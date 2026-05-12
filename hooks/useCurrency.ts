import { useState, useEffect } from 'react';
import { getUSDToZARRate } from '@/lib/currencyConverter';

export function useCurrency() {
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRate = async () => {
      setLoading(true);
      try {
        const rate = await getUSDToZARRate();
        setExchangeRate(rate);
      } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, []);

  // ZAR cents → ZAR display
  const formatPriceCents = (zarCents: number): string => {
    const zarAmount = zarCents / 100;
    return `R${zarAmount.toFixed(2)}`;
  };

  // NEW: ZAR cents → USD
  const convertZARToUSD = (zarCents: number): number => {
    if (!exchangeRate) return 0; // or fallback logic if needed

    const zarAmount = zarCents / 100;
    return zarAmount / exchangeRate;
  };

  // Optional formatted USD string
  const formatUSDFromZAR = (zarCents: number): string => {
    const usd = convertZARToUSD(zarCents);
    return `$${usd.toFixed(2)}`;
  };

  return {
    exchangeRate,
    loading,
    formatPriceCents,
    convertZARToUSD,
    formatUSDFromZAR,
  };
}