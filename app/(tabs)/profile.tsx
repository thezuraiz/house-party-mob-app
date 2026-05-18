import PremiumPurchaseModal from '@/components/PremiumPurchaseModal';
import ReferralProgress from '@/components/ReferralProgress';
import { formatScore, type ScoringType } from '@/constants/ScoringTypes';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'mythic': return '#EC4899';
    case 'Phantom Void': return 'rgba(0,206,209,0.85)';
    case 'Stellar': return '#A855F7';
    case 'rare': return '#3B82F6';
    case 'uncommon': return '#22C55E';
    case 'Obsidian Gold': return '#C9A227';
    case "Neon Pulse": return '#00FFFF';
    case "Starlight Prowler": return '#75D5E3';
    case "Golden Bushido": return '#C9A227';
    case "Liquid Metal Candy": return '#7B5EA7';
    default: return 'rgba(255,255,255,0.5)';
  }
}

function getGlassCardBorder(accentRgb: string) {
  return {
    borderWidth: 1,
    borderColor: accentRgb,
    shadowColor: accentRgb,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  } as const;
}

function getGlassAvatarRing(kitName?: string | null) {
  if (kitName === 'Obsidian Gold') {
    return {
      backgroundColor: 'rgba(0,0,0,0.42)',
      borderColor: 'rgba(255,215,0,0.55)',
    };
  }
  if (kitName === 'Phantom Void') {
    return { backgroundColor: 'rgba(0,0,0,0.42)', borderColor: 'rgba(0,206,209,0.55)' };
  }
  if (kitName === 'Neon Pulse') {
    return { backgroundColor: 'rgba(0,0,0,0.42)', borderColor: 'rgba(0,255,255,0.55)' };
  }
  if (kitName === 'Prismatic') {
    return { backgroundColor: 'rgba(0,0,0,0.42)', borderColor: 'rgba(157,0,255,0.55)' };
  }
  if (kitName === 'Stellar') {
    return { backgroundColor: 'rgba(0,0,0,0.42)', borderColor: 'rgba(192,192,192,0.55)' };
  }
  if (kitName === 'Starlight Prowler') {
    return { backgroundColor: 'rgba(0,0,0,0.42)', borderColor: 'rgba(117,213,227,0.55)' };
  }
  if (kitName === 'Golden Bushido') {
    return { backgroundColor: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.45)' };
  }
  if (kitName === 'Chaos Theory') {
    return { backgroundColor: 'rgba(0,0,0,0.2)', borderColor: 'rgba(0,0,0,0.35)' };
  }
  return {
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderColor: 'rgba(255,255,255,0.28)',
  };
}

function getGlassCameraBtn(kitName?: string | null) {
  if (kitName === 'Golden Bushido') {
    return {
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: 'rgba(255,255,255,1)',
      iconColor: '#1A1A1A',
    };
  }
  if (kitName === 'Starlight Prowler') {
    return { backgroundColor: 'rgba(255,255,255,0.9)', borderColor: 'rgba(255,255,255,0.95)', iconColor: '#1A1A1A' };
  }
  if (kitName === 'Chaos Theory') {
    return { backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(255,255,255,1)', iconColor: '#000000' };
  }
  if (kitName === 'Prismatic') {
    return { backgroundColor: PR_OVERLAY, borderColor: 'rgba(157,0,255,0.7)', iconColor: '#FFFFFF' };
  }
  if (kitName === 'Stellar') {
    return { backgroundColor: ST_OVERLAY, borderColor: 'rgba(255,255,255,0.35)', iconColor: '#FFFFFF' };
  }
  if (kitName === 'Phantom Void') {
    return { backgroundColor: PV_OVERLAY, borderColor: 'rgba(0,206,209,0.5)', iconColor: PV_CYAN };
  }
  if (kitName === 'Obsidian Gold') {
    return { backgroundColor: OG_OVERLAY, borderColor: 'rgba(255,215,0,0.55)', iconColor: OG_GOLD };
  }
  if (kitName === 'Neon Pulse') {
    return { backgroundColor: NP_OVERLAY, borderColor: 'rgba(0,255,255,0.55)', iconColor: NP_CYAN };
  }
  return {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderColor: 'rgba(255,255,255,0.35)',
    iconColor: '#FFFFFF',
  };
}

const SP_CYAN = '#75D5E3';
const SP_PURPLE = '#A855F7';
const GB_GOLD = '#C9A227';
const CT_LIME = '#AAFF00';
const PR_VIOLET = '#9D00FF';
/** Semi-transparent overlay — background image dikhe, text readable rahe */
const PR_OVERLAY = 'rgba(0,0,0,0.42)';
const PR_OVERLAY_LIGHT = 'rgba(0,0,0,0.32)';
const PR_TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.9)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
} as const;

function getPrismaticSurface() {
  return {
    backgroundColor: PR_OVERLAY,
    borderColor: 'rgba(157,0,255,0.55)',
    borderWidth: 1,
  } as const;
}

const ST_SILVER = '#C0C0C0';
const ST_OVERLAY = 'rgba(0,0,0,0.75)';
const ST_OVERLAY_PILL = 'rgba(0,0,0,0.22)';
const ST_TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.9)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 5,
} as const;

function getStellarSurface() {
  return {
    backgroundColor: ST_OVERLAY,
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
  } as const;
}

const PV_CYAN = '#00CED1';
const PV_OVERLAY = 'rgba(0,0,0,0.75)';
const PV_OVERLAY_PILL = 'rgba(0,0,0,0.22)';
const PV_TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.9)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 5,
} as const;

function getPhantomVoidSurface() {
  return {
    backgroundColor: PV_OVERLAY,
    borderColor: 'rgba(0,206,209,0.35)',
    borderWidth: 1,
  } as const;
}

const OG_GOLD = '#FFD700';
const OG_OVERLAY = 'rgba(0,0,0,0.75)';
const OG_OVERLAY_PILL = 'rgba(0,0,0,0.22)';
const OG_TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.9)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 5,
} as const;

function getObsidianGoldSurface() {
  return {
    backgroundColor: OG_OVERLAY,
    borderColor: 'rgba(255,215,0,0.4)',
    borderWidth: 1,
  } as const;
}

const NP_CYAN = '#00FFFF';
const NP_OVERLAY = 'rgba(0,0,0,0.75)';
const NP_OVERLAY_PILL = 'rgba(0,0,0,0.22)';
const NP_TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.9)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 5,
} as const;


type UserStats = {
  totalGames: number;
  totalWins: number;
  winRate: number;
  housesCount: number;
};

type GameHistory = {
  id: string;
  gameName: string;
  gameEmoji: string;
  houseName: string;
  score: number;
  scoringType: ScoringType;
  accuracyHits?: number;
  accuracyAttempts?: number;
  ratioNumerator?: number;
  ratioDenominator?: number;
  isWinner: boolean;
  playedAt: string;
  playerCount: number;
};

type LeaderboardEntry = {
  id: string;
  username: string;
  profilePhotoUrl: string | null;
  wins: number;
  gamesPlayed: number;
  winRate: number;
};

