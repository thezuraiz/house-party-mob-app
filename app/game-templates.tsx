// v6-grid-layout
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, Platform, StatusBar, Animated, TextInput, Dimensions
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { GameTemplateCard, FeaturedCard, GameTemplate } from '@/components/GameTemplateCard';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

const PT = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

// stagger entrance for grid cards
function AnimatedGridCard({ template, onPress, index }: {
  template: GameTemplate; onPress: (t: GameTemplate) => void; index: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1, useNativeDriver: true, speed: 16, bounciness: 10,
      delay: index * 50,
    } as any).start();
  }, []);
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
  const opacity = anim;
  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      <GameTemplateCard template={template} onPress={onPress} />
    </Animated.View>
  );
}

export default function GameTemplatesScreen() {
  const router = useRouter();
  const { houseId, fromOnboarding } = useLocalSearchParams();
  const { showToast } = useToast();
  const { setOnboardingComplete } = useAuth();

  const [templates, setTemplates] = useState<GameTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');

  // header entrance
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadTemplates();
    Animated.spring(headerAnim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 6 }).start();
  }, []);

  useFocusEffect(React.useCallback(() => { setCreating(false); }, []));

  async function loadTemplates() {
    try {
      const { data, error } = await supabase.from('game_templates').select('*').order('popularity_rank', { ascending: true });
      if (error) throw error;
      setTemplates(data || []);
    } catch { showToast('Failed to load templates', 'error'); }
    finally { setLoading(false); }
  }

  async function handleSelect(template: GameTemplate) {
    if (creating) return;
    if (!houseId) { Alert.alert('Error', 'No house selected.'); return; }
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const scoringType = template.scoring_category === 'score' ? 'points' : template.scoring_category;
      const gameData: any = {
        house_id: houseId, name: template.name, emoji: template.emoji,
        scoring_type: scoringType, scoring_category: template.scoring_category,
        lower_is_better: template.lower_is_better, max_attempts: template.max_attempts, created_by: user.id,
      };
      if (template.default_unit) {
        if (template.scoring_category === 'distance') gameData.distance_unit = template.default_unit;
        else if (template.scoring_category === 'weight') gameData.weight_unit = template.default_unit;
        else gameData.scoring_unit = template.default_unit;
      }
      const { error } = await supabase.from('games').insert(gameData).select().single();
      if (error) throw error;
      showToast(`${template.emoji} ${template.name} added!`, 'success');
      if (fromOnboarding === 'true') {
        try {
          await supabase.from('user_profile_settings').upsert({ user_id: user.id, has_completed_onboarding: true }, { onConflict: 'user_id' });
          setOnboardingComplete(true);
        } catch { setOnboardingComplete(true); }
      }
      setTimeout(() => { fromOnboarding === 'true' ? router.replace('/') : router.back(); }, 400);
    } catch (e: any) {
      showToast(e?.message || 'Failed to add game', 'error');
      setCreating(false);
    }
  }

  const handleBack = () => {
    if (fromOnboarding === 'true') {
      router.replace({ pathname: '/welcome-setup', params: { returnToStep: '2', houseId: houseId as string } });
    } else { router.back(); }
  };

  const categories = ['All', ...new Set(templates.map(t => t.category))];
  const searched = search.trim()
    ? templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    : templates;
  const filtered = selectedCategory === 'All' ? searched : searched.filter(t => t.category === selectedCategory);
  const popular = filtered.filter(t => t.is_popular);
  const others = filtered.filter(t => !t.is_popular);

  // split others into 2 columns
  const leftCol = others.filter((_, i) => i % 2 === 0);
  const rightCol = others.filter((_, i) => i % 2 === 1);

  const headerTranslate = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] });

  return (
    <View style={s.root}>
      {/* creating overlay */}
      {creating && (
        <View style={s.overlay}>
          <View style={s.overlayCard}>
            <View style={s.overlayIcon}>
              <Ionicons name="game-controller" size={28} color="#FFFFFF" />
            </View>
            <Text style={s.overlayTitle}>Adding game...</Text>
          </View>
        </View>
      )}

      {/* ── Header ── */}
      <Animated.View style={[s.header, { opacity: headerAnim, transform: [{ translateY: headerTranslate }] }]}>
        <View style={s.headerTop}>
          <Pressable style={s.backBtn} onPress={handleBack}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Templates</Text>
            {!loading && <Text style={s.headerCount}>{templates.length} games</Text>}
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* search bar */}
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.4)" />
          <TextInput
            style={s.searchInput}
            placeholder="Search games..."
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.4)" />
            </Pressable>
          )}
        </View>

        {/* category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catScroll}>
          {categories.map(cat => (
            <Pressable key={cat} style={[s.catChip, selectedCategory === cat && s.catChipOn]} onPress={() => setSelectedCategory(cat)}>
              <Text style={[s.catText, selectedCategory === cat && s.catTextOn]}>{cat}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>

      {/* ── Content ── */}
      {loading ? (
        <View style={s.skeletonWrap}>
          {/* featured skeleton */}
          <View style={s.skeletonFeatRow}>
            {[0, 1].map(i => <View key={i} style={s.skeletonFeat} />)}
          </View>
          {/* grid skeleton */}
          <View style={s.skeletonGrid}>
            {[0, 1, 2, 3].map(i => <View key={i} style={s.skeletonCard} />)}
          </View>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

          {/* featured horizontal scroll */}
          {popular.length > 0 && !search && (
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>🔥 Featured</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.featScroll}>
                {popular.map(t => (
                  <FeaturedCard key={t.id} template={t} onPress={handleSelect} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* 2-column grid */}
          {others.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>All Games</Text>
                <View style={s.countBadge}><Text style={s.countText}>{others.length}</Text></View>
              </View>
              <View style={s.grid}>
                <View style={s.col}>
                  {leftCol.map((t, i) => (
                    <AnimatedGridCard key={t.id} template={t} onPress={handleSelect} index={i * 2} />
                  ))}
                </View>
                <View style={s.col}>
                  {rightCol.map((t, i) => (
                    <AnimatedGridCard key={t.id} template={t} onPress={handleSelect} index={i * 2 + 1} />
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* search empty */}
          {search.length > 0 && filtered.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🔍</Text>
              <Text style={s.emptyTitle}>No results for "{search}"</Text>
              <Text style={s.emptySub}>Try a different name</Text>
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },

  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  overlayCard: {
    backgroundColor: '#111111', borderRadius: 24, padding: 32,
    alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  overlayIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  overlayTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },

  header: {
    backgroundColor: '#000000', paddingTop: PT + 14,
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
    gap: 12,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#111111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  headerCount: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#111111', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', color: '#FFFFFF', padding: 0 },

  catScroll: { gap: 8, paddingVertical: 2 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#111111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  catChipOn: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  catText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  catTextOn: { color: '#000000', fontWeight: '700' },

  skeletonWrap: { padding: 16, gap: 20 },
  skeletonFeatRow: { flexDirection: 'row', gap: 12 },
  skeletonFeat: { width: 200, height: 200, borderRadius: 22, backgroundColor: '#111111' },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  skeletonCard: { width: '47%', height: 160, borderRadius: 20, backgroundColor: '#111111' },

  body: { paddingHorizontal: 16, paddingTop: 20, gap: 8 },
  section: { gap: 12, marginBottom: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  countBadge: {
    backgroundColor: '#1A1A1A', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  countText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },

  featScroll: { paddingBottom: 4 },
  grid: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, gap: 12 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  emptySub: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
});
