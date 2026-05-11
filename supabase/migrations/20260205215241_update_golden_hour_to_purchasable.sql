/*
  # Update Golden Hour to Purchasable

  1. Changes
    - Set Golden Hour kit_items to is_unlockable = false
    - This makes it a purchasable kit instead of an earnable one
    - Only Aurora Borealis remains as earnable

  2. Purpose
    - Golden Hour is now the most expensive purchasable kit at $300
    - Aurora Borealis is the only remaining earnable (free) kit
*/

-- Update Golden Hour kit items to be purchasable (not earnable)
UPDATE kit_items 
SET is_unlockable = false 
WHERE house_kit_id = '12000000-0001-0000-0000-000000000001'::uuid; -- Golden Hour
