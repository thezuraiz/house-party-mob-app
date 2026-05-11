/**
 * ScreenWrapper — light theme base + fade-in animation for every screen
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T } from '@/constants/Theme';

interface Props {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  style?: object;
}

export default function ScreenWrapper({ children, edges = ['top'], style }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.root, style]}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />
      <SafeAreaView style={styles.safe} edges={edges}>
        <Animated.View style={[styles.content, { opacity, transform: [{ translateY }] }]}>
          {children}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  safe: { flex: 1 },
  content: { flex: 1 },
});
