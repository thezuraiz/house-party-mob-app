/**
 * ColorPickerModal — pick colors + choose where to apply, all in one modal.
 * No intermediate steps, no KitApplicationModal needed.
 */
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

const PALETTE = [
  '#000000', '#111111', '#222222', '#333333', '#555555', '#888888', '#BBBBBB', '#FFFFFF',
  '#1A0000', '#5C1010', '#B22222', '#E05C00', '#FF4500', '#FF6B00', '#FF8C00', '#FFA500',
  '#FFD700', '#ADFF2F', '#00FF7F', '#52B788', '#2D6A4F', '#1A3A24', '#006400', '#004D00',
  '#000814', '#003566', '#0077B6', '#00B4D8', '#00FFFF', '#00CED1', '#4A7BF7', '#0000FF',
  '#0D0010', '#2D0050', '#7B2FBE', '#9D00FF', '#EC4899', '#FF1493', '#FF69B4', '#FFB6C1',
];

type House = { id: string; name: string; emoji: string };

type Props = {
  visible: boolean;
  initialColors?: string[];
  houses?: House[];
  loadingHouses?: boolean;
  onClose: () => void;
  onApplyToProfile: (colors: string[]) => Promise<void>;
  onApplyToHouses: (colors: string[], houseIds: string[]) => Promise<void>;
};

