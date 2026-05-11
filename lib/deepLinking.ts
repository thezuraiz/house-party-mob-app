import * as Linking from 'expo-linking';
import { router } from 'expo-router';

const APP_SCHEME = 'houseparty';
const WEB_URL = 'https://houseparty.app';

export type DeepLinkType =
  | { type: 'house_invite'; houseId: string; inviteCode?: string }
  | { type: 'house_detail'; houseId: string }
  | { type: 'friend_profile'; userId: string }
  | { type: 'game_session'; sessionId: string }
  | { type: 'password_reset'; access_token?: string; refresh_token?: string; recovery_type?: string; token_hash?: string }
  | { type: 'email_confirmation'; access_token?: string; refresh_token?: string }
  | { type: 'email_confirmation_pkce'; token_hash: string; confirmation_type: string }
  | { type: 'referral_signup'; referralCode: string };

class DeepLinkingService {
  generateHouseInviteLink(houseId: string, inviteCode?: string): string {
    const params = new URLSearchParams({ houseId });
    if (inviteCode) {
      params.append('code', inviteCode);
    }
    return `${WEB_URL}/invite?${params.toString()}`;
  }

  generateHouseDetailLink(houseId: string): string {
    return `${WEB_URL}/house/${houseId}`;
  }

  generateFriendProfileLink(userId: string): string {
    return `${WEB_URL}/profile/${userId}`;
  }

  generateAppLink(path: string): string {
    return `${APP_SCHEME}://${path}`;
  }

  parseDeepLink(url: string): DeepLinkType | null {
    try {
      const { hostname, path, queryParams } = Linking.parse(url);

      if (hostname === 'invite' || path === '/invite') {
        const houseId = queryParams?.houseId as string;
        const inviteCode = queryParams?.code as string;
        if (houseId) {
          return { type: 'house_invite', houseId, inviteCode };
        }
      }

      if (path?.startsWith('/house/')) {
        const houseId = path.replace('/house/', '');
        if (houseId) {
          return { type: 'house_detail', houseId };
        }
      }

      if (path?.startsWith('/profile/')) {
        const userId = path.replace('/profile/', '');
        if (userId) {
          return { type: 'friend_profile', userId };
        }
      }

      if (path?.startsWith('/session/')) {
        const sessionId = path.replace('/session/', '');
        if (sessionId) {
          return { type: 'game_session', sessionId };
        }
      }

      // Password reset - support both HTTPS and custom scheme
      if (
        hostname === 'reset-password' ||
        path === '/reset-password' ||
        path === '/auth/reset' ||
        path?.startsWith('/auth/reset')
      ) {
        console.log('[DeepLink] Password reset detected, parsing params');
        console.log('[DeepLink] Query params:', queryParams);

        // Check for PKCE code (this is what Supabase sends in the email)
        if (queryParams?.code) {
          console.log('[DeepLink] ✅ PKCE code found:', queryParams.code);
          return {
            type: 'password_reset',
            token_hash: queryParams.code as string,
            recovery_type: 'recovery',
          };
        }

        // Check for token_hash (alternative PKCE flow)
        if (queryParams?.token_hash) {
          console.log('[DeepLink] PKCE flow detected with token_hash');
          return {
            type: 'password_reset',
            token_hash: queryParams.token_hash as string,
            recovery_type: (queryParams.type as string) || 'recovery',
          };
        }

        // Fallback: Supabase sends tokens in hash fragment (#access_token=...&refresh_token=...)
        // Linking.parse() doesn't extract hash, so we need to parse it manually
        const hashIndex = url.indexOf('#');
        const hashParams: Record<string, string> = {};

        if (hashIndex !== -1) {
          const hash = url.substring(hashIndex + 1);
          console.log('[DeepLink] Hash fragment:', hash);
          const params = new URLSearchParams(hash);
          params.forEach((value, key) => {
            hashParams[key] = value;
          });
          console.log('[DeepLink] Parsed hash params:', hashParams);
        }

        return {
          type: 'password_reset',
          access_token: hashParams.access_token || (queryParams?.access_token as string),
          refresh_token: hashParams.refresh_token || (queryParams?.refresh_token as string),
          recovery_type: hashParams.type || (queryParams?.type as string),
          token_hash: hashParams.token_hash || (queryParams?.token_hash as string),
        };
      }

      // Email confirmation - support both PKCE (token_hash) and implicit flow (access_token)
      if (
        hostname === 'confirm-email' ||
        path === '/confirm-email' ||
        path === '/auth/confirm' ||
        path?.startsWith('/auth/confirm')
      ) {
        console.log('[DeepLink] Email confirmation detected');
        console.log('[DeepLink] Query params:', queryParams);

        // Check for PKCE flow (token_hash in query params)
        if (queryParams?.token_hash) {
          console.log('[DeepLink] ✅ PKCE flow detected with token_hash');
          return {
            type: 'email_confirmation_pkce',
            token_hash: queryParams.token_hash as string,
            confirmation_type: (queryParams.type as string) || 'email',
          };
        }

        // Fallback: Check for implicit flow (access_token in hash fragment)
        const hashIndex = url.indexOf('#');
        const hashParams: Record<string, string> = {};

        if (hashIndex !== -1) {
          const hash = url.substring(hashIndex + 1);
          console.log('[DeepLink] Hash fragment:', hash);
          const params = new URLSearchParams(hash);
          params.forEach((value, key) => {
            hashParams[key] = value;
          });
          console.log('[DeepLink] Parsed hash params:', hashParams);
        }

        return {
          type: 'email_confirmation',
          access_token: hashParams.access_token || (queryParams?.access_token as string),
          refresh_token: hashParams.refresh_token || (queryParams?.refresh_token as string),
        };
      }

      // Referral signup link
      if (
        hostname === 'signup' ||
        path === '/signup' ||
        path?.startsWith('/signup')
      ) {
        const referralCode = queryParams?.ref as string;
        if (referralCode) {
          console.log('[DeepLink] Referral signup detected with code:', referralCode);
          return {
            type: 'referral_signup',
            referralCode
          };
        }
      }

      return null;
    } catch (error) {
      console.log('[DeepLink] Error parsing URL:', error);
      return null;
    }
  }

