/*
  # Email Confirmation Diagnostic Function

  1. Purpose
    - Help diagnose email confirmation issues
    - Check user email confirmation status
    - Provide debug information

  2. Function
    - check_email_confirmation_status: Returns detailed info about a user's email status
*/

CREATE OR REPLACE FUNCTION check_email_confirmation_status(user_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  user_record record;
BEGIN
  SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    updated_at,
    CASE 
      WHEN email_confirmed_at IS NULL THEN 'NOT_CONFIRMED'
      ELSE 'CONFIRMED'
    END as status
  INTO user_record
  FROM auth.users
  WHERE email = user_email;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'found', false,
      'message', 'User not found with this email'
    );
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'user_id', user_record.id,
    'email', user_record.email,
    'status', user_record.status,
    'email_confirmed_at', user_record.email_confirmed_at,
    'created_at', user_record.created_at,
    'updated_at', user_record.updated_at,
    'minutes_since_signup', EXTRACT(EPOCH FROM (NOW() - user_record.created_at)) / 60
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_email_confirmation_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_email_confirmation_status(text) TO anon;
