/*
  # Create Kit Discount System

  1. New Tables
    - `kit_discount_periods`
      - Stores rotating discount periods with start/end dates and discount percentage
      - Tracks which weeks have discounts active

  2. Functions
    - `get_active_kit_discount()`: Returns current active discount percentage or 0
    - Pre-populates alternating discount periods starting from this week

  3. Security
    - Public read access for discount periods
    - Only service role can manage discount periods

  4. Notes
    - Discounts alternate: 1 week ON (50-70% off), 1 week OFF (0% off)
    - Starting this week with a discount active
    - Each discount period has a randomized percentage between 50-70%
*/

-- Create discount periods table
CREATE TABLE IF NOT EXISTS kit_discount_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  discount_percentage integer NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE kit_discount_periods ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active discounts
CREATE POLICY "Anyone can view active discounts"
  ON kit_discount_periods
  FOR SELECT
  USING (is_active = true);

-- Create function to get current active discount
CREATE OR REPLACE FUNCTION get_active_kit_discount()
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_discount integer;
BEGIN
  SELECT discount_percentage INTO current_discount
  FROM kit_discount_periods
  WHERE is_active = true
    AND start_date <= now()
    AND end_date >= now()
  ORDER BY start_date DESC
  LIMIT 1;

  RETURN COALESCE(current_discount, 0);
END;
$$;

-- Pre-populate discount periods (alternating weeks starting this week)
-- Week 1: Discount active (50-70% randomized)
-- Week 2: No discount (0%)
-- Week 3: Discount active (50-70% randomized)
-- etc.

DO $$
DECLARE
  start_of_week timestamptz;
  week_counter integer := 0;
  discount_pct integer;
BEGIN
  -- Start from the beginning of this week (Monday)
  start_of_week := date_trunc('week', now());

  -- Generate 52 weeks of discount periods (1 year)
  FOR week_counter IN 0..51 LOOP
    -- Alternating: even weeks have discount, odd weeks don't
    IF week_counter % 2 = 0 THEN
      -- Discount week: random between 50-70%
      discount_pct := 50 + floor(random() * 21)::integer;
    ELSE
      -- No discount week
      discount_pct := 0;
    END IF;

    INSERT INTO kit_discount_periods (start_date, end_date, discount_percentage, is_active)
    VALUES (
      start_of_week + (week_counter * interval '1 week'),
      start_of_week + ((week_counter + 1) * interval '1 week') - interval '1 second',
      discount_pct,
      true
    );
  END LOOP;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_kit_discount_periods_active_dates
  ON kit_discount_periods(is_active, start_date, end_date);

-- Grant execute permission on function
GRANT EXECUTE ON FUNCTION get_active_kit_discount() TO anon, authenticated;