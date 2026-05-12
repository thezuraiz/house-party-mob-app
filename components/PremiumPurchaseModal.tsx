import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useCurrency } from '@/hooks/useCurrency';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Toast from './Toast';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type PremiumPurchaseModalProps = {
  visible: boolean;
  onClose: () => void;
};

export default function PremiumPurchaseModal({ visible, onClose }: PremiumPurchaseModalProps) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false, message: '', type: 'success',
  });
  const { user } = useAuth();
  const { isPremium, refreshPremiumStatus } = usePremium();
  const { formatPriceCents } = useCurrency();

  const handlePurchase = async () => {
    if (!user) {
      setToast({ visible: true, message: 'Please sign in to purchase', type: 'error' });
      return;
    }
    setLoading(true);
    logger.track('premium_purchase_initiated', { userId: user.id, platform: Platform.OS });
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) throw new Error('No active session');
      const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/yoco-premium-initialize`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to initialize payment');
      onClose();
      setTimeout(async () => {
        if (Platform.OS === 'web') {
          window.location.href = data.redirectUrl;
        } else {
          await Linking.openURL(data.redirectUrl);
        }
      }, 100);
    } catch (error: any) {
      logger.error('Premium purchase error', { userId: user?.id, error: error.message });
      setToast({ visible: true, message: error.message || 'Failed to process purchase', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { text: 'Unlimited Friends', icon: 'people' },
    { text: 'Unlimited Houses', icon: 'home' },
    { text: 'Unlimited Games', icon: 'game-controller' },
    { text: 'Upload custom profile photos', icon: 'camera' },
    { text: 'Access all emoji packs', icon: 'happy' },
    { text: 'Lifetime access — no subscriptions', icon: 'infinite' },
  ];

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            {[
              <Pressable key="close" style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
              </Pressable>,
              isPremium ? (
                <View key="premium" style={styles.alreadyPremiumContainer}>
                  <View style={styles.alreadyPremiumIcon}>
                    <Ionicons name="diamond" size={40} color="#FFD700" />
                  </View>
                  <Text style={styles.alreadyPremiumTitle}>You're Premium!</Text>
                  <Text style={styles.alreadyPremiumSubtitle}>
                    You already have lifetime Premium access. Enjoy all features!
                  </Text>
                  <View style={styles.alreadyPremiumFeatures}>
                    {['Unlimited Friends', 'Unlimited Houses', 'Unlimited Games', 'Custom profile photos', 'All emoji packs'].map((f, i) => (
                      <View key={i} style={styles.featureItem}>
                        <View style={styles.checkIcon}>
                          <Ionicons name="checkmark" size={14} color="#000000" />
                        </View>
                        <Text style={styles.featureText}>{f}</Text>
                      </View>
                    ))}
                  </View>
                  <Pressable style={styles.alreadyPremiumBtn} onPress={onClose}>
                    <Text style={styles.alreadyPremiumBtnTxt}>Awesome!</Text>
                  </Pressable>
                </View>
              ) : (
                <ScrollView
                  key="purchase"
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                  contentContainerStyle={styles.scrollContent}
                >
                  {/* Crown header */}
                  <View style={styles.header}>
                    <View style={styles.iconBox}>
                      <Ionicons name="diamond" size={36} color="#00000" />
                    </View>
                    <Text style={styles.title}>Unlock Premium</Text>
                    <Text style={styles.subtitle}>Pay once, own forever</Text>
                  </View>

                  {/* Price pill */}
                  <View style={styles.pricePill}>
                    <Text style={styles.priceAmount} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
                      {formatPriceCents(499)}
                    </Text>
                    <View style={styles.priceMeta}>
                      <Text style={styles.priceOnce}>one-time</Text>
                      <View style={styles.lifetimeBadge}>
                        <Ionicons name="flash" size={11} color="#FFFFFF" />
                        <Text style={styles.lifetimeText}>LIFETIME</Text>
                      </View>
                    </View>
                  </View>

                  {/* Features */}
                  <View style={styles.featuresContainer}>
                    {features.map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <View style={styles.checkIcon}>
                          <Ionicons name="checkmark" size={14} color="#000000" />
                        </View>
                        <Text style={styles.featureText}>{feature.text}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Note */}
                  <View style={styles.noteContainer}>
                    <Ionicons name="sparkles" size={15} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.noteText}>
                      Unlock unlimited houses and all premium features forever
                    </Text>
                  </View>

                  {/* CTA */}
                  <Pressable
                    style={[styles.purchaseButton, loading && { opacity: 0.6 }]}
                    onPress={handlePurchase}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <>
                        <Ionicons name="diamond" size={20} color="#000000" />
                        <Text style={styles.purchaseText}>Purchase Premium</Text>
                      </>
                    )}
                  </Pressable>

                  <Text style={styles.disclaimer}>Secure payment processed by YOCO</Text>
                </ScrollView>
              ),
            ]}
          </View>
        </View>
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.92,
    backgroundColor: '#111111',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  closeButton: {
    position: 'absolute',
    top: 16, right: 16,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#1A1A1A',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 10,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
    paddingTop: 8,
  },
  iconBox: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14, color: 'rgba(255,255,255,0.45)', fontWeight: '500',
  },

  // Price
  pricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    paddingVertical: 16, paddingHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#1A1A1A',
  },
  priceAmount: {
    fontSize: 22, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: -0.5, flex: 1, flexShrink: 1,
  },
  priceMeta: {
    gap: 6, alignItems: 'flex-end', marginLeft: 12,
  },
  priceOnce: {
    fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '600',
  },
  lifetimeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  lifetimeText: {
    fontSize: 11, color: '#000000', fontWeight: '800', letterSpacing: 0.5,
  },

  // Features
  featuresContainer: {
    gap: 12, marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  checkIcon: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
  },
  featureText: {
    fontSize: 15, color: '#FFFFFF', flex: 1, fontWeight: '500',
  },

  // Note
  noteContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1A1A1A',
    padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 24,
  },
  noteText: {
    fontSize: 13, color: 'rgba(255,255,255,0.6)',
    flex: 1, lineHeight: 19, fontWeight: '500',
  },

  // CTA
  purchaseButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    marginBottom: 12,
  },
  purchaseText: {
    fontSize: 17, fontWeight: '800', color: '#000000', letterSpacing: 0.2,
  },
  disclaimer: {
    fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center',
  },

  // Already Premium view
  alreadyPremiumContainer: {
    padding: 24, paddingTop: 48, paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    alignItems: 'center',
  },
  alreadyPremiumIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  alreadyPremiumTitle: {
    fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 8,
  },
  alreadyPremiumSubtitle: {
    fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center',
    lineHeight: 20, marginBottom: 28, paddingHorizontal: 8,
  },
  alreadyPremiumFeatures: { width: '100%', gap: 10, marginBottom: 32 },
  alreadyPremiumBtn: {
    width: '100%', backgroundColor: '#FFD700',
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  alreadyPremiumBtnTxt: {
    fontSize: 17, fontWeight: '800', color: '#000000',
  },
});
