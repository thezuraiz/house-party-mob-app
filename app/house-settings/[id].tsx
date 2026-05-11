import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, FlatList, Modal, Platform, Image, StatusBar
} from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import PremiumPurchaseModal from '@/components/PremiumPurchaseModal';
import Toast from '@/components/Toast';
import { uploadHouseImage, deleteHouseImage } from '@/lib/imageUpload';
import { T } from '@/constants/Theme';

type Game = {
  id: string;
  name: string;
  game_type: string;
  scoring_type?: string;
  created_at: string;
};

export default function HouseSettingsScreen() {
  const { id } = useLocalSearchParams();
  const [house, setHouse] = useState<any>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [showGameManagement, setShowGameManagement] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false, message: '', type: 'success',
  });
  const { user } = useAuth();
  const { isPremium, loading: premiumLoading } = usePremium();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => { loadHouseSettings(); }, [id, user]);

  const loadHouseSettings = async () => {
    if (!user || !id) return;
    const { data: houseData } = await supabase.from('houses').select('*').eq('id', id).maybeSingle();
    if (houseData) setHouse(houseData);
    const { data: gamesData } = await supabase
      .from('games').select('id, name, game_type, scoring_type, created_at')
      .eq('house_id', id).is('deleted_at', null).order('created_at', { ascending: false });
    if (gamesData) setGames(gamesData);
    setLoading(false);
  };

  const handleDeleteGame = async (gameId: string, gameName: string) => {
    if (!user || saving) return;
    if (Platform.OS === 'web') {
      if (!confirm(`Delete "${gameName}"? History will be preserved.`)) return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('games')
        .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
        .eq('id', gameId).eq('house_id', house?.id);
      if (!error) setGames(prev => prev.filter(g => g.id !== gameId));
    } catch (err) {
      console.log('Error deleting game:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePickImage = async () => {
    if (!user || uploadingImage) return;
    if (!isPremium) { setShowPremiumModal(true); return; }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images', allowsEditing: true, aspect: [16, 9], quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const { validateImage } = await import('@/lib/imageUpload');
        const validation = await validateImage(imageUri);
        if (!validation.valid) {
          setToast({ visible: true, message: validation.error || 'Invalid image', type: 'error' });
          return;
        }
        setUploadingImage(true);
        const uploadResult = await uploadHouseImage(imageUri, user.id, id as string, house?.image_url);
        if (uploadResult.success && uploadResult.url) {
          const { error } = await supabase.from('houses').update({ image_url: uploadResult.url }).eq('id', id);
          if (!error) {
            setHouse((prev: any) => ({ ...prev, image_url: uploadResult.url }));
            queryClient.invalidateQueries({ queryKey: ['houses', user?.id] });
            setToast({ visible: true, message: 'House image updated!', type: 'success' });
          }
        } else {
          setToast({ visible: true, message: uploadResult.error || 'Upload failed', type: 'error' });
        }
      }
    } catch (err) {
      console.log('Error picking image:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!user || !house?.image_url || uploadingImage) return;
    if (Platform.OS === 'web' && !confirm('Remove background image?')) return;
    setUploadingImage(true);
    try {
      await deleteHouseImage(house.image_url);
      const { error } = await supabase.from('houses').update({ image_url: null }).eq('id', id);
      if (!error) {
        setHouse((prev: any) => ({ ...prev, image_url: null }));
        queryClient.invalidateQueries({ queryKey: ['houses', user?.id] });
      }
    } catch (err) {
      console.log('Error removing image:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading || premiumLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Toast message={toast.message} type={toast.type} visible={toast.visible}
        onHide={() => setToast(p => ({ ...p, visible: false }))} />

      {/* ── Hero banner ── */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.heroLabel}>House Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.heroBody}>
          <View style={styles.heroEmoji}>
            <Text style={{ fontSize: 36 }}>{house?.house_emoji || '🏠'}</Text>
          </View>
          <Text style={styles.heroName}>{house?.name}</Text>
          <View style={styles.heroCodeRow}>
            <Ionicons name="key-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.heroCode}>{house?.invite_code}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section label ── */}
        <Text style={styles.groupLabel}>CUSTOMISATION</Text>

        {/* ── Background Image row ── */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBox, { backgroundColor: '#1A1A1A' }]}>
              <MaterialCommunityIcons name="image-edit-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Background Image</Text>
              <Text style={styles.cardSub}>Custom photo on your house card</Text>
            </View>
            {!isPremium && (
              <View style={styles.premiumPill}>
                <MaterialCommunityIcons name="diamond-stone" size={11} color="#D97706" />
                <Text style={styles.premiumPillText}>Pro</Text>
              </View>
            )}
          </View>

          {house?.image_url ? (
            <View style={styles.imgBlock}>
              <Image source={{ uri: house.image_url }} style={styles.houseImg} />
              <View style={styles.imgBtnRow}>
                <Pressable
                  style={[styles.btnPrimary, { flex: 1 }, uploadingImage && styles.disabled]}
                  onPress={handlePickImage} disabled={uploadingImage}
                >
                  {uploadingImage
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><MaterialCommunityIcons name="camera-plus-outline" size={16} color="#fff" /><Text style={styles.btnPrimaryText}>Change</Text></>
                  }
                </Pressable>
                <Pressable
                  style={[styles.btnDanger, { flex: 1 }, uploadingImage && styles.disabled]}
                  onPress={handleRemoveImage} disabled={uploadingImage}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color={T.error} />
                  <Text style={styles.btnDangerText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={[styles.uploadZone, uploadingImage && styles.disabled]}
              onPress={handlePickImage} disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={T.primary} />
              ) : (
                <>
                  <View style={styles.uploadIconBox}>
                    <MaterialCommunityIcons
                      name={isPremium ? 'image-plus' : 'lock-outline'}
                      size={22} color={isPremium ? T.primary : T.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uploadTitle}>
                      {isPremium ? 'Add Background Image' : 'Unlock with Premium'}
                    </Text>
                    <Text style={styles.uploadSub}>
                      {isPremium ? 'Tap to pick a photo' : 'Make your house card stand out'}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={T.textMuted} />
                </>
              )}
            </Pressable>
          )}
        </View>

        {/* ── Section label ── */}
        <Text style={styles.groupLabel}>GAMES</Text>

        {/* ── Games count + action ── */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBox, { backgroundColor: '#1A1A1A' }]}>
              <MaterialCommunityIcons name="gamepad-variant-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Manage Games</Text>
              <Text style={styles.cardSub}>Remove games, history stays safe</Text>
            </View>
            <View style={styles.countBubble}>
              <Text style={styles.countText}>{games.length}</Text>
            </View>
          </View>

          {/* game list preview */}
          {games.length === 0 ? (
            <View style={styles.emptyGames}>
              <MaterialCommunityIcons name="gamepad-variant-outline" size={28} color={T.border} />
              <Text style={styles.emptyGamesText}>No games yet</Text>
            </View>
          ) : (
            <>
              {games.slice(0, 4).map((g, i) => (
                <View key={g.id} style={[styles.gameRow, i === 0 && { marginTop: 4 }]}>
                  <Text style={styles.gameRowEmoji}>🎮</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gameRowName} numberOfLines={1}>{g.name}</Text>
                    <Text style={styles.gameRowMeta}>{g.game_type} · {g.scoring_type || 'Points'}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={T.border} />
                </View>
              ))}
              <Pressable style={styles.manageBtn} onPress={() => setShowGameManagement(true)}>
                <FontAwesome5 name="sliders-h" size={14} color="#FFFFFF" />
                <Text style={styles.manageBtnText}>
                  {games.length > 4 ? `Manage all ${games.length} games` : 'Manage Games'}
                </Text>
              </Pressable>
            </>
          )}

          {games.length === 0 && (
            <Pressable style={[styles.manageBtn, { marginTop: 12 }]} onPress={() => setShowGameManagement(true)}>
              <FontAwesome5 name="sliders-h" size={14} color="#FFFFFF" />
              <Text style={styles.manageBtnText}>Manage Games</Text>
            </Pressable>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Manage Games bottom sheet ── */}
      <Modal
        visible={showGameManagement} transparent
        animationType="slide" onRequestClose={() => setShowGameManagement(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHead}>
              <View>
                <Text style={styles.sheetTitle}>Manage Games</Text>
                <Text style={styles.sheetSub}>{games.length} game{games.length !== 1 ? 's' : ''}</Text>
              </View>
              <Pressable style={styles.sheetClose} onPress={() => setShowGameManagement(false)}>
                <MaterialCommunityIcons name="close" size={18} color={T.textSecondary} />
              </Pressable>
            </View>

            {games.length === 0 ? (
              <View style={styles.sheetEmpty}>
                <MaterialCommunityIcons name="gamepad-variant-outline" size={40} color={T.border} />
                <Text style={styles.sheetEmptyText}>No games in this house</Text>
              </View>
            ) : (
              <FlatList
                data={games}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
                renderItem={({ item }) => (
                  <View style={styles.sheetGameItem}>
                    <View style={styles.sheetGameIcon}>
                      <MaterialCommunityIcons name="gamepad-variant-outline" size={17} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetGameName}>{item.name || 'Unnamed'}</Text>
                      <Text style={styles.sheetGameMeta}>{item.game_type || 'Custom'} · {item.scoring_type || 'Points'}</Text>
                    </View>
                    <Pressable
                      style={[styles.deleteBtn, saving && styles.disabled]}
                      onPress={() => handleDeleteGame(item.id, item.name || 'Unnamed')}
                      disabled={saving}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={17} color={T.error} />
                    </Pressable>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <PremiumPurchaseModal visible={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </View>
  );
}

const PT = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' },
  container: { flex: 1, backgroundColor: '#000000' },

  /* ── Hero ── */
  hero: {
    paddingTop: PT + 52,
    paddingBottom: 32,
    paddingHorizontal: 20,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  heroTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroLabel: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
  heroBody: { alignItems: 'center', gap: 8 },
  heroEmoji: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  heroName: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  heroCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroCode: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 2 },

  /* ── Scroll body ── */
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 24 },

  groupLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.4, marginBottom: 10, marginLeft: 4,
  },

  /* ── Card ── */
  card: {
    backgroundColor: '#111111', borderRadius: 20,
    padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    gap: 12,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  cardSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  premiumPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
  },
  premiumPillText: { fontSize: 11, fontWeight: '700', color: '#F59E0B' },

  countBubble: {
    minWidth: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8,
  },
  countText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

  /* ── Image ── */
  imgBlock: { gap: 10 },
  houseImg: { width: '100%', height: 150, borderRadius: 14, backgroundColor: '#1A1A1A' },
  imgBtnRow: { flexDirection: 'row', gap: 10 },

  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#FFFFFF', paddingVertical: 12, borderRadius: 12,
  },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#000000' },
  btnDanger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: 'rgba(239,68,68,0.1)', paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  btnDangerText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },

  uploadZone: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed',
    backgroundColor: '#1A1A1A',
  },
  uploadIconBox: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#222222', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  uploadTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  uploadSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  disabled: { opacity: 0.45 },

  /* ── Games list ── */
  emptyGames: { alignItems: 'center', paddingVertical: 16, gap: 6 },
  emptyGamesText: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },

  gameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  gameRowEmoji: { fontSize: 18, width: 28, textAlign: 'center' },
  gameRowName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  gameRowMeta: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 },

  manageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FFFFFF', paddingVertical: 13, borderRadius: 14, marginTop: 4,
  },
  manageBtnText: { fontSize: 14, fontWeight: '700', color: '#000000' },

  /* ── Bottom sheet ── */
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#111111', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '78%', paddingBottom: 32,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', marginTop: 12, marginBottom: 2,
  },
  sheetHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: '#FFFFFF' },
  sheetSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  sheetClose: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  sheetEmpty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  sheetEmptyText: { fontSize: 15, color: 'rgba(255,255,255,0.4)' },

  sheetGameItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1A1A', borderRadius: 14, padding: 13,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  sheetGameIcon: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: '#222222', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  sheetGameName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  sheetGameMeta: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  deleteBtn: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
});
