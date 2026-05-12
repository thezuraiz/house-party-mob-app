import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Platform, StatusBar, Image } from 'react-native';
import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return num + 'st';
  if (j === 2 && k !== 12) return num + 'nd';
  if (j === 3 && k !== 13) return num + 'rd';
  return num + 'th';
}
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import BannerRenderer from '@/components/BannerRenderer';
import KitBorder from '@/components/KitBorder';

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'mythic': return '#EC4899';
    case 'legendary': return '#FFD700';
    case 'epic': return '#A855F7';
    case 'rare': return '#3B82F6';
    case 'uncommon': return '#22C55E';
    default: return 'rgba(255,255,255,0.5)';
  }
}

type PlayerStats = {
  user_id: string;
  username: string;
  profile_photo_url?: string | null;
  total_games: number;
  total_wins: number;
  total_losses: number;
  win_rate: number;
  best_placement_count: number;
  average_score: number;
  total_score: number;
  houses_played: number;
};

type HouseStats = {
  house_id: string;
  house_name: string;
  games_played: number;
  wins: number;
  win_rate: number;
};

type RecentGame = {
  session_id: string;
  game_name: string;
  house_name: string;
  score: number;
  placement: number;
  is_winner: boolean;
  played_at: string;
};

export default function PlayerStatsScreen() {
  const { userId } = useLocalSearchParams();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [houseStats, setHouseStats] = useState<HouseStats[]>([]);
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKitTheme, setActiveKitTheme] = useState<{colors: string[], name: string, rarity: string} | null>(null);
  const [gamesDisplayLimit, setGamesDisplayLimit] = useState(10);
  const [allGames, setAllGames] = useState<RecentGame[]>([]);
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchPlayerStats();
    fetchActiveKitTheme();

    if (!userId) return;

    const subscription = supabase
      .channel(`player-stats-${userId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_scores',
          filter: `user_id=eq.${userId}`
        },
        () => {
          console.log('[PLAYER STATS] Score updated, refreshing stats...');
          fetchPlayerStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions'
        },
        () => {
          console.log('[PLAYER STATS] Game session updated, refreshing stats...');
          fetchPlayerStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profile_settings',
          filter: `user_id=eq.${userId}`
        },
        () => {
          console.log('[PLAYER STATS] Profile settings updated, refreshing...');
          fetchPlayerStats();
          fetchActiveKitTheme();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId]);

  // Update displayed games when limit changes
  useEffect(() => {
    setRecentGames(allGames.slice(0, gamesDisplayLimit));
  }, [gamesDisplayLimit, allGames]);

  const fetchActiveKitTheme = async () => {
    if (!userId) {
      console.log('[PLAYER STATS] No userId provided');
      return;
    }

    console.log('[PLAYER STATS] Fetching kit theme for user:', userId);

    const { data: profileSettings, error: settingsError } = await supabase
      .from('user_profile_settings')
      .select('equipped_house_kit_id')
      .eq('user_id', userId)
      .maybeSingle();

    console.log('[PLAYER STATS] Profile settings:', { profileSettings, settingsError });

    if (settingsError || !profileSettings?.equipped_house_kit_id) {
      console.log('[PLAYER STATS] No equipped kit found');
      setActiveKitTheme(null);
      return;
    }

    const { data: houseKit, error: kitError } = await supabase
      .from('house_kits')
      .select('name, color_scheme, rarity')
      .eq('id', profileSettings.equipped_house_kit_id)
      .maybeSingle();

    console.log('[PLAYER STATS] House kit data:', { houseKit, kitError });

    if (!kitError && houseKit) {
      let colors = Array.isArray(houseKit.color_scheme) && houseKit.color_scheme.length > 0
        ? houseKit.color_scheme
        : ['#111111', '#1A1A1A']; // fallback for image-based kits

      if (colors.length === 1) {
        colors = [colors[0], colors[0]];
      }

      console.log('[PLAYER STATS] Setting active kit theme:', { colors, name: houseKit.name, rarity: houseKit.rarity });

      setActiveKitTheme({
        colors,
        name: houseKit.name,
        rarity: houseKit.rarity || 'common'
      });
    } else {
      console.log('[PLAYER STATS] Failed to load kit or no color scheme');
      setActiveKitTheme(null);
    }
  };

  const fetchPlayerStats = async () => {
    if (!userId) return;

    try {
      console.log('[PLAYER STATS] Fetching stats for user:', userId);

      const { data: profileSettings } = await supabase
        .from('user_profile_settings')
        .select('is_private, profile_photo_url')
        .eq('user_id', userId)
        .maybeSingle();

      const isPrivate = profileSettings?.is_private === true;
      const isOwnProfile = user?.id === userId;

      if (isPrivate && !isOwnProfile) {
        setStats(null);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      const { data: scores, error: scoresError } = await supabase
        .from('session_scores')
        .select(`
          score,
          placement,
          is_winner,
          session_id,
          game_sessions!inner (
            house_id,
            status,
            started_at,
            game_id,
            is_solo_game,
            games (
              name
            ),
            houses (
              name
            )
          )
        `)
        .eq('user_id', userId)
        .eq('game_sessions.status', 'completed')
        .eq('game_sessions.is_solo_game', false);

      if (scoresError) {
        console.log('[PLAYER STATS] Query error:', scoresError);
      }

      if (!scores || scores.length === 0) {
        console.log('[PLAYER STATS] No scores returned for user:', userId);
        setStats({
          user_id: userId as string,
          username: profile?.username || 'Unknown',
          profile_photo_url: profileSettings?.profile_photo_url || profile?.avatar_url || null,
          total_games: 0,
          total_wins: 0,
          total_losses: 0,
          win_rate: 0,
          best_placement_count: 0,
          average_score: 0,
          total_score: 0,
          houses_played: 0,
        });
        setLoading(false);
        return;
      }

      // Sort scores by game session start time (client-side since PostgREST can't order by foreign columns)
      const sortedScores = scores.sort((a, b) => {
        const sessionA = Array.isArray(a.game_sessions) ? a.game_sessions[0] : a.game_sessions;
        const sessionB = Array.isArray(b.game_sessions) ? b.game_sessions[0] : b.game_sessions;
        const dateA = new Date(sessionA?.started_at || 0);
        const dateB = new Date(sessionB?.started_at || 0);
        return dateB.getTime() - dateA.getTime();
      });

      // Count unique game sessions, not score entries
      const uniqueSessions = new Set(sortedScores.map(s => s.session_id));
      const totalGames = uniqueSessions.size;

      // Count wins by checking unique sessions where user won
      const winningSessionIds = new Set(sortedScores.filter(s => s.is_winner).map(s => s.session_id));
      const totalWins = winningSessionIds.size;

      const totalLosses = totalGames - totalWins;
      const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
      const bestPlacementCount = sortedScores.filter(s => s.placement === 1).length;
      const totalScore = sortedScores.reduce((sum, s) => sum + (s.score || 0), 0);
      const averageScore = totalGames > 0 ? totalScore / totalGames : 0;

      const uniqueHouses = new Set(sortedScores.map(s => {
        const session = Array.isArray(s.game_sessions) ? s.game_sessions[0] : s.game_sessions;
        return session?.house_id;
      }).filter(Boolean));
      const housesPlayed = uniqueHouses.size;

      setStats({
        user_id: userId as string,
        username: profile?.username || 'Unknown',
        profile_photo_url: profileSettings?.profile_photo_url || profile?.avatar_url || null,
        total_games: totalGames,
        total_wins: totalWins,
        total_losses: totalLosses,
        win_rate: winRate,
        best_placement_count: bestPlacementCount,
        average_score: Math.round(averageScore),
        total_score: totalScore,
        houses_played: housesPlayed,
      });

      const houseStatsMap = new Map<string, any>();
      sortedScores.forEach(score => {
        const session = Array.isArray(score.game_sessions) ? score.game_sessions[0] : score.game_sessions;
        const house = Array.isArray(session?.houses) ? session.houses[0] : session?.houses;
        const houseId = session?.house_id;
        const houseName = house?.name;

        if (!houseStatsMap.has(houseId)) {
          houseStatsMap.set(houseId, {
            house_id: houseId,
            house_name: houseName,
            games_played: 0,
            wins: 0,
          });
        }

        const hStat = houseStatsMap.get(houseId);
        hStat.games_played += 1;
        if (score.is_winner) {
          hStat.wins += 1;
        }
      });

      const houseStatsArray = Array.from(houseStatsMap.values()).map(h => ({
        ...h,
        win_rate: (h.wins / h.games_played) * 100,
      }));
      houseStatsArray.sort((a, b) => b.games_played - a.games_played);
      setHouseStats(houseStatsArray);

      const allGamesData = sortedScores.map(s => {
        const session = Array.isArray(s.game_sessions) ? s.game_sessions[0] : s.game_sessions;
        const game = Array.isArray(session?.games) ? session.games[0] : session?.games;
        const house = Array.isArray(session?.houses) ? session.houses[0] : session?.houses;
        return {
          session_id: s.session_id,
          game_name: game?.name || 'Unknown Game',
          house_name: house?.name || 'Unknown House',
          score: s.score || 0,
          placement: s.placement || 1,  // Default to 1st place if null
          is_winner: s.is_winner,
          played_at: session?.started_at || '',
        };
      });
      setAllGames(allGamesData);
      setRecentGames(allGamesData.slice(0, gamesDisplayLimit));

      console.log('[PLAYER STATS] Stats loaded successfully');
    } catch (error) {
      console.log('[PLAYER STATS] Error fetching stats:', error);
    }

    setLoading(false);
  };

  const headerColors = activeKitTheme?.colors || ['#0F172A', '#1E293B'];
  const hasKitEffects = activeKitTheme && ['legendary', 'mythic'].includes(activeKitTheme.rarity);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={[styles.container, { backgroundColor: '#F1F5F9' }]}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <LinearGradient colors={headerColors as [string, string, ...string[]]} style={styles.container}>
          <View style={styles.privateHeader}>
            <Pressable style={[styles.backButton, { top: insets.top + 8 }]} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.privateHeaderTitle}>Player Stats</Text>
            <View style={{ width: 44 }} />
          </View>
          <View style={styles.centered}>
            <View style={styles.privateProfileContainer}>
              <View style={styles.lockIcon}>
                <Text style={styles.lockEmoji}>🔒</Text>
              </View>
              <Text style={styles.privateProfileTitle}>Private Profile</Text>
              <Text style={styles.privateProfileText}>
                This user has set their profile to private
              </Text>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

          {/* ── Header banner with kit ── */}
          <View style={styles.headerGradient}>
            <View style={styles.header}>
              {/* Image-based kit backgrounds */}
              {activeKitTheme?.name === 'Phantom Void' && (
                <Image source={require('@/assets/images/PhantomVoid.jpg')} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} resizeMode="cover" />
              )}
              {activeKitTheme?.name === 'Stellar' && (
                <Image source={require('@/assets/images/Stellar.jpg')} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} resizeMode="cover" />
              )}
              {activeKitTheme?.name === 'Neon Pulse' && (
                <Image source={require('@/assets/images/NeonPulse.jpg')} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} resizeMode="cover" />
              )}
              {activeKitTheme?.name === 'Obsidian Gold' && (
                <Image source={require('@/assets/images/ObsidianGold.jpg')} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} resizeMode="cover" />
              )}
              {activeKitTheme?.name === 'Prismatic' && (
                <Image source={require('@/assets/images/Prismatic.jpg')} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} resizeMode="cover" />
              )}
              {activeKitTheme?.name === 'Chaos Theory' && (
                <Image source={require('@/assets/images/ChaosTheory.jpeg')} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} resizeMode="cover" />
              )}
              {activeKitTheme?.name === 'Golden Bushido' && (
                <Image source={require('@/assets/images/GoldenBushido.jpeg')} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} resizeMode="cover" />
              )}
              {activeKitTheme?.name === 'Liquid Metal Candy' && (
                <Image source={require('@/assets/images/LiquidMetalProfile.jpeg')} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} resizeMode="cover" />
              )}
              {activeKitTheme?.name === 'Starlight Prowler' && (
                <Image source={require('@/assets/images/StarlightProwler.jpeg')} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} resizeMode="cover" />
              )}
              {/* Gradient/animated kits that don't have a static image */}
              {activeKitTheme && !['Phantom Void','Stellar','Neon Pulse','Obsidian Gold','Prismatic','Chaos Theory','Golden Bushido','Liquid Metal Candy','Starlight Prowler'].includes(activeKitTheme.name) && (
                hasKitEffects ? (
                  <BannerRenderer
                    colors={activeKitTheme.colors}
                    rarity={activeKitTheme.rarity as any}
                    kitName={activeKitTheme.name}
                    size="large"
                    style={StyleSheet.absoluteFill}
                    disableBorders={true}
                  />
                ) : (
                  <LinearGradient
                    colors={activeKitTheme.colors as [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )
              )}
              {/* No kit — default dark */}
              {!activeKitTheme && (
                <LinearGradient
                  colors={['#111111', '#1A1A1A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              {/* Dark overlay — lighter for image-based kits so image shows through */}
              <View style={[
                styles.headerOverlay,
                activeKitTheme && ['Phantom Void','Stellar','Neon Pulse','Obsidian Gold','Prismatic','Chaos Theory','Golden Bushido','Liquid Metal Candy','Starlight Prowler'].includes(activeKitTheme.name)
                  && { backgroundColor: 'rgba(0,0,0,0.15)' }
              ]} />
              {/* Bottom gradient for text readability on image kits */}
              {activeKitTheme && ['Phantom Void','Stellar','Neon Pulse','Obsidian Gold','Prismatic','Chaos Theory','Golden Bushido','Liquid Metal Candy','Starlight Prowler'].includes(activeKitTheme.name) && (
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.6)']}
                  locations={[0.5, 1]}
                  style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
                />
              )}

              <View style={styles.headerContentWrapper}>
                <Pressable style={[styles.backButton, { top: insets.top + 8 }]} onPress={() => router.back()}>
                  <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                </Pressable>

                {/* Avatar */}
                <View style={styles.avatarContainer}>
                  <KitBorder
                    rarity={activeKitTheme?.rarity || 'common'}
                    kitName={activeKitTheme?.name}
                    colors={activeKitTheme?.colors || ['#FFFFFF']}
                    borderRadius={56}
                    style={{ width: 112, height: 112 }}
                  >
                    <View style={styles.avatarInner}>
                      {stats.profile_photo_url ? (
                        <Image
                          source={{ uri: stats.profile_photo_url }}
                          style={styles.avatarImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.avatarText}>
                          {stats.username[0].toUpperCase()}
                        </Text>
                      )}
                    </View>
                  </KitBorder>
                </View>

                {/* Username */}
                <Text style={styles.username}>{stats.username}</Text>

                {/* Kit name badge — only if kit equipped */}
                {activeKitTheme && (
                  <View style={[
                    styles.kitNameBadge,
                    { borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(0,0,0,0.4)' }
                  ]}>
                    <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                    <Text style={styles.kitNameBadgeText}>{activeKitTheme.name}</Text>
                    <View style={[styles.rarityDot, { backgroundColor: getRarityColor(activeKitTheme.rarity) }]} />
                    <Text style={[styles.rarityLabel, { color: getRarityColor(activeKitTheme.rarity) }]}>
                      {activeKitTheme.rarity.charAt(0).toUpperCase() + activeKitTheme.rarity.slice(1)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* ── Kit showcase card (premium only) ── */}
          {activeKitTheme && ['rare','epic','legendary','mythic'].includes(activeKitTheme.rarity) && (
            <View style={styles.kitShowcaseWrap}>
              <KitBorder
                rarity={activeKitTheme.rarity}
                kitName={activeKitTheme.name}
                colors={activeKitTheme.colors}
                borderRadius={18}
              >
                <View style={styles.kitShowcase}>
                  {['Phantom Void','Stellar','Neon Pulse','Obsidian Gold','Prismatic','Chaos Theory','Golden Bushido','Liquid Metal Candy','Starlight Prowler'].includes(activeKitTheme.name) ? (
                    <Image
                      source={
                        activeKitTheme.name === 'Phantom Void' ? require('@/assets/images/PhantomVoid.jpg')
                        : activeKitTheme.name === 'Stellar' ? require('@/assets/images/Stellar.jpg')
                        : activeKitTheme.name === 'Neon Pulse' ? require('@/assets/images/NeonPulse.jpg')
                        : activeKitTheme.name === 'Obsidian Gold' ? require('@/assets/images/ObsidianGold.jpg')
                        : activeKitTheme.name === 'Prismatic' ? require('@/assets/images/Prismatic.jpg')
                        : activeKitTheme.name === 'Chaos Theory' ? require('@/assets/images/ChaosTheory.jpeg')
                        : activeKitTheme.name === 'Golden Bushido' ? require('@/assets/images/GoldenBushido.jpeg')
                        : activeKitTheme.name === 'Liquid Metal Candy' ? require('@/assets/images/LiquidMetalProfile.jpeg')
                        : require('@/assets/images/StarlightProwler.jpeg')
                      }
                      style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
                      resizeMode="cover"
                    />
                  ) : (
                    <BannerRenderer
                      colors={activeKitTheme.colors}
                      rarity={activeKitTheme.rarity as any}
                      kitName={activeKitTheme.name}
                      size="large"
                      style={StyleSheet.absoluteFill as any}
                    />
                  )}
                  <View style={styles.kitShowcaseOverlay} />
                  <View style={styles.kitShowcaseContent}>
                    <View style={styles.kitShowcaseLeft}>
                      <Text style={styles.kitShowcaseLabel}>Active Kit</Text>
                      <Text style={styles.kitShowcaseName}>{activeKitTheme.name}</Text>
                    </View>
                    <View style={[styles.kitRarityPill, { backgroundColor: getRarityColor(activeKitTheme.rarity) + '33', borderColor: getRarityColor(activeKitTheme.rarity) }]}>
                      <Ionicons name="sparkles" size={12} color={getRarityColor(activeKitTheme.rarity)} />
                      <Text style={[styles.kitRarityText, { color: getRarityColor(activeKitTheme.rarity) }]}>
                        {activeKitTheme.rarity.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              </KitBorder>
            </View>
          )}

          {/* ── Stat cards ── */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="game-controller" size={24} color="#FFFFFF" />
              <Text style={styles.statValue}>{stats.total_games}</Text>
              <Text style={styles.statLabel}>Games</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="trophy" size={24} color="#FFFFFF" />
              <Text style={styles.statValue}>{stats.total_wins}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="trending-up" size={24} color="#FFFFFF" />
              <Text style={styles.statValue}>{stats.win_rate.toFixed(0)}%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
          </View>

          {/* ── House performance ── */}
          {houseStats.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Performance by House</Text>
              {houseStats.map((houseStat) => (
                <View key={houseStat.house_id} style={styles.houseStatCard}>
                  <View style={styles.houseStatHeader}>
                    <Ionicons name="home" size={16} color="rgba(255,255,255,0.5)" />
                    <Text style={styles.houseStatName}>{houseStat.house_name}</Text>
                  </View>
                  <Text style={styles.houseStatText}>
                    {houseStat.games_played} games · {houseStat.wins} wins · {houseStat.win_rate.toFixed(0)}% win rate
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Recent games ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Games</Text>
            {recentGames.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="game-controller-outline" size={40} color="rgba(255,255,255,0.25)" />
                <Text style={styles.emptyStateTitle}>No games yet</Text>
                <Text style={styles.emptyStateText}>Games will appear here once played</Text>
              </View>
            ) : (
              <>
                {recentGames.map((game, index) => (
                  <View
                    key={`${game.session_id}-${index}`}
                    style={[styles.gameCard, game.is_winner && styles.gameCardWinner]}
                  >
                    <View style={styles.gameCardHeader}>
                      <Text style={styles.gameName}>{game.game_name}</Text>
                      {game.is_winner && (
                        <View style={styles.winnerBadge}>
                          <Ionicons name="trophy" size={11} color="#000000" />
                          <Text style={styles.winnerText}>Winner</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.gameHouse}>{game.house_name}</Text>
                    <View style={styles.gameStats}>
                      <Text style={styles.gameStatText}>Score: {game.score}</Text>
                      <Text style={styles.gameStatText}>{getOrdinalSuffix(game.placement)} place</Text>
                    </View>
                    <Text style={styles.gameDate}>{formatRelativeDate(game.played_at)}</Text>
                  </View>
                ))}
                {allGames.length > recentGames.length && (
                  <Pressable
                    style={styles.loadMoreButton}
                    onPress={() => setGamesDisplayLimit(prev => prev + 10)}
                  >
                    <Text style={styles.loadMoreText}>Load More</Text>
                    <Text style={styles.loadMoreSubtext}>{recentGames.length} of {allGames.length}</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollView: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: 'rgba(255,255,255,0.4)' },

  // Header
  headerGradient: {
    position: 'relative',
    marginTop: -1, // flush with top
  },
  header: {
    alignItems: 'center',
    position: 'relative',
    minHeight: 320,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  headerContentWrapper: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10,
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 56 : 52,
    paddingBottom: 40,  // more space below kit badge
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 8,
    left: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 112, height: 112, borderRadius: 56,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 112, height: 112, borderRadius: 56 },
  avatarText: {
    fontSize: 44, fontWeight: '800', color: '#FFFFFF',
    width: 112, height: 112, lineHeight: 112, textAlign: 'center',
  },
  username: {
    fontSize: 26, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: -0.5, marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  kitNameBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  kitNameBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  rarityDot: { width: 6, height: 6, borderRadius: 3 },
  rarityLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  // Kit showcase
  kitShowcaseWrap: { marginHorizontal: 16, marginTop: 16, marginBottom: 4 },
  kitShowcase: {
    height: 80, borderRadius: 16, overflow: 'hidden',
    justifyContent: 'center',
  },
  kitShowcaseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  kitShowcaseContent: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, zIndex: 2,
  },
  kitShowcaseLeft: { gap: 2 },
  kitShowcaseLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1 },
  kitShowcaseName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  kitRarityPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1,
  },
  kitRarityText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  // Stat cards
  statsContainer: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 10,
  },
  statCard: {
    flex: 1, backgroundColor: '#111111',
    borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  statCardOverlay: { padding: 16, alignItems: 'center', gap: 4 },
  statIconContainer: {},
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: '600' },

  // Sections
  section: { paddingHorizontal: 16, paddingTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 12, letterSpacing: -0.3 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 24 },

  // House stats
  houseStatCard: {
    backgroundColor: '#111111', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  houseStatHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  houseStatName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  houseStatDetails: { marginLeft: 24 },
  houseStatText: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },

  // Game cards
  gameCard: {
    backgroundColor: '#111111', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  gameCardWinner: {
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: '#1A1A1A',
  },
  gameCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  gameName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  winnerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  winnerText: { fontSize: 10, fontWeight: '800', color: '#000000' },
  gameHouse: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 6 },
  gameStats: { flexDirection: 'row', gap: 14 },
  gameStatText: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  gameDate: { fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 6 },

  // Load more
  loadMoreButton: {
    backgroundColor: '#111111', borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    marginTop: 4,
  },
  loadMoreText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  loadMoreSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 },

  // Empty states
  emptyStateContainer: {
    alignItems: 'center', padding: 32,
    backgroundColor: '#111111', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  emptyStateEmoji: { fontSize: 40, marginBottom: 12 },
  emptyStateTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  emptyStateText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },

  // Private profile
  privateHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 16,
    paddingBottom: 16,
  },
  privateHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  privateProfileContainer: {
    alignItems: 'center', padding: 40,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20,
    margin: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  lockIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  lockEmoji: { fontSize: 40 },
  privateProfileTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  privateProfileText: { fontSize: 15, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },

  // Compat (unused but kept to avoid missing style errors)
  usernameContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  avatarBorder: { position: 'absolute', width: 120, height: 120, borderRadius: 60, zIndex: 1, overflow: 'hidden' },
  equippedKitBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: '#10B981' },
  equippedKitText: { fontSize: 12, fontWeight: '600', color: '#10B981' },
});
