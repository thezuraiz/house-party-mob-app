/*
  # Insert Default Onboarding Coach Mark Flows

  1. Inserts predefined coach mark flow configurations
    - First house creation flow
    - House features tour
    - Game templates tour
    - Game session flow
    - Social features tour
    - Profile customization
    - Shop introduction
    - Join house tutorial

  2. Configuration Details
    - Each flow has multiple steps with target IDs, titles, descriptions
    - Flows have priority ordering to determine which shows first
    - Trigger conditions specify when each flow should appear
    - Target screens indicate where flows are relevant

  3. Notes
    - Flows can be enabled/disabled via is_active flag
    - Priority determines flow order (lower number = higher priority)
    - Steps include position, highlight type, and action requirements
*/

-- Insert first house creation flow
INSERT INTO onboarding_flow_config (
  flow_name,
  display_name,
  target_screen,
  steps_config,
  trigger_condition,
  is_active,
  priority_order
) VALUES (
  'first_house_creation',
  'Create Your First House',
  '(tabs)/index',
  '[
    {
      "stepId": "create_house_button",
      "targetId": "create_house_button",
      "title": "Create Your First House",
      "description": "Tap here to create a house where you and your friends can track scores and compete!",
      "position": "bottom",
      "highlightType": "circle",
      "actionRequired": "tap",
      "autoAdvanceOnAction": true
    }
  ]'::jsonb,
  'no_houses_exist',
  true,
  1
) ON CONFLICT (flow_name) DO NOTHING;

-- Insert house features tour
INSERT INTO onboarding_flow_config (
  flow_name,
  display_name,
  target_screen,
  steps_config,
  trigger_condition,
  is_active,
  priority_order
) VALUES (
  'house_features_tour',
  'Discover House Features',
  'house/[id]',
  '[
    {
      "stepId": "add_game_button",
      "targetId": "add_game_button",
      "title": "Start a Game",
      "description": "Create a new game to start tracking scores with your house members.",
      "position": "bottom",
      "highlightType": "rectangle",
      "actionRequired": "none",
      "highlightPadding": 12
    },
    {
      "stepId": "house_leaderboard",
      "targetId": "house_leaderboard",
      "title": "View Leaderboard",
      "description": "See how you rank against your housemates. The more you play and win, the higher you climb!",
      "position": "top",
      "highlightType": "rectangle",
      "actionRequired": "none",
      "highlightPadding": 8
    },
    {
      "stepId": "house_settings",
      "targetId": "house_settings",
      "title": "Customize Your House",
      "description": "Tap here to change your house name, emoji, colors, and invite new members.",
      "position": "bottom",
      "highlightType": "circle",
      "actionRequired": "none"
    }
  ]'::jsonb,
  'first_house_created',
  true,
  2
) ON CONFLICT (flow_name) DO NOTHING;

-- Insert social features tour
INSERT INTO onboarding_flow_config (
  flow_name,
  display_name,
  target_screen,
  steps_config,
  trigger_condition,
  is_active,
  priority_order
) VALUES (
  'social_features_tour',
  'Connect with Friends',
  '(tabs)/friends',
  '[
    {
      "stepId": "add_friend_button",
      "targetId": "add_friend_button",
      "title": "Add Friends",
      "description": "Search for friends by username to connect and invite them to your houses!",
      "position": "bottom",
      "highlightType": "circle",
      "actionRequired": "none"
    },
    {
      "stepId": "friend_requests_tab",
      "targetId": "friend_requests_tab",
      "title": "Manage Requests",
      "description": "View incoming friend requests here and accept the ones you want to connect with.",
      "position": "bottom",
      "highlightType": "rectangle",
      "actionRequired": "none"
    }
  ]'::jsonb,
  'no_friends_after_3_days',
  true,
  5
) ON CONFLICT (flow_name) DO NOTHING;

-- Insert profile customization flow
INSERT INTO onboarding_flow_config (
  flow_name,
  display_name,
  target_screen,
  steps_config,
  trigger_condition,
  is_active,
  priority_order
) VALUES (
  'profile_customization',
  'Customize Your Profile',
  '(tabs)/profile',
  '[
    {
      "stepId": "avatar_section",
      "targetId": "avatar_section",
      "title": "Add Profile Photo",
      "description": "Tap your avatar to upload a profile photo and personalize your account!",
      "position": "bottom",
      "highlightType": "circle",
      "actionRequired": "none",
      "highlightPadding": 10
    },
    {
      "stepId": "badges_section",
      "targetId": "badges_section",
      "title": "Unlock Badges",
      "description": "Complete achievements to unlock badges and show off your accomplishments!",
      "position": "top",
      "highlightType": "rectangle",
      "actionRequired": "none"
    }
  ]'::jsonb,
  'no_avatar_after_1_day',
  true,
  6
) ON CONFLICT (flow_name) DO NOTHING;

-- Insert shop introduction flow
INSERT INTO onboarding_flow_config (
  flow_name,
  display_name,
  target_screen,
  steps_config,
  trigger_condition,
  is_active,
  priority_order
) VALUES (
  'shop_introduction',
  'Explore the Shop',
  '(tabs)/shop',
  '[
    {
      "stepId": "kit_preview",
      "targetId": "kit_preview_0",
      "title": "Unlock Themes",
      "description": "Earn coins by playing games and use them to unlock beautiful color themes for your houses!",
      "position": "bottom",
      "highlightType": "rectangle",
      "actionRequired": "none",
      "highlightPadding": 12
    },
    {
      "stepId": "coins_display",
      "targetId": "coins_display",
      "title": "Your Coins",
      "description": "This shows your current coin balance. Win games to earn more!",
      "position": "bottom",
      "highlightType": "circle",
      "actionRequired": "none"
    }
  ]'::jsonb,
  'first_shop_visit',
  true,
  7
) ON CONFLICT (flow_name) DO NOTHING;

-- Insert join house tutorial
INSERT INTO onboarding_flow_config (
  flow_name,
  display_name,
  target_screen,
  steps_config,
  trigger_condition,
  is_active,
  priority_order
) VALUES (
  'join_house_tutorial',
  'Join a House',
  '(tabs)/index',
  '[
    {
      "stepId": "join_house_button",
      "targetId": "join_house_button",
      "title": "Join Existing House",
      "description": "Have an invite code? Tap here to join a house your friends already created!",
      "position": "bottom",
      "highlightType": "circle",
      "actionRequired": "none"
    },
    {
      "stepId": "scan_qr_button",
      "targetId": "scan_qr_button",
      "title": "Scan QR Code",
      "description": "You can also join a house by scanning a QR code shared by the house admin.",
      "position": "bottom",
      "highlightType": "circle",
      "actionRequired": "none"
    }
  ]'::jsonb,
  'no_houses_after_signup',
  true,
  8
) ON CONFLICT (flow_name) DO NOTHING;
