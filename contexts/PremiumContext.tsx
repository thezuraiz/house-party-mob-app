import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

type PremiumContextType = {
  isPremium: boolean;
  loading: boolean;
  checkPremiumStatus: () => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
};

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const checkPremiumStatus = useCallback(async () => {
    if (!user) {
      setIsPremium(false);
      setLoading(false);
      return;
    }

    try {
      // Check if user has premium through referrals
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('premium_unlocked')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.log('Error checking referral premium status:', profileError);
      } else if (profileData?.premium_unlocked) {
        console.log('[PREMIUM] User has premium via referrals');
        setIsPremium(true);
        setLoading(false);
        return;
      }

      // Check if user has premium through purchase
      const { data, error } = await supabase
        .from('user_purchases')
        .select('id, payment_status')
        .eq('user_id', user.id)
        .eq('payment_status', 'completed')
        .eq('product_type', 'premium')
        .maybeSingle();

      if (error) {
        console.log('Error checking premium status:', error);
        setIsPremium(false);
      } else {
        setIsPremium(!!data);
      }
    } catch (error) {
      console.log('Error checking premium status:', error);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshPremiumStatus = useCallback(async () => {
    setLoading(true);

    const maxRetries = 5;
    const retryDelay = 300;

    for (let i = 0; i < maxRetries; i++) {
      if (!user) {
        setLoading(false);
        return;
      }

      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      try {
        // Check if user has premium through referrals
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('premium_unlocked')
          .eq('id', user.id)
          .maybeSingle();

        if (!profileError && profileData?.premium_unlocked) {
          console.log('[PREMIUM] Premium status found via referrals on attempt', i + 1);
          setIsPremium(true);
          setLoading(false);
          return;
        }

        // Check if user has premium through purchase
        const { data, error } = await supabase
          .from('user_purchases')
          .select('id, payment_status')
          .eq('user_id', user.id)
          .eq('payment_status', 'completed')
          .eq('product_type', 'premium')
          .maybeSingle();

        if (!error && data) {
          console.log('[PREMIUM] Premium status found via purchase on attempt', i + 1);
          setIsPremium(true);
          setLoading(false);
          return;
        }

        if (i < maxRetries - 1) {
          console.log('[PREMIUM] Premium not found yet, retrying...');
        }
      } catch (error) {
        console.log('[PREMIUM] Error checking premium status:', error);
        if (i === maxRetries - 1) {
          setLoading(false);
          return;
        }
      }
    }

    setLoading(false);
    await checkPremiumStatus();
  }, [user, checkPremiumStatus]);

  useEffect(() => {
    checkPremiumStatus();
  }, [checkPremiumStatus]);

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        loading,
        checkPremiumStatus,
        refreshPremiumStatus,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
}
