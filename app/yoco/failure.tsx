import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import { logger } from '@/lib/logger';

export default function YocoFailureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const type = params.type as string;

  useEffect(() => {
    logger.error('YOCO_FAILURE', 'Payment failed', { type });
  }, [type]);

  const handleContinue = () => {
    if (type === 'premium') {
      router.replace('/(tabs)/profile');
    } else {
      router.replace('/(tabs)/shop');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.icon}>
          <AlertCircle size={64} color="#FFFFFF" strokeWidth={3} />
        </View>
        <Text style={styles.title}>Payment Failed</Text>
        <Text style={styles.message}>
          Your payment could not be processed. Please try again or contact support if the problem persists.
        </Text>
        <Pressable style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Go Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    gap: 16,
    maxWidth: 400,
  },
  icon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

