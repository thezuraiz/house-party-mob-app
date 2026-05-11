/*
  # Create Atomic Premium Unlock Function
  
  ## Purpose
  Ensures premium unlock is atomic - either both updates succeed or both fail.
  Prevents data inconsistency where payment is marked completed but premium not unlocked.
  
  ## Function: complete_premium_payment
  Parameters:
  - p_purchase_id: UUID of the user_purchases record
  - p_user_id: UUID of the user
  - p_checkout_id: Yoco checkout/transaction ID
  - p_yoco_status: Status from Yoco (e.g., 'completed')
  
  Returns: JSON with success status and message
  
  ## Behavior
  - Updates user_purchases.payment_status to 'completed'
  - Updates profiles.premium_unlocked to TRUE
  - Logs success to app_logs
  - All in a single transaction (rollback on any error)
  
  ## Usage
  Called by:
  - yoco-premium-callback (webhook handler)
  - yoco-verify-payment (manual verification)
  - recover-pending-payments (recovery job)
*/

CREATE OR REPLACE FUNCTION complete_premium_payment(
  p_purchase_id UUID,
  p_user_id UUID,
  p_checkout_id TEXT,
  p_yoco_status TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_already_completed BOOLEAN;
BEGIN
  -- Check if already completed
  SELECT (payment_status = 'completed') INTO v_already_completed
  FROM user_purchases
  WHERE id = p_purchase_id;

  IF v_already_completed THEN
    -- Ensure premium is unlocked even if this is a retry
    UPDATE profiles
    SET premium_unlocked = TRUE
    WHERE id = p_user_id AND premium_unlocked = FALSE;
    
    v_result = jsonb_build_object(
      'success', true,
      'message', 'Payment already completed',
      'already_processed', true
    );
    
    RETURN v_result;
  END IF;

  -- ATOMIC TRANSACTION: Update purchase status
  UPDATE user_purchases
  SET 
    payment_status = 'completed',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'completed_at', NOW(),
      'yoco_status', p_yoco_status,
      'checkout_id', p_checkout_id
    )
  WHERE id = p_purchase_id;

  -- Check if update succeeded
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase record not found: %', p_purchase_id;
  END IF;

  -- ATOMIC TRANSACTION: Unlock premium
  UPDATE profiles
  SET premium_unlocked = TRUE
  WHERE id = p_user_id;

  -- Check if update succeeded
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found: %', p_user_id;
  END IF;

  -- Log success
  INSERT INTO app_logs (
    level,
    event_type,
    event_name,
    message,
    user_id,
    metadata
  ) VALUES (
    'info',
    'payment_success',
    'premium_unlocked',
    'Premium successfully unlocked via atomic transaction',
    p_user_id,
    jsonb_build_object(
      'purchase_id', p_purchase_id,
      'checkout_id', p_checkout_id,
      'yoco_status', p_yoco_status
    )
  );

  v_result = jsonb_build_object(
    'success', true,
    'message', 'Premium unlocked successfully',
    'purchase_id', p_purchase_id,
    'user_id', p_user_id
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    INSERT INTO app_logs (
      level,
      event_type,
      event_name,
      message,
      user_id,
      metadata
    ) VALUES (
      'error',
      'payment_failure',
      'premium_unlock_failed',
      'Failed to complete premium payment: ' || SQLERRM,
      p_user_id,
      jsonb_build_object(
        'purchase_id', p_purchase_id,
        'checkout_id', p_checkout_id,
        'error', SQLERRM,
        'error_detail', SQLSTATE
      )
    );
    
    -- Re-raise to trigger rollback
    RAISE EXCEPTION 'Premium unlock transaction failed: %', SQLERRM;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION complete_premium_payment(UUID, UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION complete_premium_payment(UUID, UUID, TEXT, TEXT) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION complete_premium_payment IS 'Atomically completes premium payment and unlocks premium features. Used by webhook callbacks and verification endpoints.';