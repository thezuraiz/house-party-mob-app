import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

const ITEMS = [
  {
    icon: 'shield-checkmark-outline' as const,
    label: 'Privacy Policy',
    desc: 'How we collect, use, and protect your data',
    route: '/privacy-policy',
    color: '#FFFFFF',
    bg: 'rgba(255,255,255,0.08)',
  },
  {
    icon: 'document-text-outline' as const,
    label: 'Terms of Service',
    desc: 'Rules and guidelines for using HouseParty',
    route: '/terms-of-service',
    color: '#FFFFFF',
    bg: 'rgba(255,255,255,0.08)',
  },
  {
    icon: 'refresh-outline' as const,
    label: 'Refund & Cancellation',
    desc: 'Information about subscriptions and refunds',
    route: '/refund-policy',
    color: '#FFFFFF',
    bg: 'rgba(255,255,255,0.08)',
  },
];

export default function LegalScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </Pressable>
        <Text style={s.headerTitle}>Legal & Policies</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Ionicons name="shield-outline" size={32} color="#FFFFFF" />
          </View>
          <Text style={s.heroTitle}>Legal & Policies</Text>
          <Text style={s.heroSub}>Review our policies and legal information</Text>
        </View>

        {/* List */}
        <View style={s.list}>
          {ITEMS.map((item, i) => (
            <Pressable
              key={item.route}
              style={({ pressed }) => [s.card, pressed && { opacity: 0.75 }]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[s.iconBox, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={s.cardInfo}>
                <Text style={s.cardTitle}>{item.label}</Text>
                <Text style={s.cardDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
            </Pressable>
          ))}
        </View>

        <View style={s.footer}>
          <Text style={s.footerTxt}>Last Updated: January 13, 2026</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#111111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

  body: { padding: 20, paddingBottom: 60 },

  hero: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  heroIcon: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: '#111111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },

  list: { gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#111111', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 3 },
  cardDesc: { fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 18 },

  footer: { marginTop: 32, alignItems: 'center' },
  footerTxt: { fontSize: 12, color: 'rgba(255,255,255,0.25)' },
});
