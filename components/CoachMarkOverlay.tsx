import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import Svg, { Defs, Rect, Mask, Circle, RRect } from 'react-native-svg';
import CoachMark from './CoachMark';
import CoachMarkTooltip from './CoachMarkTooltip';
import { TargetElement, CoachMarkStep } from '@/types/coachMark';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CoachMarkOverlayProps {
  target: TargetElement;
  step: CoachMarkStep;
  currentStepIndex: number;
  totalSteps: number;
  onNext?: () => void;
  onSkip?: () => void;
  onBackdropPress?: () => void;
}

export default function CoachMarkOverlay({
  target,
  step,
  currentStepIndex,
  totalSteps,
  onNext,
  onSkip,
  onBackdropPress,
}: CoachMarkOverlayProps) {
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    overlayOpacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
  }, []);

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const padding = step.highlightPadding || 8;
  const isCircle = step.highlightType === 'circle';

  const highlightX = target.x - padding;
  const highlightY = target.y - padding;
  const highlightWidth = target.width + padding * 2;
  const highlightHeight = target.height + padding * 2;

  const centerX = target.x + target.width / 2;
  const centerY = target.y + target.height / 2;
  const radius = isCircle
    ? Math.max(target.width, target.height) / 2 + padding
    : 0;

  return (
    <Animated.View style={[styles.container, animatedOverlayStyle]}>
      <TouchableWithoutFeedback onPress={onBackdropPress}>
        <View style={StyleSheet.absoluteFill}>
          <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
            <Defs>
              <Mask id="mask" x="0" y="0" width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
                <Rect x="0" y="0" width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="white" />
                {isCircle ? (
                  <Circle cx={centerX} cy={centerY} r={radius} fill="black" />
                ) : (
                  <RRect
                    x={highlightX}
                    y={highlightY}
                    width={highlightWidth}
                    height={highlightHeight}
                    rx={12}
                    ry={12}
                    fill="black"
                  />
                )}
              </Mask>
            </Defs>

            <Rect
              x="0"
              y="0"
              width={SCREEN_WIDTH}
              height={SCREEN_HEIGHT}
              fill="rgba(0, 0, 0, 0.75)"
              mask="url(#mask)"
            />
          </Svg>

          <CoachMark
            target={target}
            highlightType={step.highlightType}
            padding={padding}
          />
        </View>
      </TouchableWithoutFeedback>

      <CoachMarkTooltip
        target={target}
        title={step.title}
        description={step.description}
        position={step.position}
        onNext={onNext}
        onSkip={onSkip}
        showNext={!step.autoAdvanceOnAction}
        currentStep={currentStepIndex + 1}
        totalSteps={totalSteps}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
});
