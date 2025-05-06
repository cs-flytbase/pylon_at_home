-- Teams and Team Members
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, email)
);

-- WhatsApp Integration
CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  periskope_api_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, phone_number)
);

-- Conversations table for all channels
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  channel_type TEXT NOT NULL CHECK (channel_type IN ('email', 'whatsapp', 'chat', 'other')),
  channel_id TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WhatsApp specific conversation data
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  whatsapp_conversation_id TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT NOT NULL,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  imported_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, whatsapp_conversation_id)
);

-- General conversation messages
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  is_from_customer BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WhatsApp specific message data
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
  whatsapp_message_id TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  sender_name TEXT,
  is_from_me BOOLEAN NOT NULL DEFAULT false,
  media_url TEXT,
  media_type TEXT,
  sent_at TIMESTAMPTZ NOT NULL,
  UNIQUE (message_id, whatsapp_message_id)
);

-- RLS Policies
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Team members can see their teams
CREATE POLICY "Users can view teams they belong to" 
  ON teams FOR SELECT 
  USING (id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- Team members can see other members in their teams
CREATE POLICY "Users can view team members in their teams" 
  ON team_members FOR SELECT 
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- Users can see their own WhatsApp accounts
CREATE POLICY "Users can view their own WhatsApp accounts" 
  ON whatsapp_accounts FOR SELECT 
  USING (user_id = auth.uid());

-- Users can create WhatsApp accounts
CREATE POLICY "Users can create WhatsApp accounts" 
  ON whatsapp_accounts FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own WhatsApp accounts
CREATE POLICY "Users can delete their own WhatsApp accounts" 
  ON whatsapp_accounts FOR DELETE 
  USING (user_id = auth.uid());

-- Team members can see conversations in their teams
CREATE POLICY "Team members can see conversations in their teams" 
  ON conversations FOR SELECT 
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- Team members can see messages in their team conversations
CREATE POLICY "Team members can see messages in their team conversations" 
  ON conversation_messages FOR SELECT 
  USING (conversation_id IN (
    SELECT id FROM conversations 
    WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  ));

-- Create team function
CREATE OR REPLACE FUNCTION create_team(p_name TEXT, p_slug TEXT, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- Create the team
  INSERT INTO teams (name, slug)
  VALUES (p_name, p_slug)
  RETURNING id INTO v_team_id;
  
  -- Add the creator as an owner
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_team_id, p_user_id, 'owner');
  
  RETURN v_team_id;
END;
$$;

-- Join team with invitation token function
CREATE OR REPLACE FUNCTION join_team_with_token(p_user_id UUID, p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
  v_team_id UUID;
BEGIN
  -- Find the invitation
  SELECT * INTO v_invitation 
  FROM team_invitations 
  WHERE token = p_token AND expires_at > now();
  
  IF v_invitation IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (SELECT 1 FROM team_members WHERE team_id = v_invitation.team_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'You are already a member of this team';
  END IF;
  
  -- Add the user to the team
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_invitation.team_id, p_user_id, v_invitation.role);
  
  -- Delete the invitation
  DELETE FROM team_invitations WHERE id = v_invitation.id;
  
  RETURN v_invitation.team_id;
END;
$$;
