import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform, Modal, Animated, Image } from 'react-native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useDiscountNotification } from '@/contexts/DiscountNotificationContext';
import { useCurrency } from '@/hooks/useCurrency';
import Ionicons from '@expo/vector-icons/Ionicons';
import NeuIcon from '@/components/NeuIcon';
import BannerRenderer from '@/components/BannerRenderer';
import Toast from '@/components/Toast';
import PremiumPurchaseModal from '@/components/PremiumPurchaseModal';
import KitApplicationModal from '@/components/KitApplicationModal';
import ErrorBoundary from '@/components/ErrorBoundary';
import { logError, logInfo, logWarning, formatSupabaseError } from '@/lib/errorReporting';
import ColorPickerModal from '@/components/ColorPickerModal';
import { notifications } from '@/lib/notifications';
import * as Linking from 'expo-linking';
import { T } from '@/constants/Theme';

type HouseKit = {
  id: string;
  name: string;
  description: string;
  rarity: string;
  is_unlockable: boolean;
  is_earnable: boolean;
  is_active: boolean;
  color_scheme?: string[];
  unlock_type: 'free' | 'purchasable' | 'chance_based';
  price_cents?: number;
  unlock_chance?: number;
  unlock_condition?: string;
  owned_by_user?: boolean;
};