function IroncladOrb({ size, color, opacity, top, left, right, bottom, duration }: {
  size: number; color: string; opacity: number;
  top?: any; left?: any; right?: any; bottom?: any; duration: number;
}) {
  const anim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const op = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [opacity * 0.6, opacity, opacity * 0.6] });
  return (
    <Animated.View style={{
      position: 'absolute', width: size, height: size, borderRadius: size / 2,
      backgroundColor: color,
      opacity: op,
      transform: [{ scale }],
      top, left, right, bottom,
      shadowColor: color, shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8, shadowRadius: size / 3,
    }} />
  );
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<UserStats>({ totalGames: 0, totalWins: 0, winRate: 0, housesCount: 0 });
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [activeKit, setActiveKit] = useState<{ colors: string[]; name: string; rarity: string } | null>(null);
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'info' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
  }>({ visible: false, type: 'success', title: '', message: '' });

  const showAlert = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setCustomAlert({ visible: true, type, title, message });
  };
  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmText = 'Confirm') => {
    setCustomAlert({ visible: true, type: 'confirm', title, message, onConfirm, confirmText });
  };

  const { user, signOut } = useAuth();
  const { profilePhotoUrl, displayName: profileDisplayName, updateProfilePhoto, refreshProfile } = useProfile();
  const { isPremium, loading: premiumLoading, checkPremiumStatus } = usePremium();
  const router = useRouter();

  useEffect(() => { fetchProfile(); }, []);

  useFocusEffect(useCallback(() => {
    if (!user) return;
    fetchProfile();
    refreshProfile();
    checkPremiumStatus();
    fetchActiveKit();
    const ch = supabase
      .channel(`profile-${user.id}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'session_scores', filter: `user_id=eq.${user.id}` }, () => fetchProfile())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profile_settings', filter: `user_id=eq.${user.id}` }, () => fetchActiveKit())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, checkPremiumStatus]));

  useEffect(() => { if (user) fetchGameHistory(); }, [showAllHistory]);

  const fetchProfile = async () => {
    if (!user) return;
    const [profileResult, scoresResult, housesResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('session_scores')
        .select('is_winner, game_sessions!inner(is_solo_game, status)')
        .eq('user_id', user.id)
        .eq('game_sessions.is_solo_game', false)
        .eq('game_sessions.status', 'completed'),
      supabase.from('house_members').select('house_id').eq('user_id', user.id),
    ]);
    if (profileResult.data) setProfile(profileResult.data);
    const totalGames = scoresResult.data?.length || 0;
    const totalWins = scoresResult.data?.filter((s) => s.is_winner).length || 0;
    setStats({
      totalGames,
      totalWins,
      winRate: totalGames > 0 ? (totalWins / totalGames) * 100 : 0,
      housesCount: housesResult.data?.length || 0,
    });
    await Promise.all([fetchGameHistory(), fetchLeaderboard()]);
    setLoading(false);
  };

  const fetchActiveKit = async () => {
    if (!user) return;
    const { data: settings } = await supabase
      .from('user_profile_settings')
      .select('equipped_house_kit_id, custom_profile_colors')
      .eq('user_id', user.id)
      .maybeSingle();

    // Custom colors take priority if no kit equipped
    if (!settings?.equipped_house_kit_id) {
      if (settings?.custom_profile_colors) {
        let rawColors = settings.custom_profile_colors;
        // Handle both array and JSON string formats
        let colors: string[] = [];
        if (Array.isArray(rawColors)) {
          colors = rawColors;
        } else if (typeof rawColors === 'string') {
          try { colors = JSON.parse(rawColors); } catch { colors = [rawColors]; }
        }
        colors = colors.filter((c: any) => typeof c === 'string' && c.startsWith('#'));
        if (colors.length === 1) colors = [colors[0], colors[0]];
        if (colors.length >= 2) {
          setActiveKit({ colors, name: 'Custom', rarity: 'common' });
          return;
        }
      }
      setActiveKit(null);
      return;
    }

    const { data: kit } = await supabase
      .from('house_kits')
      .select('name, color_scheme, rarity')
      .eq('id', settings.equipped_house_kit_id)
      .maybeSingle();

    if (kit?.color_scheme) {
      let colors = Array.isArray(kit.color_scheme) ? kit.color_scheme : [];
      if (colors.length === 1) colors = [colors[0], colors[0]];
      if (colors.length >= 2) setActiveKit({ colors, name: kit.name, rarity: kit.rarity || 'common' });
    } else {
      setActiveKit(null);
    }
  };

  const fetchGameHistory = async () => {
    if (!user) return;
    const { data: sessions } = await supabase
      .from('session_scores')
      .select(`
        id, score, is_winner, session_id, accuracy_hits, accuracy_attempts, ratio_numerator, ratio_denominator,
        game_sessions!inner(id, started_at, game_id, house_id, is_solo_game, status,
          games(name, game_emoji, scoring_type), houses(name))
      `)
      .eq('user_id', user.id)
      .eq('game_sessions.is_solo_game', false)
      .eq('game_sessions.status', 'completed')
      .order('created_at', { ascending: false })
      .limit(showAllHistory ? 100 : 10);

    if (sessions) {
      const sessionIds = sessions.map((s) => s.session_id);
      const { data: playerCounts } = await supabase.from('session_scores').select('session_id').in('session_id', sessionIds);
      const countMap = new Map<string, number>();
      playerCounts?.forEach((pc) => countMap.set(pc.session_id, (countMap.get(pc.session_id) || 0) + 1));
      const history = sessions.map((session: any) => {
        const gs = session.game_sessions;
        if (!gs) return null;
        return {
          id: session.id,
          gameName: gs.games?.name || 'Unknown Game',
          gameEmoji: gs.games?.game_emoji || '🎮',
          houseName: gs.houses?.name || 'Unknown House',
          score: session.score || 0,
          scoringType: (gs.games?.scoring_type as ScoringType) || 'points',
          accuracyHits: session.accuracy_hits,
          accuracyAttempts: session.accuracy_attempts,
          ratioNumerator: session.ratio_numerator,
          ratioDenominator: session.ratio_denominator,
          isWinner: session.is_winner || false,
          playedAt: gs.started_at || '',
          playerCount: countMap.get(session.session_id) || 0,
        };
      });
      setGameHistory(history.filter((h) => h !== null && h.gameName !== 'Unknown Game') as GameHistory[]);
    }
  };

  const fetchLeaderboard = async () => {
    if (!user) return;
    const { data: memberships } = await supabase.from('house_members').select('house_id').eq('user_id', user.id);
    if (!memberships?.length) { setLeaderboard([]); return; }
    const houseIds = memberships.map((h) => h.house_id);
    const { data: friendMembers } = await supabase.from('house_members').select('user_id').in('house_id', houseIds).neq('user_id', user.id).limit(50);
    if (!friendMembers?.length) { setLeaderboard([]); return; }
    const friendIds = [...new Set(friendMembers.map((m) => m.user_id))].slice(0, 10);
    const [profilesResult, settingsResult, scoresResult] = await Promise.all([
      supabase.from('profiles').select('id, username').in('id', friendIds),
      supabase.from('user_profile_settings').select('user_id, profile_photo_url').in('user_id', friendIds),
      supabase.from('session_scores').select('user_id, is_winner, game_sessions!inner(is_solo_game)').in('user_id', friendIds).eq('game_sessions.is_solo_game', false),
    ]);
    const profilesMap = new Map(profilesResult.data?.map((p) => [p.id, p.username]) || []);
    const photosMap = new Map(settingsResult.data?.map((s) => [s.user_id, s.profile_photo_url]) || []);
    const scoresMap = new Map<string, any[]>();
    scoresResult.data?.forEach((score) => {
      if (!scoresMap.has(score.user_id)) scoresMap.set(score.user_id, []);
      scoresMap.get(score.user_id)!.push(score);
    });
    const friendStats = friendIds.map((id) => {
      const scores = scoresMap.get(id) || [];
      const wins = scores.filter((s) => s.is_winner).length;
      return {
        id,
        username: profilesMap.get(id) || 'Unknown',
        profilePhotoUrl: photosMap.get(id) || null,
        wins,
        gamesPlayed: scores.length,
        winRate: scores.length > 0 ? (wins / scores.length) * 100 : 0,
      };
    });
    setLeaderboard(friendStats.sort((a, b) => b.wins - a.wins));
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      showAlert('error', 'Error', 'Failed to sign out. Please try again.');
      setSigningOut(false);
    }
  };

  const pickImageFromDevice = async () => {
    if (!isPremium) {
      showConfirm('Premium Feature', 'Photo uploads are available with Premium.', () => setShowPremiumModal(true), 'Upgrade');
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { showAlert('error', 'Permission Required', 'Gallery permission is needed'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.3 });
      if (!result.canceled && result.assets?.[0]) {
        const uri = result.assets[0].uri;
        showConfirm('Confirm Upload', 'Use this photo as your profile picture?', async () => await uploadProfilePhoto(uri), 'Upload');
      }
    } catch {
      showAlert('error', 'Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadProfilePhoto = async (uri: string) => {
    if (!user) return;
    setUploadingPhoto(true);
    try {
      const { uploadProfilePhoto: uploadUtil } = await import('@/lib/imageUpload');
      const result = await uploadUtil(uri, user.id);
      if (!result.success) throw new Error(result.error || 'Upload failed');
      const urlWithTimestamp = `${result.url}?t=${Date.now()}`;
      await updateProfilePhoto(urlWithTimestamp);
      await refreshProfile();
      await fetchProfile();
      showAlert('success', 'Success', 'Profile photo updated!');
    } catch (error: any) {
      showAlert('error', 'Upload Failed', error.message || 'Could not upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading || premiumLoading) {
    return (
      <SafeAreaView style={s.root} edges={[]}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#4A7BF7" />
        </View>
      </SafeAreaView>
    );
  }

  const initials = (profileDisplayName || profile?.username || 'U').charAt(0).toUpperCase();

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.scroll]}>
      <SafeAreaView style={s.root} edges={[]}>
        {/* <StatusBar barStyle="light-content" backgroundColor="#000000" /> */}
        {/* Liquid Metal Candy — image directly in banner, not absolute */}
        {/* Neon Rift — full screen background PNG */}
        {activeKit?.name === 'Neon Rift Loadout' && (
          <>
            <Image
              source={require('@/assets/images/NeonBackground.jpg')}
              style={[StyleSheet.absoluteFill, { opacity: 0.85 }]}
              resizeMode="cover"
            />
            <LinearGradient
              colors={[
                'rgba(0,0,0,0)',
                'rgba(0,0,0,0.15)',
                'rgba(0,0,0,0.45)',
                'rgba(0,0,0,0.85)',
                '#000000',
              ]}
              locations={[0, 0.35, 0.6, 0.82, 1]}
              style={StyleSheet.absoluteFill}
            />
          </>
        )}
        {/* Ironclad Vanguard — full screen background PNG */}
        {activeKit?.name === 'Ironclad Vanguard' && (
          <>
            <Image
              source={require('../../ItoncladPBg.png')}
              style={[StyleSheet.absoluteFill, { opacity: 0.9, width: '100%', height: '100%' }]}
              resizeMode="stretch"
            />
          </>
        )}
        {/* Phantom Echo Set — full screen animated GIF background */}
        {activeKit?.name === 'Phantom Echo Set' && (
          <Image
            source={require('../../neon_glow_animation.gif')}
            style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
            resizeMode="stretch"
          />
        )}
        {/* Phantom Void — full screen background image */}
        {activeKit?.name === 'Phantom Void' && (
          <>
            <Image
              source={require('@/assets/images/PhantomVoid.jpg')}
              style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: 0.5 }]}
              resizeMode="stretch"
            />
            <LinearGradient
              colors={[
                'rgba(0,0,0,0)',
                'rgba(0,0,0,0.15)',
                'rgba(0,0,0,0.45)',
                'rgba(0,0,0,0.85)',
                '#000000',
              ]}
              locations={[0, 0.35, 0.6, 0.82, 1]}
              style={StyleSheet.absoluteFill}
            />
          </>
        )}
        {/* Stellar — full screen background image */}
        {activeKit?.name === 'Stellar' && (
          <>
            <Image
              source={require('@/assets/images/Stellar.jpg')}
              style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: 0.5 }]}
              resizeMode="cover"
            />
            <LinearGradient
              colors={[
                'rgba(0,0,0,0)',
                'rgba(0,0,0,0.15)',
                'rgba(0,0,0,0.45)',
                'rgba(0,0,0,0.85)',
                '#000000',
              ]}
              locations={[0, 0.35, 0.6, 0.82, 1]}
              style={StyleSheet.absoluteFill}
            />
          </>
        )}
        {/* Neon Pulse — full screen background image */}
        {activeKit?.name === 'Neon Pulse' && (
          <>
            <Image
              source={require('@/assets/images/NeonPulse.jpg')}
              style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: 0.3 }]}
              resizeMode="cover"
            />
            <LinearGradient
              colors={[
                'rgba(0,0,0,0)',
                'rgba(0,0,0,0.15)',
                'rgba(0,0,0,0.45)',
                'rgba(0,0,0,0.85)',
                '#000000',
              ]}
              locations={[0, 0.35, 0.6, 0.82, 1]}
              style={StyleSheet.absoluteFill}
            />
          </>
        )}
        {/* Obsidian Gold — full screen background image */}
        {activeKit?.name === 'Obsidian Gold' && (
          <>
            <Image
              source={require('@/assets/images/ObsidianGold.jpg')}
              style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: 0.3 }]}
              resizeMode="cover"
            />
            <LinearGradient
              colors={[
                'rgba(0,0,0,0)',
                'rgba(0,0,0,0.15)',
                'rgba(0,0,0,0.45)',
                'rgba(0,0,0,0.85)',
                '#000000',
              ]}
              locations={[0, 0.35, 0.6, 0.82, 1]}
              style={StyleSheet.absoluteFill}
            />
          </>
        )}
        {/* Prismatic — full screen background */}
        {activeKit?.name === 'Prismatic' && (
          <>
            <Image
              source={require('@/assets/images/Prismatic.jpg')}
              style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.48)']}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
            />
          </>
        )}

        {/* AVATAR HERO — header merged into banner */}
        <View style={s.heroSection}>
          {/* Kit banner — full top section */}

          <View style={[
            s.heroBanner,
            (activeKit?.name === 'Liquid Metal Candy' || activeKit?.name === 'Starlight Prowler' || activeKit?.name === 'Chaos Theory' || activeKit?.name === 'Golden Bushido') && {
              backgroundColor: 'transparent',
              overflow: 'visible',
              height: Platform.OS === 'android' ? 260 + (StatusBar.currentHeight || 24) : 260,
            },
            (activeKit?.name === 'Phantom Void' || activeKit?.name === 'Stellar' || activeKit?.name === 'Neon Pulse' || activeKit?.name === 'Obsidian Gold' || activeKit?.name === 'Prismatic') && {
              backgroundColor: 'transparent',
              overflow: 'visible',
            }
          ]}>
            {activeKit ? (
              activeKit.name === 'Neon Rift Loadout' || activeKit.name === 'Ironclad Vanguard' || activeKit.name === 'Phantom Echo Set' || activeKit.name === 'Liquid Metal Candy' || activeKit.name === 'Starlight Prowler' || activeKit.name === 'Golden Bushido' || activeKit.name === 'Chaos Theory' || activeKit.name === 'Phantom Void' || activeKit.name === 'Stellar' || activeKit.name === 'Neon Pulse' || activeKit.name === 'Obsidian Gold' || activeKit.name === 'Prismatic' ? (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]}>
                  {activeKit.name === 'Liquid Metal Candy' && (
                    <>
                      <Image source={require('@/assets/images/LiquidMetalProfile.jpeg')}
                        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} resizeMode="cover" />
                      <View style={s.lmcDarkSheet} />
                    </>
                  )}
                  {activeKit.name === 'Starlight Prowler' && (
                    <>
                      <Image source={require('@/assets/images/StarlightProwler.jpeg')}
                        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} resizeMode="cover" />
                      <View style={s.lmcDarkSheet} />
                    </>
                  )}
                  {activeKit.name === 'Golden Bushido' && (
                    <>
                      <Image
                        source={require('@/assets/images/lionheader.jpeg')}
                        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
                        resizeMode="cover"
                      />
                      <View style={s.lmcDarkSheet} />
                    </>
                  )}
                  {activeKit.name === 'Chaos Theory' && (
                    <>
                      <Image
                        source={require('@/assets/images/ChaosTheory.jpeg')}
                        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
                        resizeMode="cover"
                      />
                      <View style={s.lmcDarkSheet} />
                    </>
                  )}
                  {activeKit.name === 'Phantom Void' && (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} />
                  )}
                  {activeKit.name === 'Stellar' && (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} />
                  )}
                  {activeKit.name === 'Neon Pulse' && (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} />
                  )}
                  {activeKit.name === 'Obsidian Gold' && (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} />
                  )}
                  {activeKit.name === 'Prismatic' && (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} />
                  )}
                </View>
              ) : (
                <>
                  <LinearGradient
                    colors={activeKit.colors as [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
                </>
              )
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#111111' }]} />
            )}

            <View style={{ top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 56, left: 16, right: 16, position: 'absolute', zIndex: 10 }}>
              {/* Back button */}
              <Pressable style={s.bannerBackBtn} onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
              </Pressable>

              {/* Premium icon + Settings button — always show both, side by side */}
              <View style={{
                position: 'absolute',

                right: 16,
                flexDirection: 'row', alignItems: 'center', gap: 8,
                zIndex: 10,
              }}>
                {activeKit?.name === 'Starlight Prowler' && (
                  isPremium ? (
                    <View style={[s.glossyCard, s.spPremiumBtn]}>
                      <Text style={s.spPremiumBtnTxt}>Premium</Text>
                    </View>
                  ) : (
                    <Pressable style={s.spPremiumBtn} onPress={() => setShowPremiumModal(true)}>
                      <Text style={s.spPremiumBtnTxt}>Premium</Text>
                    </Pressable>
                  )
                )}
                {activeKit?.name === 'Golden Bushido' && (
                  isPremium ? (
                    <View style={[s.gbPremiumBtn, s.glossyCard, { borderColor: '#B8920F' }]}>
                      <Text style={s.gbPremiumBtnTxt}>Premium</Text>
                    </View>
                  ) : (
                    <Pressable style={s.gbPremiumBtn} onPress={() => setShowPremiumModal(true)}>
                      <Text style={s.gbPremiumBtnTxt}>Premium</Text>
                    </Pressable>
                  )
                )}
                {activeKit?.name === 'Chaos Theory' && (
                  isPremium ? (
                    <View style={[s.ctPremiumBtn, s.glossyCard, { borderColor: '#AAFF00' }]}>
                      <Text style={[s.ctPremiumBtnTxt]}>Premium</Text>
                    </View>
                  ) : (
                    <Pressable style={s.ctPremiumBtn} onPress={() => setShowPremiumModal(true)}>
                      <Text style={s.ctPremiumBtnTxt}>Premium</Text>
                    </Pressable>
                  )
                )}
                {activeKit?.name === 'Prismatic' && (
                  isPremium ? (
                    <View style={s.prPremiumBtn}>
                      <Text style={s.prPremiumBtnTxt}>Premium</Text>
                    </View>
                  ) : (
                    <Pressable style={s.prPremiumBtn} onPress={() => setShowPremiumModal(true)}>
                      <Text style={s.prPremiumBtnTxt}>Premium</Text>
                    </Pressable>
                  )
                )}
                {activeKit?.name === 'Stellar' && (
                  isPremium ? (
                    <View style={[s.stPremiumBtn, s.glossyCard]}>
                      <Text style={s.stPremiumBtnTxt}>Premium</Text>
                    </View>
                  ) : (
                    <Pressable style={s.stPremiumBtn} onPress={() => setShowPremiumModal(true)}>
                      <Text style={s.stPremiumBtnTxt}>Premium</Text>
                    </Pressable>
                  )
                )}
                {activeKit?.name === 'Phantom Void' && (
                  isPremium ? (
                    <View style={[s.pvPremiumBtn, s.glossyCard,]}>
                      <Text style={s.pvPremiumBtnTxt}>Premium</Text>
                    </View>
                  ) : (
                    <Pressable style={s.pvPremiumBtn} onPress={() => setShowPremiumModal(true)}>
                      <Text style={s.pvPremiumBtnTxt}>Premium</Text>
                    </Pressable>
                  )
                )}
                {activeKit?.name === 'Obsidian Gold' && (
                  isPremium ? (
                    <View style={s.ogPremiumBtn}>
                      <Text style={s.ogPremiumBtnTxt}>Premium</Text>
                    </View>
                  ) : (
                    <Pressable style={s.ogPremiumBtn} onPress={() => setShowPremiumModal(true)}>
                      <Text style={s.ogPremiumBtnTxt}>Premium</Text>
                    </Pressable>
                  )
                )}
                {activeKit?.name === 'Neon Pulse' && (
                  isPremium ? (
                    <View style={s.npPremiumBtn}>
                      <Text style={s.npPremiumBtnTxt}>Premium</Text>
                    </View>
                  ) : (
                    <Pressable style={s.npPremiumBtn} onPress={() => setShowPremiumModal(true)}>
                      <Text style={s.npPremiumBtnTxt}>Premium</Text>
                    </Pressable>
                  )
                )}
                {activeKit?.name === 'Liquid Metal Candy' && (
                  isPremium ? (
                    <View style={[s.lmcPremiumBtn, { overflow: 'hidden' }]}>
                      <BlurView
                        intensity={40}
                        tint="dark"
                        style={StyleSheet.absoluteFill}
                      />
                      <Text style={[s.lmcPremiumBtnTxt]}>Premium</Text>
                    </View>
                  ) : (
                    <Pressable style={s.lmcPremiumBtn} onPress={() => setShowPremiumModal(true)}>
                      <Ionicons name="diamond" size={18} color="rgba(255,255,255,0.8)" />
                    </Pressable>
                  )
                )}
                <Pressable style={[s.settingsBtn]} onPress={() => router.push('/profile-settings')}>
                  <Ionicons name="settings-outline" size={18} color="rgba(255,255,255,0.8)" />
                </Pressable>
              </View>
            </View>
          </View>

          {/* LMC & Starlight Prowler & Golden Bushido — special card layout */}
          {(activeKit?.name === 'Liquid Metal Candy' || activeKit?.name === 'Starlight Prowler' || activeKit?.name === 'Golden Bushido' || activeKit?.name === 'Chaos Theory' || activeKit?.name === 'Phantom Void' || activeKit?.name === 'Stellar' || activeKit?.name === 'Neon Pulse' || activeKit?.name === 'Obsidian Gold' || activeKit?.name === 'Prismatic') ? (
            <>
              {/* Golden Bushido — dark curved container wrapping card + pill */}
              {activeKit?.name === 'Golden Bushido' ? (
                <View style={{
                  marginHorizontal: 0,
                  marginTop: -32,
                  paddingTop: 20,
                  paddingHorizontal: 0,
                  zIndex: 5,
                }}>
                  <View style={[s.lmcCard, {
                    borderWidth: 0,
                    marginTop: 0,
                    backgroundColor: '#B8920F',
                    overflow: 'hidden',
                    shadowColor: '#FFD700',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 20,
                    elevation: 12,
                  }]}>
                    <Image
                      source={require('@/assets/images/GoldenBushido.jpeg')}
                      style={[StyleSheet.absoluteFill, { opacity: 0.38 }]}
                      resizeMode="cover"
                    />
                    <View style={s.lmcAvatarBox}>
                      <View style={[s.lmcAvatarOuter, getGlassAvatarRing(activeKit?.name)]}>
                        {profilePhotoUrl ? (
                          <Image source={{ uri: profilePhotoUrl }} style={s.avatarImg} resizeMode="cover" />
                        ) : (
                          <View style={[s.avatarFallback, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                            <Text style={s.avatarInitial}>{initials}</Text>
                          </View>
                        )}
                      </View>
                      <Pressable
                        style={[s.cameraBtn, {
                          backgroundColor: getGlassCameraBtn(activeKit?.name).backgroundColor,
                          borderColor: getGlassCameraBtn(activeKit?.name).borderColor,
                        }, uploadingPhoto && { opacity: 0.6 }]}
                        onPress={uploadingPhoto ? undefined : pickImageFromDevice}
                        disabled={uploadingPhoto}
                      >
                        {uploadingPhoto
                          ? <ActivityIndicator size="small" color={getGlassCameraBtn(activeKit?.name).iconColor} />
                          : <Ionicons name="camera" size={12} color={getGlassCameraBtn(activeKit?.name).iconColor} />
                        }
                      </Pressable>
                    </View>
                    <View style={s.lmcCardInfo}>
                      <Text style={s.lmcCardName}>{profileDisplayName || profile?.username}</Text>
                      <Text style={s.lmcCardBio}>Short bio .....</Text>
                    </View>
                  </View>
                  <View style={s.lmcPillWrap}>
                    <View style={[s.lmcPill, s.glossyCard, {
                      elevation: 4,
                      paddingHorizontal: 32,
                      paddingVertical: 13,
                    }]}>
                      <Text style={[s.lmcPillTxt, { color: GB_GOLD }]}>** {activeKit?.name} **</Text>
                    </View>
                  </View>
                </View>
              ) : activeKit?.name === 'Phantom Void' ? (
                <View style={{
                  marginHorizontal: 0,
                  marginTop: -32,
                  backgroundColor: 'transparent',
                  borderTopLeftRadius: 32,
                  borderTopRightRadius: 32,
                  paddingTop: 20,
                  paddingHorizontal: 0,
                  zIndex: 5,
                }}>
                  <View style={[s.lmcCard, s.glossyCard, {
                    marginTop: 0,
                    overflow: 'hidden',
                    elevation: 12,
                    borderRadius: 16,
                  }]}>
                    <View style={s.lmcAvatarBox}>
                      <View style={[s.lmcAvatarOuter, getGlassAvatarRing(activeKit?.name)]}>
                        {profilePhotoUrl ? (
                          <Image source={{ uri: profilePhotoUrl }} style={s.avatarImg} resizeMode="cover" />
                        ) : (
                          <View style={[s.avatarFallback, { backgroundColor: 'rgba(0,206,209,0.2)' }]}>
                            <Text style={s.avatarInitial}>{initials}</Text>
                          </View>
                        )}
                      </View>
                      <Pressable
                        style={[s.cameraBtn, {
                          backgroundColor: getGlassCameraBtn(activeKit?.name).backgroundColor,
                          borderColor: getGlassCameraBtn(activeKit?.name).borderColor,
                        }, uploadingPhoto && { opacity: 0.6 }]}
                        onPress={uploadingPhoto ? undefined : pickImageFromDevice}
                        disabled={uploadingPhoto}
                      >
                        {uploadingPhoto
                          ? <ActivityIndicator size="small" color={getGlassCameraBtn(activeKit?.name).iconColor} />
                          : <Ionicons name="camera" size={12} color={getGlassCameraBtn(activeKit?.name).iconColor} />
                        }
                      </Pressable>
                    </View>
                    <View style={s.lmcCardInfo}>
                      <Text style={[s.lmcCardName, PV_TEXT_SHADOW]} numberOfLines={1}>
                        {profileDisplayName || profile?.username}
                      </Text>
                      {(user?.email && (profileDisplayName || profile?.username)) && (
                        <Text style={[s.lmcCardBio, { color: 'rgba(255,255,255,0.55)' }, PV_TEXT_SHADOW]} numberOfLines={1}>
                          {user?.email || profileDisplayName || profile?.username}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={s.lmcPillWrap}>
                    <View style={[s.lmcPill, s.glossyCard, {
                      paddingHorizontal: 32,
                      paddingVertical: 13,
                    }]}>
                      <Text style={[s.lmcPillTxt, { color: PV_CYAN, fontWeight: '600' }, PV_TEXT_SHADOW]}>** {activeKit?.name} **</Text>
                    </View>
                  </View>
                </View>
              ) : activeKit?.name === 'Stellar' ? (
                <View style={{
                  marginHorizontal: 0,
                  // marginTop: -32,
                  backgroundColor: 'transparent',
                  paddingHorizontal: 0,
                  zIndex: 5,
                }}>
                  <View style={[s.lmcCard, s.glossyCard, { borderRadius: 16 }]}>
                    <View style={s.lmcAvatarBox}>
                      <View style={[s.lmcAvatarOuter, getGlassAvatarRing(activeKit?.name)]}>
                        {profilePhotoUrl ? (
                          <Image source={{ uri: profilePhotoUrl }} style={s.avatarImg} resizeMode="cover" />
                        ) : (
                          <View style={[s.avatarFallback, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                            <Text style={s.avatarInitial}>{initials}</Text>
                          </View>
                        )}
                      </View>
                      <Pressable
                        style={[s.cameraBtn, {
                          backgroundColor: getGlassCameraBtn(activeKit?.name).backgroundColor,
                          borderColor: getGlassCameraBtn(activeKit?.name).borderColor,
                        }, uploadingPhoto && { opacity: 0.6 }]}
                        onPress={uploadingPhoto ? undefined : pickImageFromDevice}
                        disabled={uploadingPhoto}
                      >
                        {uploadingPhoto
                          ? <ActivityIndicator size="small" color={getGlassCameraBtn(activeKit?.name).iconColor} />
                          : <Ionicons name="camera" size={12} color={getGlassCameraBtn(activeKit?.name).iconColor} />
                        }
                      </Pressable>
                    </View>
                    <View style={s.lmcCardInfo}>
                      <Text style={[s.lmcCardName, ST_TEXT_SHADOW]} numberOfLines={1}>
                        {profileDisplayName || profile?.username}
                      </Text>
                      {user?.email && (profileDisplayName || profile?.username) && (
                        <Text style={[s.lmcCardBio, { color: 'rgba(255,255,255,0.55)' }, ST_TEXT_SHADOW]} numberOfLines={1}>
                          {user?.email || profileDisplayName || profile?.username}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={s.lmcPillWrap}>
                    <View style={[s.glossyCard, {
                      paddingHorizontal: 32,
                      paddingVertical: 13,
                      borderRadius: 24,
                    }]}>
                      <Text style={[s.lmcPillTxt]}>** {activeKit?.name} **</Text>
                    </View>
                  </View>
                </View>
              ) : activeKit?.name === 'Neon Pulse' ? (
                <View style={{
                  marginHorizontal: 0,
                  marginTop: -32,
                  backgroundColor: 'transparent',
                  borderTopLeftRadius: 32,
                  borderTopRightRadius: 32,
                  paddingTop: 20,
                  paddingHorizontal: 0,
                  zIndex: 5,
                }}>
                  <View style={[s.lmcCard, s.glossyCard, {
                    borderWidth: 1,
                    marginTop: 0,
                    overflow: 'hidden',
                  }]}>
                    <View style={s.lmcAvatarBox}>
                      <View style={[s.lmcAvatarOuter, getGlassAvatarRing(activeKit?.name)]}>
                        {profilePhotoUrl ? (
                          <Image source={{ uri: profilePhotoUrl }} style={s.avatarImg} resizeMode="cover" />
                        ) : (
                          <View style={[s.avatarFallback, { backgroundColor: 'rgba(0,255,255,0.2)' }]}>
                            <Text style={s.avatarInitial}>{initials}</Text>
                          </View>
                        )}
                      </View>
                      <Pressable
                        style={[s.cameraBtn, {
                          backgroundColor: getGlassCameraBtn(activeKit?.name).backgroundColor,
                          borderColor: getGlassCameraBtn(activeKit?.name).borderColor,
                        }, uploadingPhoto && { opacity: 0.6 }]}
                        onPress={uploadingPhoto ? undefined : pickImageFromDevice}
                        disabled={uploadingPhoto}
                      >
                        {uploadingPhoto
                          ? <ActivityIndicator size="small" color={getGlassCameraBtn(activeKit?.name).iconColor} />
                          : <Ionicons name="camera" size={12} color={getGlassCameraBtn(activeKit?.name).iconColor} />
                        }
                      </Pressable>
                    </View>
                    <View style={s.lmcCardInfo}>
                      <Text style={[s.lmcCardName, NP_TEXT_SHADOW]} numberOfLines={1}>
                        {user?.email || profileDisplayName || profile?.username}
                      </Text>
                      {(user?.email && (profileDisplayName || profile?.username)) && (
                        <Text style={[s.lmcCardBio, { color: 'rgba(255,255,255,0.55)' }, NP_TEXT_SHADOW]} numberOfLines={1}>
                          {profileDisplayName || profile?.username}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={s.lmcPillWrap}>
                    <View style={[s.lmcPill, s.glossyCard, {
                      borderWidth: 1,
                      paddingHorizontal: 32,
                      paddingVertical: 13,
                    }]}>
                      <Text style={[s.lmcPillTxt, { color: NP_CYAN, fontWeight: '600' }, NP_TEXT_SHADOW]}>** {activeKit?.name} **</Text>
                    </View>
                  </View>
                </View>
              ) : activeKit?.name === 'Obsidian Gold' ? (
                <View style={{
                  marginHorizontal: 0,
                  marginTop: -32,
                  backgroundColor: 'transparent',
                  borderTopLeftRadius: 32,
                  borderTopRightRadius: 32,
                  paddingTop: 20,
                  paddingHorizontal: 0,
                  zIndex: 5,
                }}>
                  <View style={[s.lmcCard, s.glossyCard, {
                    borderWidth: 1,
                    marginTop: 0,
                    overflow: 'hidden',
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }]}>
                    <BlurView
                      intensity={10}
                      tint="dark"
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={s.lmcAvatarBox}>
                      <View style={[s.lmcAvatarOuter, getGlassAvatarRing(activeKit?.name)]}>
                        {profilePhotoUrl ? (
                          <Image source={{ uri: profilePhotoUrl }} style={s.avatarImg} resizeMode="cover" />
                        ) : (
                          <View style={[s.avatarFallback, { backgroundColor: 'rgba(255,215,0,0.2)' }]}>
                            <Text style={s.avatarInitial}>{initials}</Text>
                          </View>
                        )}
                      </View>
                      <Pressable
                        style={[s.cameraBtn, {
                          backgroundColor: getGlassCameraBtn(activeKit?.name).backgroundColor,
                          borderColor: getGlassCameraBtn(activeKit?.name).borderColor,
                        }, uploadingPhoto && { opacity: 0.6 }]}
                        onPress={uploadingPhoto ? undefined : pickImageFromDevice}
                        disabled={uploadingPhoto}
                      >
                        {uploadingPhoto
                          ? <ActivityIndicator size="small" color={getGlassCameraBtn(activeKit?.name).iconColor} />
                          : <Ionicons name="camera" size={12} color={getGlassCameraBtn(activeKit?.name).iconColor} />
                        }
                      </Pressable>
                    </View>
                    <View style={s.lmcCardInfo}>

                      <Text style={[s.lmcCardName, OG_TEXT_SHADOW]} numberOfLines={1}>
                        {profileDisplayName || profile?.username}
                      </Text>
                      {(user?.email && (profileDisplayName || profile?.username)) && (
                        <Text style={[s.lmcCardBio, { color: 'rgba(255,255,255,0.55)' }, OG_TEXT_SHADOW]} numberOfLines={1}>
                          {user?.email || profileDisplayName || profile?.username}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={s.lmcPillWrap}>
                    <View style={[s.lmcPill, s.glossyCard, {
                      paddingHorizontal: 32,
                      paddingVertical: 13,
                    }]}>
                      <BlurView
                        intensity={10}
                        tint="dark"
                        style={StyleSheet.absoluteFill}
                      />
                      <Text style={[s.lmcPillTxt, { color: OG_GOLD, fontWeight: '600' }, OG_TEXT_SHADOW]}>** {activeKit?.name} **</Text>
                    </View>
                  </View>
                </View>
              ) : activeKit?.name === 'Prismatic' ? (
                <View style={{
                  marginHorizontal: 0,
                  marginTop: -32,
                  backgroundColor: 'transparent',
                  borderTopLeftRadius: 32,
                  borderTopRightRadius: 32,
                  paddingTop: 20,
                  paddingHorizontal: 0,
                  zIndex: 5,
                }}>
                  <View style={[s.lmcCard, {
                    borderWidth: 1.5,
                    borderColor: 'rgba(157,0,255,0.75)',
                    marginTop: 0,
                    backgroundColor: 'transparent',
                    overflow: 'hidden',
                    shadowColor: PR_VIOLET,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 16,
                    elevation: 10,
                  }]}>
                    <LinearGradient
                      colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.38)', 'rgba(157,0,255,0.12)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                    />
                    <View style={s.lmcAvatarBox}>
                      <View style={[s.lmcAvatarOuter, getGlassAvatarRing(activeKit?.name)]}>
                        {profilePhotoUrl ? (
                          <Image source={{ uri: profilePhotoUrl }} style={s.avatarImg} resizeMode="cover" />
                        ) : (
                          <View style={[s.avatarFallback, { backgroundColor: 'rgba(157,0,255,0.25)' }]}>
                            <Text style={s.avatarInitial}>{initials}</Text>
                          </View>
                        )}
                      </View>
                      <Pressable
                        style={[s.cameraBtn, {
                          backgroundColor: getGlassCameraBtn(activeKit?.name).backgroundColor,
                          borderColor: getGlassCameraBtn(activeKit?.name).borderColor,
                        }, uploadingPhoto && { opacity: 0.6 }]}
                        onPress={uploadingPhoto ? undefined : pickImageFromDevice}
                        disabled={uploadingPhoto}
                      >
                        {uploadingPhoto
                          ? <ActivityIndicator size="small" color={getGlassCameraBtn(activeKit?.name).iconColor} />
                          : <Ionicons name="camera" size={12} color={getGlassCameraBtn(activeKit?.name).iconColor} />
                        }
                      </Pressable>
                    </View>
                    <View style={s.lmcCardInfo}>
                      <Text style={[s.lmcCardName, PR_TEXT_SHADOW]}>{profileDisplayName || profile?.username}</Text>
                      <Text style={[s.lmcCardBio, { color: 'rgba(255,255,255,0.78)' }, PR_TEXT_SHADOW]}>Short bio ......</Text>
                    </View>
                  </View>
                  <View style={s.lmcPillWrap}>
                    <View style={[s.lmcPill, {
                      borderColor: 'rgba(157,0,255,0.75)',
                      borderWidth: 1.5,
                      backgroundColor: PR_OVERLAY,
                      shadowColor: PR_VIOLET,
                      shadowOpacity: 0.3,
                      shadowRadius: 10,
                      elevation: 4,
                      paddingHorizontal: 32,
                      paddingVertical: 13,
                    }]}>
                      <Text style={[s.lmcPillTxt, { color: '#FFFFFF', fontWeight: '700' }, PR_TEXT_SHADOW]}>** {activeKit?.name} **</Text>
                    </View>
                  </View>
                </View>
              ) : activeKit?.name === 'Starlight Prowler' ? (
                <View style={{
                  marginHorizontal: 0,
                  marginTop: -32,
                  backgroundColor: '#000000',
                  borderTopLeftRadius: 32,
                  borderTopRightRadius: 32,
                  paddingTop: 20,
                  paddingHorizontal: 0,
                  zIndex: 5,
                }}>
                  <View style={[s.lmcCard, s.glossyCard, {
                    marginTop: 0,
                    overflow: 'hidden',
                    borderColor: getRarityColor(activeKit.name) + 88,
                    borderWidth: 1,
                  }]}>
                    <View style={s.lmcAvatarBox}>
                      <View style={[s.lmcAvatarOuter, getGlassAvatarRing(activeKit?.name), {
                        borderColor: 'rgba(255,255,255,0.45)',
                        backgroundColor: 'rgba(0,0,0,0.15)',
                      }]}>
                        {profilePhotoUrl ? (
                          <Image source={{ uri: profilePhotoUrl }} style={s.avatarImg} resizeMode="cover" />
                        ) : (
                          <View style={[s.avatarFallback, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                            <Text style={s.avatarInitial}>{initials}</Text>
                          </View>
                        )}
                      </View>
                      <Pressable
                        style={[s.cameraBtn, {
                          backgroundColor: getGlassCameraBtn(activeKit?.name).backgroundColor,
                          borderColor: getGlassCameraBtn(activeKit?.name).borderColor,
                        }, uploadingPhoto && { opacity: 0.6 }]}
                        onPress={uploadingPhoto ? undefined : pickImageFromDevice}
                        disabled={uploadingPhoto}
                      >
                        {uploadingPhoto
                          ? <ActivityIndicator size="small" color={getGlassCameraBtn(activeKit?.name).iconColor} />
                          : <Ionicons name="camera" size={12} color={getGlassCameraBtn(activeKit?.name).iconColor} />
                        }
                      </Pressable>
                    </View>
                    <View style={s.lmcCardInfo}>
                      <Text style={s.lmcCardName} numberOfLines={1}>{user?.email || profileDisplayName || profile?.username}</Text>
                      <Text style={s.lmcCardBio}>{profileDisplayName || profile?.username}</Text>
                    </View>
                  </View>
                  <View style={s.lmcPillWrap}>
                    <View style={[s.lmcPill, s.glossyCard, {
                      paddingHorizontal: 32,
                      paddingVertical: 13,
                    }]}>
                      <Text style={[s.lmcPillTxt, { color: SP_CYAN }]}>** {activeKit?.name} **</Text>
                    </View>
                  </View>
                </View>
              ) : activeKit?.name === 'Chaos Theory' ? (
                <View style={{
                  marginHorizontal: 0,
                  marginTop: -32,
                  borderTopLeftRadius: 32,
                  borderTopRightRadius: 32,
                  paddingTop: 20,
                  paddingHorizontal: 0,
                  zIndex: 5,
                }}>
                  <View style={[s.lmcCard, s.glossyCard, {
                    marginTop: 0,
                    backgroundColor: CT_LIME,
                    borderWidth: 1,
                    borderRadius: 40,
                  }]}>
                    <View style={s.lmcAvatarBox}>
                      <View style={[s.lmcAvatarOuter, getGlassAvatarRing(activeKit?.name)]}>
                        {profilePhotoUrl ? (
                          <Image source={{ uri: profilePhotoUrl }} style={s.avatarImg} resizeMode="cover" />
                        ) : (
                          <View style={[s.avatarFallback, { backgroundColor: 'rgba(0,0,0,0.15)' }]}>
                            <Text style={[s.avatarInitial, { color: '#000000' }]}>{initials}</Text>
                          </View>
                        )}
                      </View>
                      <Pressable
                        style={[s.cameraBtn, {
                          backgroundColor: getGlassCameraBtn(activeKit?.name).backgroundColor,
                          borderColor: getGlassCameraBtn(activeKit?.name).borderColor,
                        }, uploadingPhoto && { opacity: 0.6 }]}
                        onPress={uploadingPhoto ? undefined : pickImageFromDevice}
                        disabled={uploadingPhoto}
                      >
                        {uploadingPhoto
                          ? <ActivityIndicator size="small" color={getGlassCameraBtn(activeKit?.name).iconColor} />
                          : <Ionicons name="camera" size={12} color={getGlassCameraBtn(activeKit?.name).iconColor} />
                        }
                      </Pressable>
                    </View>
                    <View style={s.lmcCardInfo}>
                      <Text style={[s.lmcCardName, { color: '#000000' }]} numberOfLines={1}>{user?.email || profileDisplayName || profile?.username}</Text>
                      <Text style={[s.lmcCardBio, { color: 'rgba(0,0,0,0.65)' }]}>{profileDisplayName || profile?.username}</Text>
                    </View>
                  </View>
                  <View style={s.lmcPillWrap}>
                    <View style={[s.lmcPill, s.glossyCard, {
                      paddingHorizontal: 32,
                      paddingVertical: 13,
                    }]}>
                      <Text style={[s.lmcPillTxt, { color: CT_LIME }]}>** {activeKit?.name} **</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <>
                  <View style={[s.lmcCard, s.glossyCard, { backgroundColor: '#7B5EA7', borderRadius: 40 }]}>
                    <LinearGradient
                      colors={['#7B5EA7', '#9B6FBF', '#8B65AF']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                    />
                    <View style={s.lmcAvatarBox}>
                      <View style={[s.lmcAvatarOuter, getGlassAvatarRing(activeKit?.name)]}>
                        {profilePhotoUrl ? (
                          <Image source={{ uri: profilePhotoUrl }} style={s.avatarImg} resizeMode="cover" />
                        ) : (
                          <View style={[s.avatarFallback, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                            <Text style={s.avatarInitial}>{initials}</Text>
                          </View>
                        )}
                      </View>
                      <Pressable
                        style={[s.cameraBtn, {
                          backgroundColor: getGlassCameraBtn(activeKit?.name).backgroundColor,
                          borderColor: getGlassCameraBtn(activeKit?.name).borderColor,
                        }, uploadingPhoto && { opacity: 0.6 }]}
                        onPress={uploadingPhoto ? undefined : pickImageFromDevice}
                        disabled={uploadingPhoto}
                      >
                        {uploadingPhoto
                          ? <ActivityIndicator size="small" color={getGlassCameraBtn(activeKit?.name).iconColor} />
                          : <Ionicons name="camera" size={12} color={getGlassCameraBtn(activeKit?.name).iconColor} />
                        }
                      </Pressable>
                    </View>
                    <View style={s.lmcCardInfo}>
                      <Text style={s.lmcCardName} numberOfLines={1}>{profileDisplayName || profile?.username}</Text>
                      <Text style={s.lmcCardBio}>{user?.email || profileDisplayName || profile?.username} </Text>
                    </View>
                  </View>
                  <View style={s.lmcPillWrap}>
                    <View style={[s.lmcPill, s.glossyCard, { borderColor: getRarityColor(activeKit?.name) + '80', borderWidth: 1 }]}>
                      <Text style={[s.lmcPillTxt, { color: getRarityColor(activeKit?.name) }]}>** {activeKit?.name} **</Text>
                    </View>
                  </View>
                </>
              )}
            </>
          ) : (
            <>
              {/* Left-aligned profile card layout */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 20,
                gap: 16,
              }}>
                {/* Avatar left side */}
                <View style={{ position: 'relative' }}>
                  <View style={[
                    s.avatarOuter,
                    activeKit && {
                      borderColor: activeKit.colors[activeKit.colors.length - 1],
                      shadowColor: activeKit.colors[activeKit.colors.length - 1],
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.8,
                      shadowRadius: 16,
                      elevation: 14,
                      borderWidth: 3,
                    }
                  ]}>
                    {profilePhotoUrl ? (
                      <Image source={{ uri: profilePhotoUrl }} style={s.avatarImg} resizeMode="cover" />
                    ) : (
                      <View style={s.avatarFallback}>
                        <Text style={s.avatarInitial}>{initials}</Text>
                      </View>
                    )}
                  </View>
                  <Pressable
                    style={[s.cameraBtn, {
                      backgroundColor: getGlassCameraBtn(activeKit?.name).backgroundColor,
                      borderColor: getGlassCameraBtn(activeKit?.name).borderColor,
                    }, uploadingPhoto && { opacity: 0.6 }]}
                    onPress={uploadingPhoto ? undefined : pickImageFromDevice}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto
                      ? <ActivityIndicator size="small" color={getGlassCameraBtn(activeKit?.name).iconColor} />
                      : <Ionicons name="camera" size={12} color={getGlassCameraBtn(activeKit?.name).iconColor} />
                    }
                  </Pressable>
                </View>

                {/* Right side — name + kit + upgrade */}
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={[s.heroName, { textAlign: 'left', fontSize: 24 }, activeKit?.name === 'Neon Rift Loadout' && {
                    textShadowColor: 'rgba(157,0,255,0.8)',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 12,
                  }]}>{profileDisplayName || profile?.username}</Text>

                  {activeKit && activeKit.name !== 'Neon Rift Loadout' && activeKit.name !== 'Ironclad Vanguard' && activeKit.name !== 'Phantom Echo Set' && (
                    <View style={[s.kitBadge, {
                      backgroundColor: activeKit.colors[activeKit.colors.length - 1] + '22',
                      borderColor: activeKit.colors[activeKit.colors.length - 1] + 'AA',
                      alignSelf: 'flex-start',
                    }]}>
                      <Ionicons name="sparkles" size={11} color={activeKit.colors[activeKit.colors.length - 1]} />
                      <Text style={[s.kitBadgeTxt, { color: activeKit.colors[activeKit.colors.length - 1] }]}>
                        {activeKit.name}
                      </Text>
                      <View style={[s.rarityDot, {
                        backgroundColor: activeKit.rarity === 'mythic' ? '#EC4899'
                          : activeKit.rarity === 'legendary' ? '#FFD700'
                            : activeKit.rarity === 'epic' ? '#A855F7'
                              : activeKit.rarity === 'rare' ? '#3B82F6'
                                : 'rgba(255,255,255,0.3)'
                      }]} />
                      <Text style={[s.rarityTxt, { color: 'rgba(255,255,255,0.5)' }]}>
                        {(activeKit.rarity || 'common').charAt(0).toUpperCase() + (activeKit.rarity || 'common').slice(1)}
                      </Text>
                    </View>
                  )}

                  {activeKit?.name !== 'Neon Rift Loadout' && activeKit?.name !== 'Ironclad Vanguard' && activeKit?.name !== 'Phantom Echo Set' && (
                    !isPremium && (
                      <Pressable style={[s.upgradeBadge, { alignSelf: 'flex-start' }]} onPress={() => setShowPremiumModal(true)}>
                        <Text style={s.upgradeBadgeText}>✦ Upgrade to Premium</Text>
                      </Pressable>
                    )
                  )}
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── ACTIVE KIT SHOWCASE ── */}
        {activeKit && activeKit.name !== 'Chaos Theory' && activeKit.name !== 'Liquid Metal Candy' && (
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <View style={[s.glossyCard, {
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              borderRadius: 16,
              borderColor: getRarityColor(activeKit.name) + '88',
            }]}>
              <BlurView
                intensity={10}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
              <View>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 3, letterSpacing: 0.5 }}>
                  Active Kit
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 }}>
                  {activeKit.name}
                </Text>
              </View>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                borderWidth: 1,
                borderColor: activeKit.name === 'Chaos Theory' ? '#AAFF00' : getRarityColor(activeKit.name),
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                display: activeKit.name === 'Golden Bushido' ? 'none' : 'flex',
              }}>
                <Ionicons name="sparkles" size={12} color={activeKit.name === 'Chaos Theory' ? '#AAFF00' : getRarityColor(activeKit.name)} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: activeKit.name === 'Chaos Theory' ? '#AAFF00' : getRarityColor(activeKit.name), letterSpacing: 0.5 }}>
                  {activeKit.rarity.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* STAT CARDS */}
        {activeKit?.name === 'Chaos Theory' ? (
          <View style={{
            marginHorizontal: 0,
            // marginTop: 0,
            paddingHorizontal: 16,
            paddingBottom: 20,
            paddingTop: 8,
          }}>
            <View style={[s.statGrid, { paddingHorizontal: 0, marginBottom: 0 }]}>
              {[
                { icon: 'game-controller' as const, value: stats.totalGames, label: 'Total Games' },
                { icon: 'trophy' as const, value: stats.totalWins, label: 'Total Wins' },
                { icon: 'trending-up' as const, value: `${stats.winRate.toFixed(0)}%`, label: 'Winning Rate' },
                { icon: 'home' as const, value: stats.housesCount, label: 'Houses' },
              ].map((st, i) => (
                <View key={i} style={[s.statCard, {
                  borderColor: 'rgba(170,255,0,0.8)',
                  borderWidth: 1,
                  backgroundColor: '#0A0A0A',
                  overflow: 'hidden',
                  elevation: 4,
                }]}>
                  <Image
                    source={require('@/assets/images/ChaosTheory.jpeg')}
                    style={{
                      position: 'absolute',
                      width: 280,
                      height: 280,
                      opacity: 0.9,
                    }}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.88)', 'rgba(0,0,0,0.95)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[StyleSheet.absoluteFill,]}
                  />
                  <Ionicons name={st.icon} size={22} color="#FFFFFF" style={{ marginBottom: 8 }} />
                  <Text style={[s.statValue, { color: '#FFFFFF', fontWeight: '900', fontSize: 28 }]}>{st.value}</Text>
                  <Text style={[s.statLabel, { color: 'rgba(255,255,255,0.85)', letterSpacing: 0.8 }]}>{st.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : activeKit?.name === 'Starlight Prowler' ? (
          <View style={{
            marginHorizontal: 0,
            marginTop: 0,
            backgroundColor: '#000000',
            paddingHorizontal: 16,
            paddingBottom: 20,
            paddingTop: 8,
          }}>
            <View style={[s.statGrid, { paddingHorizontal: 0, marginBottom: 0 }]}>
              {[
                { icon: 'game-controller' as const, value: stats.totalGames, label: 'Total Games' },
                { icon: 'trophy' as const, value: stats.totalWins, label: 'Total Wins' },
                { icon: 'trending-up' as const, value: `${stats.winRate.toFixed(0)}%`, label: 'Winning Rate' },
                { icon: 'home' as const, value: stats.housesCount, label: 'Houses' },
              ].map((st, i) => {
                return (
                  <View key={i} style={[s.statCard, {
                    borderColor: 'rgba(117,213,227,0.75)',
                    borderWidth: 1,
                    backgroundColor: '#0A0A0A',
                    overflow: 'hidden',
                  }]}>
                    <Image
                      source={require('@/assets/images/StarlightProwler.jpeg')}
                      style={{
                        position: 'absolute',
                        width: 280,
                        height: 280,
                        opacity: 0.3,
                      }}
                      resizeMode="cover"
                    />
                    <Ionicons name={st.icon} size={22} color="#FFFFFF" style={{ marginBottom: 8 }} />
                    <Text style={[s.statValue, { color: '#FFFFFF', fontWeight: '900', fontSize: 28 }]}>{st.value}</Text>
                    <Text style={[s.statLabel, { color: 'rgba(255,255,255,0.75)', letterSpacing: 0.8 }]}>{st.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : activeKit?.name === 'Golden Bushido' ? (
          <View style={{
            marginHorizontal: 0,
            marginTop: 0,
            backgroundColor: '#000000',
            paddingHorizontal: 16,
            paddingBottom: 20,
            paddingTop: 8,
          }}>
            <View style={[s.statGrid, { paddingHorizontal: 0, marginBottom: 0 }]}>
              {[
                { icon: 'game-controller' as const, value: stats.totalGames, label: 'Total Games' },
                { icon: 'trophy' as const, value: stats.totalWins, label: 'Total Wins' },
                { icon: 'trending-up' as const, value: `${stats.winRate.toFixed(0)}%`, label: 'Winning Rate' },
                { icon: 'home' as const, value: stats.housesCount, label: 'Houses' },
              ].map((st, i) => (
                <View key={i} style={[s.statCard, {
                  borderColor: 'rgba(255,215,0,0.75)',
                  borderWidth: 1,
                  backgroundColor: '#0A0A0F',
                  overflow: 'hidden',
                  shadowColor: '#FFD700',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.12,
                  shadowRadius: 10,
                  elevation: 4,
                }]}>
                  <LinearGradient
                    colors={['#0F172A', '#080810', '#000000']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                  />
                  <LinearGradient
                    colors={['rgba(201,162,39,0.12)', 'transparent']}
                    start={{ x: 1, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                  />
                  <Ionicons name={st.icon} size={22} color="#FFFFFF" style={{ marginBottom: 8 }} />
                  <Text style={[s.statValue, { color: GB_GOLD, fontWeight: '900', fontSize: 28 }]}>{st.value}</Text>
                  <Text style={[s.statLabel, { color: GB_GOLD, letterSpacing: 0.8 }]}>{st.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : activeKit?.name === 'Phantom Void' ? (
          <View style={{
            marginHorizontal: 0,
            marginTop: 0,
            backgroundColor: 'transparent',
            paddingHorizontal: 16,
            paddingBottom: 20,
            paddingTop: 8,
          }}>
            <View style={[s.statGrid, { paddingHorizontal: 0, marginBottom: 0 }]}>
              {[
                { icon: 'game-controller' as const, value: stats.totalGames, label: 'Total Games', iconColor: '#FF9F43' },
                { icon: 'trophy' as const, value: stats.totalWins, label: 'Total Wins', iconColor: PV_CYAN },
                { icon: 'trending-up' as const, value: `${stats.winRate.toFixed(0)}%`, label: 'Win Rate', iconColor: '#4ADE80' },
                { icon: 'home' as const, value: stats.housesCount, label: 'Houses', iconColor: '#FACC15' },
              ].map((st, i) => (
                <View key={i} style={[s.statCard, s.glossyCard, {
                  overflow: 'hidden',
                  elevation: 6,
                }]}>
                  <Ionicons name={st.icon} size={22} color={st.iconColor} style={{ marginBottom: 8 }} />
                  <Text style={[s.statValue, { color: '#FFFFFF', fontWeight: '900', fontSize: 28 }, PV_TEXT_SHADOW]}>{st.value}</Text>
                  <Text style={[s.statLabel, { color: 'rgba(255,255,255,0.55)', letterSpacing: 0.8 }]}>{st.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : activeKit?.name === 'Stellar' ? (
          <View style={{
            marginHorizontal: 0,
            marginTop: 0,
            backgroundColor: 'transparent',
            paddingHorizontal: 16,
            paddingBottom: 20,
            paddingTop: 8,
          }}>
            <View style={[s.statGrid, { paddingHorizontal: 0, marginBottom: 0 }]}>
              {[
                { icon: 'game-controller' as const, value: stats.totalGames, label: 'Total Games', iconColor: '#FF9F43' },
                { icon: 'trophy' as const, value: stats.totalWins, label: 'Total Wins', iconColor: ST_SILVER },
                { icon: 'trending-up' as const, value: `${stats.winRate.toFixed(0)}%`, label: 'Win Rate', iconColor: '#4ADE80' },
                { icon: 'home' as const, value: stats.housesCount, label: 'Houses', iconColor: '#FACC15' },
              ].map((st, i) => (
                <View key={i} style={[s.statCard, s.glossyCard, {
                  overflow: 'hidden',
                  elevation: 6,
                }]}>
                  <Ionicons name={st.icon} size={22} color={st.iconColor} style={{ marginBottom: 8 }} />
                  <Text style={[s.statValue, { color: '#FFFFFF', fontWeight: '900', fontSize: 28 }, ST_TEXT_SHADOW]}>{st.value}</Text>
                  <Text style={[s.statLabel, { color: 'rgba(255,255,255,0.55)', letterSpacing: 0.8 }]}>{st.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : activeKit?.name === 'Neon Pulse' ? (
          <View style={{
            marginHorizontal: 0,
            marginTop: 0,
            backgroundColor: 'transparent',
            paddingHorizontal: 16,
            paddingBottom: 20,
            paddingTop: 8,
          }}>
            <View style={[s.statGrid, { paddingHorizontal: 0, marginBottom: 0 }]}>
              {[
                { icon: 'game-controller' as const, value: stats.totalGames, label: 'Total Games', iconColor: '#FF9F43' },
                { icon: 'trophy' as const, value: stats.totalWins, label: 'Total Wins', iconColor: NP_CYAN },
                { icon: 'trending-up' as const, value: `${stats.winRate.toFixed(0)}%`, label: 'Win Rate', iconColor: '#4ADE80' },
                { icon: 'home' as const, value: stats.housesCount, label: 'Houses', iconColor: '#FACC15' },
              ].map((st, i) => (
                <View key={i} style={[s.statCard, s.glossyCard, {
                  overflow: 'hidden',
                  elevation: 6,
                }]}>
                  <Ionicons name={st.icon} size={22} color={st.iconColor} style={{ marginBottom: 8 }} />
                  <Text style={[s.statValue, { color: '#FFFFFF', fontWeight: '900', fontSize: 28 }, NP_TEXT_SHADOW]}>{st.value}</Text>
                  <Text style={[s.statLabel, { color: 'rgba(255,255,255,0.55)', letterSpacing: 0.8 }]}>{st.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : activeKit?.name === 'Obsidian Gold' ? (
          <View style={{
            marginHorizontal: 0,
            marginTop: 0,
            backgroundColor: 'transparent',
            paddingHorizontal: 16,
            paddingBottom: 20,
            paddingTop: 8,
          }}>
            <View style={[s.statGrid, { paddingHorizontal: 0, marginBottom: 0 }]}>
              {[
                { icon: 'game-controller' as const, value: stats.totalGames, label: 'Total Games', iconColor: '#FF9F43' },
                { icon: 'trophy' as const, value: stats.totalWins, label: 'Total Wins', iconColor: OG_GOLD },
                { icon: 'trending-up' as const, value: `${stats.winRate.toFixed(0)}%`, label: 'Win Rate', iconColor: '#4ADE80' },
                { icon: 'home' as const, value: stats.housesCount, label: 'Houses', iconColor: '#FACC15' },
              ].map((st, i) => (
                <View key={i} style={[s.statCard, s.glossyCard, {
                  overflow: 'hidden',
                  // elevation: 6,
                }]}>
                  <BlurView
                    intensity={10}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons name={st.icon} size={22} color={st.iconColor} style={{ marginBottom: 8 }} />
                  <Text style={[s.statValue, { color: '#FFFFFF', fontWeight: '900', fontSize: 28 }, OG_TEXT_SHADOW]}>{st.value}</Text>
                  <Text style={[s.statLabel, { color: 'rgba(255,255,255,0.55)', letterSpacing: 0.8 }]}>{st.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : activeKit?.name === 'Prismatic' ? (
          <View style={{
            marginHorizontal: 0,
            marginTop: 0,
            backgroundColor: 'transparent',
            paddingHorizontal: 16,
            paddingBottom: 20,
            paddingTop: 8,
          }}>
            <View style={[s.statGrid, { paddingHorizontal: 0, marginBottom: 0 }]}>
              {[
                { icon: 'game-controller' as const, value: stats.totalGames, label: 'Total Games' },
                { icon: 'trophy' as const, value: stats.totalWins, label: 'Total Wins' },
                { icon: 'trending-up' as const, value: `${stats.winRate.toFixed(0)}%`, label: 'Winning Rate' },
                { icon: 'home' as const, value: stats.housesCount, label: 'Houses' },
              ].map((st, i) => (
                <View key={i} style={[s.statCard, {
                  borderColor: 'rgba(157,0,255,0.7)',
                  borderWidth: 1,
                  backgroundColor: 'transparent',
                  overflow: 'hidden',
                  shadowColor: PR_VIOLET,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 4,
                }]}>
                  <LinearGradient
                    colors={['rgba(0,0,0,0.48)', 'rgba(0,0,0,0.4)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                  />
                  <Ionicons name={st.icon} size={22} color="#FFFFFF" style={{ marginBottom: 8 }} />
                  <Text style={[s.statValue, { color: '#FFFFFF', fontWeight: '900', fontSize: 28 }, PR_TEXT_SHADOW]}>{st.value}</Text>
                  <Text style={[s.statLabel, { color: 'rgba(255,255,255,0.9)', letterSpacing: 0.8 }, PR_TEXT_SHADOW]}>{st.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={s.statGrid}>
            {[
              { icon: 'game-controller' as const, value: stats.totalGames, label: 'Total Games' },
              { icon: 'trophy' as const, value: stats.totalWins, label: 'Total Wins' },
              { icon: 'trending-up' as const, value: `${stats.winRate.toFixed(0)}%`, label: 'Win Rate' },
              { icon: 'home' as const, value: stats.housesCount, label: 'Houses' },
            ].map((st, i) => (
              <View key={i} style={[
                s.statCard,
                activeKit?.name === 'Liquid Metal Candy' && s.lmcStatCard && { borderColor: getRarityColor(activeKit.name), borderWidth: 1 },
                activeKit?.name === 'Golden Bushido' && {
                  overflow: 'hidden',
                },
                activeKit && activeKit.name !== 'Liquid Metal Candy' && activeKit.name !== 'Golden Bushido' && activeKit.name !== 'Phantom Void' && i === 0 && { borderColor: getRarityColor(activeKit?.name) + '80' }
              ]}>
                {activeKit?.name === 'Liquid Metal Candy' && (
                  <>
                    <Image
                      source={require('@/assets/images/LiquidMetalProfile.jpeg')}
                      style={{
                        position: 'absolute',
                        width: 320, height: 320,
                        // top: i < 2 ? -30 : -160,
                        // left: i % 2 === 0 ? -30 : -160,
                      }}
                      resizeMode="cover"
                    />
                    <BlurView
                      intensity={40}
                      tint="dark"
                      style={StyleSheet.absoluteFill}
                    />

                    {/* Gradient Overlay */}
                    <LinearGradient
                      colors={[
                        'rgba(0,0,0,1)',
                        'rgba(0,0,0,0.75)',
                        'rgba(0,0,0,0.35)',
                        'transparent',
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </>
                )}
                {activeKit?.name === 'Golden Bushido' && (
                  <LinearGradient
                    colors={['#000000', '#110c05']}
                    start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                  />
                )}
                <Ionicons name={st.icon} size={24}
                  color={activeKit?.name === 'Golden Bushido' ? '#FFFFFF' : '#FFFFFF'}
                  style={{ marginBottom: 6 }}
                />
                <Text style={[s.statValue,
                activeKit?.name === 'Golden Bushido' && { color: '#C9A227', fontWeight: '900', fontSize: 28 }
                ]}>{st.value}</Text>
                <Text style={[s.statLabel,
                activeKit?.name === 'Golden Bushido' && { color: '#C9A227', letterSpacing: 0.8 }
                ]}>{st.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* REFERRAL — only show if not premium */}
        {!isPremium && (
          <View style={s.section}>
            <ReferralProgress />
          </View>
        )}


        {/* GAME HISTORY */}
        {gameHistory.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={[s.sectionTitle, activeKit?.name === 'Prismatic' && PR_TEXT_SHADOW]}>Recent Games</Text>
              {gameHistory.length >= 10 && (
                <Pressable onPress={() => setShowAllHistory(!showAllHistory)}>
                  <Text style={s.seeAll}>{showAllHistory ? 'Less' : 'See All'}</Text>
                </Pressable>
              )}
            </View>
            <View style={s.gap}>
              {gameHistory.map((game) => (
                <View key={game.id} style={[s.historyRow, s.glossyCard, game.isWinner && s.historyWin,
                ]}>
                  <View style={s.historyEmojiBg}>
                    <Text style={{ fontSize: 22 }}>{game.gameEmoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.historyGame} numberOfLines={1}>{game.gameName}</Text>
                    <Text style={s.historyHouse} numberOfLines={1}>{game.houseName}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    {game.isWinner && (
                      <View style={s.winTag}>
                        <Ionicons name="trophy" size={10} color="#FFD700" />
                        <Text style={s.winTagText}>Win</Text>
                      </View>
                    )}
                    <Text style={s.historyScore} numberOfLines={1}>
                      {formatScore(game.score, game.scoringType, {
                        hits: game.accuracyHits,
                        attempts: game.accuracyAttempts,
                        numerator: game.ratioNumerator,
                        denominator: game.ratioDenominator,
                      })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}


        {/* LEADERBOARD */}
        {leaderboard.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={[s.sectionTitle, activeKit?.name === 'Prismatic' && PR_TEXT_SHADOW]}>Friends Leaderboard</Text>
            </View>
            <View style={s.gap}>
              {leaderboard.map((entry, i) => (
                <View key={entry.id} style={[s.lbRow, s.glossyCard,
                ]}>
                  <View style={[s.lbRank, i === 0 && s.lbGold, i === 1 && s.lbSilver, i === 2 && s.lbBronze]}>
                    <Text style={s.lbRankText}>{i + 1}</Text>
                  </View>
                  <View style={s.lbAvatar}>
                    {entry.profilePhotoUrl ? (
                      <Image source={{ uri: entry.profilePhotoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <Text style={s.lbAvatarText}>{(entry.username || 'U').charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.lbName} numberOfLines={1}>{entry.username}</Text>
                    <Text style={s.lbSub} numberOfLines={1}>{entry.wins} wins · {entry.winRate.toFixed(0)}% WR</Text>
                  </View>
                  {i < 3 && <Text style={{ fontSize: 20 }}>{['🥇', '🥈', '🥉'][i]}</Text>}
                </View>
              ))}
            </View>
          </View>
        )}




        {/* MENU */}
        <View style={s.section}>
          <View style={[s.glossyCard,
          { borderRadius: 16, paddingVertical: 8, }
          ]}>
            {[
              { icon: 'settings-outline', label: 'Profile Settings', sub: 'Edit name, photo & kit', onPress: () => router.push('/profile-settings') },
              { icon: 'document-text-outline', label: 'Legal & Policies', sub: 'Terms, privacy & refunds', onPress: () => router.push('/legal') },
            ].map((item, i, arr) => (
              <Pressable
                key={i}
                style={({ pressed }) => [s.menuRow, pressed && { opacity: 0.7 }, i < arr.length - 1 && s.menuDivider]}
                onPress={item.onPress}
              >
                <View style={s.menuIconBox}>
                  <Ionicons name={item.icon as any} size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.menuLabel}>{item.label}</Text>
                  <Text style={s.menuSub}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
              </Pressable>
            ))}
          </View>
        </View>




        {/* SIGN OUT */}
        <View style={[s.section, { marginBottom: 40 }]}>
          <Pressable
            style={({ pressed }) => [s.signOutBtn, (signingOut || pressed) && { opacity: 0.7 }]}
            onPress={handleSignOut}
            disabled={signingOut}
          >
            {signingOut
              ? <ActivityIndicator size="small" color="#000000" />
              : <><Ionicons name="log-out-outline" size={16} color="#000000" /><Text style={s.signOutText}>Sign Out</Text></>
            }
          </Pressable>
        </View>


        <PremiumPurchaseModal visible={showPremiumModal} onClose={() => setShowPremiumModal(false)} />

        {/* ── Custom Professional Alert ── */}
        <Modal visible={customAlert.visible} transparent animationType="fade" onRequestClose={() => setCustomAlert(a => ({ ...a, visible: false }))}>
          <Pressable style={pa.overlay} onPress={() => setCustomAlert(a => ({ ...a, visible: false }))}>
            <Pressable style={pa.box} onPress={(e: any) => e.stopPropagation()}>
              <View style={[pa.iconCircle, {
                backgroundColor: customAlert.type === 'success' ? 'rgba(255,255,255,0.08)'
                  : customAlert.type === 'error' ? 'rgba(239,68,68,0.15)'
                    : 'rgba(74,123,247,0.15)',
              }]}>
                <Ionicons
                  name={customAlert.type === 'success' ? 'checkmark-circle' : customAlert.type === 'error' ? 'close-circle' : customAlert.type === 'confirm' ? 'help-circle' : 'information-circle'}
                  size={36}
                  color={customAlert.type === 'success' ? '#FFFFFF' : customAlert.type === 'error' ? '#EF4444' : '#4A7BF7'}
                />
              </View>
              <Text style={pa.title}>{customAlert.title}</Text>
              <Text style={pa.message}>{customAlert.message}</Text>
              <View style={pa.btnRow}>
                {customAlert.type === 'confirm' && (
                  <Pressable style={pa.cancelBtn} onPress={() => setCustomAlert(a => ({ ...a, visible: false }))}>
                    <Text style={pa.cancelTxt}>Cancel</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[pa.confirmBtn, {
                    backgroundColor: customAlert.type === 'confirm' ? '#4A7BF7' : '#FFFFFF',
                    flex: customAlert.type === 'confirm' ? 1 : undefined,
                    minWidth: customAlert.type !== 'confirm' ? 120 : undefined,
                  }]}
                  onPress={() => {
                    setCustomAlert(a => ({ ...a, visible: false }));
                    if (customAlert.onConfirm) customAlert.onConfirm();
                  }}
                >
                  <Text style={[pa.confirmTxt, {
                    color: customAlert.type === 'confirm' ? '#FFFFFF' : '#000000',
                  }]}>{customAlert.type === 'confirm' ? (customAlert.confirmText || 'Confirm') : 'OK'}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView >
    </ScrollView >
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 120, backgroundColor: '#000000' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 16,
    backgroundColor: '#000000',
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#111111',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

  // Hero — card style with banner + overlapping avatar
  heroSection: {
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  lmcDarkSheet: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: '#000000',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    zIndex: 1,
  },
  heroBanner: {
    height: Platform.OS === 'android' ? 130 + (StatusBar.currentHeight || 24) : 130,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  bannerBackBtn: {
    position: 'absolute',
    left: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 10,
  },
  settingsBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(20, 20, 20, 0.9)",
    borderColor: "rgba(255,255,255,0.3)",
    borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  orbContainer: { overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999, opacity: 0.5 },
  orb1: { width: 160, height: 160, bottom: -60, right: -20 },
  orb2: { width: 120, height: 120, top: -40, left: -20, opacity: 0.35 },
  orb3: { width: 80, height: 80, top: 20, right: 60, opacity: 0.25 },
  avatarWrap: {
    position: 'relative',
    alignSelf: 'center',
    marginTop: -52, // overlap the banner
    zIndex: 10,
  },
  avatarOuter: {
    width: 104, height: 104, borderRadius: 52,
    overflow: 'hidden',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: '#000000',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: {
    width: '100%', height: '100%',
    backgroundColor: '#1A1A1A',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontSize: 40, fontWeight: '800', color: '#FFFFFF' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
    zIndex: 10,
    elevation: 10,
  },
  heroInfo: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 8,
  },
  heroName: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  kitBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    marginTop: 2,
  },
  kitBadgeTxt: { fontSize: 13, fontWeight: '700' },
  rarityDot: { width: 6, height: 6, borderRadius: 3 },
  rarityTxt: { fontSize: 11, fontWeight: '600' },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(74,123,247,0.15)',
    borderWidth: 1, borderColor: 'rgba(74,123,247,0.4)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    marginTop: 4,
  },
  premiumBadgeText: { fontSize: 12, fontWeight: '700', color: '#4A7BF7' },
  upgradeBadge: {
    backgroundColor: '#4A7BF7',
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    marginTop: 4,
  },
  upgradeBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  // Stat grid
  statGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 12, paddingHorizontal: 16, marginBottom: 4,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  // statCard: {
  //   width: '47%',
  //   backgroundColor: '#111111',
  //   borderRadius: 20, padding: 18,
  //   borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  //   alignItems: 'flex-start', gap: 4,
  //   overflow: 'hidden',
  // },
  statEmoji: { fontSize: 26, marginBottom: 4 },
  statValue: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: '#fff', fontWeight: '300', textTransform: 'uppercase', letterSpacing: 0.4 },

  // Sections
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
  seeAll: { fontSize: 12, fontWeight: '700', color: '#4A7BF7' },
  gap: { gap: 10 },

  // History
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14,
    borderRadius: 16,
  },
  historyWin: { borderColor: 'rgba(255,215,0,0.25)', backgroundColor: 'rgba(255,215,0,0.04)' },
  historyEmojiBg: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  historyGame: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  historyHouse: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  historyScore: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  winTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  winTagText: { fontSize: 10, fontWeight: '700', color: '#FFD700' },

  // Leaderboard
  lbRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 14,
  },
  lbRank: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  lbGold: { backgroundColor: 'rgba(255,215,0,0.1)', borderColor: 'rgba(255,215,0,0.3)' },
  lbSilver: { backgroundColor: 'rgba(192,192,192,0.1)', borderColor: 'rgba(192,192,192,0.3)' },
  lbBronze: { backgroundColor: 'rgba(205,127,50,0.1)', borderColor: 'rgba(205,127,50,0.3)' },
  lbRankText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  lbAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#1A1A1A', overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
  },
  lbAvatarText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  lbName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  lbSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.8)' },
  menuIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  menuSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20,
    alignSelf: 'flex-start',
  },
  signOutIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,68,68,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  signOutText: { color: '#000000', fontSize: 14, fontWeight: '700' },

  // Liquid Metal Candy specific styles
  lmcPremiumBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1, borderColor: getRarityColor('Liquid Metal Candy') + '80',
    backgroundColor: getRarityColor('Liquid Metal Candy') + '80',
  },
  lmcPremiumBtnTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
  spPremiumBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#75D5E3',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  spPremiumBtnTxt: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
  gbPremiumBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  gbPremiumBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  ctPremiumBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#AAFF00',
    backgroundColor: 'rgba(220,220,220,0.92)',
  },
  ctPremiumBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  prPremiumBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(157,0,255,0.75)',
    backgroundColor: PR_OVERLAY,
  },
  prPremiumBtnTxt: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  stPremiumBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  stPremiumBtnTxt: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  pvPremiumBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  pvPremiumBtnTxt: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  ogPremiumBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.55)',
    backgroundColor: OG_OVERLAY,
  },
  ogPremiumBtnTxt: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  npPremiumBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.55)',
    backgroundColor: NP_OVERLAY,
  },
  npPremiumBtnTxt: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  lmcCard: {
    marginHorizontal: 16,
    // borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
    zIndex: 5,
  },
  glossyCard: {
    backgroundColor: "rgba(20, 20, 20, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    padding: 18,
    // Soft glossy shadow
    shadowRadius: 30,
    // Optional blur feel
    overflow: "hidden",
    // Slight inner glow feel
    position: "relative",
  },
  lmcAvatarBox: { position: 'relative', overflow: 'visible' },
  lmcAvatarOuter: {
    width: 80, height: 80, borderRadius: 45,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  lmcCardInfo: { flex: 1, gap: 4 },
  lmcCardName: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  lmcCardBio: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  lmcPillWrap: { alignItems: 'center', marginTop: 14, marginBottom: 4 },
  lmcPill: {
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 30,
  },
  lmcPillTxt: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.3 },
  lmcStatCard: {
    borderColor: 'rgba(167,139,250,0.5)',
    backgroundColor: '#0D0D0D',
    overflow: 'hidden',
  },
});




const pa = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  box: {
    backgroundColor: '#111111', borderRadius: 24, padding: 28,
    width: '100%', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 24, elevation: 16,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: -0.3, textAlign: 'center',
  },
  message: {
    fontSize: 14, color: 'rgba(255,255,255,0.55)',
    textAlign: 'center', lineHeight: 22,
  },
  btnRow: {
    flexDirection: 'row', gap: 10, marginTop: 8, width: '100%',
  },
  cancelBtn: {
    flex: 1, backgroundColor: '#1A1A1A',
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelTxt: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  confirmBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  confirmTxt: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
