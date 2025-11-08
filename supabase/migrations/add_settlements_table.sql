-- Migration: Add settlements table for tracking confirmed settlements
-- Run this in your Supabase SQL Editor if you've already set up the database

-- Create settlements table
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(from_user_id, to_user_id, amount, created_at)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_settlements_from_user_id ON settlements(from_user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_to_user_id ON settlements(to_user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_is_confirmed ON settlements(is_confirmed);

-- Enable RLS
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all settlements" ON settlements
  FOR SELECT USING (true);

CREATE POLICY "Users can create settlements" ON settlements
  FOR INSERT WITH CHECK (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Receivers can confirm settlements" ON settlements
  FOR UPDATE USING (auth.uid() = to_user_id AND is_confirmed = false);

