/*
  # Add event_properties column to analytics_events

  1. Changes
    - Add `event_properties` column to `analytics_events` table as JSONB
    - This matches what the analytics.ts code expects

  2. Notes
    - The code inserts event_properties but the table only had event_data
    - Keeping both columns for backwards compatibility
*/

-- Add event_properties column to analytics_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analytics_events' AND column_name = 'event_properties'
  ) THEN
    ALTER TABLE analytics_events ADD COLUMN event_properties jsonb;
  END IF;
END $$;
