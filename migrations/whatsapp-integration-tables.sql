-- WhatsApp and messaging integrations tables migration

-- WhatsApp Accounts table to store user's WhatsApp connections
CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  phone_number VARCHAR(15) NOT NULL,
  periskope_api_key TEXT NOT NULL,
  account_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, phone_number)
);

-- WhatsApp Conversations table for imported chats
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES whatsapp_accounts(id) NOT NULL,
  conversation_id UUID REFERENCES conversations(id) NOT NULL,
  whatsapp_conversation_id VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  contact_phone VARCHAR(20),
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER DEFAULT 0,
  team_id UUID REFERENCES teams(id),
  imported_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account_id, whatsapp_conversation_id)
);

-- Extend existing conversations table with channel information
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel_type VARCHAR(20) DEFAULT 'web' CHECK (channel_type IN ('web', 'whatsapp', 'email', 'telegram', 'slack'));
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel_id TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- WhatsApp Messages table to store message details
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES conversation_messages(id) NOT NULL,
  whatsapp_message_id VARCHAR(255),
  sender_phone VARCHAR(20),
  sender_name VARCHAR(255),
  is_from_me BOOLEAN DEFAULT FALSE,
  media_url TEXT,
  media_type VARCHAR(50),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, whatsapp_message_id)
);

-- Integration settings table (for global API keys, credentials, etc.)
CREATE TABLE IF NOT EXISTS integration_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) NOT NULL,
  integration_type VARCHAR(30) NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  UNIQUE(team_id, integration_type)
);

-- AI Settings table for knowledge base and LLM providers
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) NOT NULL,
  default_llm_provider VARCHAR(50) DEFAULT 'openai',
  llm_settings JSONB DEFAULT '{}'::jsonb,
  knowledge_base_enabled BOOLEAN DEFAULT false,
  auto_respond_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id)
);

-- Knowledge Base documents
CREATE TABLE IF NOT EXISTS knowledge_base_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- Conversation Knowledge Base assignments
CREATE TABLE IF NOT EXISTS conversation_knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) NOT NULL,
  document_id UUID REFERENCES knowledge_base_documents(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  UNIQUE(conversation_id, document_id)
);

-- Enable Row Level Security
ALTER TABLE whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- WhatsApp accounts (private to the user)
CREATE POLICY "Users can insert their own WhatsApp accounts" ON whatsapp_accounts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view their own WhatsApp accounts" ON whatsapp_accounts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own WhatsApp accounts" ON whatsapp_accounts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own WhatsApp accounts" ON whatsapp_accounts FOR DELETE USING (user_id = auth.uid());

-- WhatsApp conversations (team-wide visibility)
CREATE POLICY "Team members can view WhatsApp conversations" ON whatsapp_conversations FOR SELECT USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert WhatsApp conversations they import" ON whatsapp_conversations FOR INSERT WITH CHECK (imported_by = auth.uid());
CREATE POLICY "Team admins can update WhatsApp conversations" ON whatsapp_conversations FOR UPDATE USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "Team admins can delete WhatsApp conversations" ON whatsapp_conversations FOR DELETE USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- WhatsApp messages (team-wide visibility)
CREATE POLICY "Team members can view WhatsApp messages" ON whatsapp_messages FOR SELECT USING (
  message_id IN (
    SELECT wm.message_id FROM whatsapp_messages wm
    JOIN conversation_messages cm ON cm.id = wm.message_id
    JOIN conversations c ON c.id = cm.conversation_id
    JOIN team_members tm ON tm.team_id = c.team_id
    WHERE tm.user_id = auth.uid()
  )
);

-- Integration settings (team-wide management)
CREATE POLICY "Team members can view integration settings" ON integration_settings FOR SELECT USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY "Team admins can manage integration settings" ON integration_settings FOR ALL USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- AI settings (team-wide management)
CREATE POLICY "Team members can view AI settings" ON ai_settings FOR SELECT USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY "Team admins can manage AI settings" ON ai_settings FOR ALL USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Knowledge base documents (team-wide visibility and admin management)
CREATE POLICY "Team members can view knowledge base documents" ON knowledge_base_documents FOR SELECT USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY "Team admins can manage knowledge base documents" ON knowledge_base_documents FOR ALL USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Conversation knowledge base (team-wide visibility and member management)
CREATE POLICY "Team members can view conversation knowledge base" ON conversation_knowledge_base FOR SELECT USING (
  conversation_id IN (
    SELECT c.id FROM conversations c
    JOIN team_members tm ON tm.team_id = c.team_id
    WHERE tm.user_id = auth.uid()
  )
);
CREATE POLICY "Team members can manage their own conversation knowledge base" ON conversation_knowledge_base FOR ALL USING (
  created_by = auth.uid() OR (
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN team_members tm ON tm.team_id = c.team_id
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    )
  )
);
