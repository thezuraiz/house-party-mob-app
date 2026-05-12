import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const MAX_RETRIES = 8;
const RETRY_DELAYS = [2000, 3000, 4000, 5000, 6000, 8000, 10000, 12000]; // progressive delays

export default function YocoSuccessScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const verifiedRef = useRef(false);

  const type = params.type as string;
  const userId = params.userId as string;
  const kitId = params.kitId as string;
  const tempId = params.tempId as string;

  useEffect(() => {
    // Wait 2s before first attempt — give webhook time to process
    const timer = setTimeout(() => verifyPayment(), 2000);

    const channel = supabase.channel('payment-verification');

    if (type === 'premium') {
      channel
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public',
          table: 'profiles', filter: `id=eq.${userId}`,
        }, (payload) => {
          if (payload.new.premium_unlocked === true && !verifiedRef.current) {
            logger.info('YOCO_SUCCESS', 'Premium unlocked via realtime');
            verifiedRef.current = true;
            setVerified(true);
            setVerifying(false);
            setError(null);
            queryClient.invalidateQueries({ queryKey: ['premium'] });
            queryClient.invalidateQueries({ queryKey: ['userProfile'] });
          }
        })
        .subscribe();
    } else if (type === 'kit') {
      channel
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public',
          table: 'user_house_kits', filter: `user_id=eq.${userId}`,
        }, (payload) => {
          if (payload.new.house_kit_id === kitId && !verifiedRef.current) {
            logger.info('YOCO_SUCCESS', 'Kit unlocked via realtime');
            verifiedRef.current = true;
            setVerified(true);
            setVerifying(false);
            setError(null);
            queryClient.invalidateQueries({ queryKey: ['houseKits'] });
            queryClient.invalidateQueries({ queryKey: ['userKits'] });
            queryClient.invalidateQueries({ queryKey: ['userAdminHouses'] });
          }
        })
        .subscribe();
    }

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const verifyPayment = async () => {
    // Already verified via realtime — skip
    if (verifiedRef.current) return;

    try {
      setVerifying(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
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
        }
        checkoutId = purchase?.payment_transaction_id;
      }

      // No record yet — webhook still processing, retry with delay
      if (!checkoutId) {
        logger.info('YOCO_SUCCESS', 'No checkout ID yet, will retry', { attempt: retryCountRef.current });
        scheduleRetry();
        return;
      }

      const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/yoco-verify-payment`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ checkoutId, type, kitId: kitId || null }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.verified) {
          verifiedRef.current = true;
          setVerified(true);
          setVerifying(false);
          setError(null);
          if (type === 'premium') {
            queryClient.invalidateQueries({ queryKey: ['premium'] });
            queryClient.invalidateQueries({ queryKey: ['userProfile'] });
          } else if (type === 'kit') {
            queryClient.invalidateQueries({ queryKey: ['houseKits'] });
            queryClient.invalidateQueries({ queryKey: ['userKits'] });
            queryClient.invalidateQueries({ queryKey: ['userAdminHouses'] });
          }
          logger.info('YOCO_SUCCESS', 'Payment verified', { type, checkoutId });
        } else {
          // Not verified yet — webhook may still be processing
          scheduleRetry();
        }
      } else {
        scheduleRetry();
      }
    } catch (err) {
      logger.error('YOCO_SUCCESS', err, { type, userId, kitId });
      scheduleRetry();
    }
  };

  const scheduleRetry = () => {
    if (verifiedRef.current) return;

    const currentRetry = retryCountRef.current;

    if (currentRetry >= MAX_RETRIES) {
      setVerifying(false);
      setError('Payment could not be verified automatically. Your purchase is safe — please restart the app or contact support if your kit is not available.');
      return;
    }

    const delay = RETRY_DELAYS[currentRetry] || 10000;
    retryCountRef.current = currentRetry + 1;
    setRetryCount(retryCountRef.current);

    logger.info('YOCO_SUCCESS', `Retrying in ${delay}ms`, { attempt: retryCountRef.current });
    setTimeout(() => verifyPayment(), delay);
  };

  const handleManualRetry = () => {
    retryCountRef.current = 0;
    setRetryCount(0);
    setError(null);
    verifyPayment();
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
              {retryCount === 0
                ? 'Verifying your payment...'
                : `Processing payment... (${retryCount}/${MAX_RETRIES})`}
            </Text>
            <Text style={styles.subMessage}>This may take a few seconds</Text>
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
              <Pressable style={styles.retryButton} onPress={handleManualRetry}>
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
  subMessage: {
    fontSize: 13,
    color: 'rgba(148,163,184,0.6)',
    textAlign: 'center',
    marginTop: -8,
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

