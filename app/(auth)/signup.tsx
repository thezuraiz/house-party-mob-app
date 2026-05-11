// v-dark-signup
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView, Dimensions } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '@/lib/supabase';
import { T } from '@/constants/Theme';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring } from 'react-native-reanimated';
import { useEffect } from 'react';

const { height: H } = Dimensions.get('window');
const BLUE = '#4A7BF7';

function FadeSlide({ delay, children }: { delay: number; children: React.ReactNode }) {
  const y = useSharedValue(16);
  const op = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withSpring(0, { damping: 20, stiffness: 130 }));
    op.value = withDelay(delay, withTiming(1, { duration: 280 }));
  }, []);
  return (
    <Animated.View style={useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: y.value }] }))}>
      {children}
    </Animated.View>
  );
}

export default function SignUpScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const validate = () => {
    if (!username.trim()) { setError('Please enter a username'); return false; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email'); return false; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return false; }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Must include uppercase, lowercase and numbers'); return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true); setError('');
    console.log('[SIGNUP] Starting signup for:', email, 'username:', username);
    const result = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: 'houseparty://confirm-email', data: { username } },
    });
    setLoading(false);
    console.log('[SIGNUP] Result:', {
      hasError: !!result.error,
      errorMsg: result.error?.message,
      hasSession: !!result.data?.session,
      hasUser: !!result.data?.user,
      userId: result.data?.user?.id,
      emailConfirmed: result.data?.user?.email_confirmed_at,
      sessionAccessToken: result.data?.session?.access_token ? 'exists' : 'null',
    });
    if (result.error) {
      const msg = result.error.message;
      console.log('[SIGNUP] ERROR:', msg);
      if (msg.includes('already taken')) setError('Username already taken.');
      else if (msg.includes('already registered') || msg.includes('User already registered')) setError('Email already registered. Sign in instead.');
      else setError(`Unable to create account: ${msg}`);
    } else if (result.data?.session) {
      console.log('[SIGNUP] Session created — navigating to onboarding in 300ms');
      // Session created (auto-confirm enabled) — go to onboarding
      setTimeout(() => {
        console.log('[SIGNUP] Now navigating to onboarding');
        router.replace('/(auth)/onboarding');
      }, 300);
    } else if (result.data?.user && !result.data?.session) {
      // No session but user created — auto-confirm might be off at project level
      // Try signing in immediately since DB trigger auto-confirms email
      console.log('[SIGNUP] No session — attempting auto sign-in...');
      const signInResult = await supabase.auth.signInWithPassword({ email, password });
      console.log('[SIGNUP] Auto sign-in result:', {
        hasSession: !!signInResult.data?.session,
        hasError: !!signInResult.error,
        errorMsg: signInResult.error?.message,
      });
      if (signInResult.data?.session) {
        console.log('[SIGNUP] Auto sign-in successful — navigating to onboarding');
        setTimeout(() => {
          router.replace('/(auth)/onboarding');
        }, 300);
      } else {
        // Sign-in failed — email might actually need confirmation
        console.log('[SIGNUP] Auto sign-in failed — showing error');
        setError('Account created! Please check your email to confirm, then sign in.');
      }
    } else {
      console.log('[SIGNUP] NO SESSION returned — unexpected state');
      router.replace('/(auth)/onboarding');
    }
  };

  return (
    <View style={s.root}>
      {/* bg shapes */}
      <View style={s.shape1} />
      <View style={s.shape2} />

      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Back */}
            <FadeSlide delay={0}>
              <Pressable style={s.backBtn} onPress={() => router.back()}>
                <MaterialCommunityIcons name="chevron-left" size={22} color="rgba(255,255,255,0.8)" />
              </Pressable>
            </FadeSlide>

            {/* Title */}
            <FadeSlide delay={120}>
              <View style={s.titleBlock}>
                <Text style={s.titleSub}>Let's Get Started</Text>
                <Text style={s.title}>Create Your Account</Text>
              </View>
            </FadeSlide>

            {/* Error */}
            {error ? (
              <FadeSlide delay={0}>
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color="#FF6B6B" />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              </FadeSlide>
            ) : null}

            {/* Username */}
            <FadeSlide delay={240}>
              <View style={s.inputBox}>
                <TextInput
                  style={s.input}
                  placeholder="Enter your username"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={username}
                  onChangeText={t => { setUsername(t); setError(''); }}
                  autoCapitalize="none"
                />
              </View>
            </FadeSlide>

            {/* Email */}
            <FadeSlide delay={320}>
              <View style={s.inputBox}>
                <TextInput
                  style={s.input}
                  placeholder="Enter your email"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={email}
                  onChangeText={t => { setEmail(t); setError(''); }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </FadeSlide>

            {/* Password */}
            <FadeSlide delay={400}>
              <View style={s.inputBox}>
                <TextInput
                  style={[s.input, { paddingRight: 52 }]}
                  placeholder="Enter your password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={password}
                  onChangeText={t => { setPassword(t); setError(''); }}
                  secureTextEntry={!showPassword}
                />
                <Pressable style={s.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.4)" />
                </Pressable>
              </View>
              <Text style={s.hint}>Minimum of 8 characters with uppercase,{'\n'}lowercase and numbers</Text>
            </FadeSlide>

            {/* Register */}
            <FadeSlide delay={500}>
              <Pressable
                style={({ pressed }) => [s.registerBtn, (loading || pressed) && { opacity: 0.85 }]}
                onPress={handleSignUp}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={s.registerText}>Register</Text>
                }
              </Pressable>
            </FadeSlide>

            {/* Login link */}
            <FadeSlide delay={580}>
              <View style={s.loginRow}>
                <Text style={s.loginText}>Already have an account? </Text>
                <Pressable onPress={() => router.push('/(auth)/signin')}>
                  <Text style={s.loginLink}>Login Now</Text>
                </Pressable>
              </View>
            </FadeSlide>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D1117' },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },

  /* bg shapes */
  shape1: {
    position: 'absolute', width: 200, height: 200,
    backgroundColor: '#1A2A4A', borderRadius: 40,
    top: -60, right: -60, transform: [{ rotate: '30deg' }], opacity: 0.6,
  },
  shape2: {
    position: 'absolute', width: 160, height: 160,
    backgroundColor: '#1A2A4A', borderRadius: 30,
    bottom: H * 0.15, right: -40, transform: [{ rotate: '20deg' }], opacity: 0.4,
  },

  /* back */
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 36,
  },

  /* title */
  titleBlock: { marginBottom: 36, gap: 4 },
  titleSub: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '400' },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },

  /* error */
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,107,107,0.1)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)',
    borderRadius: 12, padding: 12, marginBottom: 14,
  },
  errorText: { color: '#FF6B6B', fontSize: 13, fontWeight: '500', flex: 1 },

  /* inputs */
  inputBox: {
    backgroundColor: '#1A2035',
    borderRadius: 30, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
  },
  input: {
    color: '#FFFFFF', fontSize: 15,
    paddingHorizontal: 22, paddingVertical: 18,
  },
  eyeBtn: {
    position: 'absolute', right: 18,
    top: 0, bottom: 0, justifyContent: 'center',
  },
  hint: {
    fontSize: 12, color: 'rgba(255,255,255,0.3)',
    marginTop: -6, marginBottom: 28, paddingHorizontal: 6, lineHeight: 18,
  },

  /* register button */
  registerBtn: {
    backgroundColor: BLUE,
    borderRadius: 30, paddingVertical: 18,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  registerText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  /* login link */
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  loginLink: { color: BLUE, fontSize: 14, fontWeight: '700' },
});
