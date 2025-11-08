-- Migration: Add policy for game hosts to update participants when starting game
-- This allows game hosts to update initial_chips for all participants when starting a game
-- Run this in your Supabase SQL Editor if you've already set up the database

-- Drop the policy if it already exists (idempotent)
DROP POLICY IF EXISTS "Game hosts can update participants when starting game" ON game_participants;

-- Create the policy
CREATE POLICY "Game hosts can update participants when starting game" ON game_participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_participants.game_id
      AND games.host_id = auth.uid()
      AND games.status = 'pending'
    )
  );

