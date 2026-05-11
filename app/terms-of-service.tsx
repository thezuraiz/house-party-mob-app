import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import ScreenWrapper from '@/components/ScreenWrapper';
import { T } from '@/constants/Theme';

export default function TermsOfServiceScreen() {
  const router = useRouter();
  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={T.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.meta}>Last updated: November 6, 2025</Text>
        <Section title="Agreement to Terms" body="By accessing or using HouseParty, you agree to be bound by these Terms of Service. If you do not agree, you are prohibited from using this application." />
        <Section title="User Accounts" body="You are responsible for:">
          <Bullet text="Maintaining the confidentiality of your account" />
          <Bullet text="All activities that occur under your account" />
          <Bullet text="Notifying us immediately of any unauthorized use" />
        </Section>
        <Section title="Acceptable Use" body="You agree not to:">
          <Bullet text="Use the service for any illegal purpose" />
          <Bullet text="Harass, abuse, or harm other users" />
          <Bullet text="Attempt to gain unauthorized access to the service" />
          <Bullet text="Upload malicious code or viruses" />
          <Bullet text="Impersonate any person or entity" />
        </Section>
        <Section title="Premium Features" body="Some features require payment. All purchases are final and non-refundable unless required by law. We reserve the right to modify pricing and features at any time." />
        <Section title="Termination" body="We may terminate or suspend your account immediately, without prior notice, for any reason, including breach of these Terms." />
        <Section title="Disclaimer" body='The service is provided "as is" without warranties of any kind. We do not guarantee uninterrupted, secure, or error-free service.' />
        <Section title="Contact Us" body="Questions? Email us at: support@houseparty.app" />
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
});
