-- Macro Calorie Tracker Schema
-- Run this in Supabase SQL Editor

-- Food log entries
CREATE TABLE IF NOT EXISTS food_log (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name TEXT NOT NULL,
  brand TEXT,
  serving_size TEXT,
  servings NUMERIC(6,2) DEFAULT 1 NOT NULL,
  calories NUMERIC(8,2) NOT NULL DEFAULT 0,
  protein NUMERIC(8,2) NOT NULL DEFAULT 0,
  carbs NUMERIC(8,2) NOT NULL DEFAULT 0,
  fat NUMERIC(8,2) NOT NULL DEFAULT 0,
  fiber NUMERIC(8,2),
  sugar NUMERIC(8,2),
  sodium NUMERIC(8,2),
  vitamins TEXT,
  barcode TEXT
);

-- Weight entries
CREATE TABLE IF NOT EXISTS weight_entries (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  date DATE NOT NULL UNIQUE,
  weight NUMERIC(6,1) NOT NULL
);

-- Goals (single row, always id=1)
CREATE TABLE IF NOT EXISTS goals (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  daily_calories INT NOT NULL DEFAULT 2000,
  protein_pct INT NOT NULL DEFAULT 30,
  carbs_pct INT NOT NULL DEFAULT 40,
  fat_pct INT NOT NULL DEFAULT 30,
  goal_weight NUMERIC(6,1)
);

-- Insert default goals row
INSERT INTO goals (id, daily_calories, protein_pct, carbs_pct, fat_pct)
VALUES (1, 2000, 30, 40, 30)
ON CONFLICT (id) DO NOTHING;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_food_log_date ON food_log (date DESC);
CREATE INDEX IF NOT EXISTS idx_weight_entries_date ON weight_entries (date DESC);

-- Enable Row Level Security
ALTER TABLE food_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- For now, allow all reads/writes (single-user app)
-- We'll tighten this later if you add auth
CREATE POLICY "Allow all access to food_log" ON food_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to weight_entries" ON weight_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to goals" ON goals FOR ALL USING (true) WITH CHECK (true);