import { Pressable, StyleSheet, ViewStyle, Platform } from 'react-native';
import { useRef, useCallback } from 'react';
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

/**
 * Button component that supports long-press with accelerating repeat
 *
 * - Single tap: Triggers onPress once
 * - Hold down: Triggers onPress repeatedly with acceleration
 * - The longer you hold, the faster it increments
 *
 * @param onPress - Function to call on each increment
 * @param delayBeforeRepeat - Initial delay before repeating starts (default: 300ms)
 * @param accelerationFactor - How quickly to accelerate (default: 0.9 = 10% faster each cycle)
 */
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
    // Initial interval time (slower start for better UI responsiveness)
    currentIntervalTime.current = 150;
    pressCount.current = 0;

    const repeat = () => {
      // Safety check: stop immediately if button is no longer pressed
      if (!isPressed.current) {
        clearTimers();
        return;
      }

      onPress();
      pressCount.current += 1;

      // Provide haptic feedback ONLY every 20 increments with time-based debounce
      // AND only if button is still pressed
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

      // Accelerate after every 3 increments for smoother progression
      if (pressCount.current % 3 === 0) {
        clearTimers();

        // Calculate new interval time with acceleration
        currentIntervalTime.current = Math.max(
          80, // Minimum interval (increased from 50ms to reduce excessive firing)
          currentIntervalTime.current * accelerationFactor
        );

        // Set up new interval with faster speed
        intervalRef.current = setInterval(repeat, currentIntervalTime.current);
      }
    };

    // Start the interval
    intervalRef.current = setInterval(repeat, currentIntervalTime.current);
  }, [onPress, clearTimers, accelerationFactor]);

  const handlePressIn = useCallback(() => {
    if (disabled) return;

    // Mark as pressed
    isPressed.current = true;

    // Immediate first press
    onPress();

    // Light haptic on initial press with debounce
    const now = Date.now();
    if (Platform.OS !== 'web' && now - lastHapticTime.current > 100) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      lastHapticTime.current = now;
    }

    // Start repeating after delay
    timeoutRef.current = setTimeout(() => {
      if (onLongPress) onLongPress();
      startRepeating();
    }, delayBeforeRepeat);
  }, [disabled, onPress, onLongPress, startRepeating, delayBeforeRepeat]);

  const handlePressOut = useCallback(() => {
    // CRITICAL: Mark as not pressed BEFORE clearing timers
    // This prevents any lingering interval ticks from firing haptics
    isPressed.current = false;

    // Clear all timers
    clearTimers();

    // Reset counters but DON'T reset lastHapticTime
    // Keeping lastHapticTime prevents rapid re-firing if there's any race condition
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