export default function HouseKitsScreen() {
  const [applyingKitId, setApplyingKitId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedKit, setSelectedKit] = useState<HouseKit | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColors, setCustomColors] = useState<string[]>(['#000000', '#111111']);
  const selectedKitRef = useRef<HouseKit | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState({ title: '', description: '', rarity: '' });

  const { user } = useAuth();
  const { isPremium, loading: premiumLoading } = usePremium();
  const { markDiscountsAsSeen } = useDiscountNotification();
  const { formatPriceCents } = useCurrency();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Pre-load user's admin houses for kit application modal
  const { data: userHouses = [], isLoading: loadingHouses } = useQuery({
    queryKey: ['userAdminHouses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Use houses table directly with creator_id — this automatically excludes deleted houses
      // since deleted houses are hard-deleted (row removed from DB)
      const { data } = await supabase
        .from('houses')
        .select('id, name, house_emoji')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      return (data || []).map(house => ({
        id: house.id,
        name: house.name,
        emoji: (house as any).house_emoji || '🏠',
      }));
    },
    enabled: !!user,
    staleTime: 0,          // always fresh — no stale cache
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: kits = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['houseKits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        return await loadKitsData(user.id);
      } catch (error) {
        logError('SHOP_LOAD_KITS', error, { userId: user.id });
        return [];
      }
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Fetch all active kit discounts (single source of truth: active_kit_discounts table)
  // This is synchronized with payment gateways via get_active_kit_discount() function
  const { data: discountedKits = [] } = useQuery({
    queryKey: ['activeKitDiscounts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_active_kit_discounts');
      if (error) {
        console.log('[DISCOUNT] Error fetching discounts:', error);
        return [];
      }
      return data || [];
    },
    staleTime: 60000,
    refetchInterval: 300000,
  });

  // Mark discounts as seen when user enters the shop
  useEffect(() => {
    if (user) {
      console.log('[SHOP] User entered shop, marking discounts as seen');
      markDiscountsAsSeen();
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        console.log('[SHOP] Screen focused, refreshing kits and houses');
        queryClient.invalidateQueries({ queryKey: ['houseKits', user.id] });
        queryClient.invalidateQueries({ queryKey: ['userAdminHouses', user.id] });
        refetch();
      }
    }, [user, refetch])
  );

  const loadKitsData = async (userId: string): Promise<HouseKit[]> => {
    try {
      logInfo('HOUSE_KITS', 'Loading kits for user', { userId });

      const { data, error } = await supabase
        .from('house_kits')
        .select('*');

      // Check both user_kit_purchases and user_house_kits for owned kits
      const { data: purchases } = await supabase
        .from('user_kit_purchases')
        .select('house_kit_id')
        .eq('user_id', userId)
        .eq('payment_status', 'completed');

      const { data: userKits } = await supabase
        .from('user_house_kits')
        .select('house_kit_id, is_active, unlocked_at')
        .eq('user_id', userId);

      const purchasedKitIds = new Set([
        ...(purchases || []).map(p => p.house_kit_id),
        // Include ALL user_house_kits regardless of is_active — ownership is ownership
        ...(userKits || []).map(k => k.house_kit_id)
      ]);

      if (error) {
        logError('HOUSE_KITS', error, {
          userId,
          errorCode: error.code,
          errorDetails: error.details,
          errorHint: error.hint
        });
        setToast({
          visible: true,
          message: formatSupabaseError(error),
          type: 'error'
        });
        return [];
      }

      if (!data || data.length === 0) {
        logWarning('HOUSE_KITS', 'No kits returned from database', { userId });
        setToast({
          visible: true,
          message: 'No house kits available. This may be a data issue - please contact support.',
          type: 'error'
        });
        return [];
      }

      logInfo('HOUSE_KITS', `Loaded ${data.length} kits successfully`);
      const mapped = (data || []).map(kit => {
          let unlockType: 'free' | 'purchasable' | 'chance_based' = 'free';
          let isUnlockable = false;
          let isEarnable = false;
          let ownedByUser = purchasedKitIds.has(kit.id);
          if (kit.price_cents === 0 && (kit.rarity !== 'legendary' && kit.rarity !== 'mythic')) {
            ownedByUser = true;
          }

          if (kit.price_cents > 0) {
            unlockType = 'purchasable';
          } else if (kit.rarity === 'legendary' || kit.rarity === 'mythic') {
            unlockType = 'chance_based';
            isEarnable = true;
            isUnlockable = true;
          }

          // Debug log for new kits
          if (['Golden Bushido', 'Starlight Prowler', 'Chaos Theory'].includes(kit.name)) {
            console.log(`[OWNED_CHECK] ${kit.name} — id: ${kit.id}, price_cents: ${kit.price_cents}, rarity: ${kit.rarity}, owned: ${ownedByUser}, inPurchasedSet: ${purchasedKitIds.has(kit.id)}, unlockType: ${unlockType}`);
          }

          return {
            id: kit.id,
            name: kit.name,
            description: kit.description,
            rarity: kit.rarity,
            is_unlockable: isUnlockable,
            is_earnable: isEarnable,
            is_active: kit.is_active,
            color_scheme: kit.color_scheme,
            unlock_type: unlockType,
            price_cents: kit.price_cents,
            unlock_condition: isEarnable ? 'game_win' : undefined,
            owned_by_user: ownedByUser
          };
        }) as any;

      console.log('[OWNED_CHECK] purchasedKitIds set:', Array.from(purchasedKitIds));
      return mapped;
    } catch (err) {
      logError('HOUSE_KITS', err, { userId });
      setToast({
        visible: true,
        message: 'An unexpected error occurred loading kits',
        type: 'error'
      });
      return [];
    }
  };

  const getKitColors = (kit: HouseKit): string[] => {
    if (kit.color_scheme && Array.isArray(kit.color_scheme) && kit.color_scheme.length > 0) {
      return kit.color_scheme;
    }

    switch (kit.rarity) {
      case 'mythic':
        return ['#EC4899', '#DB2777', '#BE185D'];
      case 'legendary':
        return ['#F59E0B', '#FBBF24', '#F59E0B'];
      case 'epic':
        return ['#A855F7', '#9333EA', '#7E22CE'];
      case 'rare':
        return ['#3B82F6', '#2563EB', '#1D4ED8'];
      case 'uncommon':
        return ['#F24F13', '#D43E0A', '#047857'];
      default:
        return ['#5C4468', '#5C4468'];
    }
  };

  const handleOpenApplicationModal = (kit: HouseKit) => {
    console.log('[APPLY] Apply button clicked:', kit.id, kit.name, kit.rarity, 'owned:', kit.owned_by_user);
    selectedKitRef.current = kit;
    setSelectedKit(kit);
    setShowApplicationModal(true);
  };

  // Custom color kit handler
  const handleApplyCustomColors = async (colors: string[]) => {
    if (!user) return;
    setShowColorPicker(false);
    setCustomColors(colors);

    // Create a virtual kit object and open the application modal
    // so user can choose profile or specific houses
    const customKit: HouseKit = {
      id: 'custom',
      name: 'Custom Colors',
      description: 'Your custom gradient',
      rarity: 'common',
      is_unlockable: false,
      is_earnable: false,
      is_active: true,
      color_scheme: colors,
      unlock_type: 'free',
      owned_by_user: true,
    };
    setSelectedKit(customKit);
    setShowApplicationModal(true);
  };

  const handleApplyKit = async (target: 'profile' | 'house', houseIds?: string[], imageUri?: string, kitSnapshot?: HouseKit | null) => {
    const kit = kitSnapshot || selectedKit;
    console.log('[APPLY] handleApplyKit called — target:', target, 'kit:', kit?.name, kit?.id, 'houseIds:', houseIds);
    if (!user || !kit) {
      console.log('[APPLY] ERROR: user or kit missing — user:', !!user, 'kit:', !!kit);
      return;
    }

    const isCustom = kit.id === 'custom';
    const kitColors = isCustom ? (kit.color_scheme || customColors) : null;
    const kitName = kit.name;
    const kitId = kit.id;

    if (!isCustom) setApplyingKitId(kitId);

    try {
      if (target === 'profile') {
        console.log('[APPLY] Applying to profile — kitId:', kitId, 'isCustom:', isCustom);
        setToast({ visible: true, message: `Applying ${kitName}...`, type: 'success' });

        if (isCustom) {
          await supabase.from('user_profile_settings').upsert({
            user_id: user.id,
            equipped_house_kit_id: null,
          }, { onConflict: 'user_id' });
          setToast({ visible: true, message: 'Custom colors applied to profile!', type: 'success' });
        } else {
          console.log('[APPLY] Calling equip_kit_for_testing RPC — kitId:', kitId);
          const { data, error } = await supabase.rpc('equip_kit_for_testing', { p_kit_id: kitId });
          console.log('[APPLY] equip_kit_for_testing result — data:', JSON.stringify(data), 'error:', error);
          if (error) throw error;
          const result = data as { success: boolean; error?: string };
          if (!result.success) throw new Error(result.error || 'Failed to equip kit');
          setToast({ visible: true, message: `${kitName} equipped to your profile!`, type: 'success' });
        }
        queryClient.invalidateQueries({ queryKey: ['userProfile'] });

      } else if (target === 'house' && houseIds && houseIds.length > 0) {
        console.log('[APPLY] Applying to houses — kitId:', kitId, 'houseIds:', houseIds, 'isCustom:', isCustom);
        setToast({ visible: true, message: `Applying ${kitName}...`, type: 'success' });

        if (isCustom && kitColors) {
          const colorsJsonb = JSON.stringify(kitColors);
          const results = await Promise.allSettled(
            houseIds.map(houseId =>
              supabase.rpc('apply_custom_colors_to_house', {
                p_house_id: houseId,
                p_colors: colorsJsonb,
              })
            )
          );
          const failed = results.filter(r => {
            if (r.status === 'rejected') return true;
            if (r.status === 'fulfilled' && r.value.error) return true;
            if (r.status === 'fulfilled') {
              const d = r.value.data as any;
              return d && d.success === false;
            }
            return false;
          }).length;
          if (failed > 0) throw new Error(`Failed to apply to ${failed} house(s)`);
          setToast({ visible: true, message: `Custom colors applied to ${houseIds.length} house${houseIds.length > 1 ? 's' : ''}!`, type: 'success' });
        } else {
          const results = await Promise.allSettled(
            houseIds.map(houseId =>
              supabase.rpc('apply_kit_to_house', { p_kit_id: kitId, p_house_id: houseId })
            )
          );
          console.log('[APPLY] apply_kit_to_house results:', JSON.stringify(results));
          let successCount = 0;
          let lastError = '';
          for (const result of results) {
            if (result.status === 'fulfilled' && !result.value.error) {
              const rpcResult = result.value.data as any;
              if (rpcResult && rpcResult.success === false) {
                lastError = rpcResult.error || 'Failed to apply kit';
                console.log('[APPLY] RPC returned failure:', rpcResult.error);
              } else {
                successCount++;
              }
            } else if (result.status === 'fulfilled' && result.value.error) {
              lastError = result.value.error.message;
            }
          }
          if (successCount > 0) {
            setToast({ visible: true, message: `${kitName} applied to ${successCount} house${successCount !== 1 ? 's' : ''}!`, type: 'success' });
          } else {
            setToast({ visible: true, message: lastError || 'Failed to apply kit to house', type: 'error' });
          }
        }
        queryClient.invalidateQueries({ queryKey: ['houses', user.id], refetchType: 'all' });
      }
    } catch (e: any) {
      console.log('[APPLY] ERROR in handleApplyKit:', e.message, e);
      setToast({ visible: true, message: e.message || 'Failed to apply', type: 'error' });
    } finally {
      if (!isCustom) setApplyingKitId(null);
    }
  };

  const handlePurchaseKit = async (kit: HouseKit) => {
    if (!user) return;

    console.log('[BUY] handlePurchaseKit called:', kit.id, kit.name, kit.price_cents, kit.unlock_type);

    if (!kit.price_cents || kit.price_cents <= 0) {
      setToast({
        visible: true,
        message: 'This kit is not available for purchase',
        type: 'error'
      });
      return;
    }

    setApplyingKitId(kit.id);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      logInfo('SHOP', 'Initializing YOCO payment', { kitId: kit.id, kitName: kit.name });

      const initUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/yoco-kit-initialize`;
      const initResponse = await fetch(initUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ kitId: kit.id }),
      });

      if (!initResponse.ok) {
        let errorMessage = 'Failed to initialize payment';
        let errorData: any = null;

        try {
          errorData = await initResponse.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (jsonError) {
          errorMessage = `${errorMessage} (${initResponse.status}: ${initResponse.statusText})`;
        }

        logError('SHOP', new Error(errorMessage), {
          errorData,
          status: initResponse.status,
          statusText: initResponse.statusText
        });
        throw new Error(errorMessage);
      }

      const { redirectUrl, checkoutId } = await initResponse.json();

      if (!redirectUrl) {
        throw new Error('No payment URL returned from YOCO');
      }

      logInfo('SHOP', 'YOCO payment initialized', { checkoutId, redirectUrl });

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pendingYocoCheckout', JSON.stringify({ checkoutId, kitId: kit.id }));
        }
        window.location.href = redirectUrl;
      } else {
        logInfo('SHOP', 'Opening YOCO checkout in system browser', { redirectUrl });

        setToast({
          visible: true,
          message: 'Opening payment checkout...',
          type: 'success'
        });

        // Use system browser instead of in-app WebView to handle banking app redirects
        // System browser maintains state when user switches to banking app
        await Linking.openURL(redirectUrl);

        logInfo('SHOP', 'Payment URL opened in system browser');
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Failed to process payment';
      logError('SHOP', error || new Error(errorMessage), {
        kitId: kit.id,
        kitName: kit.name,
        errorType: typeof error,
        hasMessage: !!error?.message
      });
      setToast({
        visible: true,
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setApplyingKitId(null);
    }
  };

  const handleClaimFree = async (kit: HouseKit) => {
    if (!user) return;

    // Double-check if already owned
    if (kit.owned_by_user) {
      setToast({
        visible: true,
        message: `You already own ${kit.name}!`,
        type: 'error'
      });
      return;
    }

    setApplyingKitId(kit.id);
    try {
      // Use upsert to prevent duplicate key errors
      const { data, error } = await supabase
        .from('user_house_kits')
        .upsert({
          user_id: user.id,
          house_kit_id: kit.id,
          is_active: true,
        }, {
          onConflict: 'user_id,house_kit_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      setToast({
        visible: true,
        message: `${kit.name} unlocked!`,
        type: 'success'
      });

      // Refresh the entire kits list to update ownership status
      await refetch();
    } catch (e: any) {
      console.log('[HOUSE KITS] Claim error:', e);
      setToast({
        visible: true,
        message: e.message || 'Failed to claim kit',
        type: 'error'
      });
    } finally {
      setApplyingKitId(null);
    }
  };

  const canEquipKit = (kit: HouseKit): boolean => {
    return kit.owned_by_user === true;
  };

  const getKitDiscount = (kitId: string): { discount: number; discountedPrice: number } | null => {
    const discounted = discountedKits.find((dk: any) => dk.kit_id === kitId);
    if (!discounted) return null;
    return {
      discount: discounted.discount_percentage,
      discountedPrice: discounted.discounted_price // Already in cents from database
    };
  };


  if (loading || premiumLoading || !formatPriceCents) {
    return (
      <ErrorBoundary>
        <View style={s.root}>
          <View style={s.centered}>
            <ActivityIndicator size="large" color="#4A7BF7" />
            <Text style={s.loadingTxt}>Loading kits...</Text>
          </View>
        </View>
      </ErrorBoundary>
    );
  }

  const filteredKits = kits
    // Hide free non-earnable kits — custom colors replaces them
    .filter(k => k.unlock_type !== 'free' || k.is_earnable);

  return (
    <ErrorBoundary onError={(error, errorInfo) => {
      logError('HOUSE_KITS_SCREEN', error, { componentStack: errorInfo.componentStack, userId: user?.id });
    }}>
      <SafeAreaView style={s.root} edges={['top']}>
        <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={() => setToast({ ...toast, visible: false })} />
        <PremiumPurchaseModal visible={showPremiumModal} onClose={() => setShowPremiumModal(false)} />

        {/* Info modal */}
        <Modal visible={showInfoModal} transparent animationType="fade" onRequestClose={() => setShowInfoModal(false)}>
          <Pressable style={s.overlay} onPress={() => setShowInfoModal(false)}>
            <View style={s.infoBox}>
              <View style={s.infoHead}>
                <Text style={s.infoTitle}>{infoModalContent.title}</Text>
                <Pressable style={s.closeBtn} onPress={() => setShowInfoModal(false)}>
                  <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
                </Pressable>
              </View>
              <View style={[s.rarityPill, infoModalContent.rarity === 'mythic' && s.mythicPill, infoModalContent.rarity === 'legendary' && s.legendaryPill]}>
                <Text style={s.rarityPillTxt}>{infoModalContent.rarity.toUpperCase()}</Text>
              </View>
              <Text style={s.infoDesc}>{infoModalContent.description}</Text>
            </View>
          </Pressable>
        </Modal>

        <KitApplicationModal
          visible={showApplicationModal}
          kit={selectedKit ? { id: selectedKit.id, name: selectedKit.name, rarity: selectedKit.rarity, color_scheme: selectedKit.color_scheme || [] } : null}
          userHouses={userHouses}
          loadingHouses={loadingHouses}
          onClose={() => {
            setShowApplicationModal(false);
          }}
          onApply={(target, houseIds, imageUri) => {
            const snap = selectedKitRef.current || selectedKit;
            console.log('[APPLY] onApply called — target:', target, 'houseIds:', houseIds, 'snap:', snap?.name, snap?.id);
            if (!snap) {
              console.log('[APPLY] ERROR: snap is null — kit lost before apply');
              return;
            }
            setShowApplicationModal(false);
            handleApplyKit(target, houseIds, imageUri, snap);
          }}
        />

        <ColorPickerModal
          visible={showColorPicker}
          initialColors={customColors}
          houses={userHouses}
          loadingHouses={loadingHouses}
          onClose={() => setShowColorPicker(false)}
          onApplyToProfile={async (colors) => {
            setCustomColors(colors);
            const { error } = await supabase.from('user_profile_settings').upsert(
              {
                user_id: user!.id,
                equipped_house_kit_id: null,
                custom_profile_colors: colors,
              },
              { onConflict: 'user_id' }
            );
            if (error) {
              setToast({ visible: true, message: 'Failed to apply to profile', type: 'error' });
            } else {
              setToast({ visible: true, message: 'Custom colors applied to profile!', type: 'success' });
              queryClient.invalidateQueries({ queryKey: ['userProfile'] });
            }
          }}
          onApplyToHouses={async (colors, houseIds) => {
            let successCount = 0;
            let lastError = '';

            for (const houseId of houseIds) {
              try {
                // Direct upsert — RLS allows house admins/creators
                const { error } = await supabase
                  .from('house_customizations')
                  .upsert({
                    house_id: houseId,
                    custom_banner_colors: colors,
                    applied_kit_id: null,
                    rarity: 'common',
                    updated_at: new Date().toISOString(),
                  }, { onConflict: 'house_id' });

                if (error) {
                  // Try update instead
                  const { error: updateError } = await supabase
                    .from('house_customizations')
                    .update({
                      custom_banner_colors: colors,
                      rarity: 'common',
                      applied_kit_id: null,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('house_id', houseId);

                  if (updateError) {
                    lastError = updateError.message;
                    console.log('[CUSTOM_COLORS] Update error:', updateError);
                  } else {
                    successCount++;
                  }
                } else {
                  successCount++;
                }
              } catch (e: any) {
                lastError = e.message;
              }
            }

            if (successCount > 0) {
              setToast({ visible: true, message: `Custom colors applied to ${successCount} house${successCount !== 1 ? 's' : ''}!`, type: 'success' });
              queryClient.invalidateQueries({ queryKey: ['houses', user!.id], refetchType: 'all' });
            } else {
              setToast({ visible: true, message: `Failed: ${lastError}`, type: 'error' });
            }
          }}
        />

        {/* ── HEADER ── */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <View>
              <Text style={s.headerLabel}>PRIME KITS</Text>
              <Text style={s.headerTitle}>Shop</Text>
            </View>
            <View style={s.headerRight}>
              {discountedKits.length > 0 && (
                <View style={s.salePill}>
                  <Ionicons name="flash" size={11} color="#EF4444" />
                  <Text style={s.saleTxt}>SALE</Text>
                </View>
              )}
              <View style={s.headerIcon}>
                <Ionicons name="storefront-outline" size={20} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </View>

        {/* ── KIT LIST ── */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          {filteredKits.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}><Text style={{ fontSize: 40 }}>🏪</Text></View>
              <Text style={s.emptyTitle}>No Kits Available</Text>
              <Text style={s.emptySub}>Check back later for new house kits!</Text>
            </View>
          ) : (
            <>
              {/* ── Custom Color Kit card ── */}
              <Pressable style={kc.customCard} onPress={() => setShowColorPicker(true)}>
                  {/* Background gradient from current colors */}
                  <LinearGradient
                    colors={customColors.length >= 2 ? customColors as [string, string, ...string[]] : ['#0A0A1A', '#1A0A2E', '#0A1A2E']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {/* Dark overlay for readability */}
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />

                  {/* Content */}
                  <View style={kc.customContent}>
                    {/* Left — icon + label */}
                    <View style={kc.customLeft}>
                      <View style={kc.customIconCircle}>
                        <Ionicons name="color-palette" size={24} color="#FFFFFF" />
                      </View>
                      <View>
                        <Text style={kc.customTitle}>Your Colors</Text>
                        <Text style={kc.customSub}>Build your own gradient</Text>
                      </View>
                    </View>

                    {/* Right — color dots + button */}
                    <View style={kc.customRight}>
                      <View style={kc.customDots}>
                        {customColors.slice(0, 4).map((c, i) => (
                          <View key={i} style={[kc.customDot, {
                            backgroundColor: c,
                            borderWidth: 1.5,
                            borderColor: 'rgba(255,255,255,0.25)',
                          }]} />
                        ))}
                      </View>
                      <View style={kc.customBtn}>
                        <Ionicons name="pencil" size={13} color="#000000" />
                        <Text style={kc.customBtnTxt}>Edit</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>

              {filteredKits.map((kit, index) => {
              const canEquip = canEquipKit(kit);
              const isApplying = applyingKitId === kit.id;
              const colors = getKitColors(kit);
              const discountInfo = getKitDiscount(kit.id);
              const rarityColor =
                kit.rarity === 'mythic'    ? '#EC4899' :
                kit.rarity === 'legendary' ? '#F59E0B' :
                kit.rarity === 'epic'      ? '#A855F7' :
                kit.rarity === 'rare'      ? '#3B82F6' :
                kit.rarity === 'uncommon'  ? '#22C55E' : '#6B7280';

              return (
                <KitCard
                  key={kit.id}
                  index={index}
                  kit={kit}
                  colors={colors}
                  rarityColor={rarityColor}
                  canEquip={canEquip}
                  isApplying={isApplying}
                  discountInfo={discountInfo}
                  formatPriceCents={formatPriceCents}
                  onApply={() => handleOpenApplicationModal(kit)}
                  onClaim={() => handleClaimFree(kit)}
                  onBuy={() => handlePurchaseKit(kit)}
                  onInfo={() => {
                    setInfoModalContent({
                      title: kit.name,
                      description: kit.rarity === 'mythic'
                        ? 'This ultra-rare kit has a 0.015% chance (1 in 6,667) to unlock every time you WIN a game.'
                        : 'This rare kit has a 0.025% chance (1 in 4,000) to unlock every time you FINISH a game.',
                      rarity: kit.rarity,
                    });
                    setShowInfoModal(true);
                  }}
                  logError={logError}
                />
              );
            })}
            </>
          )}
          <View style={{ height: 110 }} />
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

// ── Animated Kit Card ─────────────────────────────────────────────────────────

// ── Kit Card — new design ─────────────────────────────────────────────────────
function KitCard({ kit, index, colors, rarityColor, canEquip, isApplying, discountInfo, formatPriceCents, onApply, onClaim, onBuy, onInfo, logError }: any) {
  const slideAnim   = useRef(new Animated.Value(0)).current;
  const glowAnim    = useRef(new Animated.Value(0)).current;
  const pressAnim   = useRef(new Animated.Value(1)).current;
  const bounceAnim  = useRef(new Animated.Value(1)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;  // shimmer sweep
  const pulseAnim   = useRef(new Animated.Value(1)).current;  // border pulse

  const isPremiumKit = ['epic', 'legendary', 'mythic'].includes(kit.rarity);
  const isUnowned = !canEquip && kit.unlock_type === 'purchasable';
  const shouldShimmer = isPremiumKit && isUnowned;

  useEffect(() => {
    // Entrance only
    Animated.timing(slideAnim, {
      toValue: 1, duration: 500, delay: index * 65, useNativeDriver: true,
    }).start();
  }, []);

  const onPressIn  = () => Animated.spring(pressAnim, { toValue: 0.96, useNativeDriver: true, speed: 60 }).start();
  const onPressOut = () => Animated.spring(pressAnim, { toValue: 1,    useNativeDriver: true, speed: 60 }).start();

  // Micro-interaction: bounce + sparkle burst when Apply/Claim tapped
  const triggerApplyFeedback = (callback: () => void) => {
    Animated.sequence([
      Animated.spring(bounceAnim, { toValue: 0.88, useNativeDriver: true, speed: 80, bounciness: 0 }),
      Animated.spring(bounceAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 18 }),
    ]).start();
    sparkleOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(sparkleAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(sparkleOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start(() => sparkleAnim.setValue(0));
    callback();
  };

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  const sparkleScale = sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.2] });

  // Shimmer moves left to right across the swatch
  const shimmerTranslate = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-120, 120] });
  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.15, 0.5, 0.85, 1],
    outputRange: [0, 0.9, 1, 0.9, 0],
  });

  const rarityLabel = kit.unlock_type === 'purchasable'
    ? 'Premium'
    : (kit.rarity || 'common').charAt(0).toUpperCase() + (kit.rarity || 'common').slice(1);

  return (
    <Animated.View style={{
      opacity: slideAnim,
      transform: [
        { translateX: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [index % 2 === 0 ? -40 : 40, 0] }) },
        { scale: Animated.multiply(Animated.multiply(pressAnim, bounceAnim), pulseAnim) },
      ],
    }}>
      <View>
        <View style={[kc.card]}>

          {/* Full background image for image-based kits */}
          {(kit.name === 'Golden Bushido' || kit.name === 'Chaos Theory' || kit.name === 'Starlight Prowler' || kit.name === 'Liquid Metal Candy' || kit.name === 'Phantom Void' || kit.name === 'Stellar' || kit.name === 'Neon Pulse' || kit.name === 'Obsidian Gold' || kit.name === 'Prismatic') && (
            <>
              <Image
                source={kit.name === 'Golden Bushido'
                  ? require('@/assets/images/GoldenBushido.jpeg')
                  : kit.name === 'Chaos Theory'
                  ? require('@/assets/images/ChaosTheory.jpeg')
                  : kit.name === 'Starlight Prowler'
                  ? require('@/assets/images/StarlightProwler.jpeg')
                  : kit.name === 'Phantom Void'
                  ? require('@/assets/images/PhantomVoid.jpg')
                  : kit.name === 'Stellar'
                  ? require('@/assets/images/Stellar.jpg')
                  : kit.name === 'Neon Pulse'
                  ? require('@/assets/images/NeonPulse.jpg')
                  : kit.name === 'Obsidian Gold'
                  ? require('@/assets/images/ObsidianGold.jpg')
                  : kit.name === 'Prismatic'
                  ? require('@/assets/images/Prismatic.jpg')
                  : require('@/assets/images/LiquidMetalProfile.jpeg')}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', borderRadius: 24 }}
                resizeMode="cover"
              />
              {/* Dark overlay so text is always readable */}
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.55)' }} />
            </>
          )}

          {/* Sparkle burst overlay */}
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { opacity: sparkleOpacity, transform: [{ scale: sparkleScale }], borderRadius: 24, backgroundColor: `${rarityColor}22`, zIndex: 20 }]}
          />

          {/* ── LEFT: Full-height color swatch ── */}
          <View style={kc.swatch}>
            <ErrorBoundary onError={(e: any) => logError('BANNER', e, { kitId: kit.id })}>
              {kit.name === 'Liquid Metal Candy' ? (
                <View style={StyleSheet.absoluteFill} />
              ) : kit.name === 'Starlight Prowler' ? (
                <View style={StyleSheet.absoluteFill} />
              ) : kit.name === 'Golden Bushido' ? (
                <View style={StyleSheet.absoluteFill} />
              ) : kit.name === 'Chaos Theory' ? (
                <View style={StyleSheet.absoluteFill} />
              ) : kit.name === 'Phantom Void' ? (
                <View style={StyleSheet.absoluteFill} />
              ) : kit.name === 'Stellar' ? (
                <View style={StyleSheet.absoluteFill} />
              ) : kit.name === 'Neon Pulse' ? (
                <View style={StyleSheet.absoluteFill} />
              ) : kit.name === 'Obsidian Gold' ? (
                <View style={StyleSheet.absoluteFill} />
              ) : kit.name === 'Prismatic' ? (
                <View style={StyleSheet.absoluteFill} />
              ) : (
                <LinearGradient
                  colors={colors.length >= 2 ? colors as [string, string, ...string[]] : [colors[0] || '#000', colors[0] || '#000']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
            </ErrorBoundary>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.5)']}
              style={StyleSheet.absoluteFill}
            />
            {/* Rarity pill on swatch */}
            <View style={kc.rarityPill}>
              <Text style={kc.rarityTxt}>{rarityLabel}</Text>
            </View>
            {/* Owned tick */}
            {canEquip && (
              <View style={kc.tick}>
                <Ionicons name="checkmark" size={14} color="#000000" />
              </View>
            )}
          </View>

          {/* ── RIGHT: Info ── */}
          <View style={kc.info}>
            {/* Name row */}
            <View style={kc.nameRow}>
              <Text style={kc.name} numberOfLines={1}>{kit.name}</Text>
              {kit.is_unlockable && (
                <View style={kc.diamondBadge}>
                  <Ionicons name="diamond" size={10} color="#F59E0B" />
                </View>
              )}
            </View>

            <Text style={kc.desc} numberOfLines={2}>{kit.description}</Text>

            {/* Price + CTA */}
            <View style={kc.footer}>
              <View style={{ flex: 1 }}>
                {canEquip ? (
                  <View style={kc.ownedRow}>
                    <View style={kc.ownedDot} />
                    <Text style={kc.ownedTxt}>Owned</Text>
                  </View>
                ) : kit.unlock_type === 'free' ? (
                  <Text style={kc.priceFree}>Free</Text>
                ) : kit.unlock_type === 'purchasable' && kit.price_cents ? (
                  discountInfo ? (
                    <View style={{ gap: 2 }}>
                      <View style={kc.discTag}>
                        <Text style={kc.discTxt}>-{discountInfo.discount}%</Text>
                      </View>
                      <Text style={kc.priceOld}>{formatPriceCents(kit.price_cents)}</Text>
                      <Text style={kc.priceNew}>{formatPriceCents(discountInfo.discountedPrice)}</Text>
                    </View>
                  ) : (
                    <View style={kc.priceBlock}>
                      <Text style={kc.priceMain}>{formatPriceCents(kit.price_cents).split('(')[0].trim()}</Text>
                      {formatPriceCents(kit.price_cents).includes('(') && (
                        <Text style={kc.priceUsd}>
                          {formatPriceCents(kit.price_cents).match(/\(.*\)/)?.[0] || ''}
                        </Text>
                      )}
                    </View>
                  )
                ) : kit.unlock_type === 'chance_based' ? (
                  <Pressable style={kc.chanceRow} onPress={onInfo}>
                    <Text style={kc.priceChance}>{kit.unlock_condition === 'game_win' ? 'Win to Unlock' : 'Play to Unlock'}</Text>
                    <Ionicons name="information-circle-outline" size={13} color="#F59E0B" />
                  </Pressable>
                ) : null}
              </View>

              {/* CTA */}
              {canEquip ? (
                <Pressable style={[kc.cta, { backgroundColor: '#FFFFFF' }]} onPress={() => { onApply(); triggerApplyFeedback(() => {}); }} disabled={isApplying}>
                  {isApplying
                    ? <ActivityIndicator size="small" color="#000" />
                    : <Text style={[kc.ctaTxt, { color: '#000000' }]}>Apply</Text>
                  }
                </Pressable>
              ) : kit.unlock_type === 'free' ? (
                <Pressable style={[kc.cta, { backgroundColor: '#FFFFFF' }]} onPress={() => triggerApplyFeedback(onClaim)} disabled={isApplying}>
                  {isApplying ? <ActivityIndicator size="small" color="#000" /> : <Text style={[kc.ctaTxt, { color: '#000000' }]}>Claim</Text>}
                </Pressable>
              ) : kit.unlock_type === 'purchasable' ? (
                <Pressable style={[kc.cta, { backgroundColor: '#FFFFFF' }]} onPress={() => { triggerApplyFeedback(() => {}); onBuy(); }} disabled={isApplying}>
                  {isApplying ? <ActivityIndicator size="small" color="#000" /> : <Text style={[kc.ctaTxt, { color: '#000000' }]}>Buy</Text>}
                </Pressable>
              ) : (
                <View style={kc.locked}>
                  <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.25)" />
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ── Kit card styles ───────────────────────────────────────────────────────────
const kc = StyleSheet.create({
  customCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    minHeight: 80,
    marginBottom: 0,
  },
  customContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  customLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1,
  },
  customIconCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  customTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
  customSub: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  customRight: { alignItems: 'flex-end', gap: 8 },
  customDots: { flexDirection: 'row', gap: 5 },
  customDot: { width: 14, height: 14, borderRadius: 7 },
  customBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 12,
  },
  customBtnTxt: { fontSize: 12, fontWeight: '800', color: '#000000' },
  // keep old refs for compat
  customSwatch: { width: 100, position: 'relative', justifyContent: 'flex-end', padding: 8, overflow: 'hidden' },
  customSwatchOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  customIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#0D0D0D',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    minHeight: 140,
  },
  glowBorder: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 24, borderWidth: 1.5, zIndex: 10,
  },
  premiumTag: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#000000',
    paddingHorizontal: 7, paddingVertical: 4,
    borderRadius: 20, zIndex: 11,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  premiumTagTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  swatch: {
    width: 100,
    position: 'relative',
    justifyContent: 'flex-end',
    padding: 8,
    overflow: 'hidden',
    alignSelf: 'stretch',
    minHeight: 140,
    flex: 0,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  rarityPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    marginBottom: 4,
  },
  rarityTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, color: '#FFFFFF' },
  tick: {
    position: 'absolute', top: 8, right: 8,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
  },
  info: {
    flex: 1, padding: 14, gap: 5,
    justifyContent: 'space-between',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flex: 1, fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  diamondBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  desc: { fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 17, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  dots: { flexDirection: 'row', gap: 5, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ownedRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ownedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFFFFF' },
  ownedTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  priceFree: { fontSize: 14, fontWeight: '700', color: '#22C55E' },
  price: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  priceBlock: { gap: 1 },
  priceMain: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  priceUsd: { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: '500' },
  priceOld: { fontSize: 11, color: 'rgba(255,255,255,0.25)', textDecorationLine: 'line-through' },
  priceNew: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  priceChance: { fontSize: 11, fontWeight: '700', color: '#F59E0B' },
  discTag: {
    backgroundColor: '#EF4444', paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 5, alignSelf: 'flex-start',
  },
  discTxt: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },
  chanceRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cta: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 14, minWidth: 66, alignItems: 'center',
  },
  ctaTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  locked: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center', alignItems: 'center',
  },
});

// ── Screen styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },

  header: {
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 0,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
    gap: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.6 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  salePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
  },
  saleTxt: { fontSize: 10, fontWeight: '800', color: '#EF4444', letterSpacing: 0.5 },
  headerIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#111111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  pillRow: { flexDirection: 'row', gap: 8, paddingBottom: 12 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#111111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  pillOn: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  pillTxt: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  pillTxtOn: { color: '#000000', fontWeight: '700' },

  list: { padding: 16, gap: 12 },

  empty: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#111111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  emptySub: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  infoBox: {
    backgroundColor: '#111111', borderRadius: 22, padding: 24,
    width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 12,
  },
  infoHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', flex: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  rarityPill: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
  },
  mythicPill: { backgroundColor: 'rgba(236,72,153,0.1)', borderColor: 'rgba(236,72,153,0.3)' },
  legendaryPill: { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' },
  rarityPillTxt: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
  infoDesc: { fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 22 },
});
