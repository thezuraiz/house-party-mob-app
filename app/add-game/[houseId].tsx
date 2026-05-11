// UPDATED v4
import {
  View, Text, TextInput, StyleSheet, Pressable,
  ActivityIndicator, Platform, ScrollView, StatusBar,
  KeyboardAvoidingView, Animated, Dimensions, Modal
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import { SCORING_TYPES, ScoringType, getScoringTypeConfig } from '@/constants/ScoringTypes';
import { DistanceUnit, WeightUnit } from '@/lib/unitConversions';
import { LongPressButton } from '@/components/LongPressButton';
import PremiumPurchaseModal from '@/components/PremiumPurchaseModal';
import { T } from '@/constants/Theme';

const PT = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
const { width: SW, height: SH } = Dimensions.get('window');
const TILE_W = (SW - 32 - 36 - 20) / 3; // SW - body padding - card padding - gaps

// ── Icon map for scoring types ────────────────────────────────────────────
const SCORING_ICONS: Record<string, string> = {
  points:        'bullseye-arrow',
  wins:          'trophy',
  accuracy:      'target',
  reps:          'repeat',
  distance:      'ruler',
  weight:        'weight-lifter',
  streak:        'fire',
  reaction_time: 'lightning-bolt',
  duration:      'timer-sand',
  rank:          'medal',
  ratio:         'chart-bar',
};

// ── Mini tile on main screen ─────────────────────────────────────────────
function ScoringTile({ type, active, onPress }: {
  type: typeof SCORING_TYPES[0]; active: boolean; onPress: () => void;
}) {
  // scale uses native driver — separate from color anims
  const scale = useRef(new Animated.Value(1)).current;
  // glow uses JS driver for color interpolation
  const glow = useRef(new Animated.Value(active ? 1 : 0)).current;
  const prev = useRef(active);

  useEffect(() => {
    if (active !== prev.current) {
      if (active) {
        // scale: native driver
        Animated.sequence([
          Animated.timing(scale, { toValue: 0.82, duration: 60, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1.08, useNativeDriver: true, speed: 22, bounciness: 20 }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 28, bounciness: 4 }),
        ]).start();
        // glow: JS driver
        Animated.timing(glow, { toValue: 1, duration: 200, useNativeDriver: false }).start();
      } else {
        Animated.timing(glow, { toValue: 0, duration: 160, useNativeDriver: false }).start();
      }
      prev.current = active;
    }
  }, [active]);

  const borderColor = glow.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.1)', '#FFFFFF'] });
  const bg = glow.interpolate({ inputRange: [0, 1], outputRange: ['#1A1A1A', '#FFFFFF'] });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.timing(scale, { toValue: 0.88, duration: 60, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 22, bounciness: 10 }).start()}
    >
      {/* outer: JS driver for colors */}
      <Animated.View style={[s.tile, { borderColor, backgroundColor: bg }]}>
        {/* inner: native driver for scale transform */}
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center', gap: 4 }}>
          <MaterialCommunityIcons
            name={SCORING_ICONS[type.id] as any || 'gamepad-variant'}
            size={26}
            color={active ? '#000000' : 'rgba(255,255,255,0.6)'}
          />
          <Text style={[s.tileName, active && s.tileNameActive]} numberOfLines={1}>{type.label}</Text>
          <Text style={[s.tileUnit, active && s.tileUnitActive]}>{type.unit}</Text>
        </Animated.View>
        {active && (
          <View style={s.tileCheck}>
            <MaterialCommunityIcons name="check-bold" size={8} color="#fff" />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ── Scoring picker modal ──────────────────────────────────────────────────
function ScoringPickerModal({
  visible, current, onSelect, onClose,
}: {
  visible: boolean;
  current: ScoringType;
  onSelect: (t: ScoringType) => void;
  onClose: () => void;
}) {
  const slideY = useRef(new Animated.Value(SH)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;
  // per-card entrance anims
  const cardAnims = useRef(SCORING_TYPES.map(() => ({
    scale: new Animated.Value(0.7),
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(40),
  }))).current;
  // selected card pulse
  const selectedPulse = useRef(new Animated.Value(1)).current;
  const [localSelected, setLocalSelected] = useState<ScoringType>(current);

  useEffect(() => { setLocalSelected(current); }, [current]);

  useEffect(() => {
    if (visible) {
      // reset cards
      cardAnims.forEach(a => { a.scale.setValue(0.7); a.opacity.setValue(0); a.translateY.setValue(40); });
      // slide modal up
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 10 }),
        Animated.timing(bgOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start(() => {
        // stagger cards in
        const anims = cardAnims.map((a, i) =>
          Animated.parallel([
            Animated.spring(a.scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 14, delay: i * 40 } as any),
            Animated.timing(a.opacity, { toValue: 1, duration: 220, delay: i * 40, useNativeDriver: true }),
            Animated.spring(a.translateY, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 10, delay: i * 40 } as any),
          ])
        );
        Animated.stagger(40, anims).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: SH, duration: 260, useNativeDriver: true }),
        Animated.timing(bgOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleSelect = (type: ScoringType) => {
    setLocalSelected(type);
    // pulse the selected card
    Animated.sequence([
      Animated.spring(selectedPulse, { toValue: 1.12, useNativeDriver: true, speed: 30, bounciness: 20 }),
      Animated.spring(selectedPulse, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 6 }),
    ]).start();
    // short delay then confirm + close
    setTimeout(() => { onSelect(type); onClose(); }, 320);
  };

  const cfg = getScoringTypeConfig(localSelected);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[s.modalBg, { opacity: bgOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[s.modalSheet, { transform: [{ translateY: slideY }] }]}>
        {/* handle */}
        <View style={s.modalHandle} />

        {/* header */}
        <View style={s.modalHead}>
          <View>
            <Text style={s.modalTitle}>Scoring Type</Text>
            <Text style={s.modalSub}>How will scores be tracked?</Text>
          </View>
          <Pressable style={s.modalClose} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={18} color={T.textSecondary} />
          </Pressable>
        </View>

        {/* selected preview banner */}
        <Animated.View style={[s.selectedBanner, { transform: [{ scale: selectedPulse }] }]}>
          <View style={s.selectedBannerGrad}>
            <MaterialCommunityIcons name={SCORING_ICONS[cfg.id] as any || 'gamepad-variant'} size={32} color="#000000" />
            <View style={{ flex: 1 }}>
              <Text style={s.selectedBannerName}>{cfg.label}</Text>
              <Text style={s.selectedBannerDesc}>{(cfg as any).description || `Scored in ${cfg.unit}`}</Text>
            </View>
            <View style={s.selectedBannerUnit}>
              <Text style={s.selectedBannerUnitText}>{cfg.unit}</Text>
            </View>
          </View>
        </Animated.View>

        {/* grid */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalGrid}>
          {SCORING_TYPES.map((type, i) => {
            const isActive = localSelected === type.id;
            const anim = cardAnims[i];
            return (
              <Animated.View
                key={type.id}
                style={{
                  opacity: anim.opacity,
                  transform: [{ scale: anim.scale }, { translateY: anim.translateY }],
                  width: '30.5%',
                }}
              >
                <Pressable
                  style={[s.modalCard, isActive && s.modalCardActive]}
                  onPress={() => handleSelect(type.id)}
                >
                  <MaterialCommunityIcons
                    name={SCORING_ICONS[type.id] as any || 'gamepad-variant'}
                    size={32}
                    color={isActive ? '#000000' : 'rgba(255,255,255,0.6)'}
                  />
                  <Text style={[s.modalCardName, isActive && s.modalCardNameActive]}>{type.label}</Text>
                  <Text style={[s.modalCardUnit, isActive && s.modalCardUnitActive]}>{type.unit}</Text>
                  {isActive && (
                    <View style={s.modalCardCheck}>
                      <MaterialCommunityIcons name="check-bold" size={10} color="#fff" />
                    </View>
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────
export default function AddGameScreen() {
  const { houseId, fromOnboarding } = useLocalSearchParams();
  const [gameName, setGameName] = useState('');
  const [scoringType, setScoringType] = useState<ScoringType>('points');
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('meters');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [maxAttempts, setMaxAttempts] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const scrollHintAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (showScrollHint) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scrollHintAnim, { toValue: 8, duration: 600, useNativeDriver: true }),
          Animated.timing(scrollHintAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [showScrollHint]);
  const { user, setOnboardingComplete } = useAuth();
  const { isPremium, loading: premiumLoading } = usePremium();
  const router = useRouter();

  const handleAddGame = async () => {
    if (!gameName.trim()) { setError('Please enter a game name'); return; }
    if (!user || !houseId) { setError('Invalid session'); return; }
    setLoading(true); setError('');
    if (!isPremium) {
      const { count, error: ce } = await supabase.from('games')
        .select('id', { count: 'exact', head: true })
        .eq('house_id', houseId).eq('created_by', user.id).is('deleted_at', null);
      if (ce) { setError('Failed to check limit'); setLoading(false); return; }
      if ((count || 0) >= 1) {
        setError('Free tier: 1 game per house.');
        setLoading(false); setShowPremiumModal(true); return;
      }
    }
    const config = getScoringTypeConfig(scoringType);
    const { error: ge } = await supabase.from('games').insert({
      house_id: houseId, name: gameName.trim(), game_type: 'custom',
      created_by: user.id, rules: {}, scoring_type: scoringType,
      scoring_category: config.category, scoring_unit: config.unit,
      lower_is_better: config.lowerIsBetter,
      distance_unit: scoringType === 'distance' ? distanceUnit : null,
      weight_unit: scoringType === 'weight' ? weightUnit : null,
      max_attempts: scoringType === 'accuracy' ? maxAttempts : null,
    });
    if (ge) { setError(`Failed: ${ge.message}`); setLoading(false); return; }
    if (fromOnboarding === 'true') {
      try {
        await supabase.from('user_profile_settings').upsert(
          { user_id: user.id, has_completed_onboarding: true }, { onConflict: 'user_id' }
        );
        setOnboardingComplete(true);
        await new Promise(r => setTimeout(r, 300));
        setLoading(false); router.replace('/');
      } catch { setOnboardingComplete(true); setLoading(false); router.replace('/'); }
    } else { setLoading(false); router.back(); }
  };

  const handleBack = () => {
    if (fromOnboarding === 'true') {
      router.replace({ pathname: '/(auth)/welcome-setup', params: { returnToStep: '2', houseId: houseId as string } });
    } else { router.back(); }
  };

  const cfg = getScoringTypeConfig(scoringType);
  const canSubmit = gameName.trim().length > 0 && !loading;

  if (premiumLoading) return <View style={s.loader}><ActivityIndicator size="large" color={T.primary} /></View>;

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <PremiumPurchaseModal visible={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
      <ScoringPickerModal
        visible={showScoringModal}
        current={scoringType}
        onSelect={t => setScoringType(t)}
        onClose={() => setShowScoringModal(false)}
      />

      {/* ── Dark hero header with embedded name input ── */}
      <View style={s.hero}>
        <View style={s.heroBubble1} />
        <View style={s.heroBubble2} />
        <View style={s.heroNav}>
          <Pressable style={s.backBtn} onPress={handleBack}>
            <MaterialCommunityIcons name="chevron-left" size={26} color="#FFFFFF" />
          </Pressable>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.heroContent}>
          <Text style={s.heroLabel}>NEW GAME</Text>
          <View style={s.heroInputWrap}>
            <MaterialCommunityIcons name="gamepad-variant" size={20} color="rgba(255,255,255,0.7)" />
            <TextInput
              ref={inputRef}
              style={s.heroInput}
              placeholder="Game name..."
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={gameName}
              onChangeText={t => { setGameName(t); setError(''); }}
              returnKeyType="done"
              editable={!loading}
              autoCorrect={false}
            />
            {gameName.length > 0 && (
              <Pressable onPress={() => setGameName('')} hitSlop={10}>
                <MaterialCommunityIcons name="close-circle" size={18} color="rgba(255,255,255,0.6)" />
              </Pressable>
            )}
          </View>
          {error ? (
            <View style={s.heroError}>
              <MaterialCommunityIcons name="alert-circle-outline" size={13} color="#FFCDD2" />
              <Text style={s.heroErrorText}>{error}</Text>
            </View>
          ) : null}
          {/* quick chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {['Darts 501', 'Beer Pong', 'Pool', 'Bowling', 'Ping Pong'].map(n => (
              <Pressable key={n} style={[s.chip, gameName === n && s.chipOn]} onPress={() => { setGameName(n); setError(''); }}>
                <Text style={[s.chipText, gameName === n && s.chipTextOn]}>{n}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        onScroll={() => setShowScrollHint(false)}
        scrollEventThrottle={16}
      >

        {/* Template shortcut */}
        <Pressable style={s.templateRow} onPress={() => router.push({ pathname: '/game-templates', params: { houseId, fromOnboarding: fromOnboarding || 'false' } })}>
          <View style={s.templateIcon}>
            <MaterialCommunityIcons name="lightning-bolt" size={16} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.templateTitle}>Use a Template</Text>
            <Text style={s.templateSub}>Pick from ready-made game types</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={T.textMuted} />
        </Pressable>

        {/* Scoring section */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>SCORING TYPE</Text>
          <View style={s.tileGrid}>
            {SCORING_TYPES.map(type => (
              <ScoringTile
                key={type.id}
                type={type}
                active={scoringType === type.id}
                onPress={() => { setScoringType(type.id as ScoringType); setShowScrollHint(true); }}
              />
            ))}
          </View>
          <Pressable style={s.scoringHint} onPress={() => {}}>
            <MaterialCommunityIcons name={SCORING_ICONS[cfg.id] as any || 'gamepad-variant'} size={20} color="#FFFFFF" />
            <View style={{ flex: 1 }}>
              <Text style={s.scoringHintName}>{cfg.label}</Text>
              <Text style={s.scoringHintSub}>Selected scoring type</Text>
            </View>
          </Pressable>
        </View>

        {/* Distance */}
        {scoringType === 'distance' && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>DISTANCE UNIT</Text>
            <View style={s.seg}>
              {(['meters', 'feet', 'miles'] as DistanceUnit[]).map(u => (
                <Pressable key={u} style={[s.segBtn, distanceUnit === u && s.segBtnOn]} onPress={() => setDistanceUnit(u)}>
                  <Text style={[s.segText, distanceUnit === u && s.segTextOn]}>{u === 'meters' ? 'Meters' : u === 'feet' ? 'Feet' : 'Miles'}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Weight */}
        {scoringType === 'weight' && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>WEIGHT UNIT</Text>
            <View style={s.seg}>
              {(['kg', 'lb'] as WeightUnit[]).map(u => (
                <Pressable key={u} style={[s.segBtn, weightUnit === u && s.segBtnOn]} onPress={() => setWeightUnit(u)}>
                  <Text style={[s.segText, weightUnit === u && s.segTextOn]}>{u === 'kg' ? 'Kilograms' : 'Pounds'}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Attempts */}
        {scoringType === 'accuracy' && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>MAX ATTEMPTS PER ROUND</Text>
            <View style={s.attRow}>
              <LongPressButton style={s.attBtn} onPress={() => setMaxAttempts(p => Math.max(1, p - 1))} delayBeforeRepeat={500} accelerationFactor={0.88}>
                <MaterialCommunityIcons name="minus" size={22} color="#FFFFFF" />
              </LongPressButton>
              <View style={{ alignItems: 'center' }}>
                <Text style={s.attNum}>{maxAttempts}</Text>
                <Text style={s.attLabel}>attempts</Text>
              </View>
              <LongPressButton style={s.attBtn} onPress={() => setMaxAttempts(p => Math.min(999, p + 1))} delayBeforeRepeat={500} accelerationFactor={0.88}>
                <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
              </LongPressButton>
            </View>
          </View>
        )}

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Scroll hint arrow */}
      {showScrollHint && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: Platform.OS === 'ios' ? 120 : 150,
            alignSelf: 'center',
            alignItems: 'center',
            gap: 2,
            transform: [{ translateY: scrollHintAnim }],
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 }}>SCROLL FOR MORE</Text>
          <MaterialCommunityIcons name="chevron-double-down" size={28} color="rgba(255,255,255,0.6)" />
        </Animated.View>
      )}

      {/* Floating CTA */}
      <View style={s.footer}>
        {gameName.trim().length > 0 && (
          <View style={s.footerPreview}>
            <MaterialCommunityIcons name={SCORING_ICONS[getScoringTypeConfig(scoringType).id] as any || 'gamepad-variant'} size={26} color="#FFFFFF" />
            <View style={{ flex: 1 }}>
              <Text style={s.footerName} numberOfLines={1}>{gameName.trim()}</Text>
              <Text style={s.footerMeta}>{cfg.label} · {cfg.unit}</Text>
            </View>
          </View>
        )}
        <Pressable style={[s.cta, !canSubmit && s.ctaOff]} onPress={handleAddGame} disabled={!canSubmit}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="check-bold" size={20} color="#fff" />}
          <Text style={s.ctaText}>{loading ? 'Saving...' : 'Create Game'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' },
  root: { flex: 1, backgroundColor: '#000000' },

  /* ── Hero ── */
  hero: {
    paddingTop: PT + 12, paddingBottom: 24, paddingHorizontal: 20,
    overflow: 'hidden', backgroundColor: '#111111',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  heroBubble1: { display: 'none' as any },
  heroBubble2: { display: 'none' as any },
  heroNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroContent: { gap: 12 },
  heroLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 2 },
  heroInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1A1A1A', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  heroInput: { flex: 1, fontSize: 18, fontWeight: '700', color: '#FFFFFF', padding: 0 },
  heroError: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  heroErrorText: { fontSize: 12, color: '#EF4444', flex: 1 },

  /* chips */
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  chipOn: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  chipText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  chipTextOn: { color: '#000000', fontWeight: '700' },

  /* body */
  body: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },

  /* template */
  templateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#111111', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  templateIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  templateTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  templateSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 },

  /* section */
  section: {
    backgroundColor: '#111111', borderRadius: 20, padding: 16, gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.3 },

  /* tiles */
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    width: TILE_W, aspectRatio: 1,
    borderRadius: 14, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    gap: 3, position: 'relative', overflow: 'hidden',
  },
  tileEmoji: { fontSize: 22 },
  tileName: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textAlign: 'center', paddingHorizontal: 2 },
  tileNameActive: { color: '#000000' },
  tileUnit: { fontSize: 9, color: 'rgba(255,255,255,0.3)' },
  tileUnitActive: { color: 'rgba(0,0,0,0.6)' },
  tileCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 15, height: 15, borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center',
  },

  /* scoring hint */
  scoringHint: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1A1A1A', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  scoringHintEmoji: { fontSize: 20 },
  scoringHintName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  scoringHintSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 },

  /* segmented */
  seg: { flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 14, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  segBtnOn: { backgroundColor: '#FFFFFF' },
  segText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  segTextOn: { color: '#000000', fontWeight: '700' },

  /* attempts */
  attRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  attBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  attNum: { fontSize: 40, fontWeight: '800', color: '#FFFFFF', lineHeight: 44 },
  attLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },

  /* footer */
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#000000', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 16, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 90,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  footerPreview: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  footerMeta: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 16,
  },
  ctaOff: { opacity: 0.3 },
  ctaText: { fontSize: 15, fontWeight: '800', color: '#000000' },

  /* ── Modal ── */
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  modalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#111111', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: SH * 0.82, paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  modalSub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  modalClose: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  selectedBanner: { marginHorizontal: 16, marginTop: 14, borderRadius: 18, overflow: 'hidden' },
  selectedBannerGrad: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 18, backgroundColor: '#FFFFFF' },
  selectedBannerName: { fontSize: 17, fontWeight: '800', color: '#000000' },
  selectedBannerDesc: { fontSize: 12, color: '#444444', marginTop: 3 },
  selectedBannerUnit: {
    backgroundColor: '#F0F0F0', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
  },
  selectedBannerUnitText: { fontSize: 14, fontWeight: '800', color: '#000000' },
  modalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  modalCard: {
    backgroundColor: '#1A1A1A', borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 16, paddingHorizontal: 8, alignItems: 'center', gap: 6, position: 'relative',
  },
  modalCardActive: {
    backgroundColor: '#FFFFFF', borderColor: '#FFFFFF',
  },
  modalCardEmoji: { fontSize: 30 },
  modalCardName: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  modalCardNameActive: { color: '#000000' },
  modalCardUnit: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  modalCardUnitActive: { color: '#444444' },
  modalCardCheck: {
    position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'center', alignItems: 'center',
  },
});
