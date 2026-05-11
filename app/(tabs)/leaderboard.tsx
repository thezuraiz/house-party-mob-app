import {
  View, Text, StyleSheet, SectionList, ActivityIndicator,
  Pressable, Modal, Animated, ScrollView, Platform, StatusBar,
} from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import { formatScore, getScoringTypeConfig, type ScoringType } from '@/constants/ScoringTypes';

type House = { id: string; name: string; house_emoji: string; creator_id: string };
type Participant = {
  user_id: string; nickname: string; username: string; score: number; placement: number;
  is_winner: boolean; profile_photo_url?: string | null; equipped_kit_colors?: string[] | null;
  accuracy_hits?: number | null; accuracy_attempts?: number | null;
  ratio_numerator?: number | null; ratio_denominator?: number | null;
};
type GameSession = {
  session_id: string; game_name: string; game_emoji: string;
  scoring_type: ScoringType; distance_unit?: string; weight_unit?: string;
  completed_at: string; participants: Participant[]; winner_name: string;
};

// ── Entrance animation ────────────────────────────────────────────────────────
function Entrance({ children, delay = 0, from = 'bottom' }: {
  children: React.ReactNode; delay?: number; from?: 'bottom' | 'left';
}) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 500, delay, useNativeDriver: true }).start();
  }, []);
  const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [36, 0] });
  const translateX = a.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] });
  return (
    <Animated.View style={{
      opacity: a,
      transform: from === 'left' ? [{ translateX }] : [{ translateY }],
    }}>
      {children}
    </Animated.View>
  );
}

