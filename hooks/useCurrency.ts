import { useState, useEffect } from 'react';
import { getUSDToZARRate, convertUSDToZAR } from '@/lib/currencyConverter';

export function useCurrency() {
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Exchange rate no longer needed — prices are stored as ZAR cents directly
    setLoading(false);
  }, []);

  // price_cents in DB = ZAR cents directly (e.g. 2999 = R29.99)
  const formatPriceCents = (zarCents: number): string => {
    const zarAmount = zarCents / 100;
    return `R${zarAmount.toFixed(2)}`;
  };

  const convertUSDToZARAmount = (usdAmount: number): number => {
    if (!exchangeRate) return usdAmount * 18.5;
    return convertUSDToZAR(usdAmount, exchangeRate);
  };

  return {
    exchangeRate,
    loading,
    formatPriceCents,
    convertUSDToZARAmount,
  };
}
