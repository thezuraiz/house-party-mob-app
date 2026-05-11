/*
  # Fix house_members Foreign Key Constraint

  ## Problem
  - house_members.user_id has a foreign key to profiles(user_id)
  - But profiles table uses profiles.id as the primary key, not profiles.user_id
  - This causes foreign key constraint failures when creating houses

  ## Solution
  - Drop the old foreign key constraint
  - Recreate it to reference profiles(id) instead
*/

-- Drop the old foreign key constraint if it exists
ALTER TABLE house_members
DROP CONSTRAINT IF EXISTS house_members_user_id_fkey CASCADE;

-- Add the correct foreign key constraint
ALTER TABLE house_members
ADD CONSTRAINT house_members_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Verify the constraint is correct
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'house_members'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'user_id'
      AND ccu.table_name = 'profiles'
      AND ccu.column_name = 'id'
  ) THEN
    RAISE EXCEPTION 'Foreign key constraint was not created correctly';
  END IF;
END $$;
