import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[SUPABASE] Missing environment variables. ' +
      'Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in your .env file and on expo.dev.'
  );
}

const originalConsoleError = console.log;
// console.warn = (...args: any[]) => {
//   const message = args[0];

//   if (typeof message === 'string') {
//     if (
//       message.includes('session_not_found') ||
//       message.includes('Session from session_id claim in JWT does not exist') ||
//       message.includes('Supabase request failed') ||
//       message.includes('Invalid Refresh Token') ||
//       message.includes('Refresh Token Not Found')
//     ) {
//       return;
//     }
//   }

//   if (typeof message === 'object' && message !== null) {
//     const msgStr = JSON.stringify(message);
//     if (
//       message.code === 'session_not_found' ||
//       message.message?.includes('session_not_found') ||
//       message.message?.includes('Session from session_id claim in JWT does not exist') ||
//       message.message?.includes('Invalid Refresh Token') ||
//       message.message?.includes('Refresh Token Not Found') ||
//       msgStr.includes('session_not_found') ||
//       msgStr.includes('Invalid Refresh Token') ||
//       msgStr.includes('Refresh Token Not Found') ||
//       (message.url && message.url.includes('/auth/v1/logout') && message.status === 403)
//     ) {
//       return;
//     }
//   }

//   originalConsoleError.apply(console, args);
// };

// Use AsyncStorage for more stable session management
// SecureStore can cause phantom sessions and state corruption on some devices

// Only override window.fetch on web platform
if (typeof Platform !== 'undefined' && Platform.OS === 'web' && typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = async (input, init?) => {
    const url = typeof input === 'string' ? input : input.url;

    if (url.includes('/auth/v1/logout')) {
      try {
        const response = await originalFetch(input, init);

        if (!response.ok && response.status === 403) {
          const clonedResponse = response.clone();
          try {
            const body = await clonedResponse.text();
            if (body.includes('session_not_found')) {
              return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: response.headers,
              });
            }
          } catch (e) {
            // Ignore parse errors
          }
        }

        return response;
      } catch (error) {
        if (url.includes('/auth/v1/logout')) {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        throw error;
      }
    }

    return originalFetch(input, init);
  };
}

const customFetch: typeof fetch = async (input, init?) => {
  try {
    const response = await fetch(input, init);

    if (
      !response.ok &&
      response.status === 403 &&
      typeof input === 'string' &&
      input.includes('/auth/v1/logout')
    ) {
      const clonedResponse = response.clone();
      try {
        const body = await clonedResponse.text();
        if (body.includes('session_not_found')) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: response.headers,
          });
        }
      } catch (e) {
      }
    }

    return response;
  } catch (error) {
    throw error;
  }
};

export const supabase = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-react-native',
      },
      fetch: customFetch,
    },
  }
);

// Export URL and key for edge function calls
export const supabaseConfig = {
  supabaseUrl: supabaseUrl ?? '',
  supabaseKey: supabaseAnonKey ?? '',
};
