import {
  View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator,
  Alert, Platform, ScrollView, StatusBar, Modal,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/lib/supabase';

export default function ProfileSettingsScreen() {
  const [localDisplayName, setLocalDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [successModal, setSuccessModal] = useState(false);

  const { user } = useAuth();
  const { displayName, updateDisplayName } = useProfile();
  const router = useRouter();

  useEffect(() => { setLoading(false); }, [user]);
  useEffect(() => { setLocalDisplayName(displayName || ''); }, [displayName]);

  const handleForgotPassword = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/auth-deeplink-redirect?type=recovery`,
      });
      if (error) throw error;
      Alert.alert('Email Sent', `A password reset link has been sent to ${user.email}. Check your inbox.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send reset email');
    } finally {
      setSendingReset(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (localDisplayName !== displayName) await updateDisplayName(localDisplayName);
      setSuccessModal(true);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={s.centered}><ActivityIndicator size="large" color="#4A7BF7" /></View>
      </SafeAreaView>
    );
  }

  const initials = (displayName || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* ── Success Modal ── */}
      <Modal visible={successModal} transparent animationType="fade" onRequestClose={() => { setSuccessModal(false); router.back(); }}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            {/* Icon */}
            <View style={s.modalIconCircle}>
              <Ionicons name="checkmark" size={32} color="#000000" />
            </View>
            {/* Title */}
            <Text style={s.modalTitle}>Settings Saved</Text>
            {/* Message */}
            <Text style={s.modalMessage}>Your profile has been updated successfully.</Text>
            {/* Button */}
            <Pressable
              style={s.modalBtn}
              onPress={() => { setSuccessModal(false); router.back(); }}
            >
              <Text style={s.modalBtnTxt}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </Pressable>
        <Text style={s.headerTitle}>Settings</Text>
        <Pressable
          style={[s.saveTopBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#4A7BF7" />
            : <Text style={s.saveTopTxt}>Save</Text>
          }
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Avatar hero */}
        <View style={s.avatarHero}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarInitial}>{initials}</Text>
          </View>
          <Text style={s.avatarName}>{displayName || 'Set display name'}</Text>
          <Text style={s.avatarEmail}>{user?.email}</Text>
        </View>

        {/* Profile group */}
        <Text style={s.groupLabel}>PROFILE</Text>
        <View style={s.group}>
          <View style={s.row}>
            <View style={[s.rowIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
              <Ionicons name="person" size={16} color="#FFFFFF" />
            </View>
            <Text style={s.rowLabel}>Display Name</Text>
          </View>
          <TextInput
            style={s.input}
            placeholder="Enter display name..."
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={localDisplayName}
            onChangeText={setLocalDisplayName}
          />
          <Text style={s.rowHint}>Shown in games and leaderboards</Text>
        </View>

        {/* Account group */}
        <Text style={s.groupLabel}>ACCOUNT</Text>
        <View style={s.group}>
          {/* Email row */}
          <View style={[s.listRow, s.listRowBorder]}>
            <View style={[s.rowIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
              <Ionicons name="mail" size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.listRowLabel}>Email</Text>
              <Text style={s.listRowValue} numberOfLines={1}>{user?.email}</Text>
            </View>
          </View>

          {/* Password row — sends reset email */}
          <Pressable
            style={({ pressed }) => [s.listRow, (pressed || sendingReset) && { opacity: 0.7 }]}
            onPress={handleForgotPassword}
            disabled={sendingReset}
          >
            <View style={[s.rowIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
              {sendingReset
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.listRowLabel}>Password</Text>
              <Text style={s.listRowValue}>Tap to send a reset link to your email</Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.2)" />
          </Pressable>
        </View>

        {/* Save button */}
        <Pressable
          style={({ pressed }) => [s.saveBtn, (saving || pressed) && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={s.saveBtnTxt}>Save Changes</Text>
          }
        </Pressable>

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#111111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  saveTopBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  saveTopTxt: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Avatar hero
  avatarHero: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#1A1A1A',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  avatarInitial: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
  avatarName: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  avatarEmail: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },

  // Groups
  groupLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.8, paddingHorizontal: 20, marginBottom: 8, marginTop: 20,
  },
  group: {
    marginHorizontal: 16,
    backgroundColor: '#111111', borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },

  // Input row
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingBottom: 8 },
  rowIcon: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  rowLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  rowHint: { fontSize: 12, color: 'rgba(255,255,255,0.3)', paddingHorizontal: 14, paddingBottom: 12 },
  input: {
    backgroundColor: '#1A1A1A', color: '#FFFFFF',
    marginHorizontal: 14, padding: 13, borderRadius: 12, fontSize: 15,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },

  // List rows
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  listRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  listRowLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', flex: 1 },
  listRowValue: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  // Save button
  saveBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    marginHorizontal: 16, marginTop: 24,
  },
  saveBtnTxt: { color: '#000000', fontSize: 16, fontWeight: '800' },

  // Success Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  modalBox: {
    backgroundColor: '#111111', borderRadius: 28, padding: 32,
    width: '100%', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5, shadowRadius: 32, elevation: 20,
  },
  modalIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 22, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  modalMessage: {
    fontSize: 14, color: 'rgba(255,255,255,0.5)',
    textAlign: 'center', lineHeight: 22,
  },
  modalBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 48,
    marginTop: 8,
  },
  modalBtnTxt: { fontSize: 15, fontWeight: '800', color: '#000000' },
});
