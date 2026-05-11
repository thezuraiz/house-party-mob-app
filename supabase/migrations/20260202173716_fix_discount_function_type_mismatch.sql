/*
  # Fix discount function type mismatch
  
  1. Problem
    - `get_active_kit_discounts()` function returns numeric price but declares integer return type
    - Column 3 (original_price) has type mismatch error
  
  2. Solution
    - Update function to use `price_cents` instead of `price`
    - Ensure all price calculations use integer types consistently
    
  3. Changes
    - Replace `hk.price` with `hk.price_cents` in query
    - Update discounted price calculation to use price_cents
*/

-- Drop and recreate the function with corrected types
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
    hk.color_scheme,
    akd.ends_at
  FROM active_kit_discounts akd
  JOIN house_kits hk ON akd.kit_id = hk.id
  WHERE now() >= akd.starts_at 
    AND now() < akd.ends_at
  ORDER BY akd.discount_percentage DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_kit_discounts TO authenticated;