export default function ColorPickerModal({
  visible,
  initialColors = ['#000000', '#111111'],
  houses = [],
  loadingHouses = false,
  onClose,
  onApplyToProfile,
  onApplyToHouses,
}: Props) {
  const [colors, setColors] = useState<string[]>(['#000000', '#111111']);
  const [activeSlot, setActiveSlot] = useState(0);
  const [selectedHouses, setSelectedHouses] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [applyingTarget, setApplyingTarget] = useState<'profile' | 'houses' | null>(null);
  const [step, setStep] = useState<'colors' | 'target'>('colors');

  useEffect(() => {
    if (visible) {
      const init = initialColors.length >= 2 ? initialColors.slice(0, 4) : ['#000000', '#111111'];
      setColors(init);
      setActiveSlot(0);
      setSelectedHouses(new Set());
      setStep('colors');
      setApplying(false);
      setApplyingTarget(null);
    }
  }, [visible]);

  const pickColor = (color: string) => {
    const updated = [...colors];
    updated[activeSlot] = color;
    setColors(updated);
    if (activeSlot < colors.length - 1) setActiveSlot(activeSlot + 1);
  };

  const addSlot = () => {
    if (colors.length < 4) {
      setColors([...colors, '#333333']);
      setActiveSlot(colors.length);
    }
  };

  const removeSlot = (i: number) => {
    if (colors.length <= 2) return;
    const updated = colors.filter((_, idx) => idx !== i);
    setColors(updated);
    setActiveSlot(Math.min(activeSlot, updated.length - 1));
  };

  const toggleHouse = (id: string) => {
    setSelectedHouses(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleApplyProfile = async () => {
    if (applying) return;
    setApplying(true);
    setApplyingTarget('profile');
    try { await onApplyToProfile(colors); onClose(); }
    catch { } finally { setApplying(false); setApplyingTarget(null); }
  };

  const handleApplyHouses = async () => {
    if (selectedHouses.size === 0 || applying) return;
    setApplying(true);
    setApplyingTarget('houses');
    try { await onApplyToHouses(colors, Array.from(selectedHouses)); onClose(); }
    catch { } finally { setApplying(false); setApplyingTarget(null); }
  };

  const gradColors = colors.length >= 2
    ? colors as [string, string, ...string[]]
    : [colors[0], colors[0]] as [string, string];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>

          {/* Header */}
          <View style={s.header}>
            {step === 'target' ? (
              <Pressable style={s.backBtn} onPress={() => setStep('colors')}>
                <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
              </Pressable>
            ) : (
              <View style={{ width: 32 }} />
            )}
            <Text style={s.headerTitle}>
              {step === 'colors' ? 'Custom Colors' : 'Apply To'}
            </Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          {step === 'colors' ? (
            <>
              {/* Live preview */}
              <View style={s.previewWrap}>
                <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <View style={s.previewOverlay}>
                  <Text style={s.previewLabel}>PREVIEW</Text>
                </View>
              </View>

              {/* Color slots */}
              <View style={s.slotsSection}>
                <Text style={s.sectionLabel}>GRADIENT STOPS</Text>
                <View style={s.slots}>
                  {colors.map((color, i) => (
                    <Pressable
                      key={i}
                      style={[s.slot, activeSlot === i && s.slotActive]}
                      onPress={() => setActiveSlot(i)}
                    >
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]} />
                      {colors.length > 2 && (
                        <Pressable style={s.slotRemove} onPress={() => removeSlot(i)}>
                          <Ionicons name="close-circle" size={14} color="rgba(255,255,255,0.7)" />
                        </Pressable>
                      )}
                      {activeSlot === i && <View style={s.slotDot} />}
                    </Pressable>
                  ))}
                  {colors.length < 4 && (
                    <Pressable style={s.addSlot} onPress={addSlot}>
                      <Ionicons name="add" size={20} color="rgba(255,255,255,0.4)" />
                    </Pressable>
                  )}
                </View>
                <Text style={s.slotHint}>Tap a stop → pick color below</Text>
              </View>

              {/* Palette */}
              <Text style={[s.sectionLabel, { paddingHorizontal: 20, marginBottom: 10 }]}>COLORS</Text>
              <ScrollView style={s.paletteScroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.palette}>
                {PALETTE.map((color, i) => {
                  const isActive = colors[activeSlot] === color;
                  return (
                    <Pressable
                      key={i}
                      style={[
                        s.swatch,
                        { backgroundColor: color },
                        isActive && s.swatchActive,
                        color === '#FFFFFF' && s.swatchWhite,
                      ]}
                      onPress={() => pickColor(color)}
                    >
                      {isActive && (
                        <Ionicons name="checkmark" size={14}
                          color={color === '#FFFFFF' || color === '#BBBBBB' ? '#000' : '#FFF'} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Next */}
              <View style={s.footer}>
                <Pressable style={s.nextBtn} onPress={() => setStep('target')}>
                  <Text style={s.nextTxt}>Next — Choose Where to Apply</Text>
                  <Ionicons name="chevron-forward" size={16} color="#000000" />
                </Pressable>
              </View>
            </>
          ) : (
            /* Target selection */
          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.targetContent} showsVerticalScrollIndicator={false}>
              {/* Mini preview */}
              <View style={s.miniPreview}>
                <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              </View>

              {/* Profile option */}
              <Text style={s.targetSectionLabel}>APPLY TO</Text>
              <Pressable
                style={[s.targetOption, applying && { opacity: 0.5 }]}
                onPress={handleApplyProfile}
                disabled={applying}
              >
                <View style={s.targetIconBox}>
                  <Ionicons name="person" size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.targetTitle}>My Profile</Text>
                  <Text style={s.targetSub}>Your player card and leaderboard entry</Text>
                </View>
                {applyingTarget === 'profile'
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
                }
              </Pressable>

              {/* Houses */}
              {loadingHouses ? (
                <View style={s.loadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={s.loadingTxt}>Loading houses...</Text>
                </View>
              ) : houses.length === 0 ? (
                <View style={s.emptyHouses}>
                  <Text style={s.emptyTxt}>No houses found. Create a house first.</Text>
                </View>
              ) : (
                <>
                  <Text style={[s.targetSectionLabel, { marginTop: 20 }]}>SELECT HOUSES</Text>
                  {houses.map(house => {
                    const selected = selectedHouses.has(house.id);
                    return (
                      <Pressable
                        key={house.id}
                        style={[s.houseRow, selected && s.houseRowSelected]}
                        onPress={() => toggleHouse(house.id)}
                      >
                        <Text style={s.houseEmoji}>{house.emoji}</Text>
                        <Text style={s.houseName}>{house.name}</Text>
                        <View style={[s.checkbox, selected && s.checkboxOn]}>
                          {selected && <Ionicons name="checkmark" size={12} color="#000000" />}
                        </View>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    style={[s.applyHousesBtn, (selectedHouses.size === 0 || applying) && { opacity: 0.4 }]}
                    onPress={handleApplyHouses}
                    disabled={selectedHouses.size === 0 || applying}
                  >
                    {applyingTarget === 'houses'
                      ? <ActivityIndicator size="small" color="#000000" />
                      : <Text style={s.applyHousesTxt}>
                          Apply to {selectedHouses.size} House{selectedHouses.size !== 1 ? 's' : ''}
                        </Text>
                    }
                  </Pressable>
                </>
              )}
              <View style={{ height: 32 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#111111', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', height: '85%' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },

  previewWrap: { marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', height: 72, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', position: 'relative' },
  previewOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  previewLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '700', letterSpacing: 1.5 },

  slotsSection: { paddingHorizontal: 20, marginBottom: 16 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, marginBottom: 10 },
  slots: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  slot: { width: 50, height: 50, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', position: 'relative', justifyContent: 'center', alignItems: 'center' },
  slotActive: { borderColor: '#FFFFFF', borderWidth: 2.5 },
  slotRemove: { position: 'absolute', top: 2, right: 2, zIndex: 2 },
  slotDot: { position: 'absolute', bottom: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  addSlot: { width: 50, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A1A' },
  slotHint: { fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 8 },

  paletteScroll: { maxHeight: 170 },
  palette: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 8, paddingBottom: 8 },
  swatch: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  swatchActive: { borderWidth: 2.5, borderColor: '#FFFFFF', transform: [{ scale: 1.1 }] },
  swatchWhite: { borderColor: 'rgba(0,0,0,0.2)' },

  footer: { padding: 20, paddingBottom: 32 },
  nextBtn: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextTxt: { fontSize: 15, fontWeight: '800', color: '#000000' },

  // Target step
  targetContent: { paddingHorizontal: 20, paddingTop: 8 },
  miniPreview: { height: 48, borderRadius: 12, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  targetSectionLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, marginBottom: 12 },
  targetOption: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 10 },
  targetIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#000000', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  targetTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  targetSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  houseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  houseRowSelected: { borderColor: '#FFFFFF', backgroundColor: '#222222' },
  houseEmoji: { fontSize: 24 },
  houseName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  checkboxOn: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },

  applyHousesBtn: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  applyHousesTxt: { fontSize: 15, fontWeight: '800', color: '#000000' },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 20 },
  loadingTxt: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  emptyHouses: { paddingVertical: 20, alignItems: 'center' },
  emptyTxt: { fontSize: 14, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },
});
