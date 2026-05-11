/**
 * KitBorder — simple border for house cards and player profiles.
 */
import { View, StyleSheet } from 'react-native';
import { ReactNode } from 'react';

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
    if (kitName === 'Obsidian Gold') return '#FFD700';
    if (kitName === 'Neon Pulse') return '#00FFFF';
    if (kitName === 'Phantom Void') return '#00CED1';
    if (kitName === 'Prismatic') return '#4A7BF7';
    if (rarity === 'mythic') return '#EC4899';
    if (rarity === 'legendary') return colors[colors.length - 1] || '#FFD700';
    if (rarity === 'epic') return colors[0] || '#8A2BE2';
    return colors[0] || '#3B82F6';
  };

  const borderColor = getBorderColor();
  const borderWidth = rarity === 'mythic' ? 3 : rarity === 'legendary' ? 2.5 : 2;

  return (
    <View
      style={[
        styles.wrapper,
        { borderRadius, borderWidth, borderColor },
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
