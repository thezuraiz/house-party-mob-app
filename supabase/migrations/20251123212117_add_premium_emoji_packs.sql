/*
  # Add Premium Emoji Packs
  
  1. New Emoji Packs
    - Add 20 premium emoji packs
    - Each pack has 8-12 themed emojis
    - All packs are FREE (price_cents = 0, is_free = false means premium content available to all)
*/

INSERT INTO emoji_packs (name, emojis, preview_emoji, price_cents, is_free, theme_color, secondary_color)
VALUES
  ('Foodie', ARRAY['🍕', '🍔', '🍟', '🌭', '🍿', '🧃', '🍩', '🍰', '🎂', '🍪'], '🍕', 0, false, '#FF6B6B', '#EE5A52'),
  ('Nature', ARRAY['🌲', '🌳', '🌴', '🌵', '🌾', '🍀', '🌺', '🌻', '🌷', '🌹'], '🌲', 0, false, '#51CF66', '#40C057'),
  ('Cosmic', ARRAY['🌌', '🪐', '🌙', '⭐', '✨', '🌟', '💫', '🚀', '🛸', '👽'], '🌌', 0, false, '#4C6EF5', '#364FC7'),
  ('Party Time', ARRAY['🎉', '🎊', '🎈', '🎁', '🎀', '🎆', '🎇', '✨', '🥳', '🍾'], '🎉', 0, false, '#FF6B9D', '#F06595'),
  ('Tech Life', ARRAY['💻', '📱', '⌨️', '🖱️', '🖥️', '🎧', '🎮', '🕹️', '📡', '🔌'], '💻', 0, false, '#4DABF7', '#339AF0'),
  ('Mystic', ARRAY['🔮', '✨', '🪄', '🧙', '🧚', '🦄', '🐉', '👑', '💎', '🗡️'], '🔮', 0, false, '#9775FA', '#7950F2'),
  ('Music Vibes', ARRAY['🎵', '🎶', '🎸', '🎹', '🎺', '🎷', '🥁', '🎤', '🎧', '🎼'], '🎵', 0, false, '#FF8787', '#FA5252'),
  ('Ocean Life', ARRAY['🌊', '🐠', '🐟', '🦈', '🐙', '🦑', '🐚', '🦀', '🦞', '🐬'], '🌊', 0, false, '#339AF0', '#228BE6'),
  ('Weather', ARRAY['☀️', '🌤️', '⛅', '🌥️', '☁️', '🌧️', '⛈️', '🌩️', '🌈', '❄️'], '☀️', 0, false, '#FFD43B', '#FCC419'),
  ('Wanderlust', ARRAY['✈️', '🚗', '🚂', '🚢', '🗺️', '🧳', '🏖️', '🗼', '🏰', '⛰️'], '✈️', 0, false, '#74C0FC', '#4DABF7'),
  ('Fresh Fruits', ARRAY['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🥝', '🍑', '🥑'], '🍎', 0, false, '#FFD43B', '#FAB005'),
  ('Blazing', ARRAY['🔥', '💥', '⚡', '💫', '✨', '⭐', '🌟', '💢', '🔆', '☄️'], '🔥', 0, false, '#FF6B6B', '#FA5252'),
  ('Heartfelt', ARRAY['❤️', '💕', '💖', '💗', '💓', '💝', '💘', '💞', '💟', '♥️'], '❤️', 0, false, '#FF6B9D', '#F06595'),
  ('Retro Wave', ARRAY['📼', '📻', '☎️', '📟', '💾', '📠', '📺', '🎙️', '📹', '📷'], '📼', 0, false, '#FF6B9D', '#E64980'),
  ('Creatures', ARRAY['👾', '👻', '👹', '👺', '💀', '☠️', '👽', '🤖', '🎃', '😈'], '👾', 0, false, '#9775FA', '#845EF7'),
  ('Work Tools', ARRAY['🔨', '🔧', '⚙️', '🛠️', '⚒️', '🔩', '⛏️', '🪛', '🔪', '✂️'], '🔨', 0, false, '#868E96', '#495057'),
  ('Warrior', ARRAY['🥷', '🥋', '⚔️', '🗡️', '🛡️', '🏹', '🎯', '💣', '🧨', '⚡'], '🥷', 0, false, '#212529', '#343A40'),
  ('Rainbow', ARRAY['🌈', '🎨', '🖌️', '🖍️', '✏️', '🖊️', '🖋️', '📝', '💐', '🌸'], '🌈', 0, false, '#FF6B9D', '#F783AC'),
  ('Winter', ARRAY['❄️', '⛄', '☃️', '🎿', '⛷️', '🏂', '🧊', '🌨️', '🧣', '🧤'], '❄️', 0, false, '#A5D8FF', '#74C0FC'),
  ('Pirate Life', ARRAY['🏴‍☠️', '⚓', '🦜', '💰', '💎', '🗺️', '🧭', '⛵', '🚢', '🏝️'], '🏴‍☠️', 0, false, '#864E41', '#5C3D33')
ON CONFLICT DO NOTHING;