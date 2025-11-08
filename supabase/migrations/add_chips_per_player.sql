-- Migration: Add chips_per_player field to games table
-- This allows storing chips per player instead of total pot when creating games
-- Run this in your Supabase SQL Editor if you've already set up the database

-- Add chips_per_player column
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS chips_per_player INTEGER;

-- For existing games, calculate chips_per_player from pot_chips
-- Assuming they had equal distribution (this is a best guess)
UPDATE games 
SET chips_per_player = CASE 
  WHEN pot_chips > 0 THEN pot_chips 
  ELSE 1000 
END
WHERE chips_per_player IS NULL;

-- Make chips_per_player NOT NULL after setting defaults
ALTER TABLE games 
ALTER COLUMN chips_per_player SET NOT NULL;

-- Make pot_chips nullable (it will be calculated when game starts)
ALTER TABLE games 
ALTER COLUMN pot_chips DROP NOT NULL;

-- Set default for pot_chips to 0
ALTER TABLE games 
ALTER COLUMN pot_chips SET DEFAULT 0;

