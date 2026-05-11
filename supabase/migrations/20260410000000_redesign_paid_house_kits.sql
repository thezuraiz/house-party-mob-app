/*
  # Redesign Paid House Kits
  
  Replaces old kit color schemes with a new cool, design-forward set
  that fits the black/white/accent brand aesthetic.
  
  Kit tiers:
  - Common ($2.99): Midnight Smoke, Arctic Frost
  - Uncommon ($4.99): Ember, Jade
  - Rare ($7.99): Void, Chrome
  - Epic ($12.99): Abyss, Inferno
  - Legendary ($19.99): Obsidian Gold
  - Legendary ($49.99): Neon Pulse
  - Legendary ($99.99): Phantom Void
  - Mythic ($399.99): Prismatic
  
  Earnable kits unchanged: Golden Hour (legendary), Aurora Borealis (mythic)
*/

-- Update purchasable kits with new names, colors, descriptions
INSERT INTO house_kits (id, name, description, rarity, color_scheme, price_cents, is_active)
VALUES
  ('11000000-0001-0000-0000-000000000001'::uuid,
   'Midnight Smoke',
   'Deep charcoal fading into cool slate — clean, dark, effortless',
   'common',
   ARRAY['#1C1C1E', '#2C2C2E', '#3A3A3C', '#48484A'],
   299, true),

  ('11000000-0002-0000-0000-000000000002'::uuid,
   'Arctic Frost',
   'Crisp icy whites and cool blues — sharp and minimal',
   'common',
   ARRAY['#E8F4F8', '#B8D4E8', '#7EB8D4', '#4A9AB8'],
   299, true),

  ('11000000-0003-0000-0000-000000000003'::uuid,
   'Ember',
   'Smouldering deep red to burnt orange — intense and bold',
   'uncommon',
   ARRAY['#1A0000', '#5C1010', '#B22222', '#E05C00'],
   499, true),

  ('11000000-0004-0000-0000-000000000004'::uuid,
   'Jade',
   'Dark forest green to cool mint — fresh and refined',
   'uncommon',
   ARRAY['#0A1A0F', '#1A3A24', '#2D6A4F', '#52B788'],
   499, true),

  ('11000000-0005-0000-0000-000000000005'::uuid,
   'Void',
   'Pure black with a deep violet undertone — mysterious and sleek',
   'rare',
   ARRAY['#000000', '#0D0010', '#1A0030', '#2D0050'],
   799, true),

  ('11000000-0006-0000-0000-000000000006'::uuid,
   'Chrome',
   'Polished silver metallic gradient — industrial luxury',
   'rare',
   ARRAY['#2A2A2A', '#5A5A5A', '#9A9A9A', '#D4D4D4'],
   799, true),

  ('11000000-0007-0000-0000-000000000007'::uuid,
   'Abyss',
   'Deep navy to electric blue — like diving into the deep end',
   'epic',
   ARRAY['#000814', '#001D3D', '#003566', '#0077B6'],
   1299, true),

  ('11000000-0008-0000-0000-000000000008'::uuid,
   'Inferno',
   'Black to crimson to molten gold — power and heat',
   'epic',
   ARRAY['#0A0000', '#3D0000', '#8B0000', '#CC3300', '#FF6600'],
   1299, true),

  ('11000000-0009-0000-0000-000000000009'::uuid,
   'Obsidian Gold',
   'Pure black with sweeping gold shimmer — the definition of premium',
   'legendary',
   ARRAY['#000000', '#0A0A0A', '#1A1A1A', '#FFD700'],
   1999, true),

  ('11000000-0010-0000-0000-000000000010'::uuid,
   'Neon Pulse',
   'Jet black with cycling electric neon — alive and electric',
   'legendary',
   ARRAY['#000000', '#0A0A0A', '#111111', '#00FFFF'],
   4999, true),

  ('11000000-0011-0000-0000-000000000011'::uuid,
   'Phantom Void',
   'Ultra-dark with electric cyan waves cutting through the dark',
   'legendary',
   ARRAY['#000000', '#050510', '#0A0A20', '#00FFFF', '#00CED1'],
   9999, true),

  ('11000000-0012-0000-0000-000000000012'::uuid,
   'Prismatic',
   'Holographic rainbow shifting across pure white — the rarest of all',
   'mythic',
   ARRAY['#FFFFFF', '#F0F0FF', '#E8E8FF', '#4A7BF7', '#9D00FF', '#FF1493', '#FF6B00', '#FFD700'],
   39999, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rarity = EXCLUDED.rarity,
  color_scheme = EXCLUDED.color_scheme,
  price_cents = EXCLUDED.price_cents,
  is_active = EXCLUDED.is_active;

-- Update kit_items to match new colors
INSERT INTO kit_items (id, name, rarity, item_data, house_kit_id, is_unlockable)
VALUES
  ('21000000-0001-0000-0000-000000000001'::uuid, 'Midnight Smoke Items', 'common',
    jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#1C1C1E','#2C2C2E','#3A3A3C','#48484A'), 'text', '#FFFFFF', 'accent', '#9A9A9A')),
    '11000000-0001-0000-0000-000000000001'::uuid, false),

  ('21000000-0002-0000-0000-000000000002'::uuid, 'Arctic Frost Items', 'common',
    jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#E8F4F8','#B8D4E8','#7EB8D4','#4A9AB8'), 'text', '#000000', 'accent', '#4A9AB8')),
    '11000000-0002-0000-0000-000000000002'::uuid, false),

  ('21000000-0003-0000-0000-000000000003'::uuid, 'Ember Items', 'uncommon',
    jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#1A0000','#5C1010','#B22222','#E05C00'), 'text', '#FFFFFF', 'accent', '#E05C00')),
    '11000000-0003-0000-0000-000000000003'::uuid, false),

  ('21000000-0004-0000-0000-000000000004'::uuid, 'Jade Items', 'uncommon',
    jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#0A1A0F','#1A3A24','#2D6A4F','#52B788'), 'text', '#FFFFFF', 'accent', '#52B788')),
    '11000000-0004-0000-0000-000000000004'::uuid, false),

  ('21000000-0005-0000-0000-000000000005'::uuid, 'Void Items', 'rare',
    jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#000000','#0D0010','#1A0030','#2D0050'), 'text', '#FFFFFF', 'accent', '#7B2FBE')),
    '11000000-0005-0000-0000-000000000005'::uuid, false),

  ('21000000-0006-0000-0000-000000000006'::uuid, 'Chrome Items', 'rare',
    jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#2A2A2A','#5A5A5A','#9A9A9A','#D4D4D4'), 'text', '#000000', 'accent', '#D4D4D4')),
    '11000000-0006-0000-0000-000000000006'::uuid, false),

  ('21000000-0007-0000-0000-000000000007'::uuid, 'Abyss Items', 'epic',
    jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#000814','#001D3D','#003566','#0077B6'), 'text', '#FFFFFF', 'accent', '#0077B6')),
    '11000000-0007-0000-0000-000000000007'::uuid, false),

  ('21000000-0008-0000-0000-000000000008'::uuid, 'Inferno Items', 'epic',
    jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#0A0000','#3D0000','#8B0000','#CC3300','#FF6600'), 'text', '#FFFFFF', 'accent', '#FF6600')),
    '11000000-0008-0000-0000-000000000008'::uuid, false),

  ('21000000-0009-0000-0000-000000000009'::uuid, 'Obsidian Gold Items', 'legendary',
    jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#000000','#0A0A0A','#1A1A1A','#FFD700'), 'text', '#FFD700', 'accent', '#FFD700', 'glow', '#FFD700'),
    'effects', jsonb_build_object('shimmer', true, 'glow', true)),
    '11000000-0009-0000-0000-000000000009'::uuid, false),

  ('21000000-0010-0000-0000-000000000010'::uuid, 'Neon Pulse Items', 'legendary',
    jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#000000','#0A0A0A','#111111','#00FFFF'), 'text', '#FFFFFF', 'accent', '#00FFFF', 'glow', '#00FFFF'),
    'effects', jsonb_build_object('neon', true, 'pulse', true)),
    '11000000-0010-0000-0000-000000000010'::uuid, false),

  ('21000000-0011-0000-0000-000000000011'::uuid, 'Phantom Void Items', 'legendary',
    jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#000000','#050510','#0A0A20','#00FFFF','#00CED1'), 'text', '#FFFFFF', 'accent', '#00FFFF', 'glow', '#00CED1'),
    'effects', jsonb_build_object('waves', true, 'glow', true)),
    '11000000-0011-0000-0000-000000000011'::uuid, false),

  ('21000000-0012-0000-0000-000000000012'::uuid, 'Prismatic Items', 'mythic',
    jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#FFFFFF','#F0F0FF','#E8E8FF','#4A7BF7','#9D00FF','#FF1493','#FF6B00','#FFD700'), 'text', '#000000', 'accent', '#4A7BF7', 'glow', '#FFFFFF'),
    'effects', jsonb_build_object('holographic', true, 'prismatic', true, 'aurora', true)),
    '11000000-0012-0000-0000-000000000012'::uuid, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  rarity = EXCLUDED.rarity,
  item_data = EXCLUDED.item_data,
  house_kit_id = EXCLUDED.house_kit_id,
  is_unlockable = EXCLUDED.is_unlockable;
