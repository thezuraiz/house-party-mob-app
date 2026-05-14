import BannerUnlockModal from '@/components/BannerUnlockModal';
import HouseCard from '@/components/HouseCard';
import PremiumPurchaseModal from '@/components/PremiumPurchaseModal';
import Toast from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useBannerUnlock } from '@/contexts/BannerUnlockContext';
import { useCoachMarkContext } from '@/contexts/CoachMarkContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useCoachMarkTarget } from '@/hooks/useCoachMarkTarget';
import { safeArrayFromColors } from '@/lib/colorUtils';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SW } = Dimensions.get('window');

type House = {
  id: string; name: string; banner_id: string | null; member_count: number; role: string;
  nickname?: string | null; creator_nickname?: string | null; premium_tier?: string | null;
  house_emoji?: string | null; custom_theme_colors?: string[] | null; kit_rarity?: string | null;
  kit_name?: string | null; image_url?: string | null; isInvitedHouse?: boolean;
};

// Separate component to avoid hooks-in-render-function error
function HouseCardAnimated({ item, index, pendingInvitations, onPress }: {
  item: House;
  index: number;
  pendingInvitations: Map<string, number>;
  onPress: () => void;
}) {
  const pendingCount = pendingInvitations.get(item.id) || 0;
  const isInvitedHouse = item.isInvitedHouse || item.role === 'invited';
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1, useNativeDriver: true, speed: 16, bounciness: 10,
      delay: index * 90,
    } as any).start();
  }, []);

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }]
    }}>
      <HouseCard
        house={{
          ...item,
          house_emoji: item.house_emoji ?? undefined,
          creator_nickname: item.creator_nickname ?? undefined,
          custom_theme_colors: item.custom_theme_colors ?? undefined,
          kit_rarity: item.kit_rarity ?? undefined,
          kit_name: item.kit_name ?? undefined,
          image_url: item.image_url ?? undefined,
        }}
        hasPendingInvites={pendingCount > 0 || isInvitedHouse}
        isInvitedHouse={isInvitedHouse}
        pendingCount={pendingCount}
        onPress={onPress}
      />
    </Animated.View>
  );
}

export default function HousesScreen() {
  const [isNavigating, setIsNavigating] = useState(false);
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [unlockedBanner, setUnlockedBanner] = useState<{ id: string; name: string; rarity: 'legendary' | 'mythic'; colors: string[]; glowColor?: string } | null>(null);
  const [fetchDebounceTimer, setFetchDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const { user } = useAuth();
  const { profilePhotoUrl, displayName } = useProfile();
  const { isPremium } = usePremium();
  const { tryRandomUnlock } = useBannerUnlock();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { startFlow, userProgress } = useCoachMarkContext();
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });

  // entrance animations
  const heroAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(heroAnim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }),
      Animated.spring(actionsAnim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }),
    ]).start();
  }, []);

  const createHouseButton = useCoachMarkTarget('create_house_button');
  const joinHouseButton = useCoachMarkTarget('join_house_button');
  const scanQrButton = useCoachMarkTarget('scan_qr_button');

  const { data: houses = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['houses', user?.id],
    queryFn: async () => { if (!user) return []; return await fetchHousesData(user.id); },
    enabled: !!user, staleTime: 0, refetchOnMount: true, refetchOnWindowFocus: false,
  });

  const { data: pendingInvitations = new Map(), refetch: refetchInvitations } = useQuery({
    queryKey: ['pendingInvitations', user?.id],
    queryFn: async () => { if (!user) return new Map(); return await fetchPendingInvitationsData(user.id); },
    enabled: !!user, staleTime: 30000,
  });

  const { data: pendingFriendRequests = 0 } = useQuery({
    queryKey: ['pendingFriendRequestsCount', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase.from('friend_requests').select('id', { count: 'exact', head: true }).eq('recipient_id', user.id).eq('status', 'pending');
      return count || 0;
    },
    enabled: !!user, staleTime: 30000,
  });

  const ownedHouseCount = houses.filter((h: House) => h.role === 'admin').length;
  const totalInvites = Array.from(pendingInvitations.values()).reduce((s, n) => s + n, 0);

  useFocusEffect(useCallback(() => {
    refetchInvitations();
    if (!isNavigating) {
      checkRandomUnlock();
      if (houses.length === 0 && !loading && user && userProgress && !userProgress.isOnboardingComplete) {
        const hasSeenFlow = userProgress.skippedFlows.includes('first_house_creation');
        const hasCompletedStep = userProgress.completedSteps.includes('create_house_button');
        if (!hasSeenFlow && !hasCompletedStep) setTimeout(() => startFlow('first_house_creation'), 1000);
      }
    } else { setIsNavigating(false); }
  }, [user, isNavigating, refetchInvitations, houses, loading, userProgress, startFlow]));

  useEffect(() => {
    if (!user) return;
    // Unique topic per mount: removeChannel() is async — remount can reuse a topic still subscribed.
    const topicId =
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const debouncedFetch = () => {
      if (fetchDebounceTimer) clearTimeout(fetchDebounceTimer);
      const timer = setTimeout(() => queryClient.invalidateQueries({ queryKey: ['houses', user?.id] }), 500);
      setFetchDebounceTimer(timer);
    };
    const subscription = supabase
      .channel(`house-changes-${user.id}-${topicId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'houses' }, () => debouncedFetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'house_members', filter: `user_id=eq.${user.id}` }, () => debouncedFetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'house_customizations' }, () => {
        // Full refetch so kit_rarity, custom_theme_colors, kit_name all update correctly
        debouncedFetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_invitations', filter: `invitee_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['pendingInvitations', user?.id] });
        debouncedFetch();
      })
      .subscribe();
    return () => {
      if (fetchDebounceTimer) clearTimeout(fetchDebounceTimer);
      void supabase.removeChannel(subscription);
    };
  }, [user]);

  const checkRandomUnlock = async () => {
    if (!user) return;
    try {
      const result = await tryRandomUnlock();
      if (result.unlocked && result.bannerId && result.rarity && result.bannerName) {
        const { data: bannerData } = await supabase.from('kit_items').select('item_data').eq('id', result.bannerId).maybeSingle();
        if (bannerData) {
          setUnlockedBanner({ id: result.bannerId, name: result.bannerName, rarity: result.rarity as 'legendary' | 'mythic', colors: bannerData.item_data?.design_spec?.colors || ['#5C4468'], glowColor: bannerData.item_data?.design_spec?.glow_color });
          setUnlockModalVisible(true);
        }
      }
    } catch { }
  };

  const fetchPendingInvitationsData = async (userId: string): Promise<Map<string, number>> => {
    try {
      const { data: invitations, error } = await supabase
        .from('game_invitations')
        .select('id, game_session_id, status, game_sessions!inner(id, house_id, game_id, games(name, game_emoji))')
        .eq('invitee_id', userId).eq('status', 'pending');
      if (error) return new Map();
      const map = new Map<string, number>();
      invitations?.forEach((inv: any) => { const houseId = inv.game_sessions?.house_id; if (houseId) map.set(houseId, (map.get(houseId) || 0) + 1); });
      return map;
    } catch { return new Map(); }
  };

  const fetchHousesData = async (userId: string): Promise<House[]> => {
    try {
      const { data, error } = await supabase.from('house_members').select('house_id, role, nickname, houses(id, name, banner_id, house_emoji, creator_id, image_url)').eq('user_id', userId);
      if (error || !data) return [];
      const validData = data.filter((item: any) => item.houses && item.houses.id);
      const houseIds = validData.map((item: any) => item.houses.id);
      const creatorIds = validData.map((item: any) => item.houses.creator_id).filter(Boolean);
      const [memberCounts, premiumStatuses, creatorMembers, customizations] = await Promise.all([
        supabase.from('house_members').select('house_id').in('house_id', houseIds),
        supabase.from('house_premium_status').select('house_id, highest_kit_tier').in('house_id', houseIds),
        creatorIds.length > 0 ? supabase.from('house_members').select('house_id, user_id, nickname').in('house_id', houseIds).in('user_id', creatorIds) : { data: [] },
        supabase.from('house_customizations').select('house_id, theme_data, equipped_house_kit_id, applied_kit_id, kit_rarity, kit_color_scheme, custom_banner_colors, rarity').in('house_id', houseIds),
      ]);
      const memberCountMap = memberCounts.data?.reduce((acc: any, m: any) => { acc[m.house_id] = (acc[m.house_id] || 0) + 1; return acc; }, {}) || {};
      const premiumMap = premiumStatuses.data?.reduce((acc: any, s: any) => { acc[s.house_id] = s.highest_kit_tier; return acc; }, {}) || {};
      const creatorNicknameMap = creatorMembers.data?.reduce((acc: any, m: any) => { acc[m.user_id] = m.nickname; return acc; }, {}) || {};
      const creatorMap: Record<string, string> = {};
      validData.forEach((item: any) => { if (item.houses?.creator_id) creatorMap[item.houses.id] = creatorNicknameMap[item.houses.creator_id]; });
      const appliedKitIds = customizations.data?.filter((c: any) => c.applied_kit_id).map((c: any) => c.applied_kit_id) || [];
      let kitNamesMap: Record<string, string> = {};
      if (appliedKitIds.length > 0) {
        const { data: kitsData } = await supabase.from('house_kits').select('id, name').in('id', appliedKitIds);
        kitNamesMap = (kitsData || []).reduce((acc: any, kit: any) => { acc[kit.id] = kit.name; return acc; }, {});
      }
      const customizationMap = customizations.data?.reduce((acc: any, custom: any) => {
        if (custom.applied_kit_id) { const c = safeArrayFromColors(custom.custom_banner_colors); if (c?.length) { acc[custom.house_id] = { colors: c, rarity: custom.rarity || 'common', kitName: kitNamesMap[custom.applied_kit_id] || null }; return acc; } }
        // Custom colors without a kit (applied_kit_id = null but custom_banner_colors set)
        if (!custom.applied_kit_id && custom.custom_banner_colors) { const c = safeArrayFromColors(custom.custom_banner_colors); if (c?.length) { acc[custom.house_id] = { colors: c, rarity: custom.rarity || 'common', kitName: null }; return acc; } }
        if (custom.equipped_house_kit_id) { const c = safeArrayFromColors(custom.kit_color_scheme); if (c?.length) { acc[custom.house_id] = { colors: c, rarity: custom.kit_rarity || 'common', kitName: null }; return acc; } }
        const bg = safeArrayFromColors(custom.theme_data?.colors?.background);
        if (bg?.length) acc[custom.house_id] = { colors: bg, rarity: null, kitName: null };
        return acc;
      }, {}) || {};
      const housesWithCounts = validData.map((item: any) => {
        const c = customizationMap[item.houses.id];
        return { id: item.houses.id, name: item.houses.name, banner_id: item.houses.banner_id, member_count: memberCountMap[item.houses.id] || 0, role: item.role, nickname: item.nickname, creator_nickname: creatorMap[item.houses.id], premium_tier: premiumMap[item.houses.id], house_emoji: item.houses.house_emoji, custom_theme_colors: c?.colors || null, kit_rarity: c?.rarity || null, kit_name: c?.kitName || null, image_url: item.houses.image_url };
      });
      const { data: invitedHouses } = await supabase.from('game_invitations').select('house_id, houses!game_invitations_house_id_fkey(id, name, house_emoji, banner_id, creator_id, image_url)').eq('invitee_id', userId).eq('status', 'pending');
      const existingIds = new Set(housesWithCounts.map((h: House) => h.id));
      const newInvited = invitedHouses?.filter((inv: any) => inv.houses && !existingIds.has(inv.house_id)).reduce((acc: any[], inv: any) => {
        if (!acc.find((h: any) => h.id === inv.house_id)) acc.push({ id: inv.houses.id, name: inv.houses.name, house_emoji: inv.houses.house_emoji, banner_id: inv.houses.banner_id, member_count: 0, role: 'invited', isInvitedHouse: true, nickname: null, creator_nickname: null, premium_tier: null, custom_theme_colors: null, kit_rarity: null, kit_name: null, image_url: inv.houses.image_url });
        return acc;
      }, []) || [];
      return [...housesWithCounts, ...newInvited];
    } catch { return []; }
  };

  const onRefresh = async () => {
    await Promise.all([refetch(), refetchInvitations()]);

    queryClient.refetchQueries();
  };
  const handleCreateHousePress = () => {
    // Free users can only create 1 house
    if (!isPremium) {
      const adminHouses = houses.filter(h => h.role === 'admin');
      if (adminHouses.length >= 1) {
        setShowPremiumModal(true);
        return;
      }
    }
    setIsNavigating(true); setTimeout(() => router.push('/create-house'), 10);
  };

  const renderHouse = ({ item, index }: { item: House; index: number }) => (
    <HouseCardAnimated
      item={item}
      index={index}
      pendingInvitations={pendingInvitations}
      onPress={() => { setIsNavigating(true); setTimeout(() => router.push(`/house/${item.id}`), 10); }}
    />
  );

  const username = displayName || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Player';
  const initial = username.charAt(0).toUpperCase();
  const hasNoHouses = !loading && houses.length === 0;

  // Bounce animation for New House button when no houses
  const bounceAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (hasNoHouses) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0.96, duration: 600, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.delay(1000),
        ])
      ).start();
    } else {
      bounceAnim.stopAnimation();
      bounceAnim.setValue(1);
    }
  }, [hasNoHouses]);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#FFFFFF" colors={['#FFFFFF']} />}
      >
        {/* ── Top row ── */}
        <View style={s.topRow}>
          <Pressable style={s.avatarCircle} onPress={() => router.push('/(tabs)/profile')}>
            {profilePhotoUrl ? (
              <Image source={{ uri: profilePhotoUrl }} style={{ width: 46, height: 46, borderRadius: 23 }} resizeMode="cover" />
            ) : (
              <Text style={s.avatarText}>{initial}</Text>
            )}
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable style={s.refreshBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* ── Greeting ── */}
        <View style={s.greetBlock}>
          <Text style={s.greetName}>Hey, {username}</Text>
          <Text style={s.greetSub}>Welcome to your houses</Text>
        </View>

        <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={() => setToast({ ...toast, visible: false })} />

        {/* ── Action pills ── */}
        <View style={s.actionRow}>
          <Pressable
            ref={scanQrButton.ref}
            onLayout={scanQrButton.onLayout}
            style={s.actionPill}
            onPress={() => {
              // Free users can only create 1 house
              if (!isPremium) {
                const adminHouses = houses.filter(h => h.role === 'admin');
                if (adminHouses.length >= 1) {
                  // setShowPremiumModal(true);
                  setToast({ visible: true, message: 'Upgrade to Premium to create more houses and unlock exclusive features!', type: 'error' });

                  return;
                }
              }
              setIsNavigating(true); setTimeout(() => router.push('/scan-qr'), 10);
            }}
          >
            <Ionicons name="qr-code-outline" size={14} color="#FFFFFF" />
            <Text style={s.actionPillText}>Scan QR</Text>
          </Pressable>
          <Pressable
            ref={joinHouseButton.ref}
            onLayout={joinHouseButton.onLayout}
            style={s.actionPill}
            onPress={() => {

              if (!isPremium) {
                const adminHouses = houses.filter(h => h.role === 'admin');
                if (adminHouses.length >= 1) {
                  // setShowPremiumModal(true);
                  setToast({ visible: true, message: 'Upgrade to Premium to create more houses and unlock exclusive features!', type: 'error' });

                  return;
                }
              }

              setIsNavigating(true); setTimeout(() => router.push('/join-house'), 10);
            }}
          >
            <Ionicons name="enter-outline" size={14} color="#FFFFFF" />
            <Text style={s.actionPillText}>Join</Text>
          </Pressable>
          <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
            <Pressable
              ref={createHouseButton.ref}
              onLayout={createHouseButton.onLayout}
              style={[s.actionPillWhite, hasNoHouses && { backgroundColor: '#EF4444' }]}
              onPress={handleCreateHousePress}
            >
              <Ionicons name="add" size={14} color={hasNoHouses ? '#FFFFFF' : '#000000'} />
              <Text style={[s.actionPillWhiteText, hasNoHouses && { color: '#FFFFFF' }]}>New House</Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* ── Pending notifications banner ── */}
        {(totalInvites > 0 || pendingFriendRequests > 0) && (
          <Pressable
            style={s.notifBanner}
            onPress={() => router.push('/(tabs)/friends')}
          >
            <View style={s.notifIconBox}>
              <Ionicons name="notifications" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.notifTitle}>
                {totalInvites > 0 && pendingFriendRequests > 0
                  ? `${totalInvites} game invite${totalInvites > 1 ? 's' : ''} · ${pendingFriendRequests} friend request${pendingFriendRequests > 1 ? 's' : ''}`
                  : totalInvites > 0
                    ? `${totalInvites} pending game invite${totalInvites > 1 ? 's' : ''}`
                    : `${pendingFriendRequests} friend request${pendingFriendRequests > 1 ? 's' : ''}`
                }
              </Text>
              <Text style={s.notifSub}>Tap to view</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
          </Pressable>
        )}

        {/* ── Stats grid ── */}
        {houses.length > 0 && (
          <View style={s.statsWrap}>
            <View style={s.statsGrid}>
              <View style={[s.statCard, s.statCardWhite]}>
                <Text style={[s.statCardLabel, { color: '#000000' }]}>Houses</Text>
                <Text style={[s.statCardNum, { color: '#000000' }]}>{houses.length}</Text>
              </View>
              <View style={[s.statCard, s.statCardDark]}>
                <Text style={s.statCardLabel}>Members</Text>
                <Text style={s.statCardNum}>{houses.reduce((sum, h: House) => sum + (h.member_count || 0), 0)}</Text>
              </View>
              <View style={[s.statCard, s.statCardDark]}>
                <Text style={s.statCardLabel}>Invites</Text>
                <Text style={s.statCardNum}>{totalInvites}</Text>
              </View>
              <View style={[s.statCard, s.statCardOutline]}>
                <Text style={s.statCardLabel}>Admin</Text>
                <Text style={s.statCardNum}>{houses.filter((h: House) => h.role === 'admin').length}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Section title ── */}
        {houses.length > 0 && (
          <Text style={s.sectionTitle}>My Houses</Text>
        )}

        {/* ── Content ── */}
        {loading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        ) : houses.length === 0 ? (
          <View style={s.emptyWrap}>
            <View style={s.emptyIconBox}>
              <Ionicons name="home-outline" size={40} color="rgba(255,255,255,0.5)" />
            </View>
            <Text style={s.emptyTitle}>No Houses Yet</Text>
            <Text style={s.emptySub}>Create or join a house to start tracking scores.</Text>
            <Pressable style={s.emptyBtn} onPress={handleCreateHousePress}>
              <Text style={s.emptyBtnText}>+ New House</Text>
            </Pressable>
            <Pressable style={s.emptyBtnOutline} onPress={() => { setIsNavigating(true); setTimeout(() => router.push('/join-house'), 10); }}>
              <Text style={s.emptyBtnOutlineText}>Join a House</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.houseList}>
            {houses.map((item: House, index: number) => (
              <View key={item.id} style={s.houseCardWrapper}>
                <HouseCardAnimated
                  item={item}
                  index={index}
                  pendingInvitations={pendingInvitations}
                  onPress={() => { setIsNavigating(true); setTimeout(() => router.push(`/house/${item.id}`), 10); }}
                />
              </View>
            ))}
            {/* ── Create House card in grid ── */}
            <Pressable style={s.houseCardWrapper} onPress={handleCreateHousePress}>
              <View style={s.createHouseCard}>
                <View style={s.createHouseIconBox}>
                  <Ionicons name="add" size={28} color="#FFFFFF" />
                </View>
                <Text style={s.createHouseTitle}>Create House</Text>
                <Text style={s.createHouseSub}>Build something great</Text>
              </View>
            </Pressable>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {unlockedBanner && (
        <BannerUnlockModal
          visible={unlockModalVisible}
          bannerId={unlockedBanner.id}
          bannerName={unlockedBanner.name}
          rarity={unlockedBanner.rarity}
          colors={unlockedBanner.colors}
          glowColor={unlockedBanner.glowColor}
          onClose={() => { setUnlockModalVisible(false); setUnlockedBanner(null); }}
        />
      )}
      <PremiumPurchaseModal visible={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },

  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#000000' },
  refreshBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#1A1A1A',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },

  greetBlock: { marginBottom: 24 },
  greetName: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  greetSub: { fontSize: 15, color: 'rgba(255,255,255,0.5)', marginTop: 4 },

  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  actionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#1A1A1A', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  actionPillText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  actionPillWhite: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFFFFF', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 9,
    flex: 1,
    justifyContent: 'center',
  },
  actionPillWhiteText: { fontSize: 13, fontWeight: '700', color: '#000000' },

  /* notification banner */
  notifBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(74,123,247,0.12)', borderWidth: 1, borderColor: 'rgba(74,123,247,0.3)',
    borderRadius: 16, padding: 14, marginVertical: 16,
  },
  notifIconBox: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#4A7BF7',
    justifyContent: 'center', alignItems: 'center',
  },
  notifTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  notifSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  /* stats */
  statsWrap: {
    backgroundColor: '#111111', borderRadius: 20, padding: 12,
    marginBottom: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '48%',
    borderRadius: 20, paddingHorizontal: 18, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 64,
  },
  statCardWhite: { backgroundColor: '#FFFFFF' },
  statCardDark: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statCardOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  statCardLabel: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  statCardNum: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },

  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 16, letterSpacing: -0.3 },

  centered: { paddingVertical: 60, alignItems: 'center' },
  houseList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  houseCardWrapper: { width: (SW - 52) / 2 },

  // Create House card in grid — exact same size as house cards
  createHouseCard: {
    height: 160,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed',
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  createHouseIconBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  createHouseTitle: {
    fontSize: 14, fontWeight: '700', color: '#FFFFFF',
  },
  createHouseSub: {
    fontSize: 11, color: 'rgba(255,255,255,0.35)',
  },

  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  emptySub: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  emptyBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 22,
    paddingVertical: 14, paddingHorizontal: 32, marginTop: 8,
  },
  emptyBtnText: { color: '#000000', fontSize: 15, fontWeight: '700' },
  emptyBtnOutline: {
    backgroundColor: 'transparent', borderRadius: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 13, paddingHorizontal: 32,
  },
  emptyBtnOutlineText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },

  // compat styles
  hero: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, backgroundColor: '#000000' },
  heroBubble1: { display: 'none' as any },
  heroBubble2: { display: 'none' as any },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  heroLeft: { gap: 3 },
  heroGreeting: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  heroName: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 },
  premiumPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#1A1A1A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginTop: 4 },
  premiumPillText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  heroAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  heroAvatarText: { fontSize: 18, fontWeight: '800', color: '#000000' },
  heroDot: { position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: '#4A7BF7', borderWidth: 2, borderColor: '#000000' },
  heroStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111111', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  heroStat: { flex: 1, alignItems: 'center', gap: 2 },
  heroStatNum: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  heroStatDiv: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.08)' },
  actionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#000000' },
  actionBarTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  actionBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  createBtn: { borderRadius: 14, overflow: 'hidden' },
  createBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF', borderRadius: 14 },
  createBtnText: { color: '#000000', fontSize: 14, fontWeight: '700' },
  emptyWrap2: { flexGrow: 1, paddingBottom: 120 },
  emptyCenter: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 28 },
  emptyIconWrap: { width: 100, height: 100, borderRadius: 30, overflow: 'hidden', marginBottom: 20 },
  emptyIconGrad: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A1A' },
  featureRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 28 },
  featureCard: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center', gap: 8 },
  featureIconBox: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  featureTitle: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  featureDesc: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 15 },
  emptyCtas: { paddingHorizontal: 20, gap: 12, alignItems: 'center' },
  ctaPrimary: { width: '100%', borderRadius: 22, overflow: 'hidden' },
  ctaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 17, backgroundColor: '#FFFFFF' },
  ctaPrimaryText: { color: '#000000', fontSize: 16, fontWeight: '700' },
  orRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  orLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  orText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '500', marginHorizontal: 14 },
  ctaSecondary: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingVertical: 15, borderRadius: 22 },
  ctaSecondaryText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 110, gap: 12 },
  actionPillDark: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1A1A1A', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginLeft: 'auto' as any },
  actionPillDarkText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  statCardLight: { backgroundColor: '#FFFFFF' },
  statCardBlue: { backgroundColor: '#4A7BF7' },
  statCardPale: { backgroundColor: '#1E2A4A' },
});


