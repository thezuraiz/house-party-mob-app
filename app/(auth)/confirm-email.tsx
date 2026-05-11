import { View, Text, StyleSheet, ActivityIndicator, Linking, Pressable, SafeAreaView } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { CheckCircle, Mail, ArrowLeft, AlertCircle } from 'lucide-react-native';
import { logger, EventType, EventStatus } from '@/lib/logger';

export default function ConfirmEmailScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [waitingForEmail, setWaitingForEmail] = useState(false);
  const hasVerifiedRef = useRef(false);
  const hasInitRef = useRef(false);
  const isVerifyingRef = useRef(false);

  const router = useRouter();
  const params = useLocalSearchParams();
  const referralCode = params.ref as string | undefined;

  useEffect(() => {
    const verifyEmail = async (
      code?: string,
      tokenHash?: string,
      type?: string
    ) => {
      // Prevent duplicate verification calls
      if (isVerifyingRef.current) {
        console.log('[CONFIRM_EMAIL] Already verifying, skipping duplicate call');
        return;
      }

      // Prevent multiple verification attempts with the same code
      if (hasVerifiedRef.current) {
        console.log('[CONFIRM_EMAIL] Already verified, skipping duplicate attempt');
        return;
      }

      // Don't attempt verification without params
      if (!code && !tokenHash) {
        console.log('[CONFIRM_EMAIL] No verification params provided, showing waiting state');
        setWaitingForEmail(true);
        setLoading(false);
        return;
      }

      console.log('[CONFIRM_EMAIL] 🔥 verifyEmail called with:', {
        hasCode: !!code,
        codeLength: code?.length,
        hasTokenHash: !!tokenHash,
        tokenHashLength: tokenHash?.length,
        type,
      });

      // Check if already signed in
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        console.log('[CONFIRM_EMAIL] Already signed in, skipping verification');
        hasVerifiedRef.current = true;
        setSuccess(true);
        setLoading(false);

        setTimeout(() => {
          console.log('[CONFIRM_EMAIL] Redirecting to root, letting auth guard decide');
          router.replace('/');
        }, 1500);
        return;
      }

      // Mark as verifying BEFORE making the API call
      isVerifyingRef.current = true;
      hasVerifiedRef.current = true;

      try {
        let data: any;
        let error: any;

        // PKCE flow: token_hash uses verifyOtp, code uses exchangeCodeForSession
        if (tokenHash) {
          console.log('[CONFIRM_EMAIL] Using verifyOtp with token_hash (PKCE flow)');
          const result = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: (type || 'email') as 'email' | 'signup',
          });
          data = result.data;
          error = result.error;
        } else if (code) {
          console.log('[CONFIRM_EMAIL] Using exchangeCodeForSession with code (legacy flow)');
          const result = await supabase.auth.exchangeCodeForSession(code);
          data = result.data;
          error = result.error;
        }

        if (error) {
          console.log('[CONFIRM_EMAIL] ❌ Verification error:', error.message);
          setError(`Confirmation failed: ${error.message}`);
          setLoading(false);
          return;
        }

        if (!data?.session) {
          console.log('[CONFIRM_EMAIL] ❌ No session created');
          setError('Unable to create session. Please try signing in.');
          setLoading(false);
          return;
        }

        console.log('[CONFIRM_EMAIL] ✅ Success! Session created');
        setSuccess(true);
        setLoading(false);

        logger.event(EventType.AUTH, 'email_confirmed', {
          status: EventStatus.SUCCESS,
        });

        // Handle referral if code was provided
        if (referralCode && data.user) {
          console.log('[CONFIRM_EMAIL] Processing referral code:', referralCode);
          try {
            const { data: referralResult, error: referralError } = await supabase
              .rpc('handle_referral_signup', {
                p_referred_user_id: data.user.id,
                p_referral_code: referralCode
              });

            if (referralError) {
              console.log('[CONFIRM_EMAIL] Referral error:', referralError);
            } else if (referralResult) {
              console.log('[CONFIRM_EMAIL] Referral processed:', referralResult);
              if (referralResult.success) {
                console.log('[CONFIRM_EMAIL] ✅ Referral recorded successfully!');
              }
            }
          } catch (error) {
            console.log('[CONFIRM_EMAIL] Error processing referral:', error);
          }
        }

        // Let auth guard handle routing to avoid loops
        setTimeout(() => {
          console.log('[CONFIRM_EMAIL] Redirecting to root, letting auth guard decide');
          router.replace('/');
        }, 2000);
      } catch (e: any) {
        setError(`Verification error: ${e?.message || 'Unknown error'}`);
        setLoading(false);
      }
    };

    const parseUrlAndVerify = async (url: string) => {
      console.log('[CONFIRM_EMAIL] 📍 parseUrlAndVerify called');

      // Guard: Prevent duplicate verification attempts
      const { data: sessionData } = await supabase.auth.getSession();
      if (hasVerifiedRef.current || sessionData?.session) {
        console.log('[CONFIRM_EMAIL] Already verified or session exists, skipping duplicate attempt');
        return;
      }

      console.log('[CONFIRM_EMAIL] Raw URL:', url);

      const urlObj = new URL(url);
      console.log('[CONFIRM_EMAIL] URL Object created:', {
        href: urlObj.href,
        search: urlObj.search,
        hash: urlObj.hash,
        hashLength: urlObj.hash.length,
      });

      // ---- QUERY PARAMS ----
      let code = urlObj.searchParams.get('code') ?? undefined;
      let token_hash = urlObj.searchParams.get('token_hash') ?? undefined;
      let type = urlObj.searchParams.get('type') ?? undefined;

      console.log('[CONFIRM_EMAIL] Query params extracted:', {
        hasCode: !!code,
        hasTokenHash: !!token_hash,
        type,
      });

      // ---- HASH PARAMS (THIS IS THE FIX) ----
      if ((!code && !token_hash) && urlObj.hash) {
        console.log('[CONFIRM_EMAIL] 🔍 Parsing hash params from:', urlObj.hash);
        const hashParams = new URLSearchParams(urlObj.hash.replace('#', ''));
        code = hashParams.get('code') ?? undefined;
        token_hash = hashParams.get('token_hash') ?? undefined;
        type = type ?? hashParams.get('type') ?? undefined;

        console.log('[CONFIRM_EMAIL] Hash params extracted:', {
          hasCode: !!code,
          codePreview: code?.substring(0, 10) + '...',
          hasTokenHash: !!token_hash,
          tokenHashPreview: token_hash?.substring(0, 10) + '...',
          type,
        });
      } else {
        console.log('[CONFIRM_EMAIL] ⚠️ Hash parsing skipped:', {
          reason: !code && !token_hash ? 'missing both params' : 'already have params',
          hasHash: !!urlObj.hash,
        });
      }

      console.log('[CONFIRM_EMAIL] Final params before verify:', {
        hasCode: !!code,
        hasTokenHash: !!token_hash,
        type,
      });

      if (!code && !token_hash) {
        console.log('[CONFIRM_EMAIL] ❌ No params found - showing error');
        setError('Confirmation link is missing required parameters.');
        setLoading(false);
        return;
      }

      console.log('[CONFIRM_EMAIL] ✅ Calling verifyEmail');
      await verifyEmail(code, token_hash, type);
    };

    const init = async () => {
      console.log('[CONFIRM_EMAIL] 🚀 init() called');

      // Guard: If user already has session, leave immediately
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        console.log('[CONFIRM_EMAIL] User already has active session, redirecting to home');
        router.replace('/');
        return;
      }

      // Guard: Prevent duplicate verification attempts
      if (hasVerifiedRef.current) {
        console.log('[CONFIRM_EMAIL] Already verified, redirecting to home');
        setSuccess(true);
        setLoading(false);
        setTimeout(() => router.replace('/'), 500);
        return;
      }

      console.log('[CONFIRM_EMAIL] Raw route params:', params);

      // Normalize Expo params
      const code =
        typeof params.code === 'string'
          ? params.code
          : Array.isArray(params.code)
          ? params.code[0]
          : undefined;

      const token_hash =
        typeof params.token_hash === 'string'
          ? params.token_hash
          : Array.isArray(params.token_hash)
          ? params.token_hash[0]
          : undefined;

      const type =
        typeof params.type === 'string'
          ? params.type
          : Array.isArray(params.type)
          ? params.type[0]
          : undefined;

      console.log('[CONFIRM_EMAIL] Normalized route params:', {
        hasCode: !!code,
        hasTokenHash: !!token_hash,
        type,
      });

      if (code || token_hash) {
        console.log('[CONFIRM_EMAIL] ✅ Using route params path');
        await verifyEmail(code, token_hash, type);
        return;
      }

      console.log('[CONFIRM_EMAIL] No route params, checking Linking.getInitialURL()');
      const initialUrl = await Linking.getInitialURL();
      console.log('[CONFIRM_EMAIL] getInitialURL returned:', initialUrl);

      if (initialUrl && initialUrl.includes('confirm-email')) {
        console.log('[CONFIRM_EMAIL] ✅ Using initialURL path');
        await parseUrlAndVerify(initialUrl);
        return;
      }

      console.log('[CONFIRM_EMAIL] No URL found, waiting for deep link');
      setWaitingForEmail(true);
      setLoading(false);
    };

    const subscription = Linking.addEventListener('url', (event) => {
      console.log('[CONFIRM_EMAIL] 🔔 URL event received:', event.url);
      if (event.url.includes('confirm-email')) {
        console.log('[CONFIRM_EMAIL] ✅ Using listener path');
        parseUrlAndVerify(event.url);
      } else {
        console.log('[CONFIRM_EMAIL] ⚠️ URL does not include confirm-email');
      }
    });

    // Only run init once on component mount
    if (hasInitRef.current) {
      console.log('[CONFIRM_EMAIL] Init already ran, skipping');
      return;
    }
    hasInitRef.current = true;

    init();

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#334155']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.replace('/(auth)/signin')}
        >
          <ArrowLeft size={24} color="#94A3B8" />
        </Pressable>

        <View style={styles.content}>
          {loading && !waitingForEmail && (
            <View style={styles.stateContainer}>
              <View style={styles.loaderWrapper}>
                <ActivityIndicator size="large" color="#10B981" />
              </View>
              <Text style={styles.title}>Confirming your email...</Text>
              <Text style={styles.subtitle}>Please wait a moment</Text>
            </View>
          )}

          {waitingForEmail && (
            <View style={styles.stateContainer}>
              <View style={styles.iconWrapper}>
                <Mail size={64} color="#10B981" strokeWidth={1.5} />
              </View>
              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.subtitle}>
                We sent you a confirmation link.{'\n'}
                Click the link in your email to verify your account.
              </Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  • Check your email inbox{'\n'}
                  • Click the confirmation link{'\n'}
                  • The link will open this app automatically{'\n'}
                  • Don't see it? Check spam folder
                </Text>
              </View>
              <Pressable
                style={styles.continueButton}
                onPress={() => {
                  console.log('[CONFIRM_EMAIL] User manually continuing to sign in');
                  router.replace('/(auth)/signin');
                }}
              >
                <Text style={styles.continueButtonText}>
                  Already confirmed? Sign In
                </Text>
              </Pressable>
            </View>
          )}

          {success && (
            <View style={styles.stateContainer}>
              <View style={styles.successIconWrapper}>
                <CheckCircle size={64} color="#10B981" strokeWidth={2} />
              </View>
              <Text style={styles.title}>Email Confirmed!</Text>
              <Text style={styles.subtitle}>
                Redirecting to complete your profile...
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.stateContainer}>
              <View style={styles.errorIconWrapper}>
                <AlertCircle size={64} color="#EF4444" strokeWidth={2} />
              </View>
              <Text style={styles.errorTitle}>Verification Failed</Text>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                style={styles.retryButton}
                onPress={() => router.replace('/(auth)/signin')}
              >
                <Text style={styles.retryButtonText}>Back to Sign In</Text>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  stateContainer: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  loaderWrapper: {
    marginBottom: 24,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  successIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 3,
    borderColor: '#10B981',
  },
  errorIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  retryButtonText: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginTop: 16,
  },
  continueButtonText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
});
