import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { T } from '@/constants/Theme';

const { width: SW } = Dimensions.get('window');

function LoadingScreen() {
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOp = useRef(new Animated.Value(0)).current;
  const glowOp = useRef(new Animated.Value(0)).current;

  // one Animated.Value per letter
  const letters = 'HOUSEPARTY'.split('');
  const letterAnims = useRef(letters.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // logo pop in
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 10 }),
      Animated.timing(logoOp, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOp, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(glowOp, { toValue: 0.3, duration: 1400, useNativeDriver: true }),
      ])
    ).start();

    // letters stagger in
    const letterSeq = letterAnims.map((anim, i) =>
      Animated.timing(anim, { toValue: 1, duration: 180, delay: 600 + i * 80, useNativeDriver: true })
    );
    Animated.stagger(80, letterSeq).start();
  }, []);

  return (
    <View style={ls.root}>
      {/* outer ring */}
      <View style={ls.ring} />

      {/* logo */}
      <Animated.View style={[ls.logoWrap, { opacity: logoOp, transform: [{ scale: logoScale }] }]}>
        {/* glow bg */}
        <Animated.View style={[ls.glow, { opacity: glowOp }]} />
        <View style={ls.logoCircle}>
          <Image
            source={require('../assets/images/logo.png')}
            style={ls.logoImg}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* vertical text */}
      <View style={ls.textCol}>
        {letters.map((char, i) => (
          <Animated.Text
            key={i}
            style={[ls.letter, { opacity: letterAnims[i] }]}
          >
            {char}
          </Animated.Text>
        ))}
      </View>
    </View>
  );
}

const ls = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#000000',
    justifyContent: 'center', alignItems: 'center',
  },
  /* outer subtle ring */
  ring: {
    position: 'absolute',
    width: SW * 0.72, height: SW * 0.72, borderRadius: SW * 0.36,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    top: '18%' as any, alignSelf: 'center',
  },
  /* logo */
  logoWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  glow: {
    position: 'absolute',
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(0,200,255,0.18)',
  },
  logoCircle: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: 100, height: 100 },
  /* vertical text */
  textCol: { alignItems: 'center', gap: 2 },
  letter: {
    fontSize: 13, fontWeight: '300', color: '#FFFFFF',
    letterSpacing: 6, textAlign: 'center',
  },
});

export default function Index() {
  const { user, session, loading: authLoading } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // Only run splash + redirect while this screen is focused. Password-reset and other
  // deep links push another route; without cleanup, a pending timer would still call
  // router.replace('/(tabs)') and pull the user off reset-password.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let navTimeout: ReturnType<typeof setTimeout> | undefined;
      const startTime = Date.now();

      const finishChecking = (navigate: () => void) => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 4000 - elapsed);
        navTimeout = setTimeout(() => {
          if (cancelled) return;
          setChecking(false);
          navigate();
        }, remaining);
      };

      const checkOnboardingStatus = async () => {
        console.log('[AUTH_GUARD] Checking auth state...');
        console.log('[AUTH_GUARD] Auth loading:', authLoading);
        console.log('[AUTH_GUARD] Has user:', !!user);
        console.log('[AUTH_GUARD] Has session:', !!session);

        if (authLoading) {
          console.log('[AUTH_GUARD] Auth still loading, waiting...');
          return;
        }

        if (!user || !session) {
          console.log('[AUTH_GUARD] No authentication, redirecting to welcome');
          if (cancelled) return;
          finishChecking(() => router.replace('/(auth)/welcome'));
          return;
        }

        console.log('[AUTH_GUARD] User authenticated, checking onboarding status...');

        try {
          const { data, error } = await supabase
            .from('user_profile_settings')
            .select('has_completed_onboarding')
            .eq('user_id', user.id)
            .maybeSingle();

          if (cancelled) return;

          if (error) {
            console.log('[AUTH_GUARD] Error checking onboarding:', error);
            setOnboardingComplete(false);
            finishChecking(() => router.replace('/(auth)/onboarding'));
            return;
          }

          const completed = data?.has_completed_onboarding === true;
          console.log('[AUTH_GUARD] Onboarding complete:', completed);
          setOnboardingComplete(completed);

          if (!completed) {
            console.log('[AUTH_GUARD] Onboarding not complete, redirecting to onboarding');
            finishChecking(() => router.replace('/(auth)/onboarding'));
          } else {
            console.log('[AUTH_GUARD] Onboarding complete, redirecting to tabs');
            finishChecking(() => router.replace('/(tabs)'));
          }
        } catch (err) {
          console.log('[AUTH_GUARD] Unexpected error:', err);
          if (cancelled) return;
          setOnboardingComplete(false);
          finishChecking(() => router.replace('/(auth)/onboarding'));
        }
      };

      setChecking(true);
      checkOnboardingStatus();

      return () => {
        cancelled = true;
        if (navTimeout) clearTimeout(navTimeout);
      };
    }, [user, session, authLoading, router])
  );

  // Show loading state while checking
  if (authLoading || checking) {
    return <LoadingScreen />;
  }

  // This should never be reached, but just in case
  return null;
}

