import { Pressable, StyleSheet, ViewStyle, Platform } from 'react-native';
import { useRef, useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';

type LongPressButtonProps = {
  onPress: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  disabled?: boolean;
  delayBeforeRepeat?: number;
  accelerationFactor?: number;
};

export function LongPressButton({
  onPress,
  onLongPress,
  children,
  style,
  disabled = false,
  delayBeforeRepeat = 300,
  accelerationFactor = 0.9,
}: LongPressButtonProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentIntervalTime = useRef<number>(100);
  const pressCount = useRef<number>(0);
  const lastHapticTime = useRef<number>(0);
  const isPressed = useRef<boolean>(false);

  // Always-current ref — prevents stale closure in rapid/long-press callbacks
  const onPressRef = useRef(onPress);
  const onLongPressRef = useRef(onLongPress);
  useEffect(() => { onPressRef.current = onPress; }, [onPress]);
  useEffect(() => { onLongPressRef.current = onLongPress; }, [onLongPress]);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startRepeating = useCallback(() => {
    currentIntervalTime.current = 150;
    pressCount.current = 0;

    const repeat = () => {
      if (!isPressed.current) {
        clearTimers();
        return;
      }

      // Always use ref — never stale
      onPressRef.current();
      pressCount.current += 1;

      const now = Date.now();
      if (
        isPressed.current &&
        Platform.OS !== 'web' &&
        pressCount.current % 20 === 0 &&
        now - lastHapticTime.current > 300
      ) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        lastHapticTime.current = now;
      }

      if (pressCount.current % 3 === 0) {
        clearTimers();
        currentIntervalTime.current = Math.max(
          80,
          currentIntervalTime.current * accelerationFactor
        );
        intervalRef.current = setInterval(repeat, currentIntervalTime.current);
      }
    };

    intervalRef.current = setInterval(repeat, currentIntervalTime.current);
  }, [clearTimers, accelerationFactor]);

  const handlePressIn = useCallback(() => {
    if (disabled) return;

    isPressed.current = true;

    // Always use ref for immediate press too
    onPressRef.current();

    const now = Date.now();
    if (Platform.OS !== 'web' && now - lastHapticTime.current > 100) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      lastHapticTime.current = now;
    }

    timeoutRef.current = setTimeout(() => {
      if (onLongPressRef.current) onLongPressRef.current();
      startRepeating();
    }, delayBeforeRepeat);
  }, [disabled, startRepeating, delayBeforeRepeat]);

  const handlePressOut = useCallback(() => {
    isPressed.current = false;
    clearTimers();
    pressCount.current = 0;
    currentIntervalTime.current = 100;
  }, [clearTimers]);

  return (
    <Pressable
      style={style}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      {children}
    </Pressable>
  );
}
