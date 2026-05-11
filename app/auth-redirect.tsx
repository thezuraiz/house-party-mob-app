import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { logger } from '@/lib/logger';

export default function AuthRedirectScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [showManualButton, setShowManualButton] = useState(false);
  const [manualDeepLink, setManualDeepLink] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleAuthRedirect = () => {
      console.log('[AUTH_REDIRECT] ===== AUTH REDIRECT SCREEN OPENED =====');
      console.log('[AUTH_REDIRECT] All params:', JSON.stringify(params));
      console.log('[AUTH_REDIRECT] Params keys:', Object.keys(params));
      console.log('[AUTH_REDIRECT] token_hash:', params.token_hash);
      console.log('[AUTH_REDIRECT] type:', params.type);

      logger.info('[AUTH_REDIRECT] ===== SCREEN OPENED =====', {
        allParams: params,
        paramsKeys: Object.keys(params),
        hasTokenHash: !!params.token_hash,
        hasType: !!params.type,
      });

      const type = (params.type as string) || '';
      const token_hash = (params.token_hash as string) || '';

      if (!type || !token_hash) {
        console.log('[AUTH_REDIRECT] ❌ Missing params!');
        console.log('[AUTH_REDIRECT] Has type:', !!type);
        console.log('[AUTH_REDIRECT] Has token_hash:', !!token_hash);

        logger.error('[AUTH_REDIRECT] Missing params', {
          hasType: !!type,
          hasTokenHash: !!token_hash,
        });

        setErrorMsg('Missing authentication parameters');
        setTimeout(() => {
          console.log('[AUTH_REDIRECT] Redirecting to signin due to missing params');
          router.replace('/(auth)/signin');
        }, 2000);
        return;
      }

      console.log('[AUTH_REDIRECT] ✅ Valid params received');
      logger.info('[AUTH_REDIRECT] Valid params received', {
        type,
        tokenHashLength: token_hash.length,
      });

      if (type === 'recovery') {
        console.log('[AUTH_REDIRECT] Redirecting to reset-password');
        logger.info('[AUTH_REDIRECT] Redirecting to reset-password');
        router.replace(`/(auth)/reset-password?token_hash=${token_hash}&type=recovery`);
      } else {
        console.log('[AUTH_REDIRECT] Redirecting to confirm-email');
        logger.info('[AUTH_REDIRECT] Redirecting to confirm-email', { type });
        router.replace(`/(auth)/confirm-email?token_hash=${token_hash}&type=${type}`);
      }

      if (Platform.OS === 'web') {
        const dl =
          type === 'recovery'
            ? `houseparty://reset-password?type=recovery&token_hash=${encodeURIComponent(token_hash)}`
            : `houseparty://confirm-email?type=${encodeURIComponent(type)}&token_hash=${encodeURIComponent(token_hash)}`;

        setManualDeepLink(dl);
        setTimeout(() => setShowManualButton(true), 1500);
      }
    };

    handleAuthRedirect();
  }, [params, router]);

  const handleOpenApp = () => {
    if (manualDeepLink && Platform.OS === 'web') {
      window.location.href = manualDeepLink;
    }
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#334155']}
      style={styles.container}
    >
      <View style={styles.content}>
        {!showManualButton ? (
          <>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.text}>Redirecting...</Text>
            <Text style={styles.subtext}>
              {errorMsg ? errorMsg : 'Please wait while we verify your link'}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Open HouseParty App</Text>
            <Text style={styles.description}>
              If the app didn't open automatically, tap below.
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={handleOpenApp}
            >
              <Text style={styles.buttonText}>Open HouseParty App</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  subtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 32,
    minWidth: 250,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});
