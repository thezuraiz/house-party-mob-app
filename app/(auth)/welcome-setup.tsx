import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Platform, Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

const HOUSE_EMOJIS = ['🏠', '⚽', '🏀', '🎮', '🎯', '🎲', '🎳', '🏓'];

export default function WelcomeSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showToast } = useToast();
  const { setOnboardingComplete } = useAuth();

  const [step, setStep] = useState(1);
  const [houseName, setHouseName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🏠');
  const [loading, setLoading] = useState(false);
  const [createdHouseId, setCreatedHouseId] = useState<string | null>(null);

  useEffect(() => {
    if (params.returnToStep === '2' && params.houseId) {
      setStep(2);
      setCreatedHouseId(params.houseId as string);
    }
  }, [params.returnToStep, params.houseId]);

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  async function handleCreateHouse() {
    if (!houseName.trim()) { showToast('Please enter a house name', 'error'); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: houseId, error } = await supabase.rpc('create_house_with_admin', {
        house_name: houseName.trim(), house_description: '',
        house_emoji: selectedEmoji, invite_code: generateInviteCode(), creator_id: user.id,
      });
      if (error) throw error;
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCreatedHouseId(houseId);
      setStep(2);
    } catch (error: any) {
      showToast('Failed to create house', 'error');
    } finally { setLoading(false); }
  }

  async function handleSkipToTemplates() {
    if (!createdHouseId) return;
    router.push({ pathname: '/game-templates', params: { houseId: createdHouseId, fromOnboarding: 'true' } });
  }

  async function handleCreateCustomGame() {
    if (!createdHouseId) return;
    router.push({ pathname: `/add-game/${createdHouseId}`, params: { fromOnboarding: 'true' } });
  }

  async function handleCompleteOnboarding() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      await supabase.from('user_profile_settings').upsert(
        { user_id: user.id, has_completed_onboarding: true }, { onConflict: 'user_id' }
      );
      setOnboardingComplete(true);
      await new Promise(resolve => setTimeout(resolve, 300));
      router.replace('/');
    } catch {
      setOnboardingComplete(true);
      router.replace('/');
    } finally { setLoading(false); }
  }

  if (step === 1) {
    return (
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* Icon */}
          <View style={s.iconBox}>
            <Ionicons name="home" size={40} color="#000000" />
          </View>

          <Text style={s.title}>Create Your First House</Text>
          <Text style={s.subtitle}>
            Houses are where you and your friends track game scores together
          </Text>

          {/* Progress */}
          <View style={s.progressRow}>
            <View style={[s.progressDot, s.progressDotActive]} />
            <View style={s.progressDot} />
          </View>
          <Text style={s.progressText}>Step 1 of 2</Text>

          {/* House Name */}
          <View style={s.field}>
            <Text style={s.label}>House Name</Text>
            <TextInput
              style={s.input}
              placeholder="My Game House"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={houseName}
              onChangeText={setHouseName}
              maxLength={50}
              autoFocus
            />
          </View>

          {/* Emoji picker */}
          <View style={s.field}>
            <View style={s.labelRow}>
              <Text style={s.label}>Choose an Icon</Text>
              <Text style={s.labelSub}>free tier</Text>
            </View>
            <View style={s.emojiGrid}>
              {HOUSE_EMOJIS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={[s.emojiBtn, selectedEmoji === emoji && s.emojiBtnOn]}
                  onPress={() => {
                    setSelectedEmoji(emoji);
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={s.emojiTxt}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={s.footer}>
          <Pressable
            style={[s.primaryBtn, (!houseName.trim() || loading) && { opacity: 0.4 }]}
            onPress={handleCreateHouse}
            disabled={!houseName.trim() || loading}
          >
            {loading
              ? <Text style={s.primaryBtnTxt}>Creating...</Text>
              : <Text style={s.primaryBtnTxt}>Create House & Continue</Text>
            }
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 2) {
    return (
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}>

          {/* Icon */}
          <View style={s.iconBox}>
            <Ionicons name="trophy" size={40} color="#000000" />
          </View>

          <Text style={s.title}>Add Your First Game</Text>
          <Text style={s.subtitle}>
            Choose from popular game templates or create a custom one
          </Text>

          {/* Progress */}
          <View style={s.progressRow}>
            <View style={[s.progressDot, s.progressDotActive]} />
            <View style={[s.progressDot, s.progressDotActive]} />
          </View>
          <Text style={s.progressText}>Step 2 of 2</Text>

          {/* Template preview */}
          <View style={s.templateCard}>
            <Text style={s.templateTitle}>Popular Templates</Text>
            <View style={s.templateList}>
              {[
                { emoji: '🎯', name: 'Darts 501' },
                { emoji: '🎱', name: 'Pool' },
                { emoji: '🏓', name: 'Ping Pong' },
                { emoji: '🎮', name: 'Video Games' },
              ].map(t => (
                <View key={t.name} style={s.templateItem}>
                  <Text style={s.templateEmoji}>{t.emoji}</Text>
                  <Text style={s.templateName}>{t.name}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={s.footer}>
          <Pressable style={s.primaryBtn} onPress={handleSkipToTemplates}>
            <Ionicons name="sparkles" size={18} color="#000000" />
            <Text style={s.primaryBtnTxt}>Browse Game Templates</Text>
          </Pressable>

          <Pressable style={s.secondaryBtn} onPress={handleCreateCustomGame}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={s.secondaryBtnTxt}>Create Custom Game</Text>
          </Pressable>

          <Pressable style={s.skipBtn} onPress={handleCompleteOnboarding}>
            <Text style={s.skipTxt}>Skip, I'll add games later</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  content: { padding: 24, paddingTop: 48, paddingBottom: 20 },

  iconBox: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: 28,
    shadowColor: '#FFFFFF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },

  title: {
    fontSize: 30, fontWeight: '800', color: '#FFFFFF',
    textAlign: 'center', marginBottom: 12, letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15, color: 'rgba(255,255,255,0.45)',
    textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },

  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 },
  progressDot: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressDotActive: { backgroundColor: '#FFFFFF' },
  progressText: {
    fontSize: 13, color: 'rgba(255,255,255,0.35)',
    textAlign: 'center', marginBottom: 32,
  },

  field: { marginBottom: 24 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  label: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 10 },
  labelSub: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  input: {
    backgroundColor: '#111111', color: '#FFFFFF',
    padding: 15, borderRadius: 14, fontSize: 15,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emojiBtn: {
    width: 60, height: 60, borderRadius: 14,
    backgroundColor: '#111111',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  emojiBtnOn: {
    borderColor: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.08)',
  },
  emojiTxt: { fontSize: 28 },

  templateCard: {
    backgroundColor: '#111111', borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    marginTop: 8,
  },
  templateTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 16 },
  templateList: { gap: 14 },
  templateItem: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  templateEmoji: { fontSize: 28 },
  templateName: { fontSize: 15, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  footer: {
    padding: 20, paddingBottom: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  primaryBtnTxt: { color: '#000000', fontSize: 16, fontWeight: '800' },

  secondaryBtn: {
    backgroundColor: '#111111', borderRadius: 16,
    paddingVertical: 15, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  secondaryBtnTxt: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  skipBtn: { paddingVertical: 12, alignItems: 'center' },
  skipTxt: { color: 'rgba(255,255,255,0.35)', fontSize: 14 },
});
