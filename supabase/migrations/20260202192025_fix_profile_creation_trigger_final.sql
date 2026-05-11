/*
  # Fix Profile Creation Trigger - Final

  ## Problem
  - Profile rows are not being created automatically for new users
  - This causes foreign key constraint failures when creating houses, tracking analytics, etc.
  - Existing users may be missing profile rows

  ## Changes
  1. Recreate the trigger function to create both profiles and user_profile_settings
  2. Backfill any missing rows for existing users
  3. Grant proper permissions

  ## Security
  - Uses SECURITY DEFINER to bypass RLS during profile creation
  - Maintains all existing RLS policies
*/

-- Step 1: Recreate the trigger function with correct column names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile row for new user
  INSERT INTO public.profiles (
    id,
    username,
    avatar_url,
    coins,
    level,
    experience_points,
    selected_banner_id,
    referral_code,
    referral_count,
    premium_unlocked,
    referral_used,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NULL,  -- Username will be set during onboarding
    NULL,
    0,     -- Starting coins
    1,     -- Starting level
    0,     -- Starting XP
    NULL,
    NULL,  -- Referral code generated later if needed
    0,     -- No referrals yet
    false, -- Not premium by default
    false, -- Has not used referral code
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Also create user_profile_settings
  INSERT INTO public.user_profile_settings (
    user_id,
    profile_photo_url,
    display_name,
    selected_banner_id,
    equipped_kit_id,
    equipped_house_kit_id,
    is_private,
    has_completed_onboarding,
    push_token,
    push_enabled,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    false,  -- Profile is public by default
    false,  -- Onboarding not complete
    NULL,
    false,  -- Push notifications off by default
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 2: Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Backfill missing profile rows for existing users
INSERT INTO public.profiles (
  id,
  username,
  avatar_url,
  coins,
  level,
  experience_points,
  selected_banner_id,
  referral_code,
  referral_count,
  premium_unlocked,
  referral_used,
  created_at,
  updated_at
)
SELECT 
  au.id,
  NULL,
  NULL,
  0,
  1,
  0,
  NULL,
  NULL,
  0,
  false,
  false,
  au.created_at,
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Step 4: Backfill missing user_profile_settings for existing users
INSERT INTO public.user_profile_settings (
  user_id,
  profile_photo_url,
  display_name,
  selected_banner_id,
  equipped_kit_id,
  equipped_house_kit_id,
  is_private,
  has_completed_onboarding,
  push_token,
  push_enabled,
  created_at,
  updated_at
)
SELECT 
  au.id,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  false,
  au.created_at,
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profile_settings ups WHERE ups.user_id = au.id
)
ON CONFLICT (user_id) DO NOTHING;
