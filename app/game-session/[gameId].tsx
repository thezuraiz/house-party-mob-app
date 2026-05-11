import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import NeuIcon from '@/components/NeuIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useBadge } from '@/contexts/BadgeContext';
import { usePremium } from '@/contexts/PremiumContext';
import UserAvatar from '@/components/UserAvatar';
import EnhancedPlayerCard from '@/components/EnhancedPlayerCard';
import WinnerCelebrationModal from '@/components/WinnerCelebrationModal';
import KitUnlockCelebration from '@/components/KitUnlockCelebration';
import { getScoringTypeConfig, determineWinner, formatScore, type ScoringType } from '@/constants/ScoringTypes';
import { ScoreInputTimer } from '@/components/ScoreInputTimer';
import { ScoreInputQuickTally } from '@/components/ScoreInputQuickTally';
import { ScoreInputMeasurement } from '@/components/ScoreInputMeasurement';
import { ScoreInputAccuracy } from '@/components/ScoreInputAccuracy';
import { ScoreInputAccuracySimple } from '@/components/ScoreInputAccuracySimple';
import { ScoreInputRatio } from '@/components/ScoreInputRatio';
import { ScoreInputPosition } from '@/components/ScoreInputPosition';
import { ScoreInputUnit } from '@/components/ScoreInputUnit';
import { type DistanceUnit, type WeightUnit } from '@/lib/unitConversions';

type Player = {
  id: string; // For UI reference (could be house_member id or temp id)
  user_id: string; // ALWAYS the actual user's UUID from auth.users
  nickname: string;
  score: number;
  accuracy_hits?: number;
  accuracy_attempts?: number;
  ratio_numerator?: number;
  ratio_denominator?: number;
  input_metadata?: any; // Stores displayValue, unit, etc. for distance/weight
};

type Winner = {
  id: string;
  nickname: string;
  score: number;
};

type PlayerCardProps = {
  player: Player;
  scoringType: ScoringType;
  scoringUnit: string;
  distanceUnit?: DistanceUnit;
  weightUnit?: WeightUnit;
  maxAttempts?: number;
  totalPlayers: number;
  onUpdateScore: (playerId: string, change: number) => void;
  onSetDirectScore: (playerId: string, score: number, metadata?: any) => void;
};

