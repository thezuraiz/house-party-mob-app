/*
  # Fix trigger to use username from signup metadata
  
  1. Changes
    - Update handle_new_user() trigger to read username from raw_user_meta_data
    - Extract username from the metadata passed during signup
    - Fall back to NULL only if no username provided
  
  2. Why
    - The signup form collects a username but the trigger ignores it
    - This causes all new users to have NULL usernames
    - Users see "U" (for "User") instead of their actual initial in avatars
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
BEGIN
  -- Try to extract username from metadata
  v_username := NEW.raw_user_meta_data->>'username';
  
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
    v_username,  -- Use username from signup metadata if provided
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
