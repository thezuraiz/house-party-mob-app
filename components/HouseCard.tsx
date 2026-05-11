import { safeArrayFromColors } from '@/lib/colorUtils';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

const ENABLE_ANIMATIONS = Platform.OS !== 'android' || Platform.Version >= 28;

type HouseCardProps = {
  house: {
    id: string;
    name: string;
    house_emoji?: string;
    member_count: number;
    role?: string;
    creator_nickname?: string;
    custom_theme_colors?: string[];
    kit_rarity?: string;
    kit_name?: string;
    image_url?: string;
  };
  hasPendingInvites?: boolean;
  isInvitedHouse?: boolean;
  pendingCount?: number;
  onPress: () => void;
};

const PREMIUM_RARITIES = ['rare', 'epic', 'legendary', 'mythic'];
const ALL_KIT_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

function getAccentColor(kitName?: string | null, rarity?: string | null, colors?: string[] | null): string {
  if (kitName === 'Obsidian Gold') return '#FFD700';
  if (kitName === 'Neon Pulse') return '#00FFFF';
  if (kitName === 'Phantom Void') return '#00CED1';
  if (kitName === 'Prismatic') return '#9D00FF';
  if (kitName === 'Stellar') return '#C0C0C0';
  if (kitName === 'Neon Rift Loadout') return '#9D00FF';
  if (kitName === 'Phantom Echo Set') return '#00614A';
  if (rarity === 'mythic') return '#EC4899';
  if (rarity === 'legendary') return '#FFD700';
  if (rarity === 'epic') return '#A855F7';
  if (rarity === 'rare') return '#3B82F6';
  if (colors && colors.length > 0) return colors[colors.length - 1];
  return '#333333';
}