function PlayerCard({ player, scoringType, scoringUnit, distanceUnit, weightUnit, maxAttempts, totalPlayers, onUpdateScore, onSetDirectScore }: PlayerCardProps) {
  const scoringConfig = getScoringTypeConfig(scoringType);

  // Get the actual display unit based on the scoring type
  const getDisplayUnit = () => {
    if (scoringType === 'distance' && distanceUnit) {
      return distanceUnit;
    }
    if (scoringType === 'weight' && weightUnit) {
      return weightUnit;
    }
    return scoringConfig.unit;
  };

  const displayUnit = getDisplayUnit();

  const handleScoreChange = useCallback((newScore: number, metadata?: any) => {
    onSetDirectScore(player.id, newScore, metadata);
  }, [player.id, onSetDirectScore]);

  const renderScoreInput = () => {
    switch (scoringConfig.inputMode) {
      case 'timer':
        return (
          <ScoreInputTimer
            initialValue={player.score}
            unit={scoringConfig.unit}
            onValueChange={handleScoreChange}
            allowDecimals={scoringConfig.allowDecimals}
          />
        );
      case 'quick_tally':
        return (
          <ScoreInputQuickTally
            initialValue={player.score}
            unit={scoringConfig.unit}
            step={scoringConfig.step}
            allowDecimals={scoringConfig.allowDecimals}
            onValueChange={handleScoreChange}
          />
        );
      case 'accuracy_dual':
        if (maxAttempts && maxAttempts > 0) {
          return (
            <ScoreInputAccuracySimple
              initialHits={player.accuracy_hits || 0}
              maxAttempts={maxAttempts}
              onValueChange={(score, hits, attempts) => {
                handleScoreChange(score, { hits, attempts });
              }}
            />
          );
        }
        return (
          <ScoreInputAccuracy
            initialHits={player.accuracy_hits || 0}
            initialAttempts={player.accuracy_attempts || 0}
            onValueChange={(score, hits, attempts) => {
              handleScoreChange(score, { hits, attempts });
            }}
          />
        );
      case 'ratio_dual':
        return (
          <ScoreInputRatio
            initialNumerator={player.ratio_numerator || 0}
            initialDenominator={player.ratio_denominator || 1}
            onValueChange={(score, numerator, denominator) => {
              handleScoreChange(score, { numerator, denominator });
            }}
          />
        );
      case 'position_selector':
        return (
          <ScoreInputPosition
            initialPosition={player.score || 1}
            totalPlayers={totalPlayers}
            onValueChange={handleScoreChange}
          />
        );
      case 'unit_measurement':
        const unit = scoringType === 'distance' ? distanceUnit : weightUnit;
        return (
          <ScoreInputUnit
            initialValue={player.score}
            measurementType={scoringType === 'distance' ? 'distance' : 'weight'}
            unit={unit as any}
            allowDecimals={scoringConfig.allowDecimals}
            onValueChange={(canonical, display) => {
              handleScoreChange(canonical, { displayValue: display, unit });
            }}
          />
        );
      case 'measurement':
        return (
          <ScoreInputMeasurement
            initialValue={player.score}
            unit={scoringConfig.unit}
            allowDecimals={scoringConfig.allowDecimals}
            quickPresets={scoringConfig.quickPresets}
            onValueChange={handleScoreChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.playerCard}>
      <View style={styles.playerHeader}>
        <View style={styles.playerNameRow}>
          <View style={styles.playerAvatar}>
            <Text style={styles.playerAvatarText}>{(player.nickname || 'P').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.playerName}>{player.nickname}</Text>
        </View>
        <View style={styles.scoringTypeIndicator}>
          <Text style={styles.scoringEmoji}>{scoringConfig.emoji}</Text>
          <Text style={styles.scoringLabel}>{displayUnit}</Text>
        </View>
      </View>
      {renderScoreInput()}
    </View>
  );
}

export default function GameSessionScreen() {
  const { gameId, sessionId: existingSessionId } = useLocalSearchParams();
  const [game, setGame] = useState<any>(null);
  const [houseMembers, setHouseMembers] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [invitationStatuses, setInvitationStatuses] = useState<Map<string, string>>(new Map());
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [houseCreatorId, setHouseCreatorId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [isTie, setIsTie] = useState(false);
  const [badgeAwarded, setBadgeAwarded] = useState<{ name: string; icon: string } | undefined>();
  const [showKitUnlock, setShowKitUnlock] = useState(false);
  const [unlockedKit, setUnlockedKit] = useState<{ name: string; rarity: 'legendary' | 'mythic' } | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [scoringType, setScoringType] = useState<ScoringType>('points');
  const [scoringUnit, setScoringUnit] = useState<string>('points');
  const [lowerIsBetter, setLowerIsBetter] = useState<boolean>(false);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('meters');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [maxAttempts, setMaxAttempts] = useState<number>(10);
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
  const { user } = useAuth();
  const { checkBadge } = useBadge();
  const { isPremium } = usePremium();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Debounce timers to prevent database deadlocks
  const scoreUpdateTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingUpdatesRef = useRef<Map<string, any>>(new Map());
  const isMountedRef = useRef<boolean>(true);
  const isFinalizingRef = useRef<boolean>(false);

  useEffect(() => {
    isMountedRef.current = true;
    fetchGameData();

    return () => {
      isMountedRef.current = false;
      // Clear all pending timers on unmount
      scoreUpdateTimersRef.current.forEach(timer => clearTimeout(timer));
      scoreUpdateTimersRef.current.clear();
      pendingUpdatesRef.current.clear();
    };
  }, []);

  const checkInvitationStatus = useCallback(async () => {
    if (!sessionId) return;

    const { data: invites } = await supabase
      .from('game_invitations')
      .select('invitee_id, status')
      .eq('game_session_id', sessionId);

    if (invites) {
      // Update pending invitations
      setPendingInvitations(invites.filter(inv => inv.status === 'pending'));

      // Update invitation statuses map
      const statusMap = new Map<string, string>();
      invites.forEach(invite => {
        statusMap.set(invite.invitee_id, invite.status);
      });
      setInvitationStatuses(statusMap);

      console.log('[GAME SESSION] Invitation statuses updated:', Array.from(statusMap.entries()));
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    // Subscribe to invitation changes
    const channel = supabase
      .channel(`invitations-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_invitations',
          filter: `game_session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('[GAME SESSION] Invitation changed:', payload);
          checkInvitationStatus();
        }
      )
      .subscribe();

    checkInvitationStatus();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, checkInvitationStatus]);

  useFocusEffect(
    useCallback(() => {
      // Refetch game data when screen gains focus
      // This ensures removed friends don't appear in player list
      if (gameId && user) {
        fetchGameData();
      }
    }, [gameId, user])
  );

  const fetchGameData = async () => {
    if (!gameId || !user) return;

    const { data: gameData } = await supabase
      .from('games')
      .select('*, houses(id, name, creator_id)')
      .eq('id', gameId)
      .is('deleted_at', null)
      .maybeSingle();

    if (gameData) {
      setGame(gameData);
      setScoringType(gameData.scoring_type || 'points');
      setScoringUnit(gameData.scoring_unit || 'points');
      setLowerIsBetter(gameData.lower_is_better || false);
      setDistanceUnit(gameData.distance_unit || 'meters');
      setWeightUnit(gameData.weight_unit || 'kg');
      setMaxAttempts(gameData.max_attempts || 10);

      // Store house creator ID
      const creatorId = gameData.houses?.creator_id;
      setHouseCreatorId(creatorId);

      // Check if current user is admin or creator
      const isCreator = creatorId === user.id;

      // Check if user is an admin in house_members
      const { data: memberData } = await supabase
        .from('house_members')
        .select('role')
        .eq('house_id', gameData.houses.id)
        .eq('user_id', user.id)
        .maybeSingle();

      const isMemberAdmin = memberData?.role === 'admin';
      const userIsAdmin = isCreator || isMemberAdmin;
      setIsUserAdmin(userIsAdmin);

      console.log('[GAME SESSION] Admin check:', { isCreator, isMemberAdmin, userIsAdmin });

      // Fetch current friendships with bidirectional validation
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select(`
          id,
          friend_id,
          profiles!friendships_friend_id_fkey(
            id,
            username,
            avatar_url
          )
        `)
        .eq('user_id', user.id);

      if (friendshipsError) {
        console.log('[GAME SESSION] Error fetching friendships:', friendshipsError);
      }

      // Get blocked users to filter them out
      const { data: blockedUsers } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      const blockedIds = new Set(blockedUsers?.map(b => b.blocked_id) || []);

      // Add the creator to available players (needed for both branches)
      const [creatorHouseMemberResult, creatorSettingsResult, creatorProfileResult] = await Promise.all([
        supabase
          .from('house_members')
          .select('id, nickname, role')
          .eq('house_id', gameData.houses.id)
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_profile_settings')
          .select('display_name, equipped_house_kit_id')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .maybeSingle()
      ]);

      const creatorHouseMember = creatorHouseMemberResult.data;
      const creatorSettings = creatorSettingsResult.data;
      const creatorProfile = creatorProfileResult.data;
      const creatorIsAdmin = creatorHouseMember?.role === 'admin' || user.id === creatorId;

      const creatorPlayer = {
        id: creatorHouseMember?.id || `friend-${user.id}`,
        user_id: user.id,
        nickname: creatorHouseMember?.nickname || creatorSettings?.display_name || creatorProfile?.username || 'You',
        username: creatorProfile?.username || 'You',
        avatar_url: creatorProfile?.avatar_url || null,
        is_house_member: !!creatorHouseMember,
        is_admin: creatorIsAdmin,
        equipped_house_kit_id: creatorSettings?.equipped_house_kit_id || null,
      };

      if (friendships && friendships.length > 0) {
        // Verify bidirectional friendships (both users must have each other as friends)
        const friendIds = friendships.map(f => f.friend_id);
        const { data: reverseFriendships } = await supabase
          .from('friendships')
          .select('user_id, friend_id')
          .in('user_id', friendIds)
          .eq('friend_id', user.id);

        // Create a Set of validated friend IDs (friends who also have you as a friend)
        const validFriendIds = new Set(
          reverseFriendships?.map(rf => rf.user_id) || []
        );

        // Filter to only include bidirectional friendships that aren't blocked
        const activeFriendships = friendships.filter(
          f => validFriendIds.has(f.friend_id) && !blockedIds.has(f.friend_id)
        );

        console.log('[GAME SESSION] Validated friendships:', {
          total: friendships.length,
          bidirectional: activeFriendships.length,
          blocked: blockedIds.size
        });

        const friendsWithSettings = await Promise.all(
          activeFriendships.map(async (f: any) => {
            const [settingsResult, houseMemberResult] = await Promise.all([
              supabase
                .from('user_profile_settings')
                .select('display_name, equipped_house_kit_id')
                .eq('user_id', f.friend_id)
                .maybeSingle(),
              supabase
                .from('house_members')
                .select('id, nickname, role')
                .eq('house_id', gameData.houses.id)
                .eq('user_id', f.friend_id)
                .maybeSingle()
            ]);

            const settings = settingsResult.data;
            const houseMember = houseMemberResult.data;
            const isAdmin = houseMember?.role === 'admin';
            const isCreator = f.friend_id === creatorId;

            return {
              id: houseMember?.id || `friend-${f.friend_id}`,
              user_id: f.friend_id,
              nickname: houseMember?.nickname || settings?.display_name || f.profiles?.username || 'Friend',
              username: f.profiles?.username || 'Friend',
              avatar_url: f.profiles?.avatar_url || null,
              is_house_member: !!houseMember,
              is_admin: isAdmin || isCreator,
              equipped_house_kit_id: settings?.equipped_house_kit_id || null,
            };
          })
        );

        const allPlayers = [creatorPlayer, ...friendsWithSettings];
        setFriends(allPlayers);
        setAvailablePlayers(allPlayers);

        // Auto-select the creator as a participant (they can add others but creator is always included)
        setSelectedPlayers([{
          id: creatorPlayer.user_id,
          user_id: creatorPlayer.user_id,
          nickname: creatorPlayer.nickname,
          score: 0,
        }]);

        // Check for existing pending or active game session for this game
        await loadExistingSession(gameData.houses.id, allPlayers);
      } else {
        // No friends, but still check for existing session
        // Auto-select the creator even if they have no friends
        setSelectedPlayers([{
          id: creatorPlayer.user_id,
          user_id: creatorPlayer.user_id,
          nickname: creatorPlayer.nickname,
          score: 0,
        }]);
        await loadExistingSession(gameData.houses.id, [creatorPlayer]);
      }
    }

    setLoading(false);
  };

  const loadExistingSession = async (houseId: string, allPlayers: any[]) => {
    if (!user || !gameId) return;

    // If we have an existingSessionId from URL params, use that
    let session: any = null;

    if (existingSessionId && typeof existingSessionId === 'string') {
      const { data: specificSession } = await supabase
        .from('game_sessions')
        .select('id, status')
        .eq('id', existingSessionId)
        .maybeSingle();

      if (specificSession) {
        session = specificSession;
        console.log('[GAME SESSION] Loading specific session from URL:', session.id);
      }
    }

    // Otherwise, check for existing pending or active game session for this game
    if (!session) {
      const { data: existingSessions } = await supabase
        .from('game_sessions')
        .select('id, status')
        .eq('game_id', gameId)
        .eq('created_by', user.id)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingSessions && existingSessions.length > 0) {
        session = existingSessions[0];
      }
    }

    if (session) {
      console.log('[GAME SESSION] Found existing session:', session.id, 'Status:', session.status);
      setSessionId(session.id);

      // Load invitation data for this session
      const { data: invitations } = await supabase
        .from('game_invitations')
        .select(`
          id,
          invitee_id,
          status,
          profiles!game_invitations_invitee_id_fkey(
            id,
            username,
            avatar_url
          )
        `)
        .eq('game_session_id', session.id);

      if (invitations && invitations.length > 0) {
        console.log('[GAME SESSION] Loaded invitations:', invitations);
        setPendingInvitations(invitations);

        // Build invitation statuses map
        const statusMap = new Map<string, string>();
        invitations.forEach(invite => {
          statusMap.set(invite.invitee_id, invite.status);
        });
        setInvitationStatuses(statusMap);
      }

      // Load all players (both house members and invited) for this session
      const { data: sessionScores } = await supabase
        .from('session_scores')
        .select('user_id, score, accuracy_hits, accuracy_attempts, ratio_numerator, ratio_denominator')
        .eq('session_id', session.id);

      // Build a Set of all unique player IDs (from scores + invitations)
      const allPlayerIds = new Set<string>();

      // Add players who have score entries
      sessionScores?.forEach(score => allPlayerIds.add(score.user_id));

      // Add invited players who may not have scores yet
      invitations?.forEach(invite => allPlayerIds.add(invite.invitee_id));

      if (allPlayerIds.size > 0) {
        const players = await Promise.all(
          Array.from(allPlayerIds).map(async (userId) => {
            const score = sessionScores?.find(s => s.user_id === userId);
            const playerData = allPlayers.find(p => p.user_id === userId);

            // If player data not in allPlayers, fetch it
            if (!playerData) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', userId)
                .maybeSingle();

              const { data: settings } = await supabase
                .from('user_profile_settings')
                .select('display_name')
                .eq('user_id', userId)
                .maybeSingle();

              return {
                id: userId,
                user_id: userId,
                nickname: settings?.display_name || profile?.username || 'Player',
                score: score?.score || 0,
                accuracy_hits: score?.accuracy_hits,
                accuracy_attempts: score?.accuracy_attempts,
                ratio_numerator: score?.ratio_numerator,
                ratio_denominator: score?.ratio_denominator,
              };
            }

            return {
              id: userId,
              user_id: userId,
              nickname: playerData.nickname || 'Player',
              score: score?.score || 0,
              accuracy_hits: score?.accuracy_hits,
              accuracy_attempts: score?.accuracy_attempts,
              ratio_numerator: score?.ratio_numerator,
              ratio_denominator: score?.ratio_denominator,
            };
          })
        );
        setSelectedPlayers(players);
        console.log('[GAME SESSION] Loaded session players (scores + invites):', players);
      }

      // Check if game has started (status is active)
      if (session.status === 'active') {
        setGameStarted(true);
        setGameEnded(false); // Reset for new game
      }
    }
  };

  const togglePlayer = (member: any) => {
    const existingPlayer = selectedPlayers.find((p) => p.user_id === member.user_id);
    if (existingPlayer) {
      // Prevent creator from being deselected - they must always be included
      if (member.user_id === user?.id) {
        console.log('[GAME SESSION] Cannot deselect creator - they must always be included');
        return;
      }
      setSelectedPlayers(selectedPlayers.filter((p) => p.user_id !== member.user_id));
    } else {
      setSelectedPlayers([
        ...selectedPlayers,
        // ALWAYS use user_id for both id and user_id to ensure consistency
        // id field is used for UI operations, user_id for database operations
        { id: member.user_id, user_id: member.user_id, nickname: member.nickname, score: 0 },
      ]);
    }
  };

  const startGame = async () => {
    try {
      console.log('[GAME SESSION] Start game button pressed');

      if (!user) {
        console.log('[GAME SESSION] No authenticated user');
        return;
      }

      if (selectedPlayers.length < 1) {
        console.log('[GAME SESSION] No players selected');
        return;
      }

      // Validate all players have user_id
      const invalidPlayers = selectedPlayers.filter(p => !p.user_id);
      if (invalidPlayers.length > 0) {
        console.log('[GAME SESSION] Invalid players without user_id:', invalidPlayers);
        return;
      }

      console.log('[GAME SESSION] Starting game with', selectedPlayers.length, 'player(s):', selectedPlayers);
      setLoading(true);

      console.log('[GAME SESSION] Creating game session...');

      // Separate house members from non-members to determine initial status
      // IMPORTANT: Always treat the game creator (admin) as a house member
      const houseMemberIds = selectedPlayers
        .filter(p => {
          const isCreator = p.user_id === user.id;
          const isHouseMember = availablePlayers.find(ap => ap.user_id === p.user_id)?.is_house_member;
          return isCreator || isHouseMember;
        })
        .map(p => p.user_id);

      const nonMemberIds = selectedPlayers
        .filter(p => !houseMemberIds.includes(p.user_id))
        .map(p => p.user_id);

      // Free users cannot send game invites to non-members
      if (nonMemberIds.length > 0 && !isPremium) {
        Alert.alert(
          'Premium Feature',
          'Sending game invites to players outside your house requires Premium. Upgrade to invite friends!',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      // Set status to 'pending' if there are non-members who need to accept invitations
      const initialStatus = nonMemberIds.length > 0 ? 'pending' : 'active';

      const { data: session, error } = await supabase
        .from('game_sessions')
        .insert({
          game_id: gameId,
          house_id: game.houses.id,
          status: initialStatus,
          created_by: user?.id,
          is_solo_game: selectedPlayers.length === 1,
        })
        .select()
        .single();

      if (error || !session) {
        console.log('[GAME SESSION] Error creating game session:', error);
        setLoading(false);
        return;
      }

      console.log('[GAME SESSION] Session created:', session.id, 'Status:', initialStatus);
      setSessionId(session.id);

      // IMPORTANT: Only create score entries when game actually starts (status = 'active')
      // Do NOT create scores during 'pending' status - they will be created when game starts
      if (initialStatus === 'active' && houseMemberIds.length > 0) {
        const scoreInserts = houseMemberIds.map((userId) => ({
          session_id: session.id,
          user_id: userId,
          score: 0,
          is_winner: false,
        }));

        console.log('[GAME SESSION] Ensuring score entries exist for house members (using UPSERT to avoid duplicates)...');
        const { error: scoresError } = await supabase
          .from('session_scores')
          .upsert(scoreInserts, {
            onConflict: 'session_id,user_id',
            ignoreDuplicates: false
          });

        if (scoresError) {
          console.log('[GAME SESSION] Error upserting scores:', scoresError);
        }
      } else {
        console.log('[GAME SESSION] Skipping score creation - game status is pending, scores will be created when game starts');
      }

      // Create invitations for non-members
      if (nonMemberIds.length > 0) {
        const invitations = nonMemberIds.map((playerId) => ({
          inviter_id: user.id,
          invitee_id: playerId,
          house_id: game.houses.id,
          game_id: gameId,
          game_session_id: session.id,
          status: 'pending',
        }));

        console.log('[GAME SESSION] Creating invitations for non-members...');
        const { data: createdInvites, error: inviteError } = await supabase
          .from('game_invitations')
          .insert(invitations)
          .select();

        if (inviteError) {
          console.log('[GAME SESSION] Error creating invitations:', inviteError);
        } else {
          console.log('[GAME SESSION] Invitations sent to', nonMemberIds.length, 'players');
          setPendingInvitations(createdInvites || []);

          const initialStatuses = new Map();
          createdInvites?.forEach(invite => {
            initialStatuses.set(invite.invitee_id, 'pending');
          });
          setInvitationStatuses(initialStatuses);

          console.log('[GAME SESSION] Game invitations created successfully for house:', game.houses.name);
        }
      }

      // If all players are house members (no invitations), start game immediately
      if (initialStatus === 'active') {
        console.log('[GAME SESSION] All players are house members, starting game immediately...');
        setGameStarted(true);
        setGameEnded(false); // Reset for new game
        setLoading(false);
        return;
      }

      console.log('[GAME SESSION] Invitations created, waiting for acceptance...');
      setGameStarted(false);
      setLoading(false);

      // Set up realtime subscription for invitation responses
      const channel = supabase
        .channel(`game-invitations-${session.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'game_invitations',
            filter: `game_session_id=eq.${session.id}`
          },
          (payload) => {
            console.log('[GAME SESSION] Invitation updated:', payload);
            const updated = payload.new as any;

            setInvitationStatuses(prev => {
              const newMap = new Map(prev);
              newMap.set(updated.invitee_id, updated.status);
              return newMap;
            });

            setPendingInvitations(prev =>
              prev.map(invite =>
                invite.id === updated.id ? updated : invite
              )
            );

            // If someone accepted, add them to session_scores
            if (updated.status === 'accepted') {
              supabase
                .from('session_scores')
                .insert({
                  session_id: session.id,
                  user_id: updated.invitee_id,
                  score: 0,
                  is_winner: false,
                })
                .then(({ error }) => {
                  if (error) {
                    console.log('[GAME SESSION] Error adding accepted player to scores:', error);
                  }
                });
            }
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    } catch (err) {
      console.log('[GAME SESSION] Unexpected error starting game:', err);
      setLoading(false);
    }
  };

  const updateScore = useCallback(async (playerId: string, change: number) => {
    try {
      console.log('[GAME SESSION] Updating score for player:', playerId, 'change:', change);
      const scoringConfig = getScoringTypeConfig(scoringType);

      setSelectedPlayers((players) =>
        players.map((p) => {
          if (p.id === playerId) {
            const newScore = p.score + (change * scoringConfig.step);
            return { ...p, score: Math.max(0, newScore) };
          }
          return p;
        })
      );

      if (sessionId) {
        const player = selectedPlayers.find((p) => p.id === playerId);
        if (player) {
          const newScore = Math.max(0, player.score + (change * scoringConfig.step));
          console.log('[GAME SESSION] New score:', newScore, 'for user_id:', player.user_id);

          // Use UPSERT to avoid conflicts
          const { error } = await supabase
            .from('session_scores')
            .upsert({
              session_id: sessionId,
              user_id: player.user_id,
              score: newScore
            }, {
              onConflict: 'session_id,user_id'
            });

          if (error) {
            console.log('[GAME SESSION] Error updating score in database:', error);
          } else {
            console.log('[GAME SESSION] Score updated successfully in database');
          }
        }
      }
    } catch (err) {
      console.log('[GAME SESSION] Unexpected error updating score:', err);
    }
  }, [sessionId, scoringType, selectedPlayers]);

  const setDirectScore = useCallback(async (playerId: string, newScore: number, metadata?: any) => {
    try {
      // Safety check: Don't process if component is unmounted or game ended
      if (!isMountedRef.current || gameEnded) {
        return;
      }

      // Check if score actually changed to prevent unnecessary updates
      const player = selectedPlayers.find((p) => p.id === playerId);
      if (!player) {
        console.log('[GAME SESSION] Player not found for id:', playerId);
        return;
      }

      // Early exit if NOTHING has changed
      // Only compare fields that are actually being updated (exist in metadata)
      const scoreUnchanged = player.score === Math.max(0, newScore);

      // For metadata fields, only check if they're being provided in this update
      const accuracyUnchanged =
        (metadata?.hits === undefined || player.accuracy_hits === metadata.hits) &&
        (metadata?.attempts === undefined || player.accuracy_attempts === metadata.attempts);

      const ratioUnchanged =
        (metadata?.numerator === undefined || player.ratio_numerator === metadata.numerator) &&
        (metadata?.denominator === undefined || player.ratio_denominator === metadata.denominator);

      const unitMetadataUnchanged =
        (metadata?.displayValue === undefined || player.input_metadata?.displayValue === metadata.displayValue) &&
        (metadata?.unit === undefined || player.input_metadata?.unit === metadata.unit);

      // Early exit ONLY if score AND all provided metadata fields are unchanged
      if (scoreUnchanged && accuracyUnchanged && ratioUnchanged && unitMetadataUnchanged) {
        return;
      }

      console.log('[GAME SESSION] Setting direct score for player:', playerId, 'score:', newScore, 'metadata:', metadata);

      // Update UI immediately for responsive feel
      setSelectedPlayers((players) => {
        return players.map((p) => {
          if (p.id === playerId) {
            const updated: Player = { ...p, score: Math.max(0, newScore) };
            if (metadata?.hits !== undefined) updated.accuracy_hits = metadata.hits;
            if (metadata?.attempts !== undefined) updated.accuracy_attempts = metadata.attempts;
            if (metadata?.numerator !== undefined) updated.ratio_numerator = metadata.numerator;
            if (metadata?.denominator !== undefined) updated.ratio_denominator = metadata.denominator;
            // Store input_metadata for distance/weight units
            if (metadata?.displayValue !== undefined || metadata?.unit !== undefined) {
              updated.input_metadata = { displayValue: metadata.displayValue, unit: metadata.unit };
            }
            return updated;
          }
          return p;
        });
      });

      if (sessionId) {
        // Clear existing timer for this player
        const existingTimer = scoreUpdateTimersRef.current.get(playerId);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        // Store update data for batching
        const updateData: any = {
          score: Math.max(0, newScore),
          session_id: sessionId
        };
        if (metadata?.hits !== undefined) updateData.accuracy_hits = metadata.hits;
        if (metadata?.attempts !== undefined) updateData.accuracy_attempts = metadata.attempts;
        if (metadata?.numerator !== undefined) updateData.ratio_numerator = metadata.numerator;
        if (metadata?.denominator !== undefined) updateData.ratio_denominator = metadata.denominator;
        if (metadata?.displayValue !== undefined || metadata?.unit !== undefined) {
          updateData.input_metadata = { displayValue: metadata.displayValue, unit: metadata.unit };
        }

        pendingUpdatesRef.current.set(playerId, updateData);

        // Debounce database update to prevent deadlocks (500ms delay)
        const timer = setTimeout(async () => {
          // Safety check: Don't update if component unmounted or game ended
          if (!isMountedRef.current || gameEnded) {
            pendingUpdatesRef.current.delete(playerId);
            scoreUpdateTimersRef.current.delete(playerId);
            return;
          }

          const pendingUpdate = pendingUpdatesRef.current.get(playerId);
          if (!pendingUpdate) return;

          // Find current player data
          const player = selectedPlayers.find((p) => p.id === playerId);
          if (!player) {
            console.log('[GAME SESSION] Player not found for id:', playerId);
            pendingUpdatesRef.current.delete(playerId);
            scoreUpdateTimersRef.current.delete(playerId);
            return;
          }

          pendingUpdate.user_id = player.user_id;

          // Use UPSERT to avoid conflicts
          const { error } = await supabase
            .from('session_scores')
            .upsert(pendingUpdate, {
              onConflict: 'session_id,user_id'
            });

          if (error) {
            console.log('[GAME SESSION] Error updating score in database:', error);
            // Retry once on deadlock
            if (error.code === '40P01') {
              console.log('[GAME SESSION] Deadlock detected, retrying in 1s...');
              setTimeout(async () => {
                const { error: retryError } = await supabase
                  .from('session_scores')
                  .upsert(pendingUpdate, {
                    onConflict: 'session_id,user_id'
                  });
                if (retryError) {
                  console.log('[GAME SESSION] Retry failed:', retryError);
                }
              }, 1000);
            }
          } else {
            console.log('[GAME SESSION] Score updated successfully');
          }

          pendingUpdatesRef.current.delete(playerId);
          scoreUpdateTimersRef.current.delete(playerId);
        }, 500);

        scoreUpdateTimersRef.current.set(playerId, timer);
      }
    } catch (err) {
      console.log('[GAME SESSION] Unexpected error setting score:', err);
    }
  }, [sessionId, selectedPlayers]);

  const flushPendingScoreUpdates = useCallback(async () => {
    // Clear all timers and immediately flush pending updates
    const pendingPlayerIds = Array.from(pendingUpdatesRef.current.keys());

    if (pendingPlayerIds.length === 0) {
      console.log('[GAME SESSION] No pending score updates to flush');
      return;
    }

    console.log('[GAME SESSION] Flushing', pendingPlayerIds.length, 'pending score updates before ending game');

    // Clear all timers
    scoreUpdateTimersRef.current.forEach(timer => clearTimeout(timer));
    scoreUpdateTimersRef.current.clear();

    // Flush all pending updates immediately
    const updatePromises = pendingPlayerIds.map(async (playerId) => {
      const pendingUpdate = pendingUpdatesRef.current.get(playerId);
      if (!pendingUpdate) return;

      try {
        const { error } = await supabase
          .from('session_scores')
          .upsert(pendingUpdate, {
            onConflict: 'session_id,user_id'
          });

        if (error) {
          console.log('[GAME SESSION] Error flushing score for player:', playerId, error);
        } else {
          console.log('[GAME SESSION] Successfully flushed score for player:', playerId);
        }
      } catch (err) {
        console.log('[GAME SESSION] Exception flushing score for player:', playerId, err);
      }
    });

    await Promise.all(updatePromises);
    pendingUpdatesRef.current.clear();
    console.log('[GAME SESSION] All pending scores flushed');
  }, []);

  const handleEndGamePress = () => {
    setShowEndGameConfirm(true);
  };

  const endGame = useCallback(async () => {
    // IDEMPOTENCY: Prevent double execution
    if (isFinalizingRef.current) {
      console.warn('[GAME SESSION] endGame already in progress, ignoring duplicate call');
      return;
    }
    isFinalizingRef.current = true;

    setShowEndGameConfirm(false);
    setGameEnded(true); // CRITICAL: Stop all score updates immediately
    try {
      console.log('[GAME SESSION] endGame called', {
        timestamp: new Date().toISOString(),
        sessionId,
        scoringType,
        scoringUnit,
        playerCount: selectedPlayers.length,
        gameEnded,
        hasWinners: selectedPlayers.some(p => p.score > 0)
      });

      if (!sessionId) {
        console.log('[GAME SESSION] No session ID, navigating back');
        isFinalizingRef.current = false;
        router.back();
        return;
      }

      setLoading(true);

      // CRITICAL: Flush all pending score updates before finalizing
      await flushPendingScoreUpdates();

      console.log('[GAME SESSION] Finalizing game results...');

      // Use determineWinner which respects lowerIsBetter
      // CRITICAL: Use user_id for winner determination to match database records
      const winnerIds = determineWinner(
        selectedPlayers.map(p => ({ id: p.user_id, score: p.score })),
        scoringType,
        lowerIsBetter
      );

      const gameWinners = selectedPlayers.filter(p => winnerIds.includes(p.user_id));
      const hasValidWinner = gameWinners.length > 0;
      const isSoloGame = selectedPlayers.length === 1;
      const soloPlayerHasScore = isSoloGame && gameWinners.length > 0;
      const isGameTie = !isSoloGame && gameWinners.length > 1;

      // Sort players based on lowerIsBetter for placement
      const sortedPlayers = [...selectedPlayers].sort((a, b) => {
        if (lowerIsBetter) {
          return a.score - b.score;
        }
        return b.score - a.score;
      });

      const winningScore = sortedPlayers[0]?.score || 0;

      console.log('[GAME SESSION] Final standings:', sortedPlayers.map(p => `${p.nickname}: ${p.score}`));
      console.log('[GAME SESSION] Winners:', gameWinners.map(w => w.nickname).join(', ') || 'None (all scores are zero)');
      console.log('[GAME SESSION] Scoring type:', scoringType, 'Lower is better:', lowerIsBetter);

      if (isSoloGame) {
        if (soloPlayerHasScore) {
          console.log('[GAME SESSION] SOLO GAME - Player wins with', winningScore, scoringUnit);
        } else {
          console.log('[GAME SESSION] SOLO GAME - No winner (score is 0)');
        }
      } else if (isGameTie) {
        console.log('[GAME SESSION] TIE GAME - Multiple winners with', winningScore, scoringUnit);
      } else if (!hasValidWinner) {
        console.log('[GAME SESSION] No winners (all scores are zero)');
      }

      // Prepare player data for atomic completion
      // Validate all players have user_id before proceeding
      const invalidPlayers = selectedPlayers.filter(p => !p.user_id);
      if (invalidPlayers.length > 0) {
        console.log('[GAME SESSION] Cannot complete game - players missing user_id:', invalidPlayers);
        setLoading(false);
        setGameEnded(false);
        isFinalizingRef.current = false;
        return;
      }

      const playersData = selectedPlayers.map(player => ({
        user_id: player.user_id,
        score: player.score,
        accuracy_hits: player.accuracy_hits,
        accuracy_attempts: player.accuracy_attempts,
        ratio_numerator: player.ratio_numerator,
        ratio_denominator: player.ratio_denominator,
        input_metadata: player.input_metadata || {}
      }));

      console.log('[GAME SESSION] Calling complete_game_session RPC', {
        sessionId,
        playerCount: playersData.length,
        scores: playersData.map(p => ({ user_id: p.user_id, score: p.score }))
      });

      // Use atomic function to complete game - all scores updated and session marked complete in one transaction
      const { data: completionResult, error: completionError } = await supabase.rpc('complete_game_session', {
        p_session_id: sessionId,
        p_players: playersData
      });

      console.log('[GAME SESSION] RPC Response', { completionResult, completionError });

      if (completionError) {
        console.log('[GAME SESSION] RPC Error ending game:', completionError);
        setLoading(false);
        setGameEnded(false);
        isFinalizingRef.current = false;
        return;
      }

      if (!completionResult || !completionResult.success) {
        console.log('[GAME SESSION] Function returned error:', completionResult?.error || 'Unknown error');
        setLoading(false);
        setGameEnded(false);
        isFinalizingRef.current = false;
        return;
      }

      console.log('[GAME SESSION] Game completed successfully:', completionResult);

      // Set winner state BEFORE kit unlock checks to prevent stale state in handleKitUnlockClose
      setWinners(gameWinners);
      setIsTie(isGameTie);

      // OPTIMIZED: Run badge checks in parallel instead of sequentially
      for (const winner of gameWinners) {
        if (winner.id === user?.id) {
          console.log('[GAME SESSION] Current user won! Checking badges...');
          await Promise.all([
            checkBadge('first_win'),
            checkBadge('five_wins'),
            checkBadge('ten_wins'),
            checkBadge('twenty_five_wins'),
            checkBadge('fifty_wins')
          ]);
        }
      }

      // OPTIMIZED: Check for kit unlocks in parallel (non-blocking)
      if (user) {
        try {
          console.log('[GAME SESSION] Checking for kit unlocks...');

          const currentUserWon = gameWinners.some(w => w.user_id === user.id);

          // Run both checks in parallel
          const checks = [
            supabase.rpc('check_chance_based_kit_unlock', {
              p_user_id: user.id,
              p_condition: 'game_finish',
            })
          ];

          // Only check mythic if user won
          if (currentUserWon) {
            checks.push(
              supabase.rpc('check_chance_based_kit_unlock', {
                p_user_id: user.id,
                p_condition: 'game_win',
              })
            );
          }

          const results = await Promise.all(checks);

          // Check legendary unlock (first result)
          const { data: legendaryUnlock, error: legendaryError } = results[0];
          if (!legendaryError && legendaryUnlock && Array.isArray(legendaryUnlock) && legendaryUnlock.length > 0 && legendaryUnlock[0].unlocked) {
            console.log('[GAME SESSION] Legendary kit unlocked!', legendaryUnlock[0]);
            setUnlockedKit({
              name: legendaryUnlock[0].kit_name,
              rarity: 'legendary'
            });
            setLoading(false);
            setShowKitUnlock(true);
            return;
          }

          // Check mythic unlock (second result, if checked)
          if (currentUserWon && results[1]) {
            const { data: mythicUnlock, error: mythicError } = results[1];
            if (!mythicError && mythicUnlock && Array.isArray(mythicUnlock) && mythicUnlock.length > 0 && mythicUnlock[0].unlocked) {
              console.log('[GAME SESSION] Mythic kit unlocked!', mythicUnlock[0]);
              setUnlockedKit({
                name: mythicUnlock[0].kit_name,
                rarity: 'mythic'
              });
              setLoading(false);
              setShowKitUnlock(true);
              return;
            }
          }
        } catch (kitUnlockError) {
          console.log('[GAME SESSION] Kit unlock check failed, continuing game completion:', kitUnlockError);
          // Don't block game completion if kit unlock check fails
        }
      }

      setLoading(false);
      setShowCelebration(true);
    } catch (err) {
      console.log('[GAME SESSION] Unexpected error ending game:', err);
      setLoading(false);
      setGameEnded(false);
      isFinalizingRef.current = false;
      router.back();
    }
  }, [sessionId, selectedPlayers, scoringType, lowerIsBetter, scoringUnit, gameEnded, user, checkBadge, router, flushPendingScoreUpdates]);

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    setTimeout(() => {
      router.back();
    }, 300);
  };

  const handleKitUnlockClose = () => {
    setShowKitUnlock(false);
    setUnlockedKit(null);
    // Show winner celebration after kit unlock (winners/isTie already set in endGame)
    setLoading(false);
    setShowCelebration(true);
  };

  const cancelGame = async () => {
    try {
      console.log('[GAME SESSION] Cancel game button pressed');

      if (sessionId) {
        console.log('[GAME SESSION] Marking session as cancelled...');
        const { error } = await supabase
          .from('game_sessions')
          .update({ status: 'cancelled' })
          .eq('id', sessionId);

        if (error) {
          console.log('[GAME SESSION] Error cancelling game:', error);
        } else {
          console.log('[GAME SESSION] Game cancelled successfully');
        }
      }

      console.log('[GAME SESSION] Navigating back after cancel...');
      router.back();
    } catch (err) {
      console.log('[GAME SESSION] Unexpected error cancelling game:', err);
      router.back();
    }
  };

  const renderPlayer = ({ item }: { item: Player }) => (
    <PlayerCard
      player={item}
      scoringType={scoringType}
      scoringUnit={scoringUnit}
      distanceUnit={distanceUnit}
      weightUnit={weightUnit}
      maxAttempts={maxAttempts}
      totalPlayers={selectedPlayers.length}
      onUpdateScore={updateScore}
      onSetDirectScore={setDirectScore}
    />
  );

  const allInvitationsAccepted = () => {
    // If no session ID or no players selected, can't start
    if (!sessionId || selectedPlayers.length === 0) return false;

    // If no invitations were sent (all house members including creator), can start immediately
    if (invitationStatuses.size === 0) return true;

    // Check if all pending invitations have been responded to with acceptance
    // Only check players who actually have invitation status (non-members)
    const pendingInvites = Array.from(invitationStatuses.values()).filter(status => status === 'pending');
    const declinedInvites = Array.from(invitationStatuses.values()).filter(status => status === 'declined');

    // Can't start if anyone declined or still pending
    return pendingInvites.length === 0 && declinedInvites.length === 0;
  };

  const getInvitationStatusText = () => {
    // Count admins as auto-accepted
    const adminCount = selectedPlayers.filter(p => {
      const playerInfo = availablePlayers.find(ap => ap.user_id === p.id);
      return p.id === user?.id || playerInfo?.is_admin;
    }).length;

    const pending = Array.from(invitationStatuses.values()).filter(status => status === 'pending').length;
    const accepted = Array.from(invitationStatuses.values()).filter(status => status === 'accepted').length;
    const declined = Array.from(invitationStatuses.values()).filter(status => status === 'declined').length;
    const totalInvites = invitationStatuses.size;
    const totalAccepted = accepted + adminCount;

    // No external invitations - all house members/admins
    if (totalInvites === 0) {
      return `All players are ready! Press "Begin Game" to start`;
    }

    // All invitations responded and none declined
    if (pending === 0 && declined === 0 && accepted > 0) {
      return `All players accepted! Press "Begin Game" to start`;
    }

    // Some declined
    if (declined > 0) {
      return `Cannot start: ${declined} player${declined > 1 ? 's' : ''} declined`;
    }

    return `Waiting for responses: ${totalAccepted} accepted, ${pending} pending`;
  };

  const beginGameplay = async () => {
    console.log('[GAME SESSION] Beginning gameplay...');

    if (!sessionId) {
      console.log('[GAME SESSION] No session ID - cannot begin');
      return;
    }

    // Get all selected players who should have scores
    // Filter out any declined invitations
    const acceptedPlayerIds = selectedPlayers
      .filter(p => {
        const inviteStatus = invitationStatuses.get(p.id);
        // Include if: no invite status (house member) OR invite was accepted
        return !inviteStatus || inviteStatus === 'accepted';
      })
      .map(p => p.id);

    console.log('[GAME SESSION] Creating score entries for', acceptedPlayerIds.length, 'players');

    // Create score entries for all active players
    if (acceptedPlayerIds.length > 0) {
      const scoreInserts = acceptedPlayerIds.map((playerId) => ({
        session_id: sessionId,
        user_id: playerId,
        score: 0,
        is_winner: false,
      }));

      const { error: scoresError } = await supabase
        .from('session_scores')
        .insert(scoreInserts)
        .select();

      if (scoresError) {
        // If error is duplicate, that's okay - scores already exist
        if (scoresError.code !== '23505') {
          console.log('[GAME SESSION] Error creating scores:', scoresError);
        } else {
          console.log('[GAME SESSION] Scores already exist, continuing...');
        }
      } else {
        console.log('[GAME SESSION] Score entries created successfully');
      }
    }

    // Update game session status from pending to active
    const { error } = await supabase
      .from('game_sessions')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      console.log('[GAME SESSION] Error updating session status:', error);
    } else {
      console.log('[GAME SESSION] Session status updated to active');
    }

    setGameStarted(true);
    setGameEnded(false); // Reset for new game
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* White bg with subtle orange blob */}
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#000000' }} />
      <View style={{ position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(255,255,255,0.03)', top: -80, right: -60 }} />
      <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.02)', bottom: 120, left: -50 }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{game?.name}</Text>
          {gameStarted && (
            <View style={styles.liveChip}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>
        <View style={{ width: 44 }} />
      </View>

      {!gameStarted ? (
        <View style={styles.setup}>
          {!sessionId ? (
            <>
              <View style={styles.setupHeader}>
                <View style={styles.setupIconWrap}>
                  <Ionicons name="people" size={28} color="#FFFFFF" />
                </View>
                <Text style={styles.setupTitle}>Select Players</Text>
                <Text style={styles.setupSubtitle}>
                  Choose who's playing. Tap to select or deselect.
                </Text>
              </View>
              <FlatList
                data={availablePlayers}
                renderItem={({ item }) => (
                  <EnhancedPlayerCard
                    key={`${item.user_id}-${refreshKey}`}
                    userId={item.user_id}
                    nickname={item.nickname}
                    isSelected={!!selectedPlayers.find((p) => p.user_id === item.user_id)}
                    isCreator={item.user_id === user?.id}
                    onPress={() => togglePlayer(item)}
                  />
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.membersList}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <View style={styles.emptyStateIconWrap}>
                      <Ionicons name="people-outline" size={36} color="rgba(255,255,255,0.3)" />
                    </View>
                    <Text style={styles.emptyStateText}>No friends available</Text>
                    <Text style={styles.emptyStateSubtext}>Add friends to play with them!</Text>
                  </View>
                }
              />
              <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 8, paddingTop: 12, backgroundColor: '#000000' }}>
                <Pressable
                  style={[
                    styles.startButton,
                    selectedPlayers.length < 1 && styles.buttonDisabled,
                  ]}
                  onPress={startGame}
                  disabled={selectedPlayers.length < 1}
                >
                  <LinearGradient
                    colors={selectedPlayers.length < 1 ? ['#1A1A1A', '#1A1A1A'] : ['#FFFFFF', '#FFFFFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ paddingVertical: 17, alignItems: 'center', width: '100%', borderRadius: 18, flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                  >
                    <Ionicons name="play" size={20} color={selectedPlayers.length < 1 ? 'rgba(255,255,255,0.3)' : '#000000'} />
                    <Text style={[styles.buttonText, { color: selectedPlayers.length < 1 ? 'rgba(255,255,255,0.3)' : '#000000' }]}>
                    {(() => {
                      if (selectedPlayers.length === 0) return 'Select at least 1 player';
                      if (selectedPlayers.length === 1) return 'Start Solo Game';
                      const nonMembers = selectedPlayers.filter(p => {
                        const isCreator = p.id === user?.id;
                        const isHouseMember = availablePlayers.find(ap => ap.user_id === p.id)?.is_house_member;
                        return !isCreator && !isHouseMember;
                      });
                      if (nonMembers.length === 0) return `Start Game (${selectedPlayers.length} players)`;
                      return `Send Invitations (${nonMembers.length} invite${nonMembers.length > 1 ? 's' : ''})`;
                    })()}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.setupHeader}>
                <View style={styles.setupIconWrap}>
                  <Ionicons name="time" size={28} color="#FFFFFF" />
                </View>
                <Text style={styles.setupTitle}>Waiting for Players</Text>
                <Text style={styles.setupSubtitle}>{getInvitationStatusText()}</Text>
              </View>

              <View style={styles.invitationsList}>
                {selectedPlayers.map((player) => {
                  const status = invitationStatuses.get(player.user_id);
                  const playerInfo = availablePlayers.find(p => p.user_id === player.user_id);
                  const isCreator = player.user_id === user?.id;
                  const isHouseMember = playerInfo?.is_house_member;
                  const isPlayerAdmin = playerInfo?.is_admin || false;
                  const isAutoApproved = isCreator || isPlayerAdmin || (isHouseMember && status === undefined);

                  return (
                    <View key={player.id} style={styles.invitationCard}>
                      <View style={styles.invitationPlayerInfo}>
                        <View style={styles.inviteAvatar}>
                          <Text style={styles.inviteAvatarText}>{(player.nickname || 'P').charAt(0).toUpperCase()}</Text>
                        </View>
                        <View>
                          <Text style={styles.invitationPlayerName}>{player.nickname}</Text>
                          {isCreator && <Text style={styles.playerRoleText}>Creator</Text>}
                          {!isCreator && isPlayerAdmin && <Text style={styles.playerRoleText}>Admin</Text>}
                          {!isCreator && !isPlayerAdmin && isHouseMember && status === undefined && (
                            <Text style={styles.playerRoleText}>House Member</Text>
                          )}
                        </View>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        (isAutoApproved || status === 'accepted') && styles.statusAccepted,
                        (status === 'pending' || (!isAutoApproved && status === undefined)) && styles.statusPending,
                        status === 'declined' && styles.statusDeclined,
                      ]}>
                        <Text style={[styles.statusText,
                          (isAutoApproved || status === 'accepted') && { color: '#059669' },
                          (status === 'pending' || (!isAutoApproved && status === undefined)) && { color: '#D97706' },
                          status === 'declined' && { color: '#DC2626' },
                        ]}>
                          {isAutoApproved ? 'Ready' : status === 'accepted' ? 'Accepted' : status === 'declined' ? 'Declined' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {isUserAdmin ? (
                <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 8, paddingTop: 12, backgroundColor: '#000000' }}>
                  <Pressable
                    style={[
                      styles.startButton,
                      !allInvitationsAccepted() && styles.buttonDisabled,
                    ]}
                    onPress={beginGameplay}
                    disabled={!allInvitationsAccepted()}
                  >
                    <LinearGradient
                      colors={allInvitationsAccepted() ? ['#FFFFFF', '#FFFFFF'] : ['#1A1A1A', '#1A1A1A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ paddingVertical: 17, alignItems: 'center', width: '100%', borderRadius: 18, flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                    >
                      <Ionicons name="play" size={20} color="#FFFFFF" />
                      <Text style={styles.buttonText}>
                        {allInvitationsAccepted() ? 'Begin Game' : 'Waiting for players to accept...'}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              ) : (
                <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 8, paddingTop: 12, backgroundColor: '#000000' }}>
                  <View style={[styles.startButton, styles.buttonDisabled, { backgroundColor: '#1A1A1A', borderRadius: 18, paddingVertical: 17, alignItems: 'center' }]}>
                    <Text style={[styles.buttonText, { color: 'rgba(255,255,255,0.3)' }]}>
                      Waiting for admin to start the game...
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.gameplay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <FlatList
            data={selectedPlayers}
            renderItem={renderPlayer}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.playersList, { paddingBottom: 160 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
          <View style={[styles.actions, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
            <Pressable style={styles.cancelButton} onPress={cancelGame}>
              <Ionicons name="close" size={20} color="#EF4444" />
              <Text style={[styles.buttonText, { color: '#EF4444' }]}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.endButton} onPress={handleEndGamePress}>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>End Game</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      <Modal
        visible={showEndGameConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEndGameConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="flag" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.confirmTitle}>End Game?</Text>
            <Text style={styles.confirmMessage}>
              Final scores will be saved and this action cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={styles.confirmCancelButton}
                onPress={() => setShowEndGameConfirm(false)}
                disabled={isFinalizingRef.current}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmEndButton,
                  isFinalizingRef.current && { opacity: 0.5 }
                ]}
                onPress={endGame}
                disabled={isFinalizingRef.current}
              >
                <Text style={styles.confirmEndText}>
                  {isFinalizingRef.current ? 'Ending...' : 'End Game'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {unlockedKit && (
        <KitUnlockCelebration
          visible={showKitUnlock}
          kitName={unlockedKit.name}
          kitRarity={unlockedKit.rarity}
          onClose={handleKitUnlockClose}
        />
      )}

      <WinnerCelebrationModal
        visible={showCelebration}
        winners={winners}
        isTie={isTie}
        onClose={handleCelebrationClose}
        badgeAwarded={badgeAwarded}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
    zIndex: 2,
  },
  backButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#111111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', gap: 4 },
  title: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3, textAlign: 'center' },
  liveChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  liveText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },

  setup: { flex: 1, paddingTop: 24, paddingHorizontal: 20 },
  setupHeader: { alignItems: 'center', marginBottom: 24, gap: 8 },
  setupIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#111111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  setupTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5, textAlign: 'center' },
  setupSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  membersList: { gap: 10, paddingBottom: 12 },
  startButton: {
    borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },

  gameplay: { flex: 1, padding: 16 },
  playersList: { gap: 14, paddingBottom: 100 },

  playerCard: {
    backgroundColor: '#111111', padding: 20, borderRadius: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 5,
  },
  playerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  playerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  playerAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
  },
  playerAvatarText: { fontSize: 18, fontWeight: '800', color: '#000000' },
  playerName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  scoringTypeIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1A1A1A', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  scoringEmoji: { fontSize: 14 },
  scoringLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  scoreContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  scoreButton: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#FFFFFF', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
  },
  score: { fontSize: 56, fontWeight: '800', color: '#FFFFFF', minWidth: 90, textAlign: 'center', letterSpacing: -2 },
  scoreInput: { fontSize: 52, fontWeight: '800', color: '#FFFFFF', minWidth: 90, textAlign: 'center', backgroundColor: '#1A1A1A', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  scoreUnit: { fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 6, fontWeight: '600' },

  actions: { position: 'absolute', bottom: 0, left: 20, right: 20, flexDirection: 'row', gap: 12, paddingBottom: Platform.OS === 'ios' ? 34 : 24, paddingTop: 12, backgroundColor: '#000000' },
  cancelButton: {
    flex: 1, flexDirection: 'row', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)', paddingVertical: 17, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  endButton: {
    flex: 2, flexDirection: 'row', gap: 8,
    backgroundColor: '#FFFFFF', paddingVertical: 17, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#000000', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10 },
  emptyStateIconWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: '#111111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  emptyStateText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  emptyStateSubtext: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  confirmModal: {
    backgroundColor: '#111111', borderRadius: 24, padding: 28,
    width: '100%', maxWidth: 400,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 24, elevation: 12,
  },
  confirmIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  confirmTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 10, textAlign: 'center' },
  confirmMessage: { fontSize: 15, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  confirmActions: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmCancelButton: {
    flex: 1, backgroundColor: '#1A1A1A', paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  confirmCancelText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '600' },
  confirmEndButton: {
    flex: 1, backgroundColor: '#FFFFFF', paddingVertical: 14, borderRadius: 14, alignItems: 'center',
  },
  confirmEndText: { color: '#000000', fontSize: 16, fontWeight: '700' },

  invitationsList: { flex: 1, paddingVertical: 8, gap: 10 },
  invitationCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#111111', padding: 14, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  invitationPlayerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inviteAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  inviteAvatarText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  invitationPlayerName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  playerRoleText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusAccepted: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statusPending: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  statusDeclined: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  statusText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },

  memberCard: {
    backgroundColor: '#111111', padding: 16, borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  memberCardSelected: {
    borderColor: '#FFFFFF', backgroundColor: '#1A1A1A',
  },
  memberName: { fontSize: 16, color: '#FFFFFF', fontWeight: '700' },
});
