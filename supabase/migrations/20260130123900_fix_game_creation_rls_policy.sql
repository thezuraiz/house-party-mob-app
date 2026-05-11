/*
  # Fix Game Creation RLS Policy
  
  1. Changes
    - Update games INSERT policy to allow both house creators AND admins to create games
    - This fixes the template flow where creators couldn't add games from templates
  
  2. Security
    - Still restricts to authenticated users
    - Users must either be:
      - The house creator, OR
      - A house admin member
*/

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "House admins can create games" ON games;

-- Create new policy that allows both creators and admins
CREATE POLICY "House creators and admins can create games"
  ON games
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- House creator can create games
    (EXISTS (
      SELECT 1 FROM houses
      WHERE houses.id = games.house_id
      AND houses.creator_id = auth.uid()
    ))
    OR
    -- House admin can create games
    (EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = games.house_id
      AND house_members.user_id = auth.uid()
      AND house_members.role = 'admin'
    ))
  );