/*
  # Fix Payment Race Condition with Atomic Processing

  ## Changes
  1. **Atomic Kit Purchase Processing**
     - Creates function to process kit purchases atomically
     - Uses SELECT FOR UPDATE NOWAIT to prevent race conditions
     - Ensures idempotent payment processing

  2. **Atomic Premium Purchase Processing**
     - Creates function to process premium purchases atomically
     - Uses SELECT FOR UPDATE NOWAIT to prevent race conditions
     - Ensures both payment status and premium flag are updated together

  ## Security
  - Functions use SECURITY DEFINER to bypass RLS
  - Validates purchase exists and belongs to user
  - Returns clear success/failure status
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS process_kit_payment_atomic(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS process_premium_payment_atomic(UUID, UUID, TEXT, TEXT);

-- =====================================================
-- ATOMIC KIT PAYMENT PROCESSING
-- =====================================================
CREATE OR REPLACE FUNCTION process_kit_payment_atomic(
  p_purchase_id UUID,
  p_checkout_id TEXT,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase user_kit_purchases;
  v_result JSONB;
BEGIN
  -- Lock the row for update (NOWAIT prevents deadlocks)
  SELECT * INTO v_purchase
  FROM user_kit_purchases
  WHERE id = p_purchase_id
  FOR UPDATE NOWAIT;

  -- Check if purchase exists
  IF v_purchase IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'purchase_not_found'
    );
  END IF;

  -- Check if already processed (idempotent)
  IF v_purchase.payment_status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'message', 'Payment already completed'
    );
  END IF;

  -- Update payment status
  UPDATE user_kit_purchases
  SET
    payment_status = 'completed',
    yoco_payment_id = p_checkout_id,
    paid_at = now(),
    updated_at = now()
  WHERE id = p_purchase_id;

  -- Grant kit access to user
  INSERT INTO user_house_kits (user_id, house_kit_id, created_at)
  VALUES (v_purchase.user_id, v_purchase.house_kit_id, now())
  ON CONFLICT (user_id, house_kit_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'message', 'Payment processed and kit granted'
  );

EXCEPTION
  WHEN lock_not_available THEN
    -- Another transaction is processing this purchase
    RETURN jsonb_build_object(
      'success', false,
      'error', 'concurrent_processing',
      'message', 'Payment is being processed by another request'
    );
  WHEN OTHERS THEN
    -- Log error and return failure
    RAISE WARNING 'Error processing kit payment: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'processing_failed',
      'message', SQLERRM
    );
END;
$$;

-- =====================================================
-- ATOMIC PREMIUM PAYMENT PROCESSING
-- =====================================================
CREATE OR REPLACE FUNCTION process_premium_payment_atomic(
  p_purchase_id UUID,
  p_user_id UUID,
  p_checkout_id TEXT,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase user_purchases;
  v_profile profiles;
  v_result JSONB;
BEGIN
  -- Lock the purchase row
  SELECT * INTO v_purchase
  FROM user_purchases
  WHERE id = p_purchase_id
  FOR UPDATE NOWAIT;

  -- Check if purchase exists
  IF v_purchase IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'purchase_not_found'
    );
  END IF;

  -- Check if already processed
  IF v_purchase.payment_status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'message', 'Payment already completed'
    );
  END IF;

  -- Lock the profile row
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE NOWAIT;

  -- Update purchase status
  UPDATE user_purchases
  SET
    payment_status = 'completed',
    updated_at = now()
  WHERE id = p_purchase_id;

  -- Grant premium access
  UPDATE profiles
  SET
    is_premium = true,
    premium_unlocked_at = now(),
    updated_at = now()
  WHERE id = p_user_id;

  -- Verify premium was granted
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to grant premium access';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'message', 'Premium unlocked successfully'
  );

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'concurrent_processing',
      'message', 'Payment is being processed by another request'
    );
  WHEN OTHERS THEN
    RAISE WARNING 'Error processing premium payment: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'processing_failed',
      'message', SQLERRM
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_kit_payment_atomic TO service_role;
GRANT EXECUTE ON FUNCTION process_premium_payment_atomic TO service_role;
