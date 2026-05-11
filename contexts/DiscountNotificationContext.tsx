import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type DiscountNotificationContextType = {
  hasNewDiscounts: boolean;
  markDiscountsAsSeen: () => void;
  checkForNewDiscounts: () => Promise<void>;
};

const DiscountNotificationContext = createContext<DiscountNotificationContextType>({
  hasNewDiscounts: false,
  markDiscountsAsSeen: () => {},
  checkForNewDiscounts: async () => {},
});

export function DiscountNotificationProvider({ children }: { children: React.ReactNode }) {
  const [hasNewDiscounts, setHasNewDiscounts] = useState(false);
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const { user } = useAuth();

  const checkForNewDiscounts = useCallback(async () => {
    if (!user) {
      console.log('[DISCOUNT_NOTIFICATION] Skipping check - no user');
      return;
    }

    // Don't show again if already dismissed this session
    if (sessionDismissed) {
      console.log('[DISCOUNT_NOTIFICATION] Already dismissed this session');
      return;
    }

    try {
      // Get current active discounts
      const { data: discounts, error } = await supabase.rpc('get_active_kit_discounts');

      if (error) {
        console.log('[DISCOUNT_NOTIFICATION] Error fetching discounts:', error);
        return;
      }

      if (!discounts || discounts.length === 0) {
        console.log('[DISCOUNT_NOTIFICATION] No active discounts');
        setHasNewDiscounts(false);
        return;
      }

      // Show notification if there are active discounts and not yet dismissed
      console.log('[DISCOUNT_NOTIFICATION] Active discounts found:', discounts.length);
      setHasNewDiscounts(true);
    } catch (error) {
      console.log('[DISCOUNT_NOTIFICATION] Exception checking discounts:', error);
    }
  }, [user, sessionDismissed]);

  const markDiscountsAsSeen = useCallback(() => {
    console.log('[DISCOUNT_NOTIFICATION] Marking discounts as dismissed for this session');

    // Mark as dismissed for this session only
    setSessionDismissed(true);
    setHasNewDiscounts(false);
  }, []);

  // Check for new discounts on mount and when user changes
  useEffect(() => {
    if (user) {
      // Reset session state when user logs in (fresh login)
      console.log('[DISCOUNT_NOTIFICATION] User logged in, resetting session state');
      setSessionDismissed(false);
      checkForNewDiscounts();
    } else {
      // Clear everything when user logs out
      setHasNewDiscounts(false);
      setSessionDismissed(false);
    }
  }, [user, checkForNewDiscounts]);

  // Poll for new discounts every 5 minutes (in case new ones are added)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      checkForNewDiscounts();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, checkForNewDiscounts]);

  return (
    <DiscountNotificationContext.Provider
      value={{
        hasNewDiscounts,
        markDiscountsAsSeen,
        checkForNewDiscounts,
      }}
    >
      {children}
    </DiscountNotificationContext.Provider>
  );
}

export const useDiscountNotification = () => {
  const context = useContext(DiscountNotificationContext);
  if (!context) {
    throw new Error('useDiscountNotification must be used within a DiscountNotificationProvider');
  }
  return context;
};
