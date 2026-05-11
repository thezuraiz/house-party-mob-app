/*
  # Prevent Overlapping Kit Discounts

  1. New Functions
    - `check_no_overlapping_discounts()`: Trigger function to prevent overlapping active discounts for the same kit
      - Checks if inserting/updating a discount would overlap with an existing active discount
      - Raises an exception if overlap is detected

  2. Triggers
    - `prevent_overlapping_discounts`: Trigger on active_kit_discounts table
      - Fires BEFORE INSERT OR UPDATE
      - Ensures only one active discount per kit at any given time

  3. Notes
    - This enforces the business rule that a kit can only have ONE active discount at a time
    - Prevents race conditions where multiple discounts might be created for the same kit
    - Any future randomized discount generation will be prevented from creating conflicts
*/

-- Create trigger function to prevent overlapping discounts
CREATE OR REPLACE FUNCTION check_no_overlapping_discounts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if there are any overlapping discounts for the same kit
  IF EXISTS (
    SELECT 1
    FROM active_kit_discounts
    WHERE kit_id = NEW.kit_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        -- New discount starts during an existing discount
        (NEW.starts_at >= starts_at AND NEW.starts_at < ends_at)
        OR
        -- New discount ends during an existing discount
        (NEW.ends_at > starts_at AND NEW.ends_at <= ends_at)
        OR
        -- New discount completely encompasses an existing discount
        (NEW.starts_at <= starts_at AND NEW.ends_at >= ends_at)
      )
  ) THEN
    RAISE EXCEPTION 'Cannot create overlapping discount for kit %. A discount already exists for this time period.', NEW.kit_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to enforce no overlapping discounts
DROP TRIGGER IF EXISTS prevent_overlapping_discounts ON active_kit_discounts;
CREATE TRIGGER prevent_overlapping_discounts
  BEFORE INSERT OR UPDATE ON active_kit_discounts
  FOR EACH ROW
  EXECUTE FUNCTION check_no_overlapping_discounts();

-- Add comment for documentation
COMMENT ON FUNCTION check_no_overlapping_discounts() IS 'Prevents overlapping discounts for the same kit. Ensures only one active discount per kit at any given time.';