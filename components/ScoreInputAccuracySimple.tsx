import { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Plus, Minus } from 'lucide-react-native';
import { LongPressButton } from './LongPressButton';

type ScoreInputAccuracySimpleProps = {
  initialHits?: number;
  maxAttempts: number;
  onValueChange: (score: number, hits: number, attempts: number) => void;
};

export function ScoreInputAccuracySimple({
  initialHits = 0,
  maxAttempts,
  onValueChange,
}: ScoreInputAccuracySimpleProps) {
  const [hits, setHits] = useState(initialHits);
  const lastCallTime = useRef<number>(0);
  const MIN_CALL_INTERVAL = 150;

  const throttledOnValueChange = useCallback((score: number, hits: number, attempts: number) => {
    const now = Date.now();
    if (now - lastCallTime.current >= MIN_CALL_INTERVAL) {
      lastCallTime.current = now;
      onValueChange(score, hits, attempts);
    }
  }, [onValueChange]);

  const handleIncrement = () => {
    if (hits < maxAttempts) {
      const newHits = hits + 1;
      setHits(newHits);
      const percentage = (newHits / maxAttempts) * 100;
      throttledOnValueChange(percentage, newHits, maxAttempts);
    }
  };

  const handleDecrement = () => {
    if (hits > 0) {
      const newHits = hits - 1;
      setHits(newHits);
      const percentage = (newHits / maxAttempts) * 100;
      throttledOnValueChange(percentage, newHits, maxAttempts);
    }
  };

  const percentage = (hits / maxAttempts) * 100;
  const isMaxed = hits >= maxAttempts;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Tap + for each successful hit</Text>

      <View style={styles.counterContainer}>
        <LongPressButton
          style={[styles.button, styles.minusButton, hits === 0 && styles.buttonDisabled]}
          onPress={handleDecrement}
          disabled={hits === 0}
          delayBeforeRepeat={400}
          accelerationFactor={0.88}
        >
          <Minus size={20} color={hits === 0 ? 'rgba(255,255,255,0.2)' : '#FFFFFF'} />
        </LongPressButton>

        <View style={styles.scoreDisplay}>
          <Text style={styles.hitsValue}>{hits}</Text>
          <Text style={styles.divider}>/</Text>
          <Text style={styles.attemptsValue}>{maxAttempts}</Text>
        </View>

        <LongPressButton
          style={[styles.button, styles.plusButton, isMaxed && styles.buttonDisabled]}
          onPress={handleIncrement}
          disabled={isMaxed}
          delayBeforeRepeat={400}
          accelerationFactor={0.88}
        >
          <Plus size={20} color={isMaxed ? 'rgba(255,255,255,0.2)' : '#000000'} />
        </LongPressButton>
      </View>

      <View style={styles.resultContainer}>
        <Text style={styles.resultLabel}>Accuracy</Text>
        <Text style={[styles.resultValue, isMaxed && styles.resultMaxed]}>
          {percentage.toFixed(1)}%
        </Text>
      </View>

      {isMaxed && (
        <Text style={styles.maxedText}>Max reached!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8, paddingVertical: 4, paddingHorizontal: 12 },
  label: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  counterContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 6 },
  button: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  plusButton: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  minusButton: { backgroundColor: '#1A1A1A', borderColor: 'rgba(255,255,255,0.15)' },
  buttonDisabled: { backgroundColor: '#111111', borderColor: 'rgba(255,255,255,0.06)', opacity: 0.4 },
  scoreDisplay: { flexDirection: 'row', alignItems: 'baseline', gap: 6, backgroundColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  hitsValue: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  divider: { fontSize: 24, fontWeight: '700', color: 'rgba(255,255,255,0.3)' },
  attemptsValue: { fontSize: 24, fontWeight: '700', color: 'rgba(255,255,255,0.5)', fontVariant: ['tabular-nums'] },
  resultContainer: { alignItems: 'center', padding: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, width: '100%' },
  resultLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginBottom: 2 },
  resultValue: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  resultMaxed: { color: '#FFD700' },
  maxedText: { fontSize: 10, color: '#FFD700', fontWeight: '600', textAlign: 'center' },
});
