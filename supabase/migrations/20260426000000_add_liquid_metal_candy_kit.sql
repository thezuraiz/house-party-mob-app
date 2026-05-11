/*
  # Add Liquid Metal Candy Kit

  A mythic-tier premium kit with a liquid chrome + candy iridescent aesthetic.
  Colors shift from deep chrome black through molten silver, hot pink, electric cyan,
  and candy gold — like liquid metal catching light.
*/

INSERT INTO house_kits (id, name, description, rarity, color_scheme, price_cents, is_active)
VALUES (
  '11000000-0015-0000-0000-000000000015'::uuid,
  'Liquid Metal Candy',
  'Molten chrome meets candy iridescence — silver, pink, cyan and gold fused into one dripping premium finish',
  'mythic',
  ARRAY['#0A0A0A', '#2A2A2A', '#C0C0C0', '#FF69B4', '#00FFFF', '#FFD700'],
  19999,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  rarity      = EXCLUDED.rarity,
  color_scheme = EXCLUDED.color_scheme,
  price_cents = EXCLUDED.price_cents,
  is_active   = EXCLUDED.is_active;

INSERT INTO kit_items (id, name, rarity, item_data, house_kit_id, is_unlockable)
VALUES (
  '21000000-0015-0000-0000-000000000015'::uuid,
  'Liquid Metal Candy Items',
  'mythic',
  jsonb_build_object(
    'colors', jsonb_build_object(
      'background', jsonb_build_array('#0A0A0A', '#2A2A2A', '#C0C0C0', '#FF69B4', '#00FFFF', '#FFD700'),
      'text',       '#FFFFFF',
      'accent',     '#FF69B4',
      'glow',       '#00FFFF'
    ),
    'effects', jsonb_build_object(
      'shimmer',      true,
      'iridescent',   true,
      'liquid',       true,
      'glow',         true
    )
  ),
  '11000000-0015-0000-0000-000000000015'::uuid,
  false
)
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  rarity      = EXCLUDED.rarity,
  item_data   = EXCLUDED.item_data,
  house_kit_id = EXCLUDED.house_kit_id,
  is_unlockable = EXCLUDED.is_unlockable;
