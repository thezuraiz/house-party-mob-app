/*
  # Fix discount function color_scheme type
  
  1. Problem
    - `color_scheme` is stored as text[] but function expects jsonb
    - Column 7 has type mismatch error
  
  2. Solution
    - Convert text[] to jsonb using to_jsonb() function
    
  3. Changes
    - Cast color_scheme to jsonb in the return query
*/

-- Drop and recreate the function with proper type conversion
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
    hk.price_cents,
    akd.discount_percentage,
    CAST(hk.price_cents * (100 - akd.discount_percentage) / 100 AS integer) AS discounted_price,
    hk.rarity,
    to_jsonb(hk.color_scheme) AS color_scheme,
    akd.ends_at
  FROM active_kit_discounts akd
  JOIN house_kits hk ON akd.kit_id = hk.id
  WHERE now() >= akd.starts_at 
    AND now() < akd.ends_at
  ORDER BY akd.discount_percentage DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_kit_discounts TO authenticated;
