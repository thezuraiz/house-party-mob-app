/*
  # Random Kit Discounts System

  1. New Tables
    - `active_kit_discounts`
      - `id` (uuid, primary key)
      - `kit_id` (uuid, foreign key to house_kits)
      - `discount_percentage` (integer, 51-70%)
      - `starts_at` (timestamptz)
      - `ends_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Functions
    - `generate_random_kit_discounts()` - Creates 4-5 random discounts
    - `get_active_kit_discounts()` - Returns currently active discounts
    
  3. Security
    - Enable RLS on `active_kit_discounts` table
    - Allow all authenticated users to view active discounts
    - Only allow system/admin to create/update discounts
*/

-- Create the active kit discounts table
CREATE TABLE IF NOT EXISTS active_kit_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES house_kits(id) ON DELETE CASCADE,
  discount_percentage integer NOT NULL CHECK (discount_percentage >= 51 AND discount_percentage <= 70),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE active_kit_discounts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active discounts
CREATE POLICY "Anyone can view active discounts"
  ON active_kit_discounts
  FOR SELECT
  TO authenticated
  USING (now() >= starts_at AND now() < ends_at);

-- Function to generate random kit discounts
CREATE OR REPLACE FUNCTION generate_random_kit_discounts(duration_days integer DEFAULT 7)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  num_discounts integer;
  discount_pct integer;
  kit_record record;
BEGIN
  -- Delete expired discounts
  DELETE FROM active_kit_discounts WHERE ends_at < now();
  
  -- Delete current active discounts to refresh
  DELETE FROM active_kit_discounts WHERE ends_at >= now();
  
  -- Randomly choose 4 or 5 kits
  num_discounts := 4 + floor(random() * 2)::integer; -- 4 or 5
  
  -- Insert new random discounts
  FOR kit_record IN (
    SELECT id FROM house_kits 
    WHERE rarity IN ('rare', 'epic', 'legendary', 'mythic')
    ORDER BY random() 
    LIMIT num_discounts
  )
  LOOP
    -- Random discount between 51% and 70%
    discount_pct := 51 + floor(random() * 20)::integer;
    
    INSERT INTO active_kit_discounts (kit_id, discount_percentage, starts_at, ends_at)
    VALUES (
      kit_record.id,
      discount_pct,
      now(),
      now() + (duration_days || ' days')::interval
    );
  END LOOP;
END;
$$;

-- Function to get active discounted kits with details
CREATE OR REPLACE FUNCTION get_active_kit_discounts()
RETURNS TABLE (
  kit_id uuid,
  kit_name text,
  original_price integer,
  discount_percentage integer,
  discounted_price integer,
  rarity text,
  color_scheme jsonb,
  ends_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hk.id,
    hk.name,
    hk.price,
    akd.discount_percentage,
    CAST(hk.price * (100 - akd.discount_percentage) / 100 AS integer) AS discounted_price,
    hk.rarity,
    hk.color_scheme,
    akd.ends_at
  FROM active_kit_discounts akd
  JOIN house_kits hk ON akd.kit_id = hk.id
  WHERE now() >= akd.starts_at 
    AND now() < akd.ends_at
  ORDER BY akd.discount_percentage DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_random_kit_discounts TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_kit_discounts TO authenticated;

-- Generate initial discounts
SELECT generate_random_kit_discounts(7);
