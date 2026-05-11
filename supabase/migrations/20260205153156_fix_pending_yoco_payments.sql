/*
  # Fix Pending Yoco Payments
  
  Creates a function to manually verify and complete pending Yoco payments.
  This is needed when webhooks aren't properly registered in Yoco dashboard.
  
  1. Function
    - `complete_yoco_payment(transaction_id, user_id)` - Manually completes a payment
*/

-- Function to manually complete a Yoco payment
CREATE OR REPLACE FUNCTION complete_yoco_payment(
  p_transaction_id TEXT,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_purchase_record RECORD;
  v_result JSON;
BEGIN
  -- Check for premium purchase
  SELECT * INTO v_purchase_record
  FROM user_purchases
  WHERE payment_transaction_id = p_transaction_id
    AND user_id = p_user_id
    AND product_type = 'premium';
  
  IF FOUND THEN
    -- Update premium purchase
    UPDATE user_purchases
    SET 
      payment_status = 'completed',
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'manually_completed_at', NOW(),
        'completed_by', 'admin'
      )
    WHERE id = v_purchase_record.id;
    
    -- Unlock premium for user
    UPDATE profiles
    SET premium_unlocked = TRUE
    WHERE id = p_user_id;
    
    v_result = jsonb_build_object(
      'success', true,
      'type', 'premium',
      'message', 'Premium unlocked successfully'
    );
    
    RETURN v_result;
  END IF;
  
  -- Check for kit purchase
  SELECT * INTO v_purchase_record
  FROM user_kit_purchases
  WHERE payment_transaction_id = p_transaction_id
    AND user_id = p_user_id;
  
  IF FOUND THEN
    -- Update kit purchase
    UPDATE user_kit_purchases
    SET 
      payment_status = 'completed',
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'manually_completed_at', NOW(),
        'completed_by', 'admin'
      )
    WHERE id = v_purchase_record.id;
    
    -- Add kit to user's collection
    INSERT INTO user_house_kits (user_id, house_kit_id)
    VALUES (p_user_id, v_purchase_record.house_kit_id)
    ON CONFLICT (user_id, house_kit_id) DO NOTHING;
    
    v_result = jsonb_build_object(
      'success', true,
      'type', 'kit',
      'kit_id', v_purchase_record.house_kit_id,
      'message', 'Kit unlocked successfully'
    );
    
    RETURN v_result;
  END IF;
  
  -- No purchase found
  v_result = jsonb_build_object(
    'success', false,
    'message', 'Purchase not found'
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION complete_yoco_payment(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_yoco_payment(TEXT, UUID) TO service_role;
