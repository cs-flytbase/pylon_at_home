-- Migration: Add user_id column and FK to profiles for messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id UUID;

-- Backfill user_id for agent messages (optional, if sender_type = 'agent')
-- UPDATE messages SET user_id = sender_id WHERE sender_type = 'agent';

-- Add FK constraint (will only succeed if all user_id values are valid or null)
ALTER TABLE messages
  ADD CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
