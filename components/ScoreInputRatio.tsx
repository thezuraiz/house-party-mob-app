import { useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { semanticColors } from '@/constants/Colors';

type ScoreInputRatioProps = {
  initialNumerator?: number;
  initialDenominator?: number;
  onValueChange: (score: number, numerator: number, denominator: number) => void;
};

export function ScoreInputRatio({
  initialNumerator = 0,
  initialDenominator = 1,
  onValueChange,
}: ScoreInputRatioProps) {
  const [numerator, setNumerator] = useState(initialNumerator);
  const [denominator, setDenominator] = useState(initialDenominator);
  const [numeratorInput, setNumeratorInput] = useState(initialNumerator.toString());
  const [denominatorInput, setDenominatorInput] = useState(initialDenominator.toString());
  const lastCallTime = useRef<number>(0);
  const MIN_CALL_INTERVAL = 300;

  const throttledOnValueChange = useCallback((score: number, numerator: number, denominator: number) => {
    const now = Date.now();
    if (now - lastCallTime.current >= MIN_CALL_INTERVAL) {
      lastCallTime.current = now;
      onValueChange(score, numerator, denominator);
    }
  }, [onValueChange]);

  const calculateAndUpdate = (newNumerator: number, newDenominator: number) => {
    if (newDenominator === 0) {
      throttledOnValueChange(0, newNumerator, newDenominator);
      return;
    }

    const ratio = newNumerator / newDenominator;
    throttledOnValueChange(ratio, newNumerator, newDenominator);
  };

  const handleNumeratorChange = (text: string) => {
    setNumeratorInput(text);
    const parsed = parseFloat(text) || 0;
    if (parsed >= 0) {
      setNumerator(parsed);
      calculateAndUpdate(parsed, denominator);
    }
  };

  const handleDenominatorChange = (text: string) => {
    setDenominatorInput(text);
    const parsed = parseFloat(text) || 0;
    if (parsed >= 0) {
      setDenominator(parsed);
      calculateAndUpdate(numerator, parsed);
    }
  };

  const ratio = denominator > 0 ? numerator / denominator : 0;
  const hasError = denominator === 0;

  return (
    <View style={styles.container}>
      <View style={styles.inputsContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>A</Text>
          <TextInput
            style={styles.input}
            value={numeratorInput}
            onChangeText={handleNumeratorChange}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#64748B"
          />
        </View>

        <Text style={styles.divider}>÷</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>B</Text>
          <TextInput
            style={[styles.input, hasError && styles.inputError]}
            value={denominatorInput}
            onChangeText={handleDenominatorChange}
            keyboardType="decimal-pad"
            placeholder="1"
            placeholderTextColor="#64748B"
          />
        </View>
      </View>

      <View style={styles.resultContainer}>
        <Text style={styles.resultLabel}>Ratio</Text>
        <Text style={[styles.resultValue, hasError && styles.resultError]}>
          {ratio.toFixed(2)}
        </Text>
        <Text style={styles.resultBreakdown}>
          {numerator.toFixed(1)} ÷ {denominator.toFixed(1)}
        </Text>
      </View>

      <Text style={styles.exampleHint}>
        Examples: wins/games, goals/attempts
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  inputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 340,
  },
  inputGroup: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  inputLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', width: '100%', paddingVertical: 12, paddingHorizontal: 8, backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  inputError: { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)' },
  divider: { fontSize: 24, fontWeight: '700', color: 'rgba(255,255,255,0.3)', marginTop: 16 },
  resultContainer: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, minWidth: 160, marginTop: 8 },
  resultLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  resultValue: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  resultError: { color: '#EF4444' },
  resultBreakdown: { fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: '600', marginTop: 4 },
  exampleHint: { fontSize: 11, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', textAlign: 'center', marginTop: 4 },
});
