import { View, Text, StyleSheet, Pressable, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay,
  withSpring, withRepeat, withSequence, Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const { width: W, height: H } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  const contentOp = useSharedValue(0);
  const contentY  = useSharedValue(30);
  const btnsOp    = useSharedValue(0);
  const btnsY     = useSharedValue(20);
  const imgFloat  = useSharedValue(0);

  useEffect(() => {
    contentOp.value = withDelay(200, withTiming(1, { duration: 600 }));
    contentY.value  = withDelay(200, withSpring(0, { damping: 14, stiffness: 100 }));
    btnsOp.value    = withDelay(700, withTiming(1, { duration: 400 }));
    btnsY.value     = withDelay(700, withSpring(0, { damping: 14, stiffness: 100 }));
    imgFloat.value  = withDelay(1000, withRepeat(
      withSequence(
        withTiming(-8, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0,  { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    ));
  }, []);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOp.value,
    transform: [{ translateY: contentY.value }],
  }));
  const btnsStyle = useAnimatedStyle(() => ({
    opacity: btnsOp.value,
    transform: [{ translateY: btnsY.value }],
  }));
  const imgStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: imgFloat.value }],
  }));

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>

        {/* Main welcome image — takes up top portion */}
        <Animated.View style={[s.imgWrap, imgStyle]}>
          <Image
            source={require('../../assets/images/welcome/1-Welcome-Screen.png')}
            style={s.mainImg}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Buttons */}
        <Animated.View style={[s.buttons, btnsStyle]}>
          <Pressable
            style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text style={s.primaryText}>Get Started</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push('/(auth)/signin')}
          >
            <Text style={s.secondaryText}>I already have an account</Text>
          </Pressable>

          <Text style={s.terms}>
            By continuing you agree to our Terms &{'\n'}Privacy Policy
          </Text>
        </Animated.View>

      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1, alignItems: 'center' },

  imgWrap: {
    width: W,
    height: H * 0.58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainImg: {
    width: W,
    height: H * 0.58,
  },

  bottom: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 28,
    paddingHorizontal: 28,
  },
  appName: {
    fontSize: 42, fontWeight: '900', color: '#FFFFFF',
    letterSpacing: -1.5, textAlign: 'center',
  },
  tagline: {
    fontSize: 15, color: 'rgba(255,255,255,0.45)',
    fontWeight: '400', textAlign: 'center',
  },

  buttons: {
    width: '100%', paddingHorizontal: 28,
    gap: 12, alignItems: 'center',
  },
  primaryBtn: {
    width: '100%', backgroundColor: '#FFFFFF',
    borderRadius: 30, paddingVertical: 17, alignItems: 'center',
  },
  primaryText: { color: '#000000', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    width: '100%',
    borderRadius: 30, paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  secondaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  terms: {
    color: 'rgba(255,255,255,0.3)', fontSize: 11,
    textAlign: 'center', lineHeight: 17, marginTop: 4,
  },
});
