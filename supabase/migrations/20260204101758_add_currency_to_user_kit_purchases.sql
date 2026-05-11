/*
  # Add currency column to user_kit_purchases
  
  1. Changes
    - Add `currency` column to `user_kit_purchases` table with default value 'USD'
    - This column tracks the currency used for the purchase (USD, ZAR, etc.)
  
  2. Why
    - The yoco-kit-initialize edge function tries to insert a currency value
    - Without this column, kit purchases fail with PGRST204 error
    - Matches the structure of the user_purchases table
*/

-- Add currency column to user_kit_purchases
ALTER TABLE user_kit_purchases
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';

-- Update existing records to have USD as default
UPDATE user_kit_purchases
SET currency = 'USD'
WHERE currency IS NULL;
