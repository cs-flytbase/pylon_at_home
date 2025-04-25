-- Migration: Connect customers to profiles (platform users)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Optionally, create an index for performance
CREATE INDEX IF NOT EXISTS idx_customers_profile_id ON customers(profile_id);
