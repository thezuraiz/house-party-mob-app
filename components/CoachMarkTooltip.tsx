import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { TargetElement, CoachMarkPosition } from '@/types/coachMark';
import { Colors } from '@/constants/Colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOOLTIP_MAX_WIDTH = 280;
const TOOLTIP_PADDING = 16;
const ARROW_SIZE = 12;

interface CoachMarkTooltipProps {
  target: TargetElement;
  title: string;
  description: string;
  position: CoachMarkPosition;
  onNext?: () => void;
  onSkip?: () => void;
  showNext?: boolean;
  currentStep?: number;
  totalSteps?: number;
}

export default function CoachMarkTooltip({
  target,
  title,
  description,
  position: preferredPosition,
  onNext,
  onSkip,
  showNext = true,
  currentStep = 1,
  totalSteps = 1,
}: CoachMarkTooltipProps) {
  const [tooltipLayout, setTooltipLayout] = useState({ width: 0, height: 0 });
  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, {
      damping: 15,
      stiffness: 150,
    });
    opacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const calculatePosition = () => {
    if (tooltipLayout.width === 0 || tooltipLayout.height === 0) {
      return { top: 0, left: 0, position: preferredPosition, arrowPosition: 'center' };
    }

    const targetCenterX = target.x + target.width / 2;
    const targetCenterY = target.y + target.height / 2;
    const tooltipWidth = tooltipLayout.width;
    const tooltipHeight = tooltipLayout.height;

    let calculatedPosition = preferredPosition;
    let top = 0;
    let left = 0;
    let arrowPosition: 'left' | 'right' | 'center' = 'center';

    const canFitTop = target.y - tooltipHeight - ARROW_SIZE - 20 > 0;
    const canFitBottom = target.y + target.height + tooltipHeight + ARROW_SIZE + 20 < SCREEN_HEIGHT;
    const canFitLeft = target.x - tooltipWidth - ARROW_SIZE - 20 > 0;
    const canFitRight = target.x + target.width + tooltipWidth + ARROW_SIZE + 20 < SCREEN_WIDTH;

    if (preferredPosition === 'top' && canFitTop) {
      top = target.y - tooltipHeight - ARROW_SIZE - 16;
      left = Math.max(
        TOOLTIP_PADDING,
        Math.min(
          targetCenterX - tooltipWidth / 2,
          SCREEN_WIDTH - tooltipWidth - TOOLTIP_PADDING
        )
      );
    } else if (preferredPosition === 'bottom' && canFitBottom) {
      top = target.y + target.height + ARROW_SIZE + 16;
      left = Math.max(
        TOOLTIP_PADDING,
        Math.min(
          targetCenterX - tooltipWidth / 2,
          SCREEN_WIDTH - tooltipWidth - TOOLTIP_PADDING
        )
      );
    } else if (preferredPosition === 'left' && canFitLeft) {
      top = Math.max(
        TOOLTIP_PADDING,
        Math.min(
          targetCenterY - tooltipHeight / 2,
          SCREEN_HEIGHT - tooltipHeight - TOOLTIP_PADDING
        )
      );
      left = target.x - tooltipWidth - ARROW_SIZE - 16;
      calculatedPosition = 'left';
    } else if (preferredPosition === 'right' && canFitRight) {
      top = Math.max(
        TOOLTIP_PADDING,
        Math.min(
          targetCenterY - tooltipHeight / 2,
          SCREEN_HEIGHT - tooltipHeight - TOOLTIP_PADDING
        )
      );
      left = target.x + target.width + ARROW_SIZE + 16;
      calculatedPosition = 'right';
    } else if (canFitBottom) {
      top = target.y + target.height + ARROW_SIZE + 16;
      left = Math.max(
        TOOLTIP_PADDING,
        Math.min(
          targetCenterX - tooltipWidth / 2,
          SCREEN_WIDTH - tooltipWidth - TOOLTIP_PADDING
        )
      );
      calculatedPosition = 'bottom';
    } else if (canFitTop) {
      top = target.y - tooltipHeight - ARROW_SIZE - 16;
      left = Math.max(
        TOOLTIP_PADDING,
        Math.min(
          targetCenterX - tooltipWidth / 2,
          SCREEN_WIDTH - tooltipWidth - TOOLTIP_PADDING
        )
      );
      calculatedPosition = 'top';
    } else {
      top = SCREEN_HEIGHT / 2 - tooltipHeight / 2;
      left = SCREEN_WIDTH / 2 - tooltipWidth / 2;
      calculatedPosition = 'center';
    }

    if (left <= TOOLTIP_PADDING) {
      arrowPosition = 'left';
    } else if (left + tooltipWidth >= SCREEN_WIDTH - TOOLTIP_PADDING) {
      arrowPosition = 'right';
    }

    return { top, left, position: calculatedPosition, arrowPosition };
  };

  const { top, left, position, arrowPosition } = calculatePosition();

  const renderArrow = () => {
    if (position === 'center') return null;

    const arrowStyle = [styles.arrow];

    if (position === 'top') {
      arrowStyle.push(styles.arrowBottom);
      if (arrowPosition === 'left') {
        arrowStyle.push({ left: 24 });
      } else if (arrowPosition === 'right') {
        arrowStyle.push({ right: 24 });
      }
    } else if (position === 'bottom') {
      arrowStyle.push(styles.arrowTop);
      if (arrowPosition === 'left') {
        arrowStyle.push({ left: 24 });
      } else if (arrowPosition === 'right') {
        arrowStyle.push({ right: 24 });
      }
    } else if (position === 'left') {
      arrowStyle.push(styles.arrowRight);
    } else if (position === 'right') {
      arrowStyle.push(styles.arrowLeft);
    }

    return <View style={arrowStyle} />;
  };

  return (
    <Animated.View
      style={[
        styles.tooltipContainer,
        { top, left, maxWidth: TOOLTIP_MAX_WIDTH },
        animatedStyle,
      ]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (tooltipLayout.width !== width || tooltipLayout.height !== height) {
          setTooltipLayout({ width, height });
        }
      }}
    >
      {renderArrow()}

      <View style={styles.tooltipContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {onSkip && (
            <TouchableOpacity onPress={onSkip} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color={Colors.text} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.description}>{description}</Text>

        <View style={styles.footer}>
          <View style={styles.progressDots}>
            {Array.from({ length: totalSteps }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index + 1 === currentStep && styles.dotActive,
                ]}
              />
            ))}
          </View>

          {showNext && onNext && (
            <TouchableOpacity onPress={onNext} style={styles.nextButton}>
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tooltipContainer: {
    position: 'absolute',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  tooltipContent: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#D1D5DB',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4B5563',
  },
  dotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  nextButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
  },
  arrowTop: {
    top: -ARROW_SIZE,
    left: '50%',
    marginLeft: -ARROW_SIZE,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderBottomWidth: ARROW_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#1F2937',
  },
  arrowBottom: {
    bottom: -ARROW_SIZE,
    left: '50%',
    marginLeft: -ARROW_SIZE,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderTopWidth: ARROW_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1F2937',
  },
  arrowLeft: {
    left: -ARROW_SIZE,
    top: '50%',
    marginTop: -ARROW_SIZE,
    borderTopWidth: ARROW_SIZE,
    borderBottomWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#1F2937',
  },
  arrowRight: {
    right: -ARROW_SIZE,
    top: '50%',
    marginTop: -ARROW_SIZE,
    borderTopWidth: ARROW_SIZE,
    borderBottomWidth: ARROW_SIZE,
    borderLeftWidth: ARROW_SIZE,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#1F2937',
  },
});
