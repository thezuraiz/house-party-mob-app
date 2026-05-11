import { supabase } from './supabase';

type EventName =
  | 'app_opened'
  | 'house_created'
  | 'house_joined'
  | 'game_created'
  | 'game_session_started'
  | 'game_session_completed'
  | 'friend_request_sent'
  | 'friend_request_accepted'
  | 'badge_unlocked'
  | 'banner_unlocked'
  | 'kit_purchased'
  | 'kit_equipped'
  | 'premium_purchased'
  | 'profile_updated'
  | 'qr_code_scanned'
  | 'share_link_created'
  | 'onboarding_completed'
  | 'onboarding_skipped';

type EventProperties = Record<string, any>;

class Analytics {
  private userId: string | null = null;
  private queue: Array<{ event: EventName; properties: EventProperties }> = [];
  private isProcessing = false;
  private profileChecked = false;

  setUserId(userId: string | null) {
    this.userId = userId;
    this.profileChecked = false;
    if (userId && this.queue.length > 0) {
      this.processQueue();
    }
  }

  private async ensureProfileExists(): Promise<boolean> {
    if (!this.userId || this.profileChecked) {
      return this.profileChecked;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', this.userId)
        .maybeSingle();

      if (error) {
        console.log('[Analytics] Error checking profile:', error.message);
        return false;
      }

      this.profileChecked = !!data;
      return this.profileChecked;
    } catch (error) {
      console.log('[Analytics] Exception checking profile:', error);
      return false;
    }
  }

  async track(event: EventName, properties: EventProperties = {}) {
    const eventData = {
      event_name: event,
      event_properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        platform: 'mobile',
      },
    };

    if (!this.userId) {
      this.queue.push({ event, properties });
      return;
    }

    // Check if profile exists before tracking
    const profileExists = await this.ensureProfileExists();
    if (!profileExists) {
      // Queue the event to retry later
      this.queue.push({ event, properties });
      // Retry checking profile after a delay
      setTimeout(() => {
        this.profileChecked = false;
        this.processQueue();
      }, 2000);
      return;
    }

    try {
      const { error } = await supabase
        .from('analytics_events')
        .insert({
          user_id: this.userId,
          ...eventData,
        });

      if (error) {
        // Silently log foreign key errors (profile not ready yet)
        if (error.code === '23503') {
          console.log('[Analytics] Profile not ready, queueing event:', event);
          this.queue.push({ event, properties });
          this.profileChecked = false;
        } else {
          console.warn('[Analytics] Error tracking event:', error.message);
        }
      }
    } catch (error) {
      console.log('[Analytics] Exception tracking event:', error);
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0 || !this.userId) {
      return;
    }

    // Check if profile exists before processing queue
    const profileExists = await this.ensureProfileExists();
    if (!profileExists) {
      // Retry after a delay
      setTimeout(() => {
        this.profileChecked = false;
        this.processQueue();
      }, 2000);
      return;
    }

    this.isProcessing = true;

    try {
      const events = this.queue.splice(0, 10);
      const inserts = events.map(({ event, properties }) => ({
        user_id: this.userId!,
        event_name: event,
        event_properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          platform: 'mobile',
        },
      }));

      const { error } = await supabase
        .from('analytics_events')
        .insert(inserts);

      if (error) {
        // Silently handle foreign key errors
        if (error.code === '23503') {
          console.log('[Analytics] Profile not ready, requeueing events');
          this.queue.unshift(...events);
          this.profileChecked = false;
        } else {
          console.warn('[Analytics] Error processing queue:', error.message);
          this.queue.unshift(...events);
        }
      }
    } catch (error) {
      console.log('[Analytics] Exception processing queue:', error);
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 1000);
      }
    }
  }

  trackHouseCreated(houseId: string, houseName: string) {
    this.track('house_created', { house_id: houseId, house_name: houseName });
  }

  trackHouseJoined(houseId: string, joinMethod: 'qr' | 'link' | 'invite_code') {
    this.track('house_joined', { house_id: houseId, join_method: joinMethod });
  }

  trackGameCreated(gameId: string, houseId: string, gameType: string) {
    this.track('game_created', { game_id: gameId, house_id: houseId, game_type: gameType });
  }

  trackGameSessionStarted(sessionId: string, gameId: string, playerCount: number) {
    this.track('game_session_started', { session_id: sessionId, game_id: gameId, player_count: playerCount });
  }

  trackGameSessionCompleted(sessionId: string, gameId: string, duration: number) {
    this.track('game_session_completed', { session_id: sessionId, game_id: gameId, duration_seconds: duration });
  }

  trackBadgeUnlocked(badgeId: string, badgeName: string) {
    this.track('badge_unlocked', { badge_id: badgeId, badge_name: badgeName });
  }

  trackBannerUnlocked(bannerId: string, bannerName: string, rarity: string) {
    this.track('banner_unlocked', { banner_id: bannerId, banner_name: bannerName, rarity });
  }

  trackKitPurchased(kitId: string, kitName: string, price: number) {
    this.track('kit_purchased', { kit_id: kitId, kit_name: kitName, price_cents: price });
  }

  trackKitEquipped(kitId: string, kitName: string, target: 'profile' | 'house') {
    this.track('kit_equipped', { kit_id: kitId, kit_name: kitName, target });
  }

  trackPremiumPurchased(price: number, source: string) {
    this.track('premium_purchased', { price_cents: price, source });
  }

  trackFriendRequestSent(recipientId: string) {
    this.track('friend_request_sent', { recipient_id: recipientId });
  }

  trackFriendRequestAccepted(senderId: string) {
    this.track('friend_request_accepted', { sender_id: senderId });
  }

  trackOnboardingCompleted(duration: number) {
    this.track('onboarding_completed', { duration_seconds: duration });
  }

  trackOnboardingSkipped(step: number) {
    this.track('onboarding_skipped', { step });
  }
}

export const analytics = new Analytics();
