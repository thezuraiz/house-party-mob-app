import { useEffect, useRef, useCallback } from 'react';
import { View, findNodeHandle, Platform } from 'react-native';
import { useCoachMarkContext } from '@/contexts/CoachMarkContext';
import { TargetElement } from '@/types/coachMark';

export function useCoachMarkTarget(targetId: string) {
  const { registerTarget, unregisterTarget } = useCoachMarkContext();
  const viewRef = useRef<View>(null);
  const measureTimeoutRef = useRef<NodeJS.Timeout>();

  const measureElement = useCallback(() => {
    if (!viewRef.current) return;

    // Skip coach mark measurement on web platform
    if (Platform.OS === 'web') {
      return;
    }

    const handle = findNodeHandle(viewRef.current);
    if (!handle) return;

    viewRef.current.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        const targetElement: TargetElement = {
          targetId,
          x,
          y,
          width,
          height,
          pageX: x,
          pageY: y,
        };
        registerTarget(targetId, targetElement);
      }
    });
  }, [targetId, registerTarget]);

  const onLayout = useCallback(() => {
    if (measureTimeoutRef.current) {
      clearTimeout(measureTimeoutRef.current);
    }

    measureTimeoutRef.current = setTimeout(() => {
      measureElement();
    }, 100);
  }, [measureElement]);

  useEffect(() => {
    measureElement();

    return () => {
      if (measureTimeoutRef.current) {
        clearTimeout(measureTimeoutRef.current);
      }
      unregisterTarget(targetId);
    };
  }, [targetId, unregisterTarget, measureElement]);

  return {
    ref: viewRef,
    onLayout,
  };
}
