-- Teams tables migration

-- Teams table to store team information
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- Team members table with roles
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Team invitations table for inviting new members
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) NOT NULL,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  UNIQUE(team_id, email)
);

-- Add team_id foreign key to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- Add team_id foreign key to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- Functions for team management

-- Function to create a team and add the creator as owner
CREATE OR REPLACE FUNCTION create_team(p_name TEXT, p_slug TEXT, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- Insert the team
  INSERT INTO teams (name, slug, created_by)
  VALUES (p_name, p_slug, p_user_id)
  RETURNING id INTO v_team_id;
  
  -- Add the creator as an owner
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_team_id, p_user_id, 'owner');
  
  RETURN v_team_id;
END;
$$;

-- Function to join a team with an invitation token
CREATE OR REPLACE FUNCTION join_team_with_token(p_user_id UUID, p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
  v_role TEXT;
BEGIN
  -- Get invitation details
  SELECT team_id, role INTO v_team_id, v_role
  FROM team_invitations
  WHERE token = p_token
  AND expires_at > NOW();
  
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (SELECT 1 FROM team_members WHERE team_id = v_team_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'You are already a member of this team';
  END IF;
  
  -- Add user to the team
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_team_id, p_user_id, v_role);
  
  -- Delete the used invitation
  DELETE FROM team_invitations WHERE token = p_token;
  
  RETURN v_team_id;
END;
$$;

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Teams policies
CREATE POLICY "Team owners can insert teams" ON teams FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Team members can view teams" ON teams FOR SELECT USING (id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "Team owners can update teams" ON teams FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Team owners can delete teams" ON teams FOR DELETE USING (created_by = auth.uid());

-- Team members policies
CREATE POLICY "Team admins can insert members" ON team_members FOR INSERT WITH CHECK (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "Team members can view other members" ON team_members FOR SELECT USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY "Team admins can update members" ON team_members FOR UPDATE USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "Team admins can delete members" ON team_members FOR DELETE USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Team invitations policies
CREATE POLICY "Team admins can insert invitations" ON team_invitations FOR INSERT WITH CHECK (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "Team members can view invitations" ON team_invitations FOR SELECT USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY "Team admins can update invitations" ON team_invitations FOR UPDATE USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "Team admins can delete invitations" ON team_invitations FOR DELETE USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);
