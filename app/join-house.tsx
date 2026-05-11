import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import NeuIcon from '@/components/NeuIcon';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import HouseLimitModal from '@/components/HouseLimitModal';
import { T } from '@/constants/Theme';

export default function JoinHouseScreen() {
  const [inviteCode, setInviteCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [houseName, setHouseName] = useState('');
  const nicknameRef = useRef<TextInput>(null);
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleJoin = async () => {
    try {
      if (!inviteCode.trim() || !nickname.trim()) { setError('Please fill in all fields'); return; }
      if (!user) { setError('You must be signed in to join a house'); return; }

      setLoading(true); setError('');
      const normalizedCode = inviteCode.toUpperCase().trim();

      const { data: house, error: houseError } = await supabase
        .from('houses').select('id, name').eq('invite_code', normalizedCode).maybeSingle();

      if (houseError) { setError(`Error finding house: ${houseError.message}`); setLoading(false); return; }
      if (!house) { setError('Invalid invite code. Please check and try again.'); setLoading(false); return; }

      setHouseName(house.name);

      const { data: limitCheck, error: limitError } = await supabase
        .rpc('check_user_can_join_house', { user_id_param: user.id });

      if (limitError) { setError('Failed to check house limit'); setLoading(false); return; }
      if (limitCheck && !limitCheck.can_join) { setLoading(false); setShowLimitModal(true); return; }

      const { count: memberCount } = await supabase
        .from('house_members').select('*', { count: 'exact', head: true }).eq('house_id', house.id);

      if ((memberCount || 0) >= 50) {
        setError(`${house.name} is full (50/50 members).`); setLoading(false); return;
      }

      const { data: existingMember } = await supabase
        .from('house_members').select('id').eq('house_id', house.id).eq('user_id', user.id).maybeSingle();

      if (existingMember) { setError(`You are already a member of ${house.name}`); setLoading(false); return; }

      const { error: memberError } = await supabase.from('house_members').insert({
        house_id: house.id, user_id: user.id, nickname, role: 'member',
      });

      if (memberError) { setError(`Failed to join house: ${memberError.message}`); setLoading(false); return; }

      setLoading(false);
      queryClient.invalidateQueries({ queryKey: ['houses', user.id] });
      setTimeout(() => router.replace('/'), 100);
    } catch (err) {
      setError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setLoading(false);
    }
  };

  // Split code into individual boxes
  const codeChars = inviteCode.padEnd(6, ' ').split('');

  return (
    <View style={styles.container}>
      {/* Top gradient section */}


        <SafeAreaView  style={{backgroundColor: '#000000'}}>
          <View style={styles.topContent}>
            <NeuIcon name="arrow-back" size={20} variant="glass" containerSize={40} onPress={() => router.back()} />
            <View style={styles.topHero}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="enter" size={36} color="#FFFFFF" />
              </View>
              <Text style={styles.topTitle}>Join a House</Text>
              <Text style={styles.topSubtitle}>Enter the invite code from your friend</Text>
            </View>
          </View>
        </SafeAreaView>


      {/* Bottom card */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.cardWrapper}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={styles.card}>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={T.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Invite code input with character boxes */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Invite Code</Text>
              <Text style={styles.fieldHint}>6-character code shared by the house admin</Text>
              <View style={styles.codeBoxRow}>
                {codeChars.map((char, i) => (
                  <View key={i} style={[styles.codeBox, inviteCode.length > i && styles.codeBoxFilled, inviteCode.length === i && styles.codeBoxActive]}>
                    <Text style={styles.codeChar}>{char.trim()}</Text>
                  </View>
                ))}
              </View>
              {/* Hidden input that drives the boxes */}
              <TextInput
                style={styles.hiddenInput}
                value={inviteCode}
                onChangeText={(t) => { setInviteCode(t.toUpperCase()); setError(''); }}
                autoCapitalize="characters"
                maxLength={6}
                returnKeyType="next"
                onSubmitEditing={() => nicknameRef.current?.focus()}
                editable={!loading}
                autoFocus
              />
            </View>

            {/* Nickname */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Your Nickname</Text>
              <Text style={styles.fieldHint}>How you'll appear in this house</Text>
              <View style={[styles.inputWrapper, error && nickname === '' && styles.inputError]}>
                <Ionicons name="person-outline" size={18} color={T.textMuted} style={styles.inputIcon} />
                <TextInput
                  ref={nicknameRef}
                  style={styles.input}
                  placeholder="PlayerOne"
                  placeholderTextColor={T.textMuted}
                  value={nickname}
                  onChangeText={(t) => { setNickname(t); setError(''); }}
                  returnKeyType="done"
                  onSubmitEditing={handleJoin}
                  editable={!loading}
                />
              </View>
            </View>

            {/* How it works */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color={"#444444"} />
              <Text style={styles.infoText}>Ask the house admin for their 6-character invite code, or scan their QR code from the house screen.</Text>
            </View>

            {/* Join button */}
            <Pressable
              style={({ pressed }) => [styles.joinBtn, (loading || pressed) && styles.pressed]}
              onPress={handleJoin}
              disabled={loading}
            >

                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="enter-outline" size={20} color="#black" />
                    <Text style={styles.joinText}>Join House</Text>
                  </>
                )}

            </Pressable>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <HouseLimitModal
        visible={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onUpgrade={() => { setShowLimitModal(false); router.push('/(tabs)/profile'); }}
        context="join"
        houseName={houseName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.surfaceDark,
  },
  topSection: {
    paddingBottom: 36,
    paddingHorizontal: 24,
  },
  topContent: {
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingVertical:24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  topHero: {
    alignItems: 'center',
    gap: 10,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  topTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
  },
  topSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
  cardWrapper: {
    flex: 1,
    marginTop: -20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  card: {
    flex: 1,
    backgroundColor: T.surfaceDark,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingTop: 32,
    gap: 22,
    // shadowColor: T.dark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.errorLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 14,
  },
  errorText: {
    color: T.error,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: "#ffffff",
    letterSpacing: -0.2,
  },
  fieldHint: {
    fontSize: 12,
    color: T.textMuted,
    marginBottom: 4,
  },

  // Code boxes
  codeBoxRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  codeBox: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: T.surfaceAlt,
    borderWidth: 2,
    borderColor: T.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeBoxFilled: {
    backgroundColor: T.surfaceAlt,
    borderColor: '#B0B0B0',
  },
  codeBoxActive: {
    borderColor: '#B0B0B0',
    backgroundColor: T.surfaceAlt,
  },
  codeChar: {
    fontSize: 22,
    fontWeight: '800',
    color: '#444444',
    letterSpacing: 1,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: 56,
  },

  // Nickname input
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: T.border,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: T.error,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: T.textPrimary,
    fontSize: 16,
    paddingVertical: 16,
  },

  // Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    // backgroundColor: T.primaryLight,
    backgroundColor: T.surfaceAlt,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 13,
    // color: T.primary,
    color:"#444444",
    flex: 1,
    lineHeight: 19,
    fontWeight: '500',
  },

  // Join button
  joinBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: T.surfaceAlt,
    padding:12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    // shadowOffset: { width: 0, height: 6 },
    // shadowOpacity: 0.35,
    // shadowRadius: 14,
    // elevation: 8,
  },
  joinGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
  },
  joinText: {
    color: '#black',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.82,
  },
});
