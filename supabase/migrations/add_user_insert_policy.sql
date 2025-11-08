-- Migration: Add INSERT policy for users table
-- This allows users to create their own record in the users table
-- Run this in your Supabase SQL Editor if you've already set up the database

-- Drop the policy if it already exists (idempotent)
DROP POLICY IF EXISTS "Users can insert their own record" ON users;

-- Create the INSERT policy
CREATE POLICY "Users can insert their own record" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

