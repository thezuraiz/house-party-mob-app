import { View, StyleSheet, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { T } from '@/constants/Theme';

type Props = {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  onPress?: () => void;
  active?: boolean;
  activeColor?: string;
  containerSize?: number;
  variant?: 'light' | 'dark' | 'glass';
  style?: object;
};

export default function NeuIcon({
  name, size = 20, color, onPress,
  active = false, activeColor = T.primary,
  containerSize = 44, variant = 'light', style,
}: Props) {
  const inner = containerSize - 6;
  const radius = containerSize / 2;
  const innerRadius = inner / 2;

  const iconColor = color ?? (variant === 'dark' || variant === 'glass'
    ? 'rgba(255,255,255,0.85)'
    : T.darkLight);

  const outerStyle = variant === 'glass'
    ? { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }
    : variant === 'dark'
    ? { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }
    : { backgroundColor: '#EDE6F5', shadowColor: 'rgba(70,51,79,0.3)', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 6, elevation: 4 };

  const innerStyle = variant === 'glass' || variant === 'dark'
    ? { backgroundColor: 'transparent' }
    : { backgroundColor: '#F5F0F7', shadowColor: '#FFFFFF', shadowOffset: { width: -3, height: -3 }, shadowOpacity: 1, shadowRadius: 4, elevation: 0, borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)' };

  const content = (
    <View style={[styles.outer, { width: containerSize, height: containerSize, borderRadius: radius }, outerStyle, style]}>
      <View style={[styles.inner, { width: inner, height: inner, borderRadius: innerRadius }, innerStyle]}>
        <Ionicons name={name} size={size} color={active ? activeColor : iconColor} />
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.9 : 1 }] }]}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  outer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
