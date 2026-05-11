import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function AuthLayout() {
  const { session, loading, user, onboardingComplete, setOnboardingComplete } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const isRedirectingRef = useRef(false);
  const lastCheckTimeRef = useRef<number>(0);
  const onboardingCompletedCacheRef = useRef(false);

  // Check onboarding status when user becomes available OR when navigating to tabs
  useEffect(() => {
    if (!user || loading) {
      // Only reset if user changes (logout)
      setOnboardingChecked(false);
      setOnboardingComplete(false);
      onboardingCompletedCacheRef.current = false;
      return;
    }

    // If we've already confirmed onboarding is complete, never reset it
    if (onboardingCompletedCacheRef.current) {
      if (!onboardingChecked || onboardingComplete !== true) {
        console.log('[AUTH GUARD] Using cached onboarding complete status');
        setOnboardingChecked(true);
        setOnboardingComplete(true);
      }
      return;
    }

    // Detect navigation context safely
    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const currentScreen = segments.length > 1 ? segments[segments.length - 1] : segments[0];
    const now = Date.now();

    // Only force re-check when navigating to tabs if:
    // 1. Last check was more than 3 seconds ago (increased from 2)
    // 2. We haven't already confirmed completion
    const shouldForceCheck =
      inTabsGroup &&
      (now - lastCheckTimeRef.current) > 3000 &&
      !onboardingCompletedCacheRef.current;

    const checkOnboardingStatus = async () => {
      try {
        lastCheckTimeRef.current = now;

        const { data, error } = await supabase
          .from('user_profile_settings')
          .select('has_completed_onboarding')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          console.log('[AUTH GUARD] Onboarding status:', data.has_completed_onboarding);
          const isComplete = data.has_completed_onboarding ?? false;
          setOnboardingComplete(isComplete);

          // Cache the completion status so we never reset it
          if (isComplete) {
            onboardingCompletedCacheRef.current = true;
          }
        } else {
          setOnboardingComplete(false);
        }
      } catch (error) {
        console.log('[AUTH GUARD] Error checking onboarding:', error);
        setOnboardingComplete(false);
      } finally {
        setOnboardingChecked(true);
      }
    };

    // Check on mount or when forced
    if (!onboardingChecked || shouldForceCheck) {
      checkOnboardingStatus();
    }
  }, [user, loading, segments, setOnboardingComplete]);

  // Handle routing based on auth state
  useEffect(() => {
    // Don't route while auth is still loading
    if (loading) {
      console.log('[AUTH GUARD] Auth still loading, waiting...');
      return;
    }

    // Don't route if already in the middle of a redirect
    if (isRedirectingRef.current) {
      console.log('[AUTH GUARD] Already redirecting, skipping duplicate routing');
      return;
    }

    // Detect navigation context safely
    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const currentScreen = segments.length > 1 ? segments[segments.length - 1] : segments[0];

    // Screens that are public and don't need authentication
    const publicScreens = ['signin', 'signup', 'welcome', 'forgot-password', 'reset-password', 'confirm-email'];
    const onboardingScreens = ['onboarding', 'welcome-setup'];
    // Routes that are accessible during onboarding flow (outside auth/tabs groups)
    const onboardingAllowedRoutes = ['game-templates', 'add-game', 'create-house', 'join-house'];

    console.log('[AUTH GUARD] Routing check:', {
      currentScreen,
      inAuthGroup,
      inTabsGroup,
      hasSession: !!session,
      hasUser: !!user,
      onboardingChecked,
      onboardingComplete
    });

    // NO SESSION → Must be on public auth screens
    if (!session) {
      if (inAuthGroup && publicScreens.includes(currentScreen)) {
        console.log('[AUTH GUARD] ✅ No session, on public auth screen:', currentScreen);
        return;
      }
      console.log('[AUTH GUARD] ⚠️ No session, current screen:', currentScreen, 'inAuthGroup:', inAuthGroup, '— redirecting to welcome');
      isRedirectingRef.current = true;
      router.replace('/(auth)/welcome');
      setTimeout(() => { isRedirectingRef.current = false; }, 500);
      return;
    }

    // HAS SESSION → User is logged in, route based on state
    if (session && user) {
      // Still checking onboarding status, MUST WAIT before any routing decisions
      if (!onboardingChecked) {
        console.log('[AUTH GUARD] ⏳ Checking onboarding status...');
        return;
      }

      // If user just signed up and is still on signup screen, let the signup handler navigate
      if (inAuthGroup && currentScreen === 'signup') {
        console.log('[AUTH GUARD] ✅ User on signup screen with session, letting signup handle navigation');
        return;
      }

      // Check if email is confirmed (this check comes first)
      if (!user.email_confirmed_at) {
        if (currentScreen === 'confirm-email') {
          console.log('[AUTH GUARD] ✅ Email not confirmed, on confirm-email screen');
          return;
        }
        console.log('[AUTH GUARD] 🔄 Email not confirmed, redirecting to confirm-email');
        isRedirectingRef.current = true;
        router.replace('/(auth)/confirm-email');
        setTimeout(() => { isRedirectingRef.current = false; }, 500);
        return;
      }

      // Email confirmed, now check onboarding status
      if (onboardingComplete === false) {
        // Recovery session still counts as logged-in; allow completing reset even if onboarding isn't done
        if (currentScreen === 'reset-password') {
          console.log('[AUTH GUARD] ✅ Password reset in progress — staying on reset-password');
          return;
        }
        // User is in auth group on onboarding screen, let them continue
        if (inAuthGroup && onboardingScreens.includes(currentScreen)) {
          console.log('[AUTH GUARD] ✅ Onboarding incomplete, on onboarding screen');
          return;
        }
        // User is on an onboarding-allowed route (like game-templates or add-game)
        if (onboardingAllowedRoutes.includes(currentScreen) || onboardingAllowedRoutes.some(route => segments.join('/').includes(route))) {
          console.log('[AUTH GUARD] ✅ Onboarding incomplete, on allowed onboarding route');
          return;
        }
        // User is in tabs or trying to access tabs, needs onboarding
        if (inTabsGroup) {
          console.log('[AUTH GUARD] 🔄 Onboarding incomplete, redirecting from tabs to onboarding');
          isRedirectingRef.current = true;
          router.replace('/(auth)/onboarding');
          setTimeout(() => { isRedirectingRef.current = false; }, 500);
          return;
        }
        // User is in auth on a public screen but needs onboarding
        if (inAuthGroup && publicScreens.includes(currentScreen)) {
          console.log('[AUTH GUARD] 🔄 Onboarding incomplete, redirecting from auth screen to onboarding');
          isRedirectingRef.current = true;
          router.replace('/(auth)/onboarding');
          setTimeout(() => { isRedirectingRef.current = false; }, 500);
          return;
        }
        // Catch-all: redirect to onboarding
        console.log('[AUTH GUARD] 🔄 Onboarding incomplete, redirecting to onboarding');
        isRedirectingRef.current = true;
        router.replace('/(auth)/onboarding');
        setTimeout(() => { isRedirectingRef.current = false; }, 500);
        return;
      }

      // Email confirmed AND onboarding complete → Go to main app
      if (onboardingComplete === true) {
        // Recovery link creates a session; do not send user to tabs until they finish reset-password
        if (currentScreen === 'reset-password') {
          console.log('[AUTH GUARD] ✅ Password reset in progress — staying on reset-password');
          return;
        }
        // User is in auth group but everything is complete
        if (inAuthGroup && (publicScreens.includes(currentScreen) || onboardingScreens.includes(currentScreen))) {
          console.log('[AUTH GUARD] ✅ All complete, redirecting from auth to main app');
          isRedirectingRef.current = true;
          router.replace('/(tabs)');
          setTimeout(() => { isRedirectingRef.current = false; }, 500);
          return;
        }
        // User is already in tabs, let them be
        if (inTabsGroup) {
          console.log('[AUTH GUARD] ✅ All complete, user in tabs');
          return;
        }
      }

      console.log('[AUTH GUARD] ✅ On correct screen for current state');
    }
  }, [session, loading, segments, onboardingChecked, onboardingComplete, user, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="signin" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="welcome-setup" />
      <Stack.Screen name="confirm-email" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
