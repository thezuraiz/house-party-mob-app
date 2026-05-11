import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import ScreenWrapper from '@/components/ScreenWrapper';
import { T } from '@/constants/Theme';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={T.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.meta}>Last updated: November 6, 2025</Text>
        <Section title="Introduction" body="HouseParty is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application." />
        <Section title="Information We Collect" body="We collect information you provide directly, including:">
          <Bullet text="Account information (email, username, password)" />
          <Bullet text="Profile information (display name, avatar)" />
          <Bullet text="Game and scoring data you create" />
          <Bullet text="Messages and interactions with other users" />
        </Section>
        <Section title="How We Use Your Information" body="We use the information we collect to:">
          <Bullet text="Provide and maintain our services" />
          <Bullet text="Process transactions and send related information" />
          <Bullet text="Send you technical notices and support messages" />
          <Bullet text="Improve and personalize your experience" />
        </Section>
        <Section title="Data Storage and Security" body="We use industry-standard security measures. Your data is stored on secure servers provided by Supabase with appropriate technical and organizational protections." />
        <Section title="Data Sharing" body="We do not sell your personal information. We may share it only:">
          <Bullet text="With your consent" />
          <Bullet text="To comply with legal obligations" />
          <Bullet text="To protect our rights and prevent fraud" />
        </Section>
        <Section title="Your Rights" body="You have the right to:">
          <Bullet text="Access your personal data" />
          <Bullet text="Correct inaccurate data" />
          <Bullet text="Request deletion of your data" />
          <Bullet text="Export your data" />
        </Section>
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
