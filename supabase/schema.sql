-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  total_net_balance_money NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chips_per_player INTEGER NOT NULL,
  pot_chips INTEGER DEFAULT 0,
  multiplier INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'ended')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Game participants table
CREATE TABLE IF NOT EXISTS game_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  initial_chips INTEGER NOT NULL DEFAULT 0,
  total_rebuys_chips INTEGER NOT NULL DEFAULT 0,
  final_chips INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  net_balance_money NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(game_id, user_id)
);

-- Game transactions table
CREATE TABLE IF NOT EXISTS game_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('buy_in', 'rebuy', 'leave', 'payout')),
  amount_chips INTEGER NOT NULL,
  amount_money NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Settlements table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_host_id ON games(host_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_game_participants_game_id ON game_participants(game_id);
CREATE INDEX IF NOT EXISTS idx_game_participants_user_id ON game_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_game_transactions_game_id ON game_transactions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_transactions_user_id ON game_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_from_user_id ON settlements(from_user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_to_user_id ON settlements(to_user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_is_confirmed ON settlements(is_confirmed);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_participants_updated_at BEFORE UPDATE ON game_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own record" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for games
CREATE POLICY "Users can view all games" ON games
  FOR SELECT USING (true);

CREATE POLICY "Users can create games" ON games
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their games" ON games
  FOR UPDATE USING (auth.uid() = host_id);

-- RLS Policies for game_participants
CREATE POLICY "Users can view all participants" ON game_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join games" ON game_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" ON game_participants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Game hosts can update participants when starting game" ON game_participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_participants.game_id
      AND games.host_id = auth.uid()
      AND games.status = 'pending'
    )
  );

-- RLS Policies for game_transactions
CREATE POLICY "Users can view all transactions" ON game_transactions
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own transactions" ON game_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Game hosts can create transactions for participants" ON game_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_transactions.game_id
      AND games.host_id = auth.uid()
    )
  );

-- RLS Policies for settlements
CREATE POLICY "Users can view all settlements" ON settlements
  FOR SELECT USING (true);

CREATE POLICY "Users can create settlements" ON settlements
  FOR INSERT WITH CHECK (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Receivers can confirm settlements" ON settlements
  FOR UPDATE USING (auth.uid() = to_user_id AND is_confirmed = false);

