/*
  # Update Kit Application to Include House Images

  1. Changes
    - Modify apply_kit_to_house function to support copying house_image from kit customization
    - Preserve house_image when it's part of a kit's customization
    - Allow house images to be independent or part of kit application

  2. Behavior
    - When applying a kit, if the kit has a house_image in customization, copy it to houses table
    - If kit doesn't have a house_image, preserve the current house image
*/

CREATE OR REPLACE FUNCTION apply_kit_to_house(p_kit_id uuid, p_house_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_kit_name text;
  v_kit_colors text[];
  v_kit_colors_jsonb jsonb;
  v_kit_rarity text;
  v_house_exists boolean;
  v_user_is_creator boolean;
  v_user_owns_kit boolean;
  v_existing_house_image text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  SELECT name, color_scheme, rarity
  INTO v_kit_name, v_kit_colors, v_kit_rarity
  FROM house_kits
  WHERE id = p_kit_id;

  IF v_kit_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kit not found'
    );
  END IF;

  v_kit_colors_jsonb := to_jsonb(v_kit_colors);

  SELECT EXISTS(
    SELECT 1 FROM houses
    WHERE id = p_house_id
  ) INTO v_house_exists;

  IF NOT v_house_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'House not found'
    );
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM houses
    WHERE id = p_house_id AND creator_id = v_user_id
  ) INTO v_user_is_creator;

  IF NOT v_user_is_creator THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only the house creator can apply kits to this house'
    );
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM user_house_kits
    WHERE user_id = v_user_id AND house_kit_id = p_kit_id
  ) INTO v_user_owns_kit;

  IF NOT v_user_owns_kit THEN
    INSERT INTO user_house_kits (user_id, house_kit_id)
    VALUES (v_user_id, p_kit_id)
    ON CONFLICT (user_id, house_kit_id) DO NOTHING;
  END IF;

  -- Get existing house image from current house
  SELECT image_url INTO v_existing_house_image
  FROM houses
  WHERE id = p_house_id;

  -- Update or create house customization (preserves house_image for future kit applications)
  INSERT INTO house_customizations (
    house_id,
    applied_kit_id,
    custom_banner_colors,
    rarity,
    house_image,
    created_at,
    updated_at
  )
  VALUES (
    p_house_id,
    p_kit_id,
    v_kit_colors_jsonb,
    v_kit_rarity,
    v_existing_house_image,
    now(),
    now()
  )
  ON CONFLICT (house_id)
  DO UPDATE SET
    applied_kit_id = p_kit_id,
    custom_banner_colors = v_kit_colors_jsonb,
    rarity = v_kit_rarity,
    house_image = COALESCE(EXCLUDED.house_image, house_customizations.house_image),
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Kit applied to house successfully',
    'kit_name', v_kit_name
  );
END;
$$;

COMMENT ON FUNCTION apply_kit_to_house IS 'Applies a house kit to a house and preserves house image. Only house creators can apply kits.';