import { analytics } from '@/lib/analytics';
import { EventStatus, EventType, logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useContext, useEffect, useState } from 'react';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  onboardingComplete: boolean | null;
  setOnboardingComplete: (complete: boolean) => void;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  onboardingComplete: null,
  setOnboardingComplete: () => { },
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => { },
  resetPassword: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[AUTH] Initializing auth context...');

    const initAuth = async () => {
      try {
        logger.event(EventType.AUTH, 'session_init', {
          status: EventStatus.START,
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 15000)
        );

        const sessionPromise = supabase.auth.getSession();

        const result = await Promise.race([sessionPromise, timeoutPromise]) as any;
        const session = result?.data?.session || null;

        if (session) {
          console.log('[AUTH] ✅ Session restored from storage - User is still logged in');
          console.log('[AUTH] User ID:', session.user.id);
          console.log('[AUTH] Session expires at:', new Date(session.expires_at! * 1000).toLocaleString());

          // Validate that the user still exists by checking if profile exists
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError || !profile) {
            console.log('[AUTH] ⚠️ User profile not found - session invalid, clearing...');
            await supabase.auth.signOut({ scope: 'local' });

            logger.event(EventType.AUTH, 'session_invalid', {
              status: EventStatus.FAIL,
              metadata: {
                userId: session.user.id,
                error: 'Profile not found',
              },
            });

            setSession(null);
            setUser(null);
          } else {
            logger.event(EventType.AUTH, 'session_restored', {
              status: EventStatus.SUCCESS,
              metadata: {
                userId: session.user.id,
                expiresAt: new Date(session.expires_at! * 1000).toISOString(),
              },
            });

            setSession(session);
            setUser(session?.user ?? null);
          }
        } else {
          console.log('[AUTH] No existing session found - User needs to log in');

          logger.event(EventType.AUTH, 'session_not_found', {
            status: EventStatus.INFO,
          });

          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.log('[AUTH] Error initializing auth:', error);
        console.log('[AUTH] Continuing without session - user will need to sign in');

        logger.event(EventType.AUTH, 'session_init', {
          status: EventStatus.FAIL,
          metadata: { error: String(error) },
        });

        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    let subscription: any;
    try {
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('[AUTH] Auth state changed:', event);

        // Log all auth state changes
        logger.event(EventType.AUTH, `auth_${event.toLowerCase()}`, {
          status: EventStatus.SUCCESS,
          metadata: {
            event,
            userId: session?.user?.id,
            hasSession: !!session,
          },
        });

        // Log detailed info for different events
        switch (event) {
          case 'SIGNED_IN':
            console.log('[AUTH] ✅ User signed in successfully');
            // Profile is automatically created by database trigger during signup
            // No manual profile creation needed here
            break;
          case 'SIGNED_OUT':
            console.log('[AUTH] 👋 User signed out');
            break;
          case 'TOKEN_REFRESHED':
            console.log('[AUTH] 🔄 Token refreshed automatically - session kept alive');
            if (session?.expires_at) {
              console.log('[AUTH] New expiration:', new Date(session.expires_at * 1000).toLocaleString());
            }
            break;
          case 'USER_UPDATED':
            console.log('[AUTH] 👤 User profile updated');
            break;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          analytics.setUserId(session.user.id);
          if (event === 'SIGNED_IN') {
            analytics.track('app_opened', { session_start: true });
          }
        } else {
          analytics.setUserId(null);
        }
      });
      subscription = sub;
    } catch (error) {
      console.log('[AUTH] Error setting up auth state listener:', error);
      setLoading(false);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    console.log('[AUTH] Sign up attempt:', email);

    logger.event(EventType.AUTH, 'signup', {
      status: EventStatus.START,
      metadata: { email, username },
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
      },
    });

    if (error) {
      console.log('[AUTH] Sign up error:', error);

      logger.event(EventType.AUTH, 'signup', {
        status: EventStatus.FAIL,
        metadata: {
          error: error.message,
          code: error.code,
          email,
        },
      });

      return { error };
    }

    console.log('[AUTH] User created successfully, profile will be created automatically by trigger');

    logger.event(EventType.AUTH, 'signup', {
      status: EventStatus.SUCCESS,
      metadata: {
        userId: data.user?.id,
        email,
        username,
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('[AUTH] Sign in attempt:', email);

    logger.event(EventType.AUTH, 'signin', {
      status: EventStatus.START,
      metadata: { email },
    });

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log('[AUTH] Sign in error:', error);
      console.log('[AUTH] Error code:', error.code);
      console.log('[AUTH] Error message:', error.message);

      logger.event(EventType.AUTH, 'signin', {
        status: EventStatus.FAIL,
        metadata: {
          error: error.message,
          code: error.code,
          email,
        },
      });
    } else {
      console.log('[AUTH] Sign in successful');

      logger.event(EventType.AUTH, 'signin', {
        status: EventStatus.SUCCESS,
        metadata: { email },
      });
    }

    return { error };
  };

  const signOut = async () => {
    if (isSigningOut) {
      console.log('[AUTH] Sign out already in progress, ignoring duplicate call');
      return;
    }

    console.log('[AUTH] Sign out initiated');
    setIsSigningOut(true);

    logger.event(EventType.AUTH, 'signout', {
      status: EventStatus.START,
      metadata: { userId: user?.id },
    });

    try {
      // Clear all React Query cache to remove stale data
      console.log('[AUTH] Clearing all cached data...');
      queryClient.clear();

      setSession(null);
      setUser(null);
      analytics.setUserId(null);

      await supabase.auth.signOut({ scope: 'local' });
      console.log('[AUTH] Sign out complete');

      logger.event(EventType.AUTH, 'signout', {
        status: EventStatus.SUCCESS,
      });
    } catch (error: any) {
      const errorMessage = error?.message || '';
      const errorCode = error?.code || '';

      if (errorMessage.includes('session_not_found') || errorCode === 'session_not_found' || error?.status === 403) {
        console.log('[AUTH] Session already cleared (expected)');
      } else {
        console.log('[AUTH] Sign out error:', error);

        logger.event(EventType.AUTH, 'signout', {
          status: EventStatus.FAIL,
          metadata: {
            error: errorMessage,
            code: errorCode,
          },
        });
      }
    } finally {
      setIsSigningOut(false);
    }
  };

  const resetPassword = async (email: string) => {
    console.log('[AUTH] Password reset attempt:', email);

    logger.event(EventType.AUTH, 'password_reset', {
      status: EventStatus.START,
      metadata: { email },
    });

    // Use edge function redirect for proper deep linking
    // const redirectUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/auth-deeplink-redirect?type=recovery`;
    const redirectUrl = `houseparty://reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.log('[AUTH] Password reset error:', error);

      logger.event(EventType.AUTH, 'password_reset', {
        status: EventStatus.FAIL,
        metadata: {
          error: error.message,
          email,
        },
      });
    } else {
      console.log('[AUTH] Password reset email sent successfully');

      logger.event(EventType.AUTH, 'password_reset', {
        status: EventStatus.SUCCESS,
        metadata: { email },
      });
    }

    return { error };
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, onboardingComplete, setOnboardingComplete, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
