import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import ScreenWrapper from '@/components/ScreenWrapper';
import { T } from '@/constants/Theme';

export default function RefundPolicyScreen() {
  const router = useRouter();
  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={T.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Refund & Cancellation</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.meta}>Last updated: January 13, 2026</Text>
        <Section title="Subscription Overview" body="HouseParty Premium subscription:">
          <Bullet text="Price: $4.99 USD per month" />
          <Bullet text="Billing Cycle: Monthly, charged automatically" />
          <Bullet text="Payment Processor: Yoco" />
        </Section>
        <Section title="Cancellation Policy" body="You may cancel at any time:">
          <Bullet text="Cancellations take effect at end of current billing period" />
          <Bullet text="You retain Premium access until end of paid period" />
          <Bullet text="No cancellation fees apply" />
        </Section>
        <View style={styles.highlight}>
          <Text style={styles.highlightText}>⚠️ Cancelling does not automatically trigger a refund for the current billing period.</Text>
        </View>
        <Section title="Refund Policy" body="Our refund policy:">
          <Bullet text="No partial month refunds" />
          <Bullet text="First-time subscribers: contact us within 48 hours for technical issues" />
          <Bullet text="Unauthorized charges: report within 7 days" />
          <Bullet text="Service unavailable 48+ hours: prorated refund available" />
        </Section>
        <Section title="How to Request a Refund" body="Email: billing@housepartyapp.com with your account email and transaction details." />
        <Section title="In-App Purchases" body="All one-time purchases are final. No refunds for digital goods once accessed, except for technical delivery failures." />
        <Section title="Contact Us" body="Questions? Email: billing@housepartyapp.com" />
      </ScrollView>
    </ScreenWrapper>
  );
}

function Section({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.paragraph}>{body}</Text>
      {children}
    </View>
  );
}
function Bullet({ text }: { text: string }) {
  return <Text style={styles.bullet}>• {text}</Text>;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: T.surfaceAlt, borderWidth: 1, borderColor: T.border,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: T.textPrimary },
  scroll: { flex: 1 },
  body: { padding: 20, paddingBottom: 48 },
  meta: { fontSize: 13, color: T.textMuted, marginBottom: 20, fontStyle: 'italic' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: T.textPrimary, marginBottom: 8 },
  paragraph: { fontSize: 14, color: T.textSecondary, lineHeight: 22, marginBottom: 6 },
  bullet: { fontSize: 14, color: T.textSecondary, lineHeight: 22, marginLeft: 8, marginBottom: 4 },
  highlight: {
    backgroundColor: '#FFFBEB', borderLeftWidth: 3, borderLeftColor: T.warning,
    padding: 14, borderRadius: 10, marginBottom: 20,
  },
  highlightText: { fontSize: 13, color: '#92400E', lineHeight: 20, fontWeight: '500' },
});
