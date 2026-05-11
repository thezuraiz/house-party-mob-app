/*
  # Add automatic premium unlock trigger for referrals

  1. Changes
    - Create trigger function to automatically unlock premium when referral_count >= 10
    - This ensures premium is granted even if referral_count is updated directly
  
  2. Security
    - Trigger runs on every referral_count update
    - Automatically sets premium_unlocked = true when threshold is reached
*/

-- Function to auto-unlock premium when referral count reaches 10
CREATE OR REPLACE FUNCTION auto_unlock_premium_on_referrals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If referral_count reaches or exceeds 10 and premium is not already unlocked
  IF NEW.referral_count >= 10 AND NEW.premium_unlocked = false THEN
    NEW.premium_unlocked := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_premium_unlock_trigger ON profiles;

-- Create trigger to run before update on profiles
CREATE TRIGGER auto_premium_unlock_trigger
  BEFORE UPDATE OF referral_count ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_unlock_premium_on_referrals();

-- Also unlock premium for any existing users who already have 10+ referrals
UPDATE profiles
SET premium_unlocked = true
WHERE referral_count >= 10
  AND premium_unlocked = false;

-- Verify the changes
SELECT 
  COUNT(*) as users_with_10_plus_referrals,
  COUNT(*) FILTER (WHERE premium_unlocked = true) as premium_unlocked_count
FROM profiles
WHERE referral_count >= 10;
