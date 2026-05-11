import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

const CARD_W = (Dimensions.get('window').width - 32 - 12) / 2;

export interface GameTemplate {
  id: string; name: string; emoji: string; description: string;
  category: string; scoring_type: string; scoring_category: string;
  lower_is_better: boolean; default_unit: string | null;
  max_attempts: number | null; is_popular: boolean; popularity_rank: number;
}

// ── Featured card (horizontal scroll) ────────────────────────────────────
export function FeaturedCard({ template, onPress }: { template: GameTemplate; onPress: (t: GameTemplate) => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }).start();
  const handlePress = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress(template);
  };

  return (
    <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[fc.card, { transform: [{ scale }] }]}>
        <LinearGradient
          colors={['#1A1A1A', '#111111', '#000000']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={fc.grad}
        >
          <View style={fc.bubble} />
          <View style={fc.hotRow}>
            <View style={fc.hotBadge}>
              <Ionicons name="flame" size={10} color="#FFFFFF" />
              <Text style={fc.hotText}>Popular</Text>
            </View>
          </View>
          <Text style={fc.emoji}>{template.emoji}</Text>
          <Text style={fc.name} numberOfLines={2}>{template.name}</Text>
          <Text style={fc.desc} numberOfLines={2}>{template.description}</Text>
          <View style={fc.footer}>
            <View style={fc.catPill}>
              <Text style={fc.catText}>{template.category}</Text>
            </View>
            <View style={fc.addBtn}>
              <Ionicons name="add" size={16} color="#000000" />
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const fc = StyleSheet.create({
  card: {
    width: 200, borderRadius: 22, overflow: 'hidden', marginRight: 12,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  grad: { padding: 18, gap: 8, minHeight: 200, overflow: 'hidden' },
  bubble: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)', top: -30, right: -30,
  },
  hotRow: { flexDirection: 'row' },
  hotBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  hotText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  emoji: { fontSize: 36, marginTop: 4 },
  name: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  desc: { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 16 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  catPill: {
    backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  catText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5 },
  addBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center',
  },
});

// ── Grid card (2-column) ──────────────────────────────────────────────────
export function GameTemplateCard({ template, onPress }: { template: GameTemplate; onPress: (t: GameTemplate) => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }).start();
  const handlePress = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(template);
  };

  return (
    <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={{ width: CARD_W }}>
      <Animated.View style={[gc.card, { transform: [{ scale }] }]}>
        {template.is_popular && (
          <View style={gc.hotDot}>
            <Ionicons name="flame" size={8} color="#FFFFFF" />
          </View>
        )}
        <View style={gc.emojiBox}>
          <Text style={gc.emoji}>{template.emoji}</Text>
        </View>
        <Text style={gc.name} numberOfLines={2}>{template.name}</Text>
        <Text style={gc.desc} numberOfLines={2}>{template.description}</Text>
        <View style={gc.footer}>
          <View style={gc.catPill}>
            <Text style={gc.catText}>{template.category}</Text>
          </View>
          <View style={gc.addCircle}>
            <Ionicons name="add" size={14} color="#000000" />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const gc = StyleSheet.create({
  card: {
    backgroundColor: '#111111', borderRadius: 20, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 8,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
    position: 'relative',
  },
  hotDot: {
    position: 'absolute', top: 10, right: 10,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
  },
  emojiBox: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  emoji: { fontSize: 28 },
  name: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', lineHeight: 18 },
  desc: { fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 15 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  catPill: {
    backgroundColor: '#1A1A1A', paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  catText: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.4 },
  addCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center',
  },
});
