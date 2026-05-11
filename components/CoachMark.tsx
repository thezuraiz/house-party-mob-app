import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { TargetElement, CoachMarkHighlightType } from '@/types/coachMark';

interface CoachMarkProps {
  target: TargetElement;
  highlightType: CoachMarkHighlightType;
  padding?: number;
}

export default function CoachMark({ target, highlightType, padding = 8 }: CoachMarkProps) {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  const isCircle = highlightType === 'circle';
  const centerX = target.x + target.width / 2;
  const centerY = target.y + target.height / 2;
  const radius = isCircle
    ? Math.max(target.width, target.height) / 2 + padding
    : 0;

  const highlightStyle = isCircle
    ? {
        left: centerX - radius,
        top: centerY - radius,
        width: radius * 2,
        height: radius * 2,
        borderRadius: radius,
      }
    : {
        left: target.x - padding,
        top: target.y - padding,
        width: target.width + padding * 2,
        height: target.height + padding * 2,
        borderRadius: 12,
      };

  return (
    <View style={[styles.container, StyleSheet.absoluteFill]} pointerEvents="none">
      <View style={[styles.pulseRing, highlightStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#EF4444',
    backgroundColor: 'transparent',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
});