// Phantom Echo Set — animated vertical teal wave strips
function PhantomWaves({ accentColor }: { accentColor: string }) {
  const anims = [0, 1, 2, 3, 4].map(() => useRef(new Animated.Value(0)).current);

  useEffect(() => {
    if (!ENABLE_ANIMATIONS) return;
    anims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 2000 + i * 400, useNativeDriver: true, delay: i * 300 }),
          Animated.timing(anim, { toValue: 0, duration: 2000 + i * 400, useNativeDriver: true }),
        ])
      ).start();
    });
    return () => anims.forEach(a => a.stopAnimation());
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((anim, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${i * 22}%` as any,
          width: 16, borderRadius: 20,
          backgroundColor: accentColor,
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.45] }),
          transform: [{ scaleY: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
        }} />
      ))}
    </View>
  );
}

// Kit-specific texture overlay — geometric patterns per kit
function KitTexture({ kitName, rarity, accentColor }: { kitName?: string | null; rarity?: string | null; accentColor: string }) {
  // Plain design — no texture overlays on house cards
  return null;
}

// Floating orb component — slowly drifts around inside the card
function FloatingOrb({ color, size, startX, startY, duration, delay, opacity = 0.35 }: {
  color: string; size: number; startX: number; startY: number; duration: number; delay: number; opacity?: number;
}) {
  const x = useRef(new Animated.Value(startX)).current;
  const y = useRef(new Animated.Value(startY)).current;

  useEffect(() => {
    if (!ENABLE_ANIMATIONS) return;

    const animateOrb = () => {
      const nextX = Math.random() * 80 - 10;
      const nextY = Math.random() * 60 - 10;
      Animated.parallel([
        Animated.timing(x, { toValue: nextX, duration, useNativeDriver: true, delay }),
        Animated.timing(y, { toValue: nextY, duration, useNativeDriver: true, delay }),
      ]).start(({ finished }) => { if (finished) animateOrb(); });
    };

    const timer = setTimeout(animateOrb, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: 0.35,
        transform: [{ translateX: x }, { translateY: y }],
        // Soft blur effect via shadow
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: size / 2,
        elevation: 0,
      }}
    />
  );
}

export default function HouseCard({
  house,
  hasPendingInvites = false,
  isInvitedHouse = false,
  pendingCount = 0,
  onPress,
}: HouseCardProps) {
  const safeColors = React.useMemo(() => safeArrayFromColors(house.custom_theme_colors), [house.custom_theme_colors]);
  const hasAppliedKit = safeColors && safeColors.length > 0;
  const isPremium = PREMIUM_RARITIES.includes(house.kit_rarity || '');
  const hasAnyKit = hasAppliedKit; // show orbs for all kits
  const accentColor = getAccentColor(house.kit_name, house.kit_rarity, safeColors);

  // Orb opacity based on rarity — subtle for common, strong for legendary
  const orbOpacity = house.kit_rarity === 'mythic' ? 0.5
    : house.kit_rarity === 'legendary' ? 0.45
      : house.kit_rarity === 'epic' ? 0.38
        : house.kit_rarity === 'rare' ? 0.32
          : house.kit_rarity === 'uncommon' ? 0.25
            : 0.2; // common
  const isAdmin = house.role === 'admin';

  // Kit change animation
  const kitAnim = useRef(new Animated.Value(1)).current;
  const prevKitRef = useRef(house.kit_rarity);

  useEffect(() => {
    if (prevKitRef.current !== house.kit_rarity) {
      prevKitRef.current = house.kit_rarity;
      Animated.sequence([
        Animated.timing(kitAnim, { toValue: 0.3, duration: 180, useNativeDriver: true }),
        Animated.spring(kitAnim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }),
      ]).start();
    }
  }, [house.kit_rarity, house.custom_theme_colors]);

  const subText = 'rgba(255,255,255,0.75)';
  const badgeBg = 'rgba(0,0,0,0.5)';
  const badgeBorder = 'rgba(255,255,255,0.25)';

  return (
    <Pressable
      style={({ pressed }) => [pressed && styles.pressed]}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.card,
          hasAppliedKit && house.kit_name !== 'Neon Rift Loadout' && {
            borderColor: accentColor + '88',
            borderWidth: isPremium ? 1.5 : 1,
          },
          // Neon Rift — glassmorphic outer glow
          house.kit_name === 'Neon Rift Loadout' && {
            borderWidth: 1.5,
            borderColor: '#9D00FF',
            shadowColor: '#9D00FF',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 20,
            elevation: 20,
          },
          {
            opacity: kitAnim,
            transform: [{
              scale: kitAnim.interpolate({ inputRange: [0.3, 1], outputRange: [0.92, 1] })
            }],
          },
        ]}
      >
        <View style={styles.cardInner}>
          {/* Dark base */}
          <View style={[StyleSheet.absoluteFill, {
            backgroundColor: house.kit_name === 'Neon Rift Loadout' ? '#1A0030' : '#0D0D0D'
          }]} />

          {/* User-uploaded background image — shown when no kit is applied */}
          {house.image_url && !house.kit_name && (
            <>
              <Image
                source={{ uri: house.image_url }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: undefined, height: undefined }}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.45)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </>
          )}

          {/* Neon Rift — PNG background image */}
          {house.kit_name === 'Neon Rift Loadout' && (
            <Image
              source={require('@/assets/images/NeonBackground.jpg')}
              style={{ position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, width: undefined, height: undefined }}
              resizeMode="cover"
            />
          )}

          {/* Ironclad Vanguard — PNG background image */}
          {house.kit_name === 'Ironclad Vanguard' && (
            <Image
              source={require('@/assets/images/IroncladHouse.jpg')}
              style={{ position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, width: undefined, height: undefined }}
              resizeMode="cover"
            />
          )}

          {/* Phantom Echo Set — GIF background animation */}
          {house.kit_name === 'Phantom Echo Set' && (
            <Image
              source={require('../neon_glow_animation.gif')}
              style={{ position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, width: undefined, height: undefined }}
              resizeMode="cover"
            />
          )}

          {/* Liquid Metal Candy — holographic image background */}
          {house.kit_name === 'Liquid Metal Candy' && (
            <Image
              source={require('@/assets/images/LiquidMetalProfile.jpeg')}
              style={{ position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, width: undefined, height: undefined }}
              resizeMode="cover"
            />
          )}

          {/* Starlight Prowler — cosmic image background */}
          {house.kit_name === 'Starlight Prowler' && (
            <Image
              source={require('@/assets/images/StarlightProwler.jpeg')}
              style={{ position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, width: undefined, height: undefined }}
              resizeMode="cover"
            />
          )}

          {/* Golden Bushido — samurai image background */}
          {house.kit_name === 'Golden Bushido' && (
            <Image
              source={require('@/assets/images/GoldenBushido.jpeg')}
              style={{ position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, width: undefined, height: undefined }}
              resizeMode="cover"
            />
          )}

          {/* Chaos Theory — chaotic image background */}
          {house.kit_name === 'Chaos Theory' && (
            <Image
              source={require('@/assets/images/ChaosTheory.jpeg')}
              style={{ position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, width: undefined, height: undefined }}
              resizeMode="cover"
            />
          )}

          {/* Phantom Void — dark teal image background */}
          {house.kit_name === 'Phantom Void' && (
            <Image
              source={require('@/assets/images/PhantomVoid.jpg')}
              style={{ position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, width: undefined, height: undefined }}
              resizeMode="cover"
            />
          )}

          {/* Stellar — silver cosmic image background */}
          {house.kit_name === 'Stellar' && (
            <Image
              source={require('@/assets/images/Stellar.jpg')}
              style={{ position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, width: undefined, height: undefined }}
              resizeMode="cover"
            />
          )}

          {/* Neon Pulse — neon cyan image background */}
          {house.kit_name === 'Neon Pulse' && (
            <Image
              source={require('@/assets/images/NeonPulse.jpg')}
              style={{ position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, width: undefined, height: undefined }}
              resizeMode="cover"
            />
          )}

          {/* Obsidian Gold — gold dark image background */}
          {house.kit_name === 'Obsidian Gold' && (
            <Image
              source={require('@/assets/images/ObsidianGold.jpg')}
              style={{ position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, width: undefined, height: undefined }}
              resizeMode="cover"
            />
          )}

          {/* Prismatic — purple prismatic image background */}
          {house.kit_name === 'Prismatic' && (
            <Image
              source={require('@/assets/images/Prismatic.jpg')}
              style={{ position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, width: undefined, height: undefined }}
              resizeMode="cover"
            />
          )}

          {/* Kit gradient — full card (not for PNG/GIF kits) */}
          {hasAppliedKit && safeColors && house.kit_name !== 'Neon Rift Loadout' && house.kit_name !== 'Ironclad Vanguard' && house.kit_name !== 'Phantom Echo Set' && house.kit_name !== 'Liquid Metal Candy' && house.kit_name !== 'Starlight Prowler' && house.kit_name !== 'Golden Bushido' && house.kit_name !== 'Chaos Theory' && house.kit_name !== 'Phantom Void' && house.kit_name !== 'Stellar' && house.kit_name !== 'Neon Pulse' && house.kit_name !== 'Obsidian Gold' && house.kit_name !== 'Prismatic' && (
            <LinearGradient
              colors={safeColors.length >= 2
                ? safeColors as [string, string, ...string[]]
                : [safeColors[0], safeColors[0]] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}

          {/* Subtle dark overlay for text readability — NONE for PNG/GIF kits */}
          {hasAppliedKit && house.kit_name !== 'Neon Rift Loadout' && house.kit_name !== 'Ironclad Vanguard' && house.kit_name !== 'Phantom Echo Set' && house.kit_name !== 'Liquid Metal Candy' && house.kit_name !== 'Starlight Prowler' && house.kit_name !== 'Golden Bushido' && house.kit_name !== 'Chaos Theory' && house.kit_name !== 'Phantom Void' && house.kit_name !== 'Stellar' && house.kit_name !== 'Neon Pulse' && house.kit_name !== 'Obsidian Gold' && house.kit_name !== 'Prismatic' && (
            <LinearGradient
              colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.3)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}

          {/* Kit texture — ON TOP of overlay so it's visible */}
          {hasAppliedKit && house.kit_name !== 'Neon Rift Loadout' && house.kit_name !== 'Ironclad Vanguard' && house.kit_name !== 'Phantom Echo Set' && house.kit_name !== 'Liquid Metal Candy' && house.kit_name !== 'Starlight Prowler' && house.kit_name !== 'Phantom Void' && house.kit_name !== 'Stellar' && house.kit_name !== 'Neon Pulse' && house.kit_name !== 'Obsidian Gold' && house.kit_name !== 'Prismatic' && (
            <KitTexture kitName={house.kit_name} rarity={house.kit_rarity} accentColor={accentColor} />
          )}

          {/* Content */}
          <View style={styles.overlay}>
            {/* Top row */}
            <View style={styles.topRow}>
              <View style={styles.emojiWrap}>
                <Text style={styles.emoji}>{house.house_emoji || '🏠'}</Text>
              </View>
              <View style={styles.badges}>
                {hasPendingInvites && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>
                      {isInvitedHouse ? 'INVITED' : pendingCount > 1 ? `${pendingCount} NEW` : 'NEW'}
                    </Text>
                  </View>
                )}
                {isAdmin && (
                  <View style={[styles.roleBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
                    <Ionicons name="shield-checkmark" size={11} color="#FFFFFF" />
                    <Text style={styles.roleText}>Admin</Text>
                  </View>
                )}
                {isInvitedHouse && (
                  <View style={[styles.roleBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
                    <Ionicons name="mail-open-outline" size={11} color="#FFFFFF" />
                    <Text style={styles.roleText}>Invited</Text>
                  </View>
                )}
              </View>
            </View>

            {/* House name */}
            <Text style={styles.name} numberOfLines={2}>{house.name}</Text>

            {/* Bottom stats */}
            <View style={styles.bottomCol}>
              <View style={styles.stat}>
                <Ionicons name="people-outline" size={12} color={subText} />
                <Text style={[styles.statText, { color: subText }]}>
                  {house.member_count} {house.member_count === 1 ? 'member' : 'members'}
                </Text>
              </View>
            </View>
          </View>
        </View>

      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  // Corner accent marks — inside card
  cornerTR: {
    position: 'absolute', top: 6, right: 6,
    width: 16, height: 16,
    borderTopWidth: 2, borderRightWidth: 2,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    position: 'absolute', bottom: 6, left: 6,
    width: 16, height: 16,
    borderBottomWidth: 2, borderLeftWidth: 2,
    borderBottomLeftRadius: 4,
  },
  cornerTL: {
    position: 'absolute', top: 6, left: 6,
    width: 12, height: 12,
    borderTopWidth: 1.5, borderLeftWidth: 1.5,
    borderTopLeftRadius: 4,
  },
  cornerBR: {
    position: 'absolute', bottom: 6, right: 6,
    width: 12, height: 12,
    borderBottomWidth: 1.5, borderRightWidth: 1.5,
    borderBottomRightRadius: 4,
  },
  cardInner: {
    height: 160,
    position: 'relative',
    overflow: 'hidden',
  },
  overlay: {
    height: 160,
    paddingVertical: 14,
    paddingHorizontal: 14,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  emojiWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  emoji: { fontSize: 18 },
  badges: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    flexWrap: 'wrap', justifyContent: 'flex-end',
    flex: 1, marginLeft: 8,
  },
  pendingBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  pendingBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  roleText: {
    fontSize: 11, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  name: {
    fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  bottomCol: { gap: 3 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: {
    fontSize: 11, fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
});
