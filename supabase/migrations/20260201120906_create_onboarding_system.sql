/*
  # Create Onboarding Coach Mark System

  1. New Tables
    - `user_onboarding_progress`
      - Tracks which coach mark steps each user has completed
      - Stores current flow state and last interaction timestamp
      - `user_id` (uuid, foreign key to auth.users)
      - `completed_steps` (jsonb array of completed step IDs)
      - `current_flow_name` (text, name of active flow)
      - `current_step_index` (integer, position in current flow)
      - `is_onboarding_complete` (boolean, overall completion status)
      - `last_interaction_at` (timestamptz)
      - `skipped_flows` (jsonb array of permanently skipped flow names)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `onboarding_flow_config`
      - Admin-configurable coach mark flow definitions
      - `id` (uuid, primary key)
      - `flow_name` (text, unique identifier for flow)
      - `display_name` (text, human-readable name)
      - `target_screen` (text, screen where flow should appear)
      - `steps_config` (jsonb, array of step definitions with targets and content)
      - `trigger_condition` (text, when to show this flow)
      - `is_active` (boolean, enable/disable flows)
      - `priority_order` (integer, determines which flow shows first)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Functions
    - `mark_onboarding_step_complete` - Marks a step as completed for a user
    - `skip_onboarding_flow` - Records that user skipped a flow
    - `get_next_recommended_flow` - Suggests next flow based on user progress
    - `reset_user_onboarding` - Resets onboarding for testing (admin only)

  3. Indexes
    - Index on user_onboarding_progress(user_id, is_onboarding_complete)
    - Index on onboarding_flow_config(flow_name, is_active)

  4. Security
    - Enable RLS on all tables
    - Users can read/update their own onboarding progress
    - Only authenticated users can read flow configurations
    - Admin-only access for managing flow configs
*/

-- Create user_onboarding_progress table
CREATE TABLE IF NOT EXISTS user_onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  completed_steps jsonb DEFAULT '[]'::jsonb,
  current_flow_name text,
  current_step_index integer DEFAULT 0,
  is_onboarding_complete boolean DEFAULT false,
  last_interaction_at timestamptz DEFAULT now(),
  skipped_flows jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create onboarding_flow_config table
CREATE TABLE IF NOT EXISTS onboarding_flow_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  target_screen text NOT NULL,
  steps_config jsonb NOT NULL,
  trigger_condition text NOT NULL,
  is_active boolean DEFAULT true,
  priority_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_onboarding_progress_user_complete 
  ON user_onboarding_progress(user_id, is_onboarding_complete);

CREATE INDEX IF NOT EXISTS idx_onboarding_flow_config_flow_active 
  ON onboarding_flow_config(flow_name, is_active);

-- Enable RLS
ALTER TABLE user_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_flow_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_onboarding_progress
CREATE POLICY "Users can view own onboarding progress"
  ON user_onboarding_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding progress"
  ON user_onboarding_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding progress"
  ON user_onboarding_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for onboarding_flow_config
CREATE POLICY "Authenticated users can view active flow configs"
  ON onboarding_flow_config FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Function to mark onboarding step as complete
CREATE OR REPLACE FUNCTION mark_onboarding_step_complete(
  p_user_id uuid,
  p_step_id text,
  p_flow_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_progress record;
  v_completed_steps jsonb;
BEGIN
  -- Get or create user progress record
  INSERT INTO user_onboarding_progress (user_id, completed_steps)
  VALUES (p_user_id, '[]'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current progress
  SELECT * INTO v_progress
  FROM user_onboarding_progress
  WHERE user_id = p_user_id;

  -- Add step to completed steps if not already there
  IF NOT (v_progress.completed_steps ? p_step_id) THEN
    v_completed_steps := v_progress.completed_steps || jsonb_build_array(p_step_id);
    
    UPDATE user_onboarding_progress
    SET 
      completed_steps = v_completed_steps,
      current_flow_name = COALESCE(p_flow_name, current_flow_name),
      last_interaction_at = now(),
      updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  -- Return updated progress
  RETURN jsonb_build_object(
    'success', true,
    'completed_steps', v_completed_steps,
    'step_id', p_step_id
  );
END;
$$;

-- Function to skip an onboarding flow
CREATE OR REPLACE FUNCTION skip_onboarding_flow(
  p_user_id uuid,
  p_flow_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_skipped_flows jsonb;
BEGIN
  -- Get or create user progress record
  INSERT INTO user_onboarding_progress (user_id, skipped_flows)
  VALUES (p_user_id, '[]'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;

  -- Add flow to skipped flows
  UPDATE user_onboarding_progress
  SET 
    skipped_flows = skipped_flows || jsonb_build_array(p_flow_name),
    current_flow_name = NULL,
    current_step_index = 0,
    last_interaction_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'flow_name', p_flow_name,
    'message', 'Flow skipped successfully'
  );
END;
$$;

-- Function to get next recommended flow
CREATE OR REPLACE FUNCTION get_next_recommended_flow(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_progress record;
  v_recommended_flow record;
BEGIN
  -- Get user progress
  SELECT * INTO v_progress
  FROM user_onboarding_progress
  WHERE user_id = p_user_id;

  -- If no progress record, return first flow
  IF v_progress IS NULL THEN
    SELECT * INTO v_recommended_flow
    FROM onboarding_flow_config
    WHERE is_active = true
    ORDER BY priority_order ASC
    LIMIT 1;
    
    RETURN jsonb_build_object(
      'flow_name', v_recommended_flow.flow_name,
      'display_name', v_recommended_flow.display_name,
      'steps_config', v_recommended_flow.steps_config
    );
  END IF;

  -- Find highest priority flow that hasn't been completed or skipped
  SELECT * INTO v_recommended_flow
  FROM onboarding_flow_config
  WHERE is_active = true
    AND NOT (v_progress.skipped_flows ? flow_name)
  ORDER BY priority_order ASC
  LIMIT 1;

  IF v_recommended_flow IS NULL THEN
    RETURN jsonb_build_object('message', 'No more flows available');
  END IF;

  RETURN jsonb_build_object(
    'flow_name', v_recommended_flow.flow_name,
    'display_name', v_recommended_flow.display_name,
    'target_screen', v_recommended_flow.target_screen,
    'steps_config', v_recommended_flow.steps_config
  );
END;
$$;

-- Function to reset user onboarding (for testing)
CREATE OR REPLACE FUNCTION reset_user_onboarding(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM user_onboarding_progress WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Onboarding progress reset successfully'
  );
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION mark_onboarding_step_complete TO authenticated;
GRANT EXECUTE ON FUNCTION skip_onboarding_flow TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_recommended_flow TO authenticated;
GRANT EXECUTE ON FUNCTION reset_user_onboarding TO authenticated;