/*
  # Create Single Source of Truth for Kit Discounts

  1. New Functions
    - `get_active_kit_discount(p_kit_id uuid)`: Returns the current active discount percentage for a specific kit
      - Returns 0 if no active discount exists
      - Returns discount_percentage if an active discount is found
      - Checks that discount is currently valid (between starts_at and ends_at)

  2. Indexes
    - Performance index on kit_id and date columns for fast lookups

  3. Security
    - Function is STABLE and can be called by anon and authenticated users
    - Ensures frontend and payment gateways always get the same discount value

  4. Notes
    - This function is the SINGLE SOURCE OF TRUTH for all discount calculations
    - Frontend, PayPal, and Yoco edge functions MUST use this function
    - When generate_random_kit_discounts() creates new discounts, they are immediately reflected
    - If multiple overlapping discounts exist, the one ending latest is selected
*/

-- Create the single source of truth function for kit discounts
CREATE OR REPLACE FUNCTION get_active_kit_discount(p_kit_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT discount_percentage
      FROM active_kit_discounts
      WHERE kit_id = p_kit_id
        AND starts_at <= now()
        AND ends_at >= now()
      ORDER BY ends_at DESC
      LIMIT 1
    ),
    0
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_active_kit_discount(uuid) TO anon, authenticated;

-- Create index for performance on active discount queries
CREATE INDEX IF NOT EXISTS idx_active_kit_discounts_lookup
ON active_kit_discounts (kit_id, starts_at, ends_at);

-- Add comment for documentation
COMMENT ON FUNCTION get_active_kit_discount(uuid) IS 'Returns the active discount percentage for a kit, or 0 if none. This is the single source of truth for all discount calculations across frontend and payment gateways.';