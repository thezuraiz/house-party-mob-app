/*
  # Create apply_custom_colors_to_house function
  Accepts colors as text (JSON string) and converts to jsonb internally.
*/

CREATE OR REPLACE FUNCTION apply_custom_colors_to_house(
  p_house_id uuid,
  p_colors text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_user_id uuid;
  v_user_is_creator boolean;
  v_colors_jsonb jsonb;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  BEGIN
    v_colors_jsonb := p_colors::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid colors format');
  END;

  SELECT EXISTS(
    SELECT 1 FROM houses WHERE id = p_house_id AND creator_id = v_user_id
  ) INTO v_user_is_creator;

  IF NOT v_user_is_creator THEN
    SELECT EXISTS(
      SELECT 1 FROM house_members
      WHERE house_id = p_house_id AND user_id = v_user_id AND role = 'admin'
    ) INTO v_user_is_creator;
  END IF;

  IF NOT v_user_is_creator THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the house creator or admin can apply colors');
  END IF;

  INSERT INTO house_customizations (
    house_id, applied_kit_id, custom_banner_colors, rarity, created_at, updated_at
  )
  VALUES (p_house_id, NULL, v_colors_jsonb, 'common', now(), now())
  ON CONFLICT (house_id)
  DO UPDATE SET
    applied_kit_id = NULL,
    custom_banner_colors = v_colors_jsonb,
    rarity = 'common',
    updated_at = now();

  RETURN jsonb_build_object('success', true, 'message', 'Custom colors applied');
END;
$func$;

GRANT EXECUTE ON FUNCTION apply_custom_colors_to_house(uuid, text) TO authenticated;
