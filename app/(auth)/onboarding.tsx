import { View, Text, StyleSheet, Pressable, Dimensions, Platform, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

type Step = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    icon: 'home',
    title: 'Welcome to HouseParty',
    description: 'Create houses for different games and activities. Track scores, compete with friends, and build your legacy.',
  },
  {
    icon: 'people',
    title: 'Invite Your Friends',
    description: 'Share QR codes or invite links to bring friends into your houses. The more players, the more fun!',
  },
  {
    icon: 'trophy',
    title: 'Track Everything',
    description: "From board games to sports, track any activity with custom scoring. See who's leading on the leaderboard.",
  },
  {
    icon: 'sparkles',
    title: 'Unlock Rewards',
    description: 'Earn badges, unlock custom themes and banners. Make your houses uniquely yours!',
  },
];

function StepContent({ step, index, currentStep }: { step: Step; index: number; currentStep: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();

    // Bounce icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -10, duration: 1000, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    return () => bounceAnim.stopAnimation();
  }, [currentStep]);

  return (
    <Animated.View style={[s.stepContent, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
      {/* Icon */}
      <Animated.View style={[s.iconBox, { transform: [{ translateY: bounceAnim }] }]}>
        <Ionicons name={step.icon} size={48} color="#000000" />
      </Animated.View>

      <Text style={s.title}>{step.title}</Text>
      <Text style={s.description}>{step.description}</Text>
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user, session, setOnboardingComplete } = useAuth();
  const router = useRouter();

  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Subtle pulse on Next button
    Animated.loop(
      Animated.sequence([
        Animated.timing(btnScale, { toValue: 1.03, duration: 900, useNativeDriver: true }),
        Animated.timing(btnScale, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  if (!session || !user) return null;

  const markComplete = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await supabase.from('user_profile_settings').upsert(
        { user_id: user.id, has_completed_onboarding: true },
        { onConflict: 'user_id' }
      );
      setOnboardingComplete(true);
      await new Promise(r => setTimeout(r, 300));
      router.replace('/');
    } catch {
      setOnboardingComplete(true);
      router.replace('/');
    } finally { setLoading(false); }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      router.replace('/(auth)/welcome-setup');
    }
  };

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.content}>
        <StepContent step={step} index={currentStep} currentStep={currentStep} />

        {/* Dots */}
        <View style={s.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[s.dot, i === currentStep && s.dotActive]}
            />
          ))}
        </View>
      </View>

      <View style={s.footer}>
        {!isLast && (
          <View style={s.skipRow}>
            <Pressable onPress={() => router.replace('/(auth)/welcome-setup')} style={s.skipBtn}>
              <Text style={s.skipTxt}>Skip Tutorial</Text>
            </Pressable>
            <Text style={s.skipDot}>•</Text>
            <Pressable onPress={markComplete} style={s.skipBtn}>
              <Text style={s.skipTxt}>Skip to App</Text>
            </Pressable>
          </View>
        )}

        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <Pressable
            style={[s.nextBtn, loading && { opacity: 0.5 }]}
            onPress={handleNext}
            disabled={loading}
          >
            <Text style={s.nextTxt}>{isLast ? 'Get Started' : 'Next'}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },

  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },

  stepContent: {
    alignItems: 'center',
    gap: 20,
    paddingBottom: 40,
  },

  iconBox: {
    width: 120, height: 120, borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },

  title: {
    fontSize: 30, fontWeight: '800', color: '#FFFFFF',
    textAlign: 'center', letterSpacing: -0.5,
  },
  description: {
    fontSize: 16, color: 'rgba(255,255,255,0.45)',
    textAlign: 'center', lineHeight: 24, maxWidth: 320,
  },

  dots: {
    flexDirection: 'row', gap: 8, marginTop: 40,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    width: 28, backgroundColor: '#FFFFFF',
  },

  footer: {
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 8 : 24, gap: 12,
  },

  skipRow: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 12, paddingVertical: 8,
  },
  skipBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  skipTxt: { fontSize: 15, color: 'rgba(255,255,255,0.35)', fontWeight: '500' },
  skipDot: { fontSize: 14, color: 'rgba(255,255,255,0.2)' },

  nextBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 18,
    paddingVertical: 18, alignItems: 'center',
  },
  nextTxt: { fontSize: 17, fontWeight: '800', color: '#000000', letterSpacing: 0.2 },
});
