import { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { semanticColors, Colors } from '@/constants/Colors';

type ScoreInputMeasurementProps = {
  initialValue: number;
  unit: string;
  allowDecimals: boolean;
  quickPresets?: number[];
  onValueChange: (value: number) => void;
};

export function ScoreInputMeasurement({
  initialValue,
  unit,
  allowDecimals,
  quickPresets = [],
  onValueChange,
}: ScoreInputMeasurementProps) {
  const [value, setValue] = useState(initialValue);
  const [inputValue, setInputValue] = useState(value.toString());
  const [isEditing, setIsEditing] = useState(false);

  const handlePresetAdd = (preset: number) => {
    const newValue = value + preset;
    setValue(newValue);
    setInputValue(newValue.toString());
    onValueChange(newValue);
  };

  const handleDirectInput = () => {
    const parsed = parseFloat(inputValue) || 0;
    setValue(parsed);
    onValueChange(parsed);
    setIsEditing(false);
  };

  const handleTextChange = (text: string) => {
    setInputValue(text);
    // Trigger onValueChange immediately as user types
    const parsed = parseFloat(text) || 0;
    setValue(parsed);
    onValueChange(parsed);
  };

  const handleClear = () => {
    setValue(0);
    setInputValue('0');
    onValueChange(0);
  };

  const formatValue = (val: number) => {
    return allowDecimals ? val.toFixed(2) : Math.round(val).toString();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.displayContainer}>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={inputValue}
            onChangeText={handleTextChange}
            keyboardType={allowDecimals ? 'decimal-pad' : 'number-pad'}
            onBlur={handleDirectInput}
            onSubmitEditing={handleDirectInput}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
          />
        ) : (
          <Pressable onPress={() => setIsEditing(true)} style={styles.valuePressable}>
            <Text style={styles.valueText}>{formatValue(value)}</Text>
          </Pressable>
        )}
        <Text style={styles.unitText}>{unit}</Text>
      </View>

      {quickPresets.length > 0 && (
        <View style={styles.presetsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetsScroll}
          >
            {quickPresets.map((preset) => (
              <Pressable
                key={preset}
                style={styles.presetButton}
                onPress={() => handlePresetAdd(preset)}
              >
                <Text style={styles.presetText}>+{preset}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <Pressable style={styles.clearButton} onPress={handleClear}>
        <Text style={styles.clearText}>Clear</Text>
      </Pressable>

      <Text style={styles.hint}>Tap number to edit</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8, paddingVertical: 4, paddingHorizontal: 12 },
  displayContainer: { alignItems: 'center', minHeight: 60, justifyContent: 'center' },
  valuePressable: { padding: 6, minWidth: 120, alignItems: 'center' },
  valueText: { fontSize: 40, fontWeight: '800', color: '#FFFFFF', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  unitText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  input: { fontSize: 40, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', minWidth: 120, padding: 6, backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  presetsContainer: { width: '100%' },
  presetsScroll: { gap: 8, paddingHorizontal: 16 },
  presetButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#1A1A1A', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  presetText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  clearButton: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#1A1A1A', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  clearText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  hint: { fontSize: 10, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' },
});
