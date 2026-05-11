import { useState, useEffect } from 'react';
import { getUSDToZARRate, formatUSDCentsAsZAR, convertUSDToZAR } from '@/lib/currencyConverter';

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

  const formatPriceCents = (usdCents: number): string => {
    if (!exchangeRate) {
      const usdAmount = usdCents / 100;
      const zarAmount = usdAmount * 18.5;
      return `R${zarAmount.toFixed(2)} (~$${usdAmount.toFixed(2)} USD)`;
    }
    return formatUSDCentsAsZAR(usdCents, exchangeRate);
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
