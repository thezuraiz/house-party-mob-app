/*
  # Update House Kit Prices (ZAR-based)

  Prices are stored in USD cents and displayed in ZAR at runtime using live exchange rate.
  Target ZAR prices (at ~18.5 USD/ZAR rate):

  | Kit                | ZAR Price  | USD Price  | USD Cents |
  |--------------------|------------|------------|-----------|
  | Midnight Smoke     | R4.99      | ~$0.27     | 27        |
  | Arctic Frost       | R4.99      | ~$0.27     | 27        |
  | Ember              | R4.99      | ~$0.27     | 27        |
  | Jade               | R4.99      | ~$0.27     | 27        |
  | Void               | R4.99      | ~$0.27     | 27        |
  | Chrome             | R4.99      | ~$0.27     | 27        |
  | Abyss              | R4.99      | ~$0.27     | 27        |
  | Inferno            | R4.99      | ~$0.27     | 27        |
  | Stellar            | R4.99      | ~$0.27     | 27        |
  | Neon Rift Loadout  | R4.99      | ~$0.27     | 27        |
  | Phantom Echo Set   | R4.99      | ~$0.27     | 27        |
  | Ironclad Vanguard  | R4.99      | ~$0.27     | 27        |
  | Obsidian Gold      | R9.99      | ~$0.54     | 54        |
  | Neon Pulse         | R5.99      | ~$0.32     | 32        |
  | Phantom Void       | R9.99      | ~$0.54     | 54        |
  | Prismatic          | R9.99      | ~$0.54     | 54        |
  | Chaos Theory       | R9.99      | ~$0.54     | 54        |
  | Starlight Prowler  | R39.99     | ~$2.16     | 216       |
  | Liquid Metal Candy | R39.99     | ~$2.16     | 216       |
  | Golden Bushido     | R199.99    | ~$10.81    | 1081      |
*/

-- Common / Uncommon / Rare / Epic gradient kits → R4.99
UPDATE house_kits SET price_cents = 27 WHERE name IN (
  'Midnight Smoke', 'Arctic Frost', 'Ember', 'Jade',
  'Void', 'Chrome', 'Abyss', 'Inferno',
  'Stellar', 'Neon Rift Loadout', 'Phantom Echo Set', 'Ironclad Vanguard'
);

-- Legendary kits
UPDATE house_kits SET price_cents = 54  WHERE name = 'Obsidian Gold';
UPDATE house_kits SET price_cents = 32  WHERE name = 'Neon Pulse';
UPDATE house_kits SET price_cents = 54  WHERE name = 'Phantom Void';
UPDATE house_kits SET price_cents = 54  WHERE name = 'Prismatic';
UPDATE house_kits SET price_cents = 54  WHERE name = 'Chaos Theory';

-- Premium image kits
UPDATE house_kits SET price_cents = 216  WHERE name = 'Starlight Prowler';
UPDATE house_kits SET price_cents = 216  WHERE name = 'Liquid Metal Candy';
UPDATE house_kits SET price_cents = 1081 WHERE name = 'Golden Bushido';

