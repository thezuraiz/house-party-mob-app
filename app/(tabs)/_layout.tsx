import { Tabs, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/contexts/AuthContext';
import { useDiscountNotification } from '@/contexts/DiscountNotificationContext';
import { supabase } from '@/lib/supabase';

// Hardcoded 5 tabs — always render all 5 regardless of route.name format
const TABS = [
  { icon: 'home'          as const, active: 'home'          as const },
  { icon: 'bar-chart'     as const, active: 'bar-chart'     as const },
  { icon: 'storefront'    as const, active: 'storefront'    as const },
  { icon: 'people'        as const, active: 'people'        as const },
  { icon: 'person-circle' as const, active: 'person-circle' as const },
];

function CustomTabBar({ state, navigation }: any): React.ReactElement {
  const insets = useSafeAreaInsets();
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingInvites, setPendingInvites]   = useState(0);
  const { user } = useAuth();
  const { hasNewDiscounts } = useDiscountNotification();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ count: r }, { count: i }] = await Promise.all([
        supabase.from('friend_requests').select('id', { count: 'exact', head: true }).eq('recipient_id', user.id).eq('status', 'pending'),
        supabase.from('game_invitations').select('id', { count: 'exact', head: true }).eq('invitee_id', user.id).eq('status', 'pending'),
      ]);
      setPendingRequests(r || 0);
      setPendingInvites(i || 0);
    };
    load();
    const topicId =
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const sub = supabase
      .channel(`tab_badge-${user.id}-${topicId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests',  filter: `recipient_id=eq.${user.id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_invitations', filter: `invitee_id=eq.${user.id}`   }, load)
      .subscribe();
    return () => {
      void supabase.removeChannel(sub);
    };
  }, [user]);

  return (
    <View style={[s.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={s.bar}>
        {TABS.map((tab, i) => {
          const route   = state.routes[i];
          const focused = state.index === i;
          // badge: index=0 (game invites on home), friends=3 (requests + game invites)
          const badge = i === 0 ? pendingInvites : i === 3 ? (pendingRequests + pendingInvites) : 0;
          const dot   = i === 2 && hasNewDiscounts && !badge;

          return (
            <Pressable
              key={i}
              style={s.item}
              onPress={() => {
                if (focused || !route) return;
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!event.defaultPrevented) navigation.navigate(route.name);
              }}
              android_ripple={null}
            >
              {focused ? (
                <View style={s.activeCircle}>
                  <Ionicons name={tab.active} size={22} color="#FFFFFF" />
                  {badge > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={s.inactiveItem}>
                  <Ionicons name={tab.icon} size={22} color="#1A1A1A" />
                  {badge > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                    </View>
                  )}
                  {dot && <View style={s.dot} />}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session && segments[0] === '(tabs)') router.replace('/(auth)/welcome');
  }, [session, loading, segments]);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="leaderboard" />
      <Tabs.Screen name="shop" />
      <Tabs.Screen name="friends" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const s = StyleSheet.create({
  wrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 8,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 40,
    paddingHorizontal: 8, paddingVertical: 8, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 16,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  activeCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#1A1A1A',
    justifyContent: 'center', alignItems: 'center', elevation: 4,
    position: 'relative',
  },
  inactiveItem: {
    width: 48, height: 48, justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  badge: {
    position: 'absolute', top: 4, right: 4, backgroundColor: '#EF4444',
    borderRadius: 8, minWidth: 15, height: 15, justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#FFFFFF',
    zIndex: 10,
  },
  badgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800', lineHeight: 11 },
  dot: {
    position: 'absolute', top: 8, right: 8, backgroundColor: '#EF4444',
    width: 7, height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: '#FFFFFF',
  },
});