// ── Top 3 podium ──────────────────────────────────────────────────────────────
function Podium({ participants, userId, onPress }: {
  participants: Participant[]; userId?: string; onPress: (id: string) => void;
}) {
  const top = participants.slice(0, 3);
  if (top.length === 0) return null;
  // Reorder: 2nd, 1st, 3rd
  const order = top.length >= 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : [top[0]];
  const heights = [80, 110, 60];
  const medals = ['🥈', '🥇', '🥉'];
  const sizes = [36, 48, 32];

  return (
    <View style={p.wrap}>
      {order.map((participant, i) => {
        const isFirst = participant.placement === 1 || (top.length < 3 && i === order.length - 1);
        const isMe = participant.user_id === userId;
        const h = top.length >= 3 ? heights[i] : i === 0 ? 80 : 110;
        const sz = top.length >= 3 ? sizes[i] : i === 0 ? 36 : 48;
        const medal = top.length >= 3 ? medals[i] : i === 0 ? '🥈' : '🥇';

        return (
          <Pressable key={participant.user_id} style={p.col} onPress={() => onPress(participant.user_id)}>
            <View style={p.medalWrap}>
              <Text style={p.medalNum}>{participant.placement || i + 1}</Text>
            </View>
            <View style={[p.avatarRing, isFirst && p.avatarRingGold, isMe && p.avatarRingBlue]}>
              <UserAvatar profilePhotoUrl={participant.profile_photo_url} username={participant.username} size={sz} kitColors={participant.equipped_kit_colors} showUsername={false} />
            </View>
            <Text style={[p.name, isFirst && { color: '#FFFFFF', fontWeight: '800' }, isMe && !isFirst && { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>
              {participant.nickname}
            </Text>
            <Text style={[p.score, isFirst && { color: '#FFFFFF' }]}>{participant.score}</Text>
            <View style={[p.bar, { height: h }, isFirst && p.barGold]}>
              <Text style={p.barNum}>{participant.placement || i + 1}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Game card ─────────────────────────────────────────────────────────────────
function GameCard({ item, index, userId, onNavigate }: {
  item: GameSession; index: number; userId?: string; onNavigate: (id: string) => void;
}) {
  const cfg = getScoringTypeConfig(item.scoring_type);
  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), day = Math.floor(diff / 86400000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (day === 1) return 'Yesterday';
    if (day < 7) return `${day}d ago`;
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getScore = (participant: Participant) => formatScore(participant.score, item.scoring_type, {
    hits: participant.accuracy_hits ?? undefined, attempts: participant.accuracy_attempts ?? undefined,
    numerator: participant.ratio_numerator ?? undefined, denominator: participant.ratio_denominator ?? undefined,
  });

  return (
    <Entrance delay={index * 70}>
      <View style={g.card}>
        {/* Left accent bar */}
        <View style={g.accentBar} />

        <View style={g.inner}>
          {/* Header */}
          <View style={g.head}>
            <View style={g.emojiWrap}>
              <Ionicons name="game-controller" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={g.title}>{item.game_name}</Text>
              <Text style={g.time}>{timeAgo(item.completed_at)}</Text>
            </View>
            <View style={g.badge}>
              <Text style={g.badgeTxt}>{cfg.unit}</Text>
            </View>
          </View>

          {/* Winner banner */}
          {item.winner_name ? (
            <View style={g.winnerBanner}>
              <Ionicons name="trophy" size={14} color="#FFD700" />
              <Text style={g.winnerTxt}>{item.winner_name} won!</Text>
            </View>
          ) : null}

          {/* Players list */}
          <View style={g.players}>
            {item.participants.map((participant, i) => {
              const isMe = participant.user_id === userId;
              const pl = participant.placement || i + 1;
              const isTop = pl <= 3;
              const medalEmoji = pl === 1 ? '🥇' : pl === 2 ? '🥈' : pl === 3 ? '🥉' : null;

              return (
                <Pressable
                  key={participant.user_id}
                  style={({ pressed }) => [g.playerRow, isMe && g.playerRowMe, pl === 1 && g.playerRowFirst, pressed && { opacity: 0.7 }]}
                  onPress={() => onNavigate(participant.user_id)}
                >
                  <View style={g.placeWrap}>
                    {medalEmoji
                      ? <Text style={{ fontSize: 14 }}>{medalEmoji}</Text>
                      : <Text style={g.placeNum}>{pl}</Text>
                    }
                  </View>
                  <UserAvatar profilePhotoUrl={participant.profile_photo_url} username={participant.username} size={28} kitColors={participant.equipped_kit_colors} showUsername={false} />
                  <Text style={[g.playerName, isMe && { color: '#FFFFFF', fontWeight: '700' }, pl === 1 && { color: '#FFFFFF', fontWeight: '800' }]} numberOfLines={1}>
                    {participant.nickname}{isMe ? ' ★' : ''}
                  </Text>
                  <Text style={[g.playerScore, pl === 1 && { color: '#FFFFFF' }]}>
                    {getScore(participant)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Entrance>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LeaderboardScreen() {
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: myHouses = [], isLoading: housesLoading } = useQuery({
    queryKey: ['userHouses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('house_members')
        .select('house_id, houses!inner(id, name, house_emoji, creator_id)')
        .eq('user_id', user.id);
      return (data || []).map((d: any) => ({
        id: d.houses.id, name: d.houses.name,
        house_emoji: d.houses.house_emoji, creator_id: d.houses.creator_id,
      }));
    },
    enabled: !!user, staleTime: 30000,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['gameHistory', selectedHouseId],
    queryFn: async () => {
      if (!selectedHouseId || !user) return null;
      const [membersRes, historyRes] = await Promise.all([
        supabase.from('house_members').select('user_id').eq('house_id', selectedHouseId),
        supabase.rpc('get_house_game_history', { house_id_param: selectedHouseId }),
      ]);
      const memberCount = membersRes.data?.length || 0;
      if (historyRes.error || !historyRes.data) return { sessions: [], memberCount };
      return {
        memberCount,
        sessions: historyRes.data.map((r: any) => ({
          session_id: r.session_id, game_name: r.game_name, game_emoji: r.game_emoji,
          scoring_type: r.scoring_type || 'points', distance_unit: r.distance_unit,
          weight_unit: r.weight_unit, completed_at: r.completed_at,
          participants: r.participants || [], winner_name: r.winner_name,
        })) as GameSession[],
      };
    },
    enabled: !!selectedHouseId && !!user, staleTime: 15000,
  });

  const loading = housesLoading || historyLoading;
  const sessions = historyData?.sessions || [];
  const memberCount = historyData?.memberCount || 0;
  const selectedHouse = myHouses.find(h => h.id === selectedHouseId) ?? myHouses[0] ?? null;
  const latestSession = sessions[0];

  useEffect(() => {
    if (myHouses.length > 0 && !selectedHouseId) setSelectedHouseId(myHouses[0].id);
  }, [myHouses]);

  useEffect(() => {
    if (!user) return;
    const sub = supabase.channel('lb-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'house_members', filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['userHouses', user?.id] });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions' }, (ev) => {
        if ((ev.new as any)?.status === 'completed') queryClient.invalidateQueries({ queryKey: ['gameHistory', selectedHouseId] });
      })
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [user, selectedHouseId]);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── HERO GRADIENT HEADER ── */}
        <Entrance delay={0}>
          <LinearGradient
            colors={['#0D1117', '#111827', '#000000']}
            style={s.hero}
          >
            <View style={s.heroRow}>
              <View>
                <Text style={s.heroLabel}>GAME HISTORY</Text>
                <Text style={s.heroTitle}>
                  {selectedHouse ? selectedHouse.name : 'Select House'}
                </Text>
                <Text style={s.heroSub}>{sessions.length} games  ·  {memberCount} members</Text>
              </View>
              <Pressable style={s.switchBtn} onPress={() => setShowModal(true)}>
                <Ionicons name="swap-horizontal-outline" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* House pills */}
            {myHouses.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillRow}>
                {myHouses.map(h => {
                  const on = h.id === selectedHouseId;
                  return (
                    <Pressable key={h.id} style={[s.pill, on && s.pillOn]} onPress={() => setSelectedHouseId(h.id)}>
                      <Ionicons name="home" size={14} color={on ? '#FFFFFF' : 'rgba(255,255,255,0.45)'} />
                      <Text style={[s.pillTxt, on && s.pillTxtOn]}>{h.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {/* Stats row */}
            {sessions.length > 0 && (
              <View style={s.statsRow}>
                {[
                  { val: sessions.length, lbl: 'Games' },
                  { val: memberCount, lbl: 'Members' },
                  { val: new Set(sessions.map(s => s.winner_name).filter(Boolean)).size, lbl: 'Winners' },
                ].map((st, i) => (
                  <View key={i} style={[s.statBox, i < 2 && s.statBoxBorder]}>
                    <Text style={s.statVal}>{st.val}</Text>
                    <Text style={s.statLbl}>{st.lbl}</Text>
                  </View>
                ))}
              </View>
            )}
          </LinearGradient>
        </Entrance>

        {/* ── LATEST GAME PODIUM ── */}
        {latestSession && latestSession.participants.length >= 2 && (
          <Entrance delay={120}>
            <View style={s.podiumSection}>
              <View style={s.sectionHead}>
                <View style={s.sectionDot} />
                <Text style={s.sectionTitle}>Latest Game</Text>
                <Text style={s.sectionGame}>{latestSession.game_name}</Text>
              </View>
              <Podium
                participants={latestSession.participants}
                userId={user?.id}
                onPress={id => router.push(`/player-stats/${id}`)}
              />
            </View>
          </Entrance>
        )}

        {/* ── ALL GAMES ── */}
        {loading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color="#4A7BF7" />
          </View>
        ) : sessions.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyBox}>
              <Ionicons name="game-controller" size={40} color="#FFFFFF" />
            </View>
            <Text style={s.emptyTitle}>No Games Yet</Text>
            <Text style={s.emptySub}>Complete some games to see history here</Text>
          </View>
        ) : (
          <View style={s.gamesList}>
            <View style={s.sectionHead}>
              <View style={s.sectionDot} />
              <Text style={s.sectionTitle}>All Games</Text>
            </View>
            {sessions.map((session, i) => (
              <GameCard
                key={session.session_id}
                item={session}
                index={i}
                userId={user?.id}
                onNavigate={id => router.push(`/player-stats/${id}`)}
              />
            ))}
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── HOUSE MODAL ── */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <Pressable style={s.overlay} onPress={() => setShowModal(false)}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Switch House</Text>
            {myHouses.map(h => (
              <Pressable
                key={h.id}
                style={[s.sheetRow, selectedHouseId === h.id && s.sheetRowOn]}
                onPress={() => { setSelectedHouseId(h.id); setShowModal(false); }}
              >
                <Ionicons name="home-outline" size={20} color="rgba(255,255,255,0.5)" />
                <Text style={[s.sheetName, selectedHouseId === h.id && { color: '#FFFFFF' }]}>{h.name}</Text>
                {selectedHouseId === h.id && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── Podium styles ─────────────────────────────────────────────────────────────
const p = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 0 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  medalWrap: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  medalNum: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.5)' },
  medal: { fontSize: 22 },
  avatarRing: { borderRadius: 30, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  avatarRingGold: { borderColor: '#FFFFFF', shadowColor: '#FFFFFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 6 },
  avatarRingBlue: { borderColor: 'rgba(255,255,255,0.4)' },
  name: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.55)', textAlign: 'center' },
  score: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  bar: {
    width: '100%', borderTopLeftRadius: 10, borderTopRightRadius: 10,
    backgroundColor: '#111111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center', alignItems: 'center',
  },
  barGold: { backgroundColor: '#161616', borderColor: 'rgba(255,255,255,0.15)' },
  barNum: { fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.15)' },
});

// ── Game card styles ──────────────────────────────────────────────────────────
const g = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#0D0D0D', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  accentBar: { width: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  inner: { flex: 1, padding: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  emojiWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.2 },
  time: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
  badge: {
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  badgeTxt: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  winnerBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#161616', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 10,
  },
  winnerTxt: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  players: { gap: 5 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#141414', borderRadius: 10, padding: 9,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  playerRowFirst: {
    backgroundColor: '#1A1A1A',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  playerRowMe: { borderColor: 'rgba(255,255,255,0.2)', backgroundColor: '#1C1C1C' },
  placeWrap: { width: 22, alignItems: 'center' },
  placeNum: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.2)' },
  playerName: { flex: 1, fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  playerScore: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.5)', minWidth: 36, textAlign: 'right' },
});

// ── Screen styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  scroll: { flexGrow: 1 },
  centered: { paddingVertical: 60, alignItems: 'center' },

  hero: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, gap: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: 2, marginBottom: 4 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
  switchBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#111111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },

  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#111111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  pillOn: { backgroundColor: '#1A1A1A', borderColor: 'rgba(255,255,255,0.25)' },
  pillTxt: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },
  pillTxtOn: { color: '#FFFFFF', fontWeight: '700' },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#0D0D0D', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 2 },
  statBoxBorder: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.07)' },
  statVal: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 },
  statLbl: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  podiumSection: { marginTop: 20, marginHorizontal: 16 },
  gamesList: { marginTop: 20, marginHorizontal: 16, gap: 8 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', flex: 1, letterSpacing: -0.2 },
  sectionGame: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },

  empty: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: '#111111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  emptySub: { fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 20 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0D0D0D', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 44, gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  sheetHandle: { width: 36, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: '#111111',
  },
  sheetRowOn: { backgroundColor: '#1A1A1A', borderColor: 'rgba(255,255,255,0.2)' },
  sheetName: { flex: 1, fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
});
