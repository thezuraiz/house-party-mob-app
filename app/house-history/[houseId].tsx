import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  Pressable, RefreshControl, Animated,
} from 'react-native';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/UserAvatar';

type Participant = {
  user_id: string; nickname: string; username: string; score: number;
  placement: number | null; is_winner: boolean;
  accuracy_hits?: number | null; accuracy_attempts?: number | null;
  ratio_numerator?: number | null; ratio_denominator?: number | null;
  profile_photo_url?: string | null; equipped_kit_colors?: string[] | null;
};

type GameSession = {
  session_id: string; game_id: string; game_name: string; game_emoji: string | null;
  game_type: string; completed_at: string; participants: Participant[];
  winner_id: string | null; winner_name: string | null;
};

function AnimatedCard({ children, index }: { children: React.ReactNode; index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
    }}>
      {children}
    </Animated.View>
  );
}

export default function HouseHistoryScreen() {
  const { houseId } = useLocalSearchParams<{ houseId: string }>();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [houseName, setHouseName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useFocusEffect(useCallback(() => {
    if (!houseId || !user) return;
    fetchHouseHistory();
    fetchHouseName();
    const ch = supabase.channel(`house-sessions-${houseId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions', filter: `house_id=eq.${houseId}` }, (payload) => {
        if (payload.eventType === 'UPDATE' && (payload.new as any).status === 'completed') fetchHouseHistory(false);
      }).subscribe();
    return () => { ch.unsubscribe(); };
  }, [houseId, user]));

  const fetchHouseName = async () => {
    if (!houseId) return;
    const { data } = await supabase.from('houses').select('name').eq('id', houseId).maybeSingle();
    if (data) setHouseName(data.name);
  };

  const fetchHouseHistory = async (showLoading = true) => {
    if (!user || !houseId) return;
    if (showLoading) setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_house_game_history', { house_id_param: houseId });
      if (error) setSessions([]);
      else if (data) setSessions(data.map((s: any) => ({ ...s, participants: Array.isArray(s.participants) ? s.participants : [] })));
    } catch { setSessions([]); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (diffDays === 0) return `Today · ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getMedalEmoji = (p: number | null) => p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : null;
  const getMedalColor = (p: number | null) => p === 1 ? '#FFD700' : p === 2 ? '#C0C0C0' : p === 3 ? '#CD7F32' : 'rgba(255,255,255,0.25)';

  const getScoreText = (p: Participant) => {
    if (p.accuracy_hits != null && p.accuracy_attempts != null) return `${p.accuracy_hits}/${p.accuracy_attempts}`;
    if (p.ratio_numerator != null && p.ratio_denominator != null) return `${p.ratio_numerator}:${p.ratio_denominator}`;
    return String(p.score);
  };

  const renderParticipant = (participant: Participant, index: number) => {
    const isMe = participant.user_id === user?.id;
    const placement = participant.placement ?? (index + 1);
    const medal = getMedalEmoji(placement);

    return (
      <Pressable
        key={participant.user_id}
        style={({ pressed }) => [s.pRow, isMe && s.pRowMe, pressed && { opacity: 0.75 }]}
        onPress={() => router.push(`/player-stats/${participant.user_id}`)}
      >
        <View style={[s.rankBadge, { borderColor: getMedalColor(placement) }]}>
          {medal
            ? <Text style={{ fontSize: 14 }}>{medal}</Text>
            : <Text style={s.rankNum}>{placement}</Text>
          }
        </View>
        <UserAvatar
          profilePhotoUrl={participant.profile_photo_url}
          username={participant.username}
          size={30}
          kitColors={participant.equipped_kit_colors}
        />
        <Text style={[s.pName, isMe && { color: '#4A7BF7' }]} numberOfLines={1}>
          {participant.nickname}
        </Text>
        <View style={s.scoreWrap}>
          {participant.is_winner && <Ionicons name="trophy" size={12} color="#FFD700" />}
          <Text style={[s.scoreText, participant.is_winner && { color: '#FFD700' }]}>
            {getScoreText(participant)}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderSession = ({ item, index }: { item: GameSession; index: number }) => (
    <AnimatedCard index={index}>
      <View style={s.card}>
        {/* Card top */}
        <View style={s.cardTop}>
          <View style={s.emojiBox}>
            <Text style={{ fontSize: 26 }}>{item.game_emoji || '🎮'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.gameName}>{item.game_name}</Text>
            <View style={s.metaRow}>
              <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.35)" />
              <Text style={s.metaText}>{formatDate(item.completed_at)}</Text>
              <View style={s.dot} />
              <Ionicons name="people-outline" size={11} color="rgba(255,255,255,0.35)" />
              <Text style={s.metaText}>{item.participants.length}</Text>
            </View>
          </View>
          {item.winner_name && (
            <View style={s.winnerChip}>
              <Text style={{ fontSize: 12 }}>🏆</Text>
              <Text style={s.winnerName} numberOfLines={1}>{item.winner_name}</Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={s.divider} />

        {/* Participants */}
        <View style={s.pList}>
          {item.participants.length > 0
            ? item.participants.map((p, i) => renderParticipant(p, i))
            : <Text style={s.noData}>No score data</Text>
          }
        </View>
      </View>
    </AnimatedCard>
  );

  if (loading) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#4A7BF7" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <Animated.View style={[s.header, {
        opacity: headerAnim,
        transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
      }]}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.headerTitle}>Game History</Text>
          {houseName ? <Text style={s.headerSub}>{houseName}</Text> : null}
        </View>
        <View style={{ width: 40 }} />
      </Animated.View>

      {sessions.length === 0 ? (
        <View style={s.empty}>
          <Text style={{ fontSize: 52, marginBottom: 12 }}>🎮</Text>
          <Text style={s.emptyTitle}>No Games Yet</Text>
          <Text style={s.emptySub}>Complete some games to see history here</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={(item) => item.session_id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchHouseHistory(false); }}
              tintColor="#4A7BF7"
              colors={['#4A7BF7']}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#111111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 },

  list: { padding: 16, gap: 14, paddingBottom: 110 },

  card: {
    backgroundColor: '#111111',
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, paddingBottom: 12,
  },
  emojiBox: {
    width: 50, height: 50, borderRadius: 15,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  gameName: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: '500' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  winnerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,215,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)',
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, maxWidth: 110,
  },
  winnerName: { fontSize: 11, fontWeight: '700', color: '#FFD700', flexShrink: 1 },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 14 },

  pList: { padding: 12, gap: 8 },
  pRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1A1A1A', borderRadius: 14, padding: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  pRowMe: {
    borderColor: 'rgba(74,123,247,0.35)',
    backgroundColor: 'rgba(74,123,247,0.07)',
  },
  rankBadge: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5,
  },
  rankNum: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.4)' },
  pName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  scoreWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scoreText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', minWidth: 36, textAlign: 'right' },
  noData: { fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 8 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 32 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  emptySub: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 22 },
});
