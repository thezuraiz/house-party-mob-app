/**
 * KitBorder — simple border for house cards and player profiles.
 */
import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  rarity: string;
  kitName?: string | null;
  colors: string[];
  children: ReactNode;
  borderRadius?: number;
  style?: object;
};

export default function KitBorder({ rarity, kitName, colors, children, borderRadius = 22, style }: Props) {
  const isPremium = ['rare', 'epic', 'legendary', 'mythic'].includes(rarity);
  const innerRadius = borderRadius - 2;

  if (!isPremium) {
    return <View style={[{ borderRadius }, style]}>{children}</View>;
  }

  const getBorderColor = () => {
    if (kitName === 'Chaos Theory') return '#AAFF00';
    if (kitName === 'Obsidian Gold') return '#FFD700';
    if (kitName === 'Neon Pulse') return '#00FFFF';
    if (kitName === 'Phantom Void') return '#00CED1';
    if (kitName === 'Prismatic') return '#4A7BF7';
    if (kitName === 'Golden Bushido') return '#FFD700';
    if (kitName === 'Starlight Prowler') return '#75D5E3';
    if (kitName === 'Stellar') return 'rgba(192,192,192,0.65)';
    if (rarity === 'mythic') return '#EC4899';
    if (rarity === 'legendary') return colors[colors.length - 1] || '#FFD700';
    if (rarity === 'epic') return colors[0] || '#8A2BE2';
    return colors[0] || '#3B82F6';
  };

  const borderColor = getBorderColor();
  const borderWidth = rarity === 'mythic' ? 3 : rarity === 'legendary' ? 2.5 : 2;
  const glow = kitName === 'Obsidian Gold' || kitName === 'Golden Bushido';

  return (
    <View
      style={[
        styles.wrapper,
        {
          // borderRadius,
          // borderWidth,
          // borderColor: glow ? borderColor + '99' : borderColor,
          ...(glow ? {
            shadowColor: borderColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.45,
            shadowRadius: 10,
            elevation: 8,
          } : {}),
        },
        style,
      ]}
    >
      <View style={{ borderRadius: innerRadius, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
});
