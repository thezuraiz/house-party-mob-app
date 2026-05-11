/*
  # Enable Realtime for Premium Status Updates

  1. Changes
    - Enable realtime on profiles table for premium_unlocked updates
    - Enable realtime on user_house_kits table for kit purchases

  2. Purpose
    - Allow instant UI updates when premium is unlocked
    - Allow instant UI updates when kits are purchased
    - Provide snappy user experience for payment confirmations
*/

-- Enable realtime for profiles table (for premium_unlocked updates)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Enable realtime for user_house_kits table (for kit purchases)
ALTER PUBLICATION supabase_realtime ADD TABLE user_house_kits;
