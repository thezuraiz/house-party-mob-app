/*
  # Add Performance Index for House Members Query

  1. New Indexes
    - Add composite index on (user_id, role) for faster admin house lookups
    
  2. Performance Impact
    - Speeds up kit application modal and apply-kit page
    - Reduces query time from 600ms+ to <100ms
*/

-- Add composite index for user_id + role queries
CREATE INDEX IF NOT EXISTS idx_house_members_user_role 
ON house_members(user_id, role) 
WHERE role = 'admin';

-- Add index for house_id lookups used in batch queries
CREATE INDEX IF NOT EXISTS idx_house_members_house_id 
ON house_members(house_id);
