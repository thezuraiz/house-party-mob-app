import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Platform, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams, useGlobalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react-native';
import { logger, EventType, EventStatus } from '@/lib/logger';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [valid, setValid] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { signOut } = useAuth();

  useEffect(() => {
    const verifyResetToken = async () => {
      try {
        console.log('[RESET] URL Params:', params);

        // Step 1: Check if we already have a valid session (prevents re-exchanging code)
        const { data: sessionData } = await supabase.auth.getSession();

        if (sessionData.session) {
          console.log('[RESET] ✅ Already have active recovery session');
          setValid(true);
          setLoading(false);
          return;
        }

        // Step 2: Check for PKCE code (token_hash) and exchange it
        const tokenHash = params.token_hash as string;

        if (tokenHash) {
          console.log('[RESET] ✅ PKCE code found, exchanging for session...');

          const { data, error } = await supabase.auth.exchangeCodeForSession(tokenHash);

          if (error) {
            console.log('[RESET] ❌ Failed to exchange code:', error);
            setError('Reset link is invalid or expired. Please request a new one.');
            setLoading(false);
            return;
          }

          if (data.session) {
            console.log('[RESET] ✅ Session established from PKCE code');
            setValid(true);
            setLoading(false);
            return;
          }
        }

        // SECURITY: Removed fallback to URL tokens (security vulnerability)
        // Only PKCE flow should be used for password reset

        // Step 3: No valid session or token_hash found, show error
        console.log('[RESET] ❌ No recovery session or tokens found');
        setError('Reset link is invalid or expired. Please request a new one.');
        setLoading(false);
      } catch (e) {
        console.log('[RESET] Unexpected error:', e);
        setError('Something went wrong. Please request a new reset link.');
        setLoading(false);
      }
    };

    verifyResetToken();
  }, [params]);

  const handleResetPassword = async () => {
    if (!valid) {
      setError('Session is invalid. Please request a new reset link.');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsUpdating(true);
    setError('');

    logger.event(EventType.AUTH, 'password_update', {
      status: EventStatus.START,
    });

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setIsUpdating(false);

    if (error) {
      console.log('[RESET_PASSWORD] Error updating password:', error);
      setError(error.message);

      logger.event(EventType.AUTH, 'password_update', {
        status: EventStatus.FAIL,
        metadata: { error: error.message },
      });
    } else {
      console.log('[RESET_PASSWORD] Password updated successfully');
      setSuccess(true);

      logger.event(EventType.AUTH, 'password_update', {
        status: EventStatus.SUCCESS,
      });

      // End recovery session so auth guard does not send user to home; require fresh login.
      setTimeout(async () => {
        await signOut();
        router.replace('/(auth)/signin');
      }, 2000);
    }
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#334155']}
      style={styles.container}
    >
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={24} color="#FFFFFF" />
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your new password below</Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Verifying reset link...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              Password updated! Sign in with your new password on the next screen.
            </Text>
          </View>
        ) : null}

        {!loading && valid && (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!success && !isUpdating}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              placeholderTextColor="#64748B"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!success && !isUpdating}
            />

            {!success && (
              <Pressable
                style={[styles.button, isUpdating && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Update Password</Text>
                )}
              </Pressable>
            )}
          </View>
        )}

        {error && (
          <Pressable
            style={styles.button}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={styles.buttonText}>Request New Reset Link</Text>
          </Pressable>
        )}

        <Pressable onPress={() => router.push('/(auth)/signin')}>
          <Text style={styles.link}>
            Back to <Text style={styles.linkBold}>Sign In</Text>
          </Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: typeof Platform !== 'undefined' && Platform.OS === 'android' ? 100 : 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 32,
  },
  loadingBox: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  error: {
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successBox: {
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: 16,
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    color: '#94A3B8',
    textAlign: 'center',
  },
  linkBold: {
    color: '#10B981',
    fontWeight: '600',
  },
});
