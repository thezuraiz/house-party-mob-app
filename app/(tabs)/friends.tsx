import GameInvitationCard from '@/components/GameInvitationCard';
import PremiumPurchaseModal from '@/components/PremiumPurchaseModal';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SearchUser = {
  id: string; username: string; display_name: string; avatar_url: string | null;
  is_friend: boolean; has_pending_request: boolean; is_blocked?: boolean;
};
type FriendRequest = {
  id: string; sender_id: string; recipient_id: string; status: string; created_at: string;
  sender: { id: string; username: string; display_name: string; avatar_url: string | null };
};
type Friend = {
  id: string; friend_id: string; username: string; display_name: string; avatar_url: string | null;
};
type GameInvitation = {
  id: string; inviter_id: string; house_id: string; game_id: string;
  game_session_id: string; created_at: string;
  inviter?: { username: string; avatar_url?: string };
  house?: { name: string; house_emoji: string };
  game?: { name: string; game_emoji: string };
};

export default function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [gameInvitations, setGameInvitations] = useState<GameInvitation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'invites'>('friends');

  const { user } = useAuth();
  const { isPremium, loading: premiumLoading } = usePremium();
  const { showSuccess, showError } = useToast();
  const router = useRouter();

  useFocusEffect(useCallback(() => {
    if (!user) return;
    fetchAll();
    const ch = supabase.channel(`friends-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `user_id=eq.${user.id}` }, fetchAll)
      // Listen as recipient — catches incoming requests AND cancellations by sender
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `recipient_id=eq.${user.id}` }, fetchAll)
      // Listen as sender — catches status changes (accepted/declined) on our sent requests
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `sender_id=eq.${user.id}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_invitations', filter: `invitee_id=eq.${user.id}` }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]));

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await Promise.all([fetchFriends(), fetchRequests(), fetchGameInvitations()]);
    } finally { setLoading(false); }
  };

  const fetchFriends = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('friendships')
      .select('id, friend_id, profiles!friendships_friend_id_fkey(username, avatar_url)')
      .eq('user_id', user.id);
    if (data) {
      // Fetch display names from user_profile_settings
      const friendIds = data.map((f: any) => f.friend_id);
      const { data: settings } = await supabase
        .from('user_profile_settings')
        .select('user_id, display_name')
        .in('user_id', friendIds);
      const nameMap = new Map((settings || []).map((s: any) => [s.user_id, s.display_name]));

      setFriends(data.map((f: any) => ({
        id: f.id, friend_id: f.friend_id,
        username: f.profiles?.username || '',
        display_name: nameMap.get(f.friend_id) || f.profiles?.username || 'User',
        avatar_url: f.profiles?.avatar_url || null,
      })));
    }
  };

  const fetchRequests = async () => {
    if (!user) return;
    const [received, sent] = await Promise.all([
      supabase.from('friend_requests').select('*, sender:profiles!friend_requests_sender_id_fkey(id,username,avatar_url)').eq('recipient_id', user.id).eq('status', 'pending'),
      supabase.from('friend_requests').select('*, recipient:profiles!friend_requests_recipient_id_fkey(id,username,avatar_url)').eq('sender_id', user.id).eq('status', 'pending'),
    ]);

    // Fetch display names for all senders/recipients
    const allUserIds = [
      ...(received.data || []).map((r: any) => r.sender_id),
      ...(sent.data || []).map((r: any) => r.recipient_id),
    ];
    const { data: settings } = allUserIds.length > 0
      ? await supabase.from('user_profile_settings').select('user_id, display_name').in('user_id', allUserIds)
      : { data: [] };
    const nameMap = new Map((settings || []).map((s: any) => [s.user_id, s.display_name]));

    if (received.data) {
      setPendingRequests(received.data.map((r: any) => ({
        ...r,
        sender: {
          ...r.sender,
          display_name: nameMap.get(r.sender_id) || r.sender?.username || 'User',
        },
      })));
    }
    if (sent.data) {
      setSentRequests(sent.data.map((r: any) => ({
        ...r,
        sender: {
          id: r.recipient_id,
          username: r.recipient?.username || '',
          avatar_url: r.recipient?.avatar_url || null,
          display_name: nameMap.get(r.recipient_id) || r.recipient?.username || 'User',
        },
      })));
    }
  };

  const fetchGameInvitations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('game_invitations')
      .select('*, inviter:profiles!game_invitations_inviter_id_fkey(username,avatar_url), house:houses(name,house_emoji), game:games(name,game_emoji)')
      .eq('invitee_id', user.id).eq('status', 'pending');
    if (data) setGameInvitations(data as any);
  };

  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await supabase.rpc('search_users_for_friends', { search_query: query, current_user_id: user?.id });
      setSearchResults(data || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const sendFriendRequest = async () => {
    if (!user || !selectedUser) return;
    if (!isPremium) {
      setShowPremiumModal(true);
      return;
    }
    setSendingRequest(true);
    try {
      const { error } = await supabase.from('friend_requests').insert({ sender_id: user.id, recipient_id: selectedUser.id, status: 'pending' });
      if (error) throw error;
      showSuccess('Friend request sent!');
      setSelectedUser(null); setSearchQuery(''); setSearchResults([]);
      await fetchRequests();
    } catch (e: any) { showError(e.message || 'Failed to send request'); }
    finally { setSendingRequest(false); }
  };

  const acceptFriendRequest = async (requestId: string) => {
    try {
      // Get request details first
      const { data: request, error: fetchError } = await supabase
        .from('friend_requests')
        .select('sender_id, recipient_id')
        .eq('id', requestId)
        .maybeSingle();
      if (fetchError) throw fetchError;

      // Update status
      const { error } = await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
      if (error) throw error;

      // Manually insert friendships (both directions) in case trigger doesn't exist
      if (request) {
        await supabase.from('friendships').upsert([
          { user_id: request.sender_id, friend_id: request.recipient_id },
          { user_id: request.recipient_id, friend_id: request.sender_id },
        ], { onConflict: 'user_id,friend_id', ignoreDuplicates: true });
      }

      showSuccess('Friend request accepted!');
      await fetchAll();
    } catch (e: any) { showError(e.message || 'Failed to accept'); }
  };

  const declineFriendRequest = async (requestId: string) => {
    try {
      await supabase.from('friend_requests').update({ status: 'declined' }).eq('id', requestId);
      await fetchRequests();
    } catch (e: any) { showError(e.message || 'Failed to decline'); }
  };

  const cancelSentRequest = async (requestId: string) => {
    try {
      // Find the cancelled request before deleting (to update search results)
      const cancelledRequest = sentRequests.find(r => r.id === requestId);
      await supabase.from('friend_requests').delete().eq('id', requestId);
      // Update search results immediately so "Pending" badge disappears
      if (cancelledRequest) {
        setSearchResults(prev => prev.map(u =>
          u.id === cancelledRequest.recipient_id
            ? { ...u, has_pending_request: false }
            : u
        ));
      }
      await fetchRequests();
    } catch (e: any) { showError(e.message || 'Failed to cancel'); }
  };

  const removeFriend = async (friendId: string) => {
    Alert.alert('Remove Friend', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            // Use the RPC function that handles both directions + cleans up friend_requests
            const { error } = await supabase.rpc('remove_friendship', { target_friend_id: friendId });
            if (error) throw error;
            await fetchFriends();
            showSuccess('Friend removed');
          } catch (e: any) { showError(e.message || 'Failed to remove'); }
        }
      },
    ]);
  };

  if (premiumLoading || loading) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#4A7BF7" />
        </View>
      </SafeAreaView>
    );
  }

  const totalRequests = pendingRequests.length + sentRequests.length;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <PremiumPurchaseModal visible={showPremiumModal} onClose={() => setShowPremiumModal(false)} />

      {/* HEADER */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>Friends</Text>
            <Text style={s.headerSub}>{friends.length} friends</Text>
          </View>
          {isPremium && (
            <Pressable style={s.premiumBtn} onPress={() => setShowPremiumModal(true)}>
              <Ionicons name="diamond" size={13} color="#F59E0B" />
              <Text style={s.premiumBtnTxt}>Premium</Text>
            </Pressable>
          )}
        </View>

        {/* Search */}
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={17} color="rgba(255,255,255,0.35)" />
          <TextInput
            style={s.searchInput}
            placeholder="Search by username..."
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={searchQuery}
            onChangeText={(t) => { setSearchQuery(t); searchUsers(t); }}
          />
          {searching && <ActivityIndicator size="small" color="#4A7BF7" />}
          {searchQuery.length > 0 && !searching && (
            <Pressable onPress={() => { setSearchQuery(''); setSearchResults([]); setSelectedUser(null); }}>
              <Ionicons name="close-circle" size={17} color="rgba(255,255,255,0.3)" />
            </Pressable>
          )}
        </View>
      </View>

      {/* TABS */}
      <View style={s.tabs}>
        {([
          { key: 'friends', label: 'Friends', count: 0 },
          { key: 'requests', label: 'Requests', count: pendingRequests.length },
          { key: 'invites', label: 'Invites', count: gameInvitations.length },
        ] as const).map(tab => (
          <Pressable
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[s.tabTxt, activeTab === tab.key && s.tabTxtActive]}>{tab.label}</Text>
            {tab.count > 0 && (
              <View style={s.tabBadge}>
                <Text style={s.tabBadgeTxt}>{tab.count > 9 ? '9+' : tab.count}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* SEARCH RESULTS */}
        {searchResults.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>SEARCH RESULTS</Text>
            {searchResults.map(item => {
              const disabled = item.is_friend || item.has_pending_request;
              const selected = selectedUser?.id === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={[s.row, selected && s.rowSelected, disabled && { opacity: 0.5 }]}
                  onPress={() => !disabled && setSelectedUser(item)}
                  disabled={disabled}
                >
                  <View style={s.avatar}>
                    {item.avatar_url
                      ? <Image source={{ uri: item.avatar_url }} style={s.avatarImg} resizeMode="cover" />
                      : <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.4)" />
                    }
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowName}>{item.display_name}</Text>
                    <Text style={s.rowSub}>@{item.username}</Text>
                  </View>
                  {item.is_friend && <View style={s.chip}><Text style={s.chipTxt}>Friend</Text></View>}
                  {item.has_pending_request && <View style={s.chip}><Text style={s.chipTxt}>Pending</Text></View>}
                  {selected && !disabled && <Ionicons name="checkmark-circle" size={20} color="#4A7BF7" />}
                </Pressable>
              );
            })}
            {selectedUser && (
              <Pressable
                style={[s.sendBtn, sendingRequest && { opacity: 0.6 }, !isPremium && { backgroundColor: '#FFD700' }]}
                onPress={sendFriendRequest}
                disabled={sendingRequest}
              >
                {sendingRequest
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : !isPremium
                    ? <><Ionicons name="diamond" size={16} color="#000000" /><Text style={s.sendBtnTxt}>Upgrade to Send Requests</Text></>
                    : <><Ionicons name="person-add-outline" size={16} color="#000000" /><Text style={s.sendBtnTxt}>Send Friend Request</Text></>
                }
              </Pressable>
            )}
          </View>
        )}

        {/* FRIENDS TAB */}
        {activeTab === 'friends' && (
          <View style={s.section}>
            {friends.length === 0 ? (
              <View style={s.empty}>
                <View style={s.emptyIcon}><Ionicons name="people-outline" size={32} color="rgba(255,255,255,0.25)" /></View>
                <Text style={s.emptyTitle}>No Friends Yet</Text>
                <Text style={s.emptySub}>Search for users above to add friends</Text>
              </View>
            ) : (
              friends.map(item => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [s.row, pressed && { opacity: 0.75 }]}
                  onPress={() => router.push(`/player-stats/${item.friend_id}`)}
                >
                  <View style={s.avatar}>
                    {item.avatar_url
                      ? <Image source={{ uri: item.avatar_url }} style={s.avatarImg} resizeMode="cover" />
                      : <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.4)" />
                    }
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowName}>{item.display_name}</Text>
                    <Text style={s.rowSub}>@{item.username}</Text>
                  </View>
                  <Pressable style={s.removeBtn} onPress={() => removeFriend(item.friend_id)}>
                    <Ionicons name="close" size={15} color="#EF4444" />
                  </Pressable>
                </Pressable>
              ))
            )}
          </View>
        )}

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
          <View style={s.section}>
            {pendingRequests.length > 0 && (
              <>
                <Text style={s.sectionLabel}>RECEIVED</Text>
                {pendingRequests.map(item => (
                  <View key={item.id} style={s.row}>
                    <View style={s.avatar}>
                      {item.sender.avatar_url
                        ? <Image source={{ uri: item.sender.avatar_url }} style={s.avatarImg} resizeMode="cover" />
                        : <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.4)" />
                      }
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowName}>{item.sender.display_name}</Text>
                      <Text style={s.rowSub}>@{item.sender.username}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable style={s.acceptBtn} onPress={() => acceptFriendRequest(item.id)}>
                        <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                      </Pressable>
                      <Pressable style={s.declineBtn} onPress={() => declineFriendRequest(item.id)}>
                        <Ionicons name="close" size={17} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </>
            )}
            {sentRequests.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { marginTop: 16 }]}>SENT</Text>
                {sentRequests.map(item => (
                  <View key={item.id} style={s.row}>
                    <View style={s.avatar}>
                      {item.sender.avatar_url
                        ? <Image source={{ uri: item.sender.avatar_url }} style={s.avatarImg} resizeMode="cover" />
                        : <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.4)" />
                      }
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowName}>{item.sender.display_name}</Text>
                      <Text style={s.rowSub}>@{item.sender.username}</Text>
                    </View>
                    <View style={s.pendingChip}>
                      <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.4)" />
                      <Text style={s.pendingTxt}>Pending</Text>
                    </View>
                    <Pressable style={s.removeBtn} onPress={() => cancelSentRequest(item.id)}>
                      <Ionicons name="close" size={15} color="#EF4444" />
                    </Pressable>
                  </View>
                ))}
              </>
            )}
            {pendingRequests.length === 0 && sentRequests.length === 0 && (
              <View style={s.empty}>
                <View style={s.emptyIcon}><Ionicons name="mail-outline" size={32} color="rgba(255,255,255,0.25)" /></View>
                <Text style={s.emptyTitle}>No Requests</Text>
                <Text style={s.emptySub}>Friend requests will appear here</Text>
              </View>
            )}
          </View>
        )}

        {/* INVITES TAB */}
        {activeTab === 'invites' && (
          <View style={s.section}>
            {gameInvitations.length === 0 ? (
              <View style={s.empty}>
                <View style={s.emptyIcon}><Ionicons name="game-controller-outline" size={32} color="rgba(255,255,255,0.25)" /></View>
                <Text style={s.emptyTitle}>No Invitations</Text>
                <Text style={s.emptySub}>Game invitations will appear here</Text>
              </View>
            ) : (
              gameInvitations.map(inv => (
                <GameInvitationCard key={inv.id} invitation={inv} onResponse={fetchGameInvitations} />
              ))
            )}
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}


const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 20 },

  header: {
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
    gap: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.6 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  premiumBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
  },
  premiumBtnTxt: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#111111', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#FFFFFF', padding: 0 },

  tabs: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#111111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    position: 'relative',
  },
  tabActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  tabTxt: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  tabTxtActive: { color: '#000000', fontWeight: '700' },
  tabBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: '#000000',
  },
  tabBadgeTxt: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },

  section: { marginHorizontal: 16, marginTop: 16 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.8, marginBottom: 10,
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#111111', borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 8,
  },
  rowSelected: { borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.05)' },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  rowName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  rowSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 },

  chip: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  chipTxt: { fontSize: 11, color: '#FFFFFF', fontWeight: '600' },
  pendingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  pendingTxt: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },

  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 13, marginTop: 8,
  },
  sendBtnTxt: { color: '#000000', fontWeight: '700', fontSize: 14 },

  acceptBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center',
  },
  declineBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center',
  },
  removeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: '#111111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  emptySub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 20 },
});
