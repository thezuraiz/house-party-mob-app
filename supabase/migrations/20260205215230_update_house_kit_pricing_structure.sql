/*
  # Update House Kit Pricing Structure

  1. Changes
    - Update all house kit prices to range from $2 USD to $300 USD
    - Make Golden Hour the most expensive purchasable kit at $300 USD (30000 cents)
    - Make Eternal Radiance the second most expensive at $250 USD (25000 cents)
    - Adjust all other kit prices to create a smooth progression
    - Keep Aurora Borealis as the only earnable (free) kit

  2. New Pricing Structure
    - Neon Nights: $2.00
    - Ocean Breeze: $3.00
    - Sunset Glow: $5.00
    - Forest Grove: $7.00
    - Royal Purple: $10.00
    - Cyberpunk: $15.00
    - Galaxy: $25.00
    - Dragon Fire: $35.00
    - Diamond Ice: $50.00
    - Celestial Dreams: $80.00
    - Phantom Obsidian: $150.00
    - Eternal Radiance: $250.00
    - Golden Hour: $300.00 (now purchasable)
    - Aurora Borealis: Free (earnable)

  Note: Prices are stored in cents. Discount system remains unchanged.
*/

-- Update purchasable house kits with new pricing
UPDATE house_kits SET price_cents = 200 WHERE id = '11000000-0001-0000-0000-000000000001'::uuid; -- Neon Nights
UPDATE house_kits SET price_cents = 300 WHERE id = '11000000-0002-0000-0000-000000000002'::uuid; -- Ocean Breeze
UPDATE house_kits SET price_cents = 500 WHERE id = '11000000-0003-0000-0000-000000000003'::uuid; -- Sunset Glow
UPDATE house_kits SET price_cents = 700 WHERE id = '11000000-0004-0000-0000-000000000004'::uuid; -- Forest Grove
UPDATE house_kits SET price_cents = 1000 WHERE id = '11000000-0005-0000-0000-000000000005'::uuid; -- Royal Purple
UPDATE house_kits SET price_cents = 1500 WHERE id = '11000000-0006-0000-0000-000000000006'::uuid; -- Cyberpunk
UPDATE house_kits SET price_cents = 2500 WHERE id = '11000000-0007-0000-0000-000000000007'::uuid; -- Galaxy
UPDATE house_kits SET price_cents = 3500 WHERE id = '11000000-0008-0000-0000-000000000008'::uuid; -- Dragon Fire
UPDATE house_kits SET price_cents = 5000 WHERE id = '11000000-0009-0000-0000-000000000009'::uuid; -- Diamond Ice
UPDATE house_kits SET price_cents = 8000 WHERE id = '11000000-0010-0000-0000-000000000010'::uuid; -- Celestial Dreams
UPDATE house_kits SET price_cents = 15000 WHERE id = '11000000-0011-0000-0000-000000000011'::uuid; -- Phantom Obsidian
UPDATE house_kits SET price_cents = 25000 WHERE id = '11000000-0012-0000-0000-000000000012'::uuid; -- Eternal Radiance

-- Make Golden Hour purchasable at $300 (most expensive)
UPDATE house_kits SET price_cents = 30000 WHERE id = '12000000-0001-0000-0000-000000000001'::uuid; -- Golden Hour

-- Keep Aurora Borealis as earnable (free)
-- No change needed for Aurora Borealis (remains at 0 cents)
