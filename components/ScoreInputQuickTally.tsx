import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LongPressButton } from './LongPressButton';

type ScoreInputQuickTallyProps = {
  initialValue: number;
  unit: string;
  step: number;
  allowDecimals: boolean;
  onValueChange: (value: number) => void;
};

export function ScoreInputQuickTally({
  initialValue,
  unit,
  step,
  allowDecimals,
  onValueChange,
}: ScoreInputQuickTallyProps) {
  const [localValue, setLocalValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(initialValue.toString());

  // Always-current ref — avoids stale closure in rapid taps
  const localValueRef = useRef(initialValue);
  const onValueChangeRef = useRef(onValueChange);

  useEffect(() => { onValueChangeRef.current = onValueChange; }, [onValueChange]);

  // Keep local value in sync with parent when it changes externally
  useEffect(() => {
    setLocalValue(initialValue);
    localValueRef.current = initialValue;
    if (!isEditing) {
      setInputValue(initialValue.toString());
    }
  }, [initialValue]);

  const handleIncrement = useCallback(() => {
    const newValue = localValueRef.current + step;
    localValueRef.current = newValue;
    setLocalValue(newValue);
    onValueChangeRef.current(newValue);
  }, [step]);

  const handleDecrement = useCallback(() => {
    const newValue = Math.max(0, localValueRef.current - step);
    localValueRef.current = newValue;
    setLocalValue(newValue);
    onValueChangeRef.current(newValue);
  }, [step]);

  const handleDirectInput = () => {
    const parsed = parseFloat(inputValue) || 0;
    const clamped = Math.max(0, parsed);
    localValueRef.current = clamped;
    setLocalValue(clamped);
    onValueChangeRef.current(clamped);
    setIsEditing(false);
  };

  const formatValue = (val: number) => {
    return allowDecimals ? val.toFixed(2) : Math.round(val).toString();
  };

  return (
    <View style={styles.container}>
      <LongPressButton
        style={styles.button}
        onPress={handleDecrement}
        delayBeforeRepeat={400}
        accelerationFactor={0.88}
      >
        <Ionicons name="remove" size={26} color="#000000" />
      </LongPressButton>

      <View style={styles.valueContainer}>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={inputValue}
            onChangeText={setInputValue}
            keyboardType={allowDecimals ? 'decimal-pad' : 'number-pad'}
            onBlur={handleDirectInput}
            autoFocus
            selectTextOnFocus
          />
        ) : (
          <Pressable onLongPress={() => {
            setInputValue(localValue.toString());
            setIsEditing(true);
          }}>
            <Text style={styles.valueText}>{formatValue(localValue)}</Text>
          </Pressable>
        )}
        <Text style={styles.unitText}>{unit}</Text>
      </View>

      <LongPressButton
        style={styles.button}
        onPress={handleIncrement}
        delayBeforeRepeat={400}
        accelerationFactor={0.88}
      >
        <Ionicons name="add" size={26} color="#000000" />
      </LongPressButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  button: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueContainer: {
    alignItems: 'center',
    minWidth: 100,
  },
  valueText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  input: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    minWidth: 100,
    padding: 6,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
});
