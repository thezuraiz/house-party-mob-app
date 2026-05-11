/*
  # Add Critical Performance Indexes

  ## Overview
  Adds composite indexes to frequently queried tables to improve query performance.

  ## Indexes Added
  - House members lookups
  - Game sessions filtering  
  - Session scores queries
  - Game invitations
  - Friend system
  - Profile searches
  - Purchase transactions
*/

-- House Members
CREATE INDEX IF NOT EXISTS idx_house_members_user_house
ON house_members(user_id, house_id);

CREATE INDEX IF NOT EXISTS idx_house_members_house_role
ON house_members(house_id, role)
WHERE role IS NOT NULL;

-- Game Sessions
CREATE INDEX IF NOT EXISTS idx_game_sessions_house_status_date
ON game_sessions(house_id, status, created_at DESC);

-- Session Scores  
CREATE INDEX IF NOT EXISTS idx_session_scores_session_user
ON session_scores(session_id, user_id);

CREATE INDEX IF NOT EXISTS idx_session_scores_user_date
ON session_scores(user_id, created_at DESC);

-- Game Invitations
CREATE INDEX IF NOT EXISTS idx_game_invitations_invitee_status
ON game_invitations(invitee_id, status)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_game_invitations_session_status
ON game_invitations(game_session_id, status);

-- Friend Requests
CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient_status
ON friend_requests(recipient_id, status)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_status
ON friend_requests(sender_id, status);

-- Friendships
CREATE INDEX IF NOT EXISTS idx_friendships_user
ON friendships(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_friendships_friend
ON friendships(friend_id, created_at DESC);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower
ON profiles(LOWER(username));

-- House Customizations
CREATE INDEX IF NOT EXISTS idx_house_customizations_house
ON house_customizations(house_id);

-- User Purchases
CREATE INDEX IF NOT EXISTS idx_user_purchases_user_status
ON user_purchases(user_id, payment_status);

CREATE INDEX IF NOT EXISTS idx_user_purchases_transaction
ON user_purchases(payment_transaction_id)
WHERE payment_transaction_id IS NOT NULL;

-- User Kit Purchases
CREATE INDEX IF NOT EXISTS idx_user_kit_purchases_user_status
ON user_kit_purchases(user_id, payment_status);

CREATE INDEX IF NOT EXISTS idx_user_kit_purchases_transaction
ON user_kit_purchases(payment_transaction_id)
WHERE payment_transaction_id IS NOT NULL;

-- Update table statistics
ANALYZE house_members;
ANALYZE game_sessions;
ANALYZE session_scores;
ANALYZE game_invitations;
ANALYZE friend_requests;
ANALYZE friendships;
ANALYZE profiles;
ANALYZE user_purchases;
ANALYZE user_kit_purchases;
