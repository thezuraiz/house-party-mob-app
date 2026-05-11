import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  ScrollView, TextInput, Platform, Image, StatusBar,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import Toast from '@/components/Toast';
import { logError, formatSupabaseError } from '@/lib/errorReporting';
import HouseLimitModal from '@/components/HouseLimitModal';
import PremiumPurchaseModal from '@/components/PremiumPurchaseModal';
import { uploadHouseImage } from '@/lib/imageUpload';

type EmojiPack = {
  id: string; name: string; emojis: string[]; preview_emoji: string;
  price_cents: number; is_free: boolean; theme_color?: string; secondary_color?: string;
};

export default function CreateHouseScreen() {
  const [houseName, setHouseName] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emojiPacks, setEmojiPacks] = useState<EmojiPack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState('🏠');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });

  const { user } = useAuth();
  const { isPremium, loading: premiumLoading } = usePremium();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => { loadEmojiPacks(); }, [user]);

  const loadEmojiPacks = async () => {
    try {
      const { data, error } = await supabase.from('emoji_packs').select('*').order('is_free', { ascending: false }).order('price_cents', { ascending: true });
      if (error) { setError('Failed to load emoji packs.'); return; }
      if (data) {
        setEmojiPacks(data);
        const freePack = data.find(p => p.is_free);
        if (freePack) setSelectedPackId(freePack.id);
      }
    } catch { setError('Failed to load emoji packs.'); }
  };

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const pickImage = async () => {
    if (!isPremium) { setShowPremiumModal(true); return; }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [16, 9], quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const { validateImage } = await import('@/lib/imageUpload');
        const validation = await validateImage(imageUri);
        if (!validation.valid) { setToast({ visible: true, message: validation.error || 'Invalid image', type: 'error' }); return; }
        setSelectedImage(imageUri);
      }
    } catch (err) { logError('PICK_HOUSE_IMAGE', err); setToast({ visible: true, message: 'Failed to pick image.', type: 'error' }); }
  };

  const handleCreate = async () => {
    try {
      if (!houseName.trim() || !nickname.trim()) { setError('Please fill in all fields'); return; }
      if (!user) { setError('You must be signed in'); return; }
      setLoading(true); setError('');

      const { data: limitCheck, error: limitError } = await supabase.rpc('check_user_can_join_house', { user_id_param: user.id });
      if (limitError) throw new Error('Failed to check house limit');
      if (limitCheck && !limitCheck.can_join) { setLoading(false); setShowLimitModal(true); return; }

      let house = null;
      let attempts = 0;
      while (!house && attempts < 3) {
        attempts++;
        const inviteCode = generateInviteCode();
        const { data: houseId, error: createError } = await supabase.rpc('create_house_with_admin', {
          house_name: houseName.trim(), house_description: '', house_emoji: selectedEmoji,
          invite_code: inviteCode, creator_id: user.id,
        });
        if (!createError && houseId) {
          if (nickname.trim()) await supabase.from('house_members').update({ nickname: nickname.trim(), emoji_pack_id: selectedPackId }).eq('house_id', houseId).eq('user_id', user.id);
          house = { id: houseId };
          if (selectedImage) {
            try {
              const uploadResult = await uploadHouseImage(selectedImage, user.id, houseId);
              if (uploadResult.success && uploadResult.url) {
                await supabase.from('houses').update({ image_url: uploadResult.url }).eq('id', houseId);
              } else {
                console.warn('[CREATE_HOUSE] Image upload failed:', uploadResult.error);
              }
            } catch (imgErr) {
              console.warn('[CREATE_HOUSE] Image upload exception:', imgErr);
              // Don't fail house creation if image upload fails
            }
          }
          break;
        }
        if (createError) {
          console.log('[CREATE_HOUSE] RPC error:', createError);
          if (createError.code !== '23505') {
            let msg = formatSupabaseError(createError);
            if (createError.code === '42501') msg = 'Permission denied. Upgrade to Premium!';
            setError(msg); setLoading(false); return;
          }
        }
      }

      if (!house) { setError('Failed to create house. Please try again.'); setLoading(false); return; }
      setLoading(false);
      queryClient.invalidateQueries({ queryKey: ['houses', user.id] });
      router.replace(`/house/${house.id}`);
    } catch (err) {
      logError('CREATE_HOUSE', err, { houseName, userId: user?.id });
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  };

  const selectedPack = emojiPacks.find(p => p.id === selectedPackId);

  if (premiumLoading) {
    return (
      <View style={s.root}>
        <ActivityIndicator size="large" color="#4A7BF7" style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <ErrorBoundary onError={(error, errorInfo) => logError('CREATE_HOUSE_SCREEN', error, { componentStack: errorInfo.componentStack })}>
      <SafeAreaView style={s.root} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={() => setToast({ ...toast, visible: false })} />

        {/* Header */}
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={s.headerTitle}>Create a House</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <View style={s.hero}>
            <View style={s.heroIcon}>
              <Text style={{ fontSize: 32 }}>🏠</Text>
            </View>
            <Text style={s.heroTitle}>Create a House</Text>
            <Text style={s.heroSub}>Start your own game community</Text>
          </View>

          {error ? (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Preview Card */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>HOUSE PREVIEW</Text>
            <View style={s.previewCard}>
              {selectedImage && <Image source={{ uri: selectedImage }} style={s.previewBg} />}
              <View style={s.previewOverlay}>
                <View style={s.previewRow}>
                  <View style={s.previewEmojiBox}>
                    <Text style={{ fontSize: 22 }}>{selectedEmoji}</Text>
                  </View>
                  <Text style={s.previewName} numberOfLines={1}>{houseName || 'Your House Name'}</Text>
                  <View style={s.adminBadge}><Text style={s.adminBadgeTxt}>Admin</Text></View>
                </View>
                <View style={s.previewMeta}>
                  <Ionicons name="people-outline" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={s.previewMetaTxt}>1 member</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Background Image */}
          <View style={s.section}>
            <View style={s.labelRow}>
              <Text style={s.label}>Background Image</Text>
              {!isPremium && (
                <View style={s.premiumTag}>
                  <Ionicons name="diamond" size={10} color="#F59E0B" />
                  <Text style={s.premiumTagTxt}>PREMIUM</Text>
                </View>
              )}
            </View>
            <Text style={s.helper}>Appears behind your house card</Text>
            {selectedImage ? (
              <View style={s.imgPreview}>
                <Pressable onPress={pickImage} style={{ borderRadius: 14, overflow: 'hidden' }}>
                  <Image source={{ uri: selectedImage }} style={s.imgSelected} />
                  <View style={s.imgChangeBadge}>
                    <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
                    <Text style={s.imgChangeTxt}>Change</Text>
                  </View>
                </Pressable>
                <Pressable style={s.imgRemove} onPress={() => setSelectedImage(null)}>
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : (
              <Pressable style={s.imgPicker} onPress={pickImage}>
                <Ionicons name="camera-outline" size={20} color={isPremium ? '#4A7BF7' : 'rgba(255,255,255,0.3)'} />
                <Text style={[s.imgPickerTxt, !isPremium && { color: 'rgba(255,255,255,0.3)' }]}>
                  {isPremium ? 'Add Background Image' : 'Upgrade to Add Image'}
                </Text>
                {!isPremium && <Ionicons name="diamond" size={14} color="#F59E0B" />}
              </Pressable>
            )}
          </View>

          {/* House Name */}
          <View style={s.section}>
            <Text style={s.label}>House Name</Text>
            <TextInput
              style={s.input}
              placeholder="The Gaming Den"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={houseName}
              onChangeText={setHouseName}
              returnKeyType="next"
              editable={!loading}
            />
          </View>

          {/* Nickname */}
          <View style={s.section}>
            <Text style={s.label}>Your Nickname</Text>
            <TextInput
              style={s.input}
              placeholder="GameMaster"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={nickname}
              onChangeText={setNickname}
              returnKeyType="done"
              editable={!loading}
            />
          </View>

          {/* Emoji Pack */}
          <View style={s.section}>
            <View style={s.labelRow}>
              <Text style={s.label}>Choose Emoji Pack</Text>
              {emojiPacks.length > 3 && <Text style={s.scrollHint}>Scroll →</Text>}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.packRow}>
              {emojiPacks.map(pack => {
                const canAccess = pack.is_free || isPremium;
                const isSelected = selectedPackId === pack.id;
                return (
                  <Pressable
                    key={pack.id}
                    style={[s.packCard, isSelected && s.packCardOn, !canAccess && { opacity: 0.5 }]}
                    onPress={() => { if (canAccess) { setSelectedPackId(pack.id); setSelectedEmoji(pack.emojis[0]); } }}
                  >
                    {!canAccess && (
                      <View style={s.lockBadge}>
                        <Ionicons name="lock-closed" size={10} color="#FFFFFF" />
                      </View>
                    )}
                    <Text style={{ fontSize: 28, marginBottom: 6 }}>{pack.preview_emoji}</Text>
                    <Text style={[s.packName, isSelected && { color: '#4A7BF7' }]}>{pack.name}</Text>
                    <Text style={[s.packPrice, !pack.is_free && { color: '#F59E0B' }]}>
                      {pack.is_free ? 'Free' : 'Premium'}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Emoji Selector */}
          {selectedPack && (
            <View style={s.section}>
              <Text style={s.label}>Select Emoji</Text>
              <View style={s.emojiGrid}>
                {selectedPack.emojis.map((emoji, i) => (
                  <Pressable
                    key={i}
                    style={[s.emojiBtn, selectedEmoji === emoji && s.emojiBtnOn]}
                    onPress={() => setSelectedEmoji(emoji)}
                  >
                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Create Button */}
          <Pressable
            style={[s.createBtn, loading && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={s.createBtnTxt}>Create House</Text>
            }
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>

        <HouseLimitModal visible={showLimitModal} onClose={() => setShowLimitModal(false)} onUpgrade={() => { setShowLimitModal(false); router.push('/(tabs)/profile'); }} context="create" />
        <PremiumPurchaseModal visible={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  scroll: { padding: 20, paddingBottom: 60 },

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

  hero: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  heroIcon: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: '#1A1A1A',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 12, padding: 12, marginBottom: 16,
  },
  errorText: { color: '#EF4444', fontSize: 13, flex: 1 },

  section: { gap: 8, marginBottom: 20 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1.2 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  helper: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: -4 },
  scrollHint: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },

  // Preview
  previewCard: {
    borderRadius: 18, overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 100,
  },
  previewBg: { position: 'absolute', width: '100%', height: '100%', opacity: 0.5 },
  previewOverlay: { padding: 18, gap: 10 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewEmojiBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  previewName: { flex: 1, fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  adminBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  adminBadgeTxt: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  previewMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  previewMetaTxt: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  // Image
  imgPicker: {
    backgroundColor: '#111111', borderRadius: 14, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed',
  },
  imgPickerTxt: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  imgPreview: { position: 'relative', borderRadius: 14, overflow: 'hidden' },
  imgSelected: { width: '100%', height: 120, borderRadius: 14 },
  imgRemove: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 14,
    width: 28, height: 28, justifyContent: 'center', alignItems: 'center',
  },
  imgChangeBadge: {
    position: 'absolute', bottom: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  imgChangeTxt: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },

  premiumTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  premiumTagTxt: { color: '#F59E0B', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  input: {
    backgroundColor: '#111111', color: '#FFFFFF',
    padding: 15, borderRadius: 14, fontSize: 15,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },

  packRow: { gap: 10, paddingRight: 4 },
  packCard: {
    backgroundColor: '#111111', borderRadius: 16, padding: 14,
    alignItems: 'center', width: 96,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
  },
  packCardOn: { borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.06)' },
  packName: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontWeight: '600', marginBottom: 3 },
  packPrice: { fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
  lockBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center',
  },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn: {
    width: 52, height: 52, backgroundColor: '#111111', borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  emojiBtnOn: { borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.06)' },

  createBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    paddingVertical: 17, alignItems: 'center', marginTop: 8,
  },
  createBtnTxt: { color: '#000000', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
});