  handleDeepLink(deepLink: DeepLinkType) {
    switch (deepLink.type) {
      case 'house_invite':
        if (deepLink.inviteCode) {
          router.push(`/join-house?code=${deepLink.inviteCode}`);
        } else {
          router.push(`/house/${deepLink.houseId}`);
        }
        break;

      case 'house_detail':
        router.push(`/house/${deepLink.houseId}`);
        break;

      case 'friend_profile':
        router.push(`/player-stats/${deepLink.userId}`);
        break;

      case 'game_session':
        router.push(`/game-session/${deepLink.sessionId}`);
        break;

      case 'password_reset':

        // Encode tokens in URL query string (Expo Router params object doesn't work reliably)
        const resetParams = new URLSearchParams();
        if (deepLink.token_hash) resetParams.append('token_hash', deepLink.token_hash);
        if (deepLink.access_token) resetParams.append('access_token', deepLink.access_token);
        if (deepLink.refresh_token) resetParams.append('refresh_token', deepLink.refresh_token);
        if (deepLink.recovery_type) resetParams.append('type', deepLink.recovery_type);

        console.log('[DeepLink] Navigating to reset-password with params:', resetParams.toString().substring(0, 100) + '...');
        router.push(`/(auth)/reset-password?${resetParams.toString()}` as any);
        break;

      case 'email_confirmation':
        // Encode tokens in URL query string
        const confirmParams = new URLSearchParams();
        if (deepLink.access_token) confirmParams.append('access_token', deepLink.access_token);
        if (deepLink.refresh_token) confirmParams.append('refresh_token', deepLink.refresh_token);

        console.log('[DeepLink] Navigating to confirm-email with params');
        router.push(`/(auth)/confirm-email?${confirmParams.toString()}` as any);
        break;

      case 'email_confirmation_pkce':
        // PKCE flow: pass token_hash to confirm-email screen
        const pkceParams = new URLSearchParams();
        pkceParams.append('token_hash', deepLink.token_hash);
        pkceParams.append('type', deepLink.confirmation_type);

        console.log('[DeepLink] ✅ Navigating to confirm-email with PKCE token_hash');
        router.push(`/(auth)/confirm-email?${pkceParams.toString()}` as any);
        break;

      case 'referral_signup':
        console.log('[DeepLink] Navigating to signup with referral code:', deepLink.referralCode);
        router.push(`/(auth)/signup?ref=${deepLink.referralCode}` as any);
        break;
    }
  }

  setupDeepLinkListener(callback: (deepLink: DeepLinkType) => void) {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('[DeepLink] Received URL:', url);
      const deepLink = this.parseDeepLink(url);
      if (deepLink) {
        callback(deepLink);
      }
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[DeepLink] Initial URL:', url);
        const deepLink = this.parseDeepLink(url);
        if (deepLink) {
          callback(deepLink);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }
}

export const deepLinking = new DeepLinkingService();
