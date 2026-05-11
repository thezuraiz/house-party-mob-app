import { View, Text, StyleSheet, Pressable, Share, ActivityIndicator, TextInput } from 'react-native';
import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as Clipboard from 'expo-clipboard';
import { useToast } from '@/contexts/ToastContext';
import { T } from '@/constants/Theme';

interface ReferralStats {
  referral_code: string;
  referral_count: number;
  premium_unlocked: boolean;
  referrals_needed: number;
  share_url: string;
  referral_used: boolean;
}

export default function ReferralProgress() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendCode, setFriendCode] = useState('');
  const [submittingCode, setSubmittingCode] = useState(false);

  useEffect(() => {
    if (!user) return;

    loadReferralStats();
  }, [user]);

  const loadReferralStats = async (retryCount = 0) => {
    if (!user) {
      setLoading(false);
      return;
    }

    const maxRetries = 3;
    const delays = [0, 1000, 2000]; // 0ms, 1s, 2s
    const isLastAttempt = retryCount >= maxRetries - 1;

    try {
      console.log('[REFERRAL] Loading referral stats for user:', user.id, `(attempt ${retryCount + 1}/${maxRetries})`);

      // Wait before retry if this is not the first attempt
      if (retryCount > 0 && delays[retryCount]) {
        console.log(`[REFERRAL] Waiting ${delays[retryCount]}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delays[retryCount]));
      }

      // Load directly from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('referral_code, referral_count, premium_unlocked, referral_used')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.log('[REFERRAL] Error loading profile:', profileError);

        // Retry if we haven't reached max retries
        if (!isLastAttempt) {
          console.log('[REFERRAL] Retrying...');
          setTimeout(() => loadReferralStats(retryCount + 1), 0);
          return;
        }

        console.log('[REFERRAL] Failed after all retries');
        setLoading(false);
        return;
      }

      if (!profileData) {
        console.log('[REFERRAL] No profile found for user');

        // Retry if we haven't reached max retries
        if (!isLastAttempt) {
          console.log('[REFERRAL] Profile not ready yet, retrying...');
          setTimeout(() => loadReferralStats(retryCount + 1), 0);
          return;
        }

        console.log('[REFERRAL] Profile not found after all retries');
        setLoading(false);
        return;
      }

      // Check if referral_code is missing (still being generated)
      if (!profileData.referral_code) {
        console.log('[REFERRAL] Referral code not generated yet');

        // Retry if we haven't reached max retries
        if (!isLastAttempt) {
          console.log('[REFERRAL] Waiting for referral code generation...');
          setTimeout(() => loadReferralStats(retryCount + 1), 0);
          return;
        }

        // On last attempt with no code, show error
        console.log('[REFERRAL] Referral code still not available after retries');
        setLoading(false);
        return;
      }

      console.log('[REFERRAL] Loaded profile data:', profileData);

      // Build stats object
      const referralStats: ReferralStats = {
        referral_code: profileData.referral_code,
        referral_count: profileData.referral_count || 0,
        premium_unlocked: profileData.premium_unlocked || false,
        referrals_needed: Math.max(0, 10 - (profileData.referral_count || 0)),
        share_url: `houseparty://signup?ref=${profileData.referral_code}`,
        referral_used: profileData.referral_used || false
      };

      console.log('[REFERRAL] Built stats:', referralStats);
      setStats(referralStats);
      setLoading(false);
    } catch (error) {
      console.log('[REFERRAL] Exception loading stats:', error);

      // Retry if we haven't reached max retries
      if (!isLastAttempt) {
        console.log('[REFERRAL] Exception occurred, retrying...');
        setTimeout(() => loadReferralStats(retryCount + 1), 0);
        return;
      }

      console.log('[REFERRAL] Failed with exception after all retries');
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!stats) return;

    try {
      await Clipboard.setStringAsync(stats.referral_code);
      showToast('Referral code copied!', 'success');
    } catch (error) {
      console.log('[REFERRAL] Error copying code:', error);
      showToast('Failed to copy code', 'error');
    }
  };

  const handleSubmitFriendCode = async () => {
    if (!user || !friendCode.trim()) {
      showToast('Please enter a referral code', 'error');
      return;
    }

    const trimmedCode = friendCode.trim().toUpperCase();

    if (trimmedCode === stats?.referral_code) {
      showToast('You cannot use your own referral code', 'error');
      return;
    }

    setSubmittingCode(true);

    try {
      console.log('[REFERRAL] Submitting friend code:', trimmedCode);

      const { data: result, error } = await supabase.rpc('handle_referral_signup', {
        p_referred_user_id: user.id,
        p_referral_code: trimmedCode
      });

      if (error) {
        console.log('[REFERRAL] RPC error:', error);
        showToast('Failed to submit code. Please try again.', 'error');
        return;
      }

      if (!result.success) {
        console.log('[REFERRAL] Validation failed:', result.error);
        showToast(result.error || 'Invalid referral code', 'error');
        return;
      }

      console.log('[REFERRAL] Success!', result);
      showToast('Referral code applied successfully!', 'success');
      setFriendCode('');

      // Reload stats
      await loadReferralStats();
    } catch (error: any) {
      console.log('[REFERRAL] Exception:', error);
      showToast('An error occurred. Please try again.', 'error');
    } finally {
      setSubmittingCode(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={T.primary} />
        <Text style={styles.loadingText}>Loading referral info...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={[styles.container, { borderColor: T.errorLight }]}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
            <Ionicons name="gift-outline" size={24} color="#EF4444" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Unable to load referral info</Text>
            <Text style={styles.subtitle}>Please try refreshing</Text>
          </View>
        </View>
        <Pressable style={styles.button} onPress={() => { setLoading(true); loadReferralStats(); }}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const progress = (stats.referral_count / 10) * 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: stats.premium_unlocked ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.08)' }]}>
          {stats.premium_unlocked
            ? <Ionicons name="diamond" size={22} color="#FFFFFF" />
            : <Ionicons name="gift-outline" size={22} color="#FFFFFF" />
          }
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {stats.premium_unlocked ? 'Referral Program' : 'Unlock Premium Free'}
          </Text>
          <Text style={styles.subtitle}>
            {stats.premium_unlocked
              ? 'Share your code with friends'
              : `Invite ${stats.referrals_needed} more ${stats.referrals_needed === 1 ? 'friend' : 'friends'} to unlock`}
          </Text>
        </View>
      </View>

      {/* Referral code */}
      <View style={styles.codeContainer}>
        <Text style={styles.codeLabel}>Your Referral Code</Text>
        <Text style={styles.codeText}>{stats.referral_code}</Text>
      </View>

      {/* Friend code input */}
      {!stats.referral_used && (
        <View style={styles.friendCodeSection}>
          <Text style={styles.friendCodeLabel}>Have a friend's code?</Text>
          <Text style={styles.friendCodeDescription}>Enter it once to support your friend</Text>
          <View style={styles.friendCodeInputContainer}>
            <TextInput
              style={styles.friendCodeInput}
              placeholder="Enter friend's code"
              placeholderTextColor={T.textMuted}
              value={friendCode}
              onChangeText={(text) => setFriendCode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
              editable={!submittingCode}
            />
            <Pressable
              style={[styles.submitCodeButton, (submittingCode || !friendCode.trim()) && styles.submitCodeButtonDisabled]}
              onPress={handleSubmitFriendCode}
              disabled={submittingCode || !friendCode.trim()}
            >
              {submittingCode
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              }
            </Pressable>
          </View>
        </View>
      )}

      {stats.referral_used && (
        <View style={styles.usedCodeBanner}>
          <Ionicons name="checkmark-circle" size={18} color={T.success} />
          <Text style={styles.usedCodeText}>You've already used a referral code</Text>
        </View>
      )}

      {/* Progress */}
      {!stats.premium_unlocked && (
        <>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
            </View>
            <Text style={styles.progressText}>{stats.referral_count}/10</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={18} color="#4A7BF7" />
              <Text style={styles.statLabel}>Referrals</Text>
              <Text style={styles.statValue}>{stats.referral_count}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="gift-outline" size={18} color="#4A7BF7" />
              <Text style={styles.statLabel}>Remaining</Text>
              <Text style={styles.statValue}>{stats.referrals_needed}</Text>
            </View>
          </View>
        </>
      )}

      {/* Copy button */}
      <Pressable style={styles.button} onPress={handleCopyCode}>
        <Ionicons name="copy-outline" size={16} color="#000000" />
        <Text style={styles.buttonText}>Copy Referral Code</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    padding: 20,
    gap: 14,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 6, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 3 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 18 },
  codeContainer: {
    backgroundColor: '#1A1A1A', borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  codeLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  codeText: { fontSize: 26, fontWeight: '800', color: '#4A7BF7', letterSpacing: 3 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressBar: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#4A7BF7' },
  progressText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statItem: {
    flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 12,
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  buttonText: { fontSize: 14, fontWeight: '700', color: '#000000' },
  primaryButton: {},
  secondaryButton: {},
  secondaryButtonText: {},
  friendCodeSection: {
    backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14,
    gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  friendCodeLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  friendCodeDescription: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  friendCodeInputContainer: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  friendCodeInput: {
    flex: 1, backgroundColor: '#111111', color: '#FFFFFF',
    padding: 12, borderRadius: 10, fontSize: 16, fontWeight: '600',
    letterSpacing: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  submitCodeButton: {
    backgroundColor: '#4A7BF7', width: 44, height: 44,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  submitCodeButtonDisabled: { backgroundColor: '#1A1A1A', opacity: 0.5 },
  usedCodeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  usedCodeText: { flex: 1, fontSize: 13, color: '#22C55E', fontWeight: '600' },
});
