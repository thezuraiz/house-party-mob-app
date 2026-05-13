import { useState, useEffect } from 'react';
import { getUSDToZARRate, convertUSDToZAR } from '@/lib/currencyConverter';

export function useCurrency() {
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchRate = async () => {
      try {
        const rate = await getUSDToZARRate();
        if (mounted) {
          setExchangeRate(rate);
          setLoading(false);
        }
      } catch (error) {
        console.log('Failed to fetch exchange rate:', error);
        if (mounted) {
          setExchangeRate(18.5); // Fallback
          setLoading(false);
        }
      }
    };

    fetchRate();
    const interval = setInterval(fetchRate, 60 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // price_cents in DB = USD dollar amount (e.g. 4.25 = $4.25)
  // Display as ZAR using live exchange rate
  const formatPriceCents = (usdAmount: number): string => {
    const rate = exchangeRate || 18.5;
    const zarAmount = usdAmount * rate;
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
