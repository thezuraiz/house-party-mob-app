// v-dark-signin
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Platform, Alert, KeyboardAvoidingView, ScrollView, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Biometrics from '@/lib/biometrics';
import { T } from '@/constants/Theme';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring } from 'react-native-reanimated';

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

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const { signIn } = useAuth();
  const router = useRouter();

  useEffect(() => { checkBiometricAvailability(); }, []);

  const checkBiometricAvailability = async () => {
    const supported = await Biometrics.isBiometricSupported();
    const enrolled = await Biometrics.isBiometricEnrolled();
    const enabled = await Biometrics.isBiometricEnabled();
    const type = await Biometrics.getBiometricType();
    setBiometricType(type);
    setBiometricAvailable(supported && enrolled && enabled);
  };

  const handleSignIn = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true); setError('');
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (Platform.OS !== 'web') {
      const supported = await Biometrics.isBiometricSupported();
      const enrolled = await Biometrics.isBiometricEnrolled();
      const enabled = await Biometrics.isBiometricEnabled();
      if (supported && enrolled && !enabled) {
        const type = await Biometrics.getBiometricType();
        Alert.alert(`Enable ${type}?`, `Use ${type} to sign in next time?`, [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Enable', onPress: async () => { try { await Biometrics.enableBiometric(email, password); } catch {} } },
        ]);
      }
    }
  };

  const handleBiometricSignIn = async () => {
    setBiometricLoading(true); setError('');
    try {
      const authenticated = await Biometrics.authenticateWithBiometrics();
      if (!authenticated) { setError('Authentication failed'); setBiometricLoading(false); return; }
      const credentials = await Biometrics.getStoredCredentials();
      if (!credentials) { setError('No stored credentials found'); setBiometricLoading(false); return; }
      const { error } = await signIn(credentials.email, credentials.password);
      if (error) setError(error.message);
    } catch { setError('Biometric authentication failed'); }
    finally { setBiometricLoading(false); }
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
                <Text style={s.titleSub}>Welcome Back</Text>
                <Text style={s.title}>Login to Your Account</Text>
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

            {/* Email */}
            <FadeSlide delay={240}>
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
            <FadeSlide delay={340}>
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
            </FadeSlide>

            {/* Forgot */}
            <FadeSlide delay={400}>
              <Pressable style={s.forgotRow} onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={s.forgotText}>Forgot Password?</Text>
              </Pressable>
            </FadeSlide>

            {/* Login button */}
            <FadeSlide delay={480}>
              <Pressable
                style={({ pressed }) => [s.loginBtn, (loading || pressed) && { opacity: 0.85 }]}
                onPress={handleSignIn}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={s.loginText}>Login</Text>
                }
              </Pressable>
            </FadeSlide>

            {/* Biometric */}
            {biometricAvailable && (
              <FadeSlide delay={560}>
                <View style={s.divider}>
                  <View style={s.divLine} /><Text style={s.divText}>or</Text><View style={s.divLine} />
                </View>
                <Pressable style={[s.bioBtn, biometricLoading && { opacity: 0.7 }]} onPress={handleBiometricSignIn} disabled={biometricLoading}>
                  {biometricLoading
                    ? <ActivityIndicator color="#FFFFFF" size="small" />
                    : <><Ionicons name="finger-print-outline" size={22} color="rgba(255,255,255,0.7)" /><Text style={s.bioText}>{biometricType}</Text></>
                  }
                </Pressable>
              </FadeSlide>
            )}

            {/* Signup link */}
            <FadeSlide delay={620}>
              <View style={s.signupRow}>
                <Text style={s.signupText}>Don't have an account? </Text>
                <Pressable onPress={() => router.push('/(auth)/signup')}>
                  <Text style={s.signupLink}>Register Now</Text>
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

  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 36,
  },

  titleBlock: { marginBottom: 36, gap: 4 },
  titleSub: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '400' },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,107,107,0.1)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)',
    borderRadius: 12, padding: 12, marginBottom: 14,
  },
  errorText: { color: '#FF6B6B', fontSize: 13, fontWeight: '500', flex: 1 },

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

  forgotRow: { alignItems: 'flex-end', marginBottom: 28, marginTop: -4 },
  forgotText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '500' },

  loginBtn: {
    backgroundColor: BLUE,
    borderRadius: 30, paddingVertical: 18,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  loginText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  divText: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '500' },

  bioBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#1A2035', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 30, paddingVertical: 15, marginBottom: 28,
  },
  bioText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },

  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signupText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  signupLink: { color: BLUE, fontSize: 14, fontWeight: '700' },
});
