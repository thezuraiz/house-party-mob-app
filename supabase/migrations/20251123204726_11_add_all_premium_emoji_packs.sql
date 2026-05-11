/*
  # Add All Premium Emoji Packs
  
  Adds 20+ premium emoji packs with various themes
*/

-- Add awesome new emoji packs for premium users
INSERT INTO emoji_packs (name, emojis, preview_emoji, price_cents, is_free, theme_color, secondary_color)
VALUES
  -- Food & Drink Theme
  ('Foodie', ARRAY['🍕', '🍔', '🍟', '🌭', '🍿', '🧃', '🍩', '🍰', '🎂', '🍪'], '🍕', 0, false, '#FF6B6B', '#EE5A52'),
  
  -- Nature & Plants
  ('Nature', ARRAY['🌲', '🌳', '🌴', '🌵', '🌾', '🍀', '🌺', '🌻', '🌷', '🌹'], '🌲', 0, false, '#51CF66', '#40C057'),
  
  -- Space & Cosmos
  ('Cosmic', ARRAY['🌌', '🪐', '🌙', '⭐', '✨', '🌟', '💫', '🚀', '🛸', '👽'], '🌌', 0, false, '#4C6EF5', '#364FC7'),
  
  -- Celebration & Party
  ('Party Time', ARRAY['🎉', '🎊', '🎈', '🎁', '🎀', '🎆', '🎇', '✨', '🥳', '🍾'], '🎉', 0, false, '#FF6B9D', '#F06595'),
  
  -- Technology & Digital
  ('Tech Life', ARRAY['💻', '📱', '⌨️', '🖱️', '🖥️', '🎧', '🎮', '🕹️', '📡', '🔌'], '💻', 0, false, '#4DABF7', '#339AF0'),
  
  -- Fantasy & Magic
  ('Mystic', ARRAY['🔮', '✨', '🪄', '🧙', '🧚', '🦄', '🐉', '👑', '💎', '🗡️'], '🔮', 0, false, '#9775FA', '#7950F2'),
  
  -- Music & Sound
  ('Music Vibes', ARRAY['🎵', '🎶', '🎸', '🎹', '🎺', '🎷', '🥁', '🎤', '🎧', '🎼'], '🎵', 0, false, '#FF8787', '#FA5252'),
  
  -- Ocean & Marine
  ('Ocean Life', ARRAY['🌊', '🐠', '🐟', '🦈', '🐙', '🦑', '🐚', '🦀', '🦞', '🐬'], '🌊', 0, false, '#339AF0', '#228BE6'),
  
  -- Weather & Sky
  ('Weather', ARRAY['☀️', '🌤️', '⛅', '🌥️', '☁️', '🌧️', '⛈️', '🌩️', '🌈', '❄️'], '☀️', 0, false, '#FFD43B', '#FCC419'),
  
  -- Travel & Adventure
  ('Wanderlust', ARRAY['✈️', '🚗', '🚂', '🚢', '🗺️', '🧳', '🏖️', '🗼', '🏰', '⛰️'], '✈️', 0, false, '#74C0FC', '#4DABF7'),
  
  -- Fruits & Healthy
  ('Fresh Fruits', ARRAY['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🥝', '🍑', '🥑'], '🍎', 0, false, '#FFD43B', '#FAB005'),
  
  -- Fire & Energy
  ('Blazing', ARRAY['🔥', '💥', '⚡', '💫', '✨', '⭐', '🌟', '💢', '🔆', '☄️'], '🔥', 0, false, '#FF6B6B', '#FA5252'),
  
  -- Love & Hearts
  ('Heartfelt', ARRAY['❤️', '💕', '💖', '💗', '💓', '💝', '💘', '💞', '💟', '♥️'], '❤️', 0, false, '#FF6B9D', '#F06595'),
  
  -- Retro & Vintage
  ('Retro Wave', ARRAY['📼', '📻', '☎️', '📟', '💾', '📠', '📺', '🎙️', '📹', '📷'], '📼', 0, false, '#FF6B9D', '#E64980'),
  
  -- Monsters & Creatures
  ('Creatures', ARRAY['👾', '👻', '👹', '👺', '💀', '☠️', '👽', '🤖', '🎃', '😈'], '👾', 0, false, '#9775FA', '#845EF7'),
  
  -- Tools & Work
  ('Work Tools', ARRAY['🔨', '🔧', '⚙️', '🛠️', '⚒️', '🔩', '⛏️', '🪛', '🔪', '✂️'], '🔨', 0, false, '#868E96', '#495057'),
  
  -- Ninja & Martial Arts
  ('Warrior', ARRAY['🥷', '🥋', '⚔️', '🗡️', '🛡️', '🏹', '🎯', '💣', '🧨', '⚡'], '🥷', 0, false, '#212529', '#343A40'),
  
  -- Rainbow & Colors
  ('Rainbow', ARRAY['🌈', '🎨', '🖌️', '🖍️', '✏️', '🖊️', '🖋️', '📝', '💐', '🌸'], '🌈', 0, false, '#FF6B9D', '#F783AC'),
  
  -- Winter & Snow
  ('Winter', ARRAY['❄️', '⛄', '☃️', '🎿', '⛷️', '🏂', '🧊', '🌨️', '🧣', '🧤'], '❄️', 0, false, '#A5D8FF', '#74C0FC'),
  
  -- Pirates & Adventure
  ('Pirate Life', ARRAY['🏴‍☠️', '⚓', '🦜', '💰', '💎', '🗺️', '🧭', '⛵', '🚢', '🏝️'], '🏴‍☠️', 0, false, '#864E41', '#5C3D33')
ON CONFLICT DO NOTHING;