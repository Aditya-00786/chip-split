-- Migration: Add policy for game hosts to create transactions for participants
-- This allows game hosts to create buy_in transactions when starting a game
-- Run this in your Supabase SQL Editor if you've already set up the database

-- Drop the policy if it already exists (idempotent)
DROP POLICY IF EXISTS "Game hosts can create transactions for participants" ON game_transactions;

-- Create the policy
CREATE POLICY "Game hosts can create transactions for participants" ON game_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_transactions.game_id
      AND games.host_id = auth.uid()
    )
  );

