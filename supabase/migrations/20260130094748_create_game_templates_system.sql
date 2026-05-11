/*
  # Game Templates System
  
  1. New Tables
    - `game_templates`
      - `id` (uuid, primary key)
      - `name` (text) - Template name
      - `emoji` (text) - Game emoji icon
      - `description` (text) - Template description
      - `category` (text) - Category (Sports, Party, Board Games, etc.)
      - `scoring_type` (text) - Type of scoring
      - `scoring_category` (text) - Category from ScoringTypes
      - `lower_is_better` (boolean) - Scoring direction
      - `default_unit` (text) - Default unit for measurements
      - `max_attempts` (integer) - Max attempts if applicable
      - `is_popular` (boolean) - Featured/popular template
      - `popularity_rank` (integer) - Display order
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on `game_templates`
    - Public read access (everyone can view templates)
    - Only admins can manage templates
    
  3. Sample Data
    - Seed with 15+ popular game templates across categories
*/

-- Create game templates table
CREATE TABLE IF NOT EXISTS game_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  scoring_type text NOT NULL,
  scoring_category text NOT NULL,
  lower_is_better boolean DEFAULT false,
  default_unit text,
  max_attempts integer,
  is_popular boolean DEFAULT false,
  popularity_rank integer DEFAULT 999,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE game_templates ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view game templates"
  ON game_templates FOR SELECT
  TO authenticated
  USING (true);

-- Seed popular game templates
INSERT INTO game_templates (name, emoji, description, category, scoring_type, scoring_category, lower_is_better, default_unit, max_attempts, is_popular, popularity_rank) VALUES
  -- Darts
  ('Darts 501', '🎯', 'Classic 501 countdown - First to exactly 0 wins!', 'Sports', 'quickTally', 'points', true, NULL, NULL, true, 1),
  ('Darts 301', '🎯', 'Faster 301 countdown game', 'Sports', 'quickTally', 'points', true, NULL, NULL, true, 2),
  ('Darts Cricket', '🎯', 'Hit numbers 15-20 and bullseye', 'Sports', 'quickTally', 'points', false, NULL, NULL, false, 10),
  
  -- Billiards/Pool
  ('Pool - Race to 100', '🎱', 'First player to 100 points wins', 'Sports', 'quickTally', 'points', false, NULL, NULL, true, 3),
  ('8-Ball Pool', '🎱', 'Win by pocketing all your balls + 8-ball', 'Sports', 'quickTally', 'wins', false, NULL, NULL, false, 11),
  ('9-Ball Pool', '🎱', 'Pocket the 9-ball to win', 'Sports', 'quickTally', 'wins', false, NULL, NULL, false, 12),
  
  -- Ping Pong
  ('Ping Pong - First to 11', '🏓', 'Classic table tennis to 11 points', 'Sports', 'quickTally', 'points', false, NULL, NULL, true, 4),
  ('Ping Pong - First to 21', '🏓', 'Extended match to 21 points', 'Sports', 'quickTally', 'points', false, NULL, NULL, false, 13),
  
  -- Video Games
  ('Video Game - Kills', '🎮', 'Track kills in multiplayer games', 'Gaming', 'quickTally', 'score', false, NULL, NULL, true, 5),
  ('Video Game - K/D Ratio', '🎮', 'Track kills and deaths for K/D ratio', 'Gaming', 'ratio', 'ratio', false, NULL, NULL, false, 14),
  
  -- Basketball
  ('Basketball - 21', '🏀', 'First to exactly 21 points wins', 'Sports', 'quickTally', 'points', false, NULL, NULL, true, 6),
  ('Basketball - HORSE', '🏀', 'Miss a shot = get a letter. HORSE = out!', 'Sports', 'quickTally', 'points', true, NULL, NULL, false, 15),
  ('Basketball - Points', '🏀', 'Track total points scored', 'Sports', 'quickTally', 'points', false, NULL, NULL, false, 16),
  
  -- Card Games
  ('Poker - Chips', '🃏', 'Track poker chip counts', 'Card Games', 'quickTally', 'score', false, NULL, NULL, true, 7),
  ('Rummy - Points', '🃏', 'First to target score wins', 'Card Games', 'quickTally', 'points', false, NULL, NULL, false, 17),
  ('UNO', '🃏', 'Track rounds won', 'Card Games', 'quickTally', 'wins', false, NULL, NULL, false, 18),
  
  -- Bowling
  ('Bowling', '🎳', 'Traditional 10-frame bowling', 'Sports', 'quickTally', 'points', false, NULL, NULL, true, 8),
  
  -- Sports Games (FIFA, etc.)
  ('FIFA/Soccer', '⚽', 'Track goals scored in FIFA or real soccer', 'Gaming', 'quickTally', 'points', false, NULL, NULL, true, 9),
  ('Madden/Football', '🏈', 'Track touchdowns or final score', 'Gaming', 'quickTally', 'points', false, NULL, NULL, false, 19),
  
  -- Board Games
  ('Board Game - Victory Points', '🎲', 'Track victory points for any board game', 'Board Games', 'quickTally', 'points', false, NULL, NULL, false, 20),
  ('Monopoly Money', '🎲', 'Track money totals', 'Board Games', 'quickTally', 'score', false, NULL, NULL, false, 21),
  
  -- Cornhole
  ('Cornhole', '🌽', 'First to 21 points wins', 'Sports', 'quickTally', 'points', false, NULL, NULL, false, 22),
  
  -- Beer Pong
  ('Beer Pong', '🍺', 'Track cups remaining or points', 'Party', 'quickTally', 'points', true, NULL, NULL, true, 10),
  
  -- General
  ('Custom Score Tracker', '📊', 'Track any score - highest wins', 'General', 'quickTally', 'score', false, NULL, NULL, false, 99);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_game_templates_popular ON game_templates(is_popular, popularity_rank);
CREATE INDEX IF NOT EXISTS idx_game_templates_category ON game_templates(category);
