import AsyncStorage from '@react-native-async-storage/async-storage';
import { logInfo, logError } from './errorReporting';

const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD';
const CACHE_KEY = 'usd_zar_exchange_rate';
const CACHE_TIMESTAMP_KEY = 'usd_zar_exchange_rate_timestamp';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

type ExchangeRateCache = {
  rate: number;
  timestamp: number;
};

let inMemoryCache: ExchangeRateCache | null = null;

export async function getUSDToZARRate(): Promise<number> {
  try {
    if (inMemoryCache && Date.now() - inMemoryCache.timestamp < CACHE_DURATION) {
      return inMemoryCache.rate;
    }

    const cachedRateStr = await AsyncStorage.getItem(CACHE_KEY);
    const cachedTimestampStr = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);

    if (cachedRateStr && cachedTimestampStr) {
      const cachedTimestamp = parseInt(cachedTimestampStr, 10);
      const now = Date.now();

      if (now - cachedTimestamp < CACHE_DURATION) {
        const cachedRate = parseFloat(cachedRateStr);
        inMemoryCache = { rate: cachedRate, timestamp: cachedTimestamp };
        logInfo('CURRENCY', 'Using cached exchange rate', { rate: cachedRate });
        return cachedRate;
      }
    }

    logInfo('CURRENCY', 'Fetching fresh exchange rate from API');
    const response = await fetch(EXCHANGE_RATE_API);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const zarRate = data.rates?.ZAR;

    if (!zarRate || typeof zarRate !== 'number') {
      throw new Error('Invalid ZAR rate in API response');
    }

    const timestamp = Date.now();
    inMemoryCache = { rate: zarRate, timestamp };

    await AsyncStorage.setItem(CACHE_KEY, zarRate.toString());
    await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp.toString());

    logInfo('CURRENCY', 'Exchange rate updated', { rate: zarRate });
    return zarRate;
  } catch (error) {
    logError('CURRENCY', error, { fallback: true });

    if (inMemoryCache) {
      logInfo('CURRENCY', 'Using stale in-memory cache due to error');
      return inMemoryCache.rate;
    }

    const cachedRateStr = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedRateStr) {
      const cachedRate = parseFloat(cachedRateStr);
      logInfo('CURRENCY', 'Using stale cached rate due to error');
      return cachedRate;
    }

    logInfo('CURRENCY', 'Using fallback exchange rate: 18.5');
    return 18.5; // Fallback rate
  }
}

export function convertUSDToZAR(usdAmount: number, exchangeRate: number): number {
  return Math.round(usdAmount * exchangeRate * 100) / 100;
}

export function convertZARToUSD(zarAmount: number, exchangeRate: number): number {
  return Math.round((zarAmount / exchangeRate) * 100) / 100;
}

export function formatUSDCentsAsZAR(usdCents: number, exchangeRate: number): string {
  const usdAmount = usdCents / 100;
  const zarAmount = convertUSDToZAR(usdAmount, exchangeRate);
  return `R${zarAmount.toFixed(2)} (~$${usdAmount.toFixed(2)} USD)`;
}
