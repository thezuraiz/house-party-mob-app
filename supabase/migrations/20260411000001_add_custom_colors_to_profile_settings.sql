-- Add custom_profile_colors column to user_profile_settings
-- Used when user applies custom gradient colors to their profile (no kit)
DO $func$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile_settings' AND column_name = 'custom_profile_colors'
  ) THEN
    ALTER TABLE user_profile_settings
    ADD COLUMN custom_profile_colors jsonb DEFAULT NULL;
  END IF;
END;
$func$;
