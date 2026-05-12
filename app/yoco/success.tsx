import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export default function YocoSuccessScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const type = params.type as string;
  const userId = params.userId as string;
  const kitId = params.kitId as string;
  const tempId = params.tempId as string;

  useEffect(() => {
    verifyPayment();

    const channel = supabase.channel('payment-verification');

    if (type === 'premium') {
      channel
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            if (payload.new.premium_unlocked === true) {
              logger.info('YOCO_SUCCESS', 'Premium unlocked via realtime');
              setVerified(true);
              setVerifying(false);
              queryClient.invalidateQueries({ queryKey: ['premium'] });
              queryClient.invalidateQueries({ queryKey: ['userProfile'] });
            }
          }
        )
        .subscribe();
    } else if (type === 'kit') {
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_house_kits',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (payload.new.house_kit_id === kitId) {
              logger.info('YOCO_SUCCESS', 'Kit unlocked via realtime');
              setVerified(true);
              setVerifying(false);
              queryClient.invalidateQueries({ queryKey: ['houseKits'] });
              queryClient.invalidateQueries({ queryKey: ['userKits'] });
            }
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const verifyPayment = async (retry = false) => {
    try {
      setVerifying(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        logger.error('YOCO_SUCCESS', 'No session found');
        setError('Session expired. Please log in again.');
        setVerifying(false);
        return;
      }

      let checkoutId = null;

      if (type === 'premium') {
        let { data: purchase } = await supabase
          .from('user_purchases')
          .select('payment_transaction_id')
          .eq('user_id', userId)
          .eq('product_type', 'premium')
          .contains('metadata', { temp_checkout_id: tempId })
          .maybeSingle();

        if (!purchase) {
          const { data: fallbackPurchase } = await supabase
            .from('user_purchases')
            .select('payment_transaction_id')
            .eq('user_id', userId)
            .eq('product_type', 'premium')
            .eq('payment_status', 'pending')
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle();

          purchase = fallbackPurchase;
          logger.info('YOCO_SUCCESS', 'Using fallback lookup for premium');
        }

        checkoutId = purchase?.payment_transaction_id;
      } else if (type === 'kit' && kitId) {
        let { data: purchase } = await supabase
          .from('user_kit_purchases')
          .select('payment_transaction_id')
          .eq('user_id', userId)
          .eq('house_kit_id', kitId)
          .contains('metadata', { temp_checkout_id: tempId })
          .maybeSingle();

        if (!purchase) {
          const { data: fallbackPurchase } = await supabase
            .from('user_kit_purchases')
            .select('payment_transaction_id')
            .eq('user_id', userId)
            .eq('house_kit_id', kitId)
            .eq('payment_status', 'pending')
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle();

          purchase = fallbackPurchase;
          logger.info('YOCO_SUCCESS', 'Using fallback lookup for kit');
        }

        checkoutId = purchase?.payment_transaction_id;
      }

      if (!checkoutId) {
        logger.error('YOCO_SUCCESS', 'No checkout ID found', { type, userId, kitId, tempId });
        setError('Payment record not found. Please contact support.');
        setVerifying(false);
        return;
      }

      const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/yoco-verify-payment`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkoutId,
          type,
          kitId: kitId || null,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.verified) {
          setVerified(true);

          if (type === 'premium') {
            queryClient.invalidateQueries({ queryKey: ['premium'] });
            queryClient.invalidateQueries({ queryKey: ['userProfile'] });
          } else if (type === 'kit') {
            queryClient.invalidateQueries({ queryKey: ['houseKits'] });
            queryClient.invalidateQueries({ queryKey: ['userKits'] });
          }

          logger.info('YOCO_SUCCESS', 'Payment verified and completed', { type, userId, kitId, checkoutId, tempId });
        } else {
          setError('Payment could not be verified. Please try again.');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        logger.error('YOCO_SUCCESS', 'Verification failed', { status: response.status, error: errorData });

        if (retryCount < 5) {
          logger.info('YOCO_SUCCESS', 'Auto-retrying verification', { retryCount: retryCount + 1 });
          setRetryCount(retryCount + 1);
          await new Promise(resolve => setTimeout(resolve, 500));
          return verifyPayment(true);
        } else {
          setError('Verification failed after multiple attempts. Your purchase is safe and will be processed shortly.');
        }
      }
    } catch (error) {
      logger.error('YOCO_SUCCESS', error, { type, userId, kitId, tempId });

      if (retryCount < 5) {
        setRetryCount(retryCount + 1);
        await new Promise(resolve => setTimeout(resolve, 500));
        return verifyPayment(true);
      } else {
        setError('An error occurred while verifying your payment. Your purchase is safe and will be processed shortly.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    verifyPayment(true);
  };

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
          <CheckCircle size={64} color="#FFFFFF" strokeWidth={3} />
        </View>
        <Text style={styles.title}>Payment Successful!</Text>

        {verifying ? (
          <>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.message}>
              Verifying your payment{retryCount > 0 ? ` (attempt ${retryCount + 1})` : ''}...
            </Text>
          </>
        ) : verified ? (
          <>
            <Text style={styles.message}>
              {type === 'premium'
                ? 'Your premium features have been unlocked!'
                : 'Your house kit has been unlocked!'}
            </Text>
            <Pressable style={styles.button} onPress={handleContinue}>
              <Text style={styles.buttonText}>Continue</Text>
            </Pressable>
          </>
        ) : error ? (
          <>
            <Text style={styles.errorMessage}>{error}</Text>
            <View style={styles.buttonRow}>
              <Pressable style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.buttonText}>Retry Verification</Text>
              </Pressable>
              <Pressable style={styles.continueButton} onPress={handleContinue}>
                <Text style={styles.buttonText}>Continue Anyway</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.message}>
              Your payment was successful. Your purchase will be available shortly.
            </Text>
            <Pressable style={styles.button} onPress={handleContinue}>
              <Text style={styles.buttonText}>Continue</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
    backgroundColor: '#10B981',
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
  errorMessage: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  button: {
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  retryButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    flex: 1,
  },
  continueButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

