# Database Schema

## Overview

The Support Platform uses Supabase (PostgreSQL) as its database with the following table structure. This schema supports all the core features including ticket management, communication, and analytics.

## Tables

### `profiles` Table

Stores user profiles for support team members.

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent', -- 'agent', 'admin', 'developer'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
```

### `tickets` Table

Stores main ticket information.

```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  customer_id TEXT, -- External customer identifier
  customer_name TEXT,
  customer_email TEXT,
  source TEXT NOT NULL, -- 'email', 'whatsapp', 'telegram', 'slack'
  status TEXT NOT NULL DEFAULT 'new', -- 'new', 'in-progress', 'on-me', 'on-dev-team', 'closed', etc.
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  type TEXT NOT NULL DEFAULT 'support', -- 'support', 'bug', 'feature'
  assignee_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_response_at TIMESTAMP WITH TIME ZONE, -- For SLA tracking
  resolved_at TIMESTAMP WITH TIME ZONE, -- When ticket was closed
  has_media BOOLEAN DEFAULT FALSE, -- Flag for tickets with media attachments
  external_id TEXT, -- ID from external system if relevant
  
  -- Add any additional fields for analytics/metrics here
  sentiment TEXT, -- Detected customer sentiment ('positive', 'neutral', 'negative')
  feature_weight INTEGER DEFAULT 1 -- For feature request voting/weighting
);

-- Indexes for common queries
CREATE INDEX tickets_status_idx ON tickets(status);
CREATE INDEX tickets_assignee_idx ON tickets(assignee_id);
CREATE INDEX tickets_updated_at_idx ON tickets(updated_at);
CREATE INDEX tickets_type_idx ON tickets(type);

-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Tickets are viewable by authenticated users" 
  ON tickets FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Tickets can be updated by authenticated users" 
  ON tickets FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Tickets can be inserted by authenticated users" 
  ON tickets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### `messages` Table

Stores conversation threads within tickets.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL, -- 'customer', 'agent', 'ai'
  sender_id UUID, -- User ID if sender is an agent
  sender_name TEXT NOT NULL,
  sender_avatar TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_internal BOOLEAN DEFAULT FALSE, -- For internal notes
  reply_type TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'ai', 'template'
  has_attachments BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  platform TEXT, -- Source platform this message was from/to
  external_id TEXT -- ID from external messaging platform if relevant
);

-- Indexes
CREATE INDEX messages_ticket_id_idx ON messages(ticket_id);
CREATE INDEX messages_created_at_idx ON messages(created_at);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Messages are viewable by authenticated users" 
  ON messages FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Messages can be inserted by authenticated users" 
  ON messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Messages can be updated by authenticated users" 
  ON messages FOR UPDATE USING (auth.role() = 'authenticated');
```

### `attachments` Table

Stores media files attached to messages.

```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE, -- For easier queries
  type TEXT NOT NULL, -- 'image', 'video', 'file'
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Storage path
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER, -- For images/videos
  height INTEGER, -- For images/videos
  duration INTEGER, -- For videos (in seconds)
  thumbnail_path TEXT, -- For preview thumbnails
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX attachments_message_id_idx ON attachments(message_id);
CREATE INDEX attachments_ticket_id_idx ON attachments(ticket_id);

-- Enable RLS
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Attachments are viewable by authenticated users" 
  ON attachments FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Attachments can be inserted by authenticated users" 
  ON attachments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### `tags` Table

Stores tag definitions for ticket categorization.

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#3B82F6', -- Tailwind blue-500 as default
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Tags are viewable by authenticated users" 
  ON tags FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Tags can be managed by admins" 
  ON tags FOR ALL USING (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));
```

### `ticket_tags` Junction Table

Links tickets to tags (many-to-many relationship).

```sql
CREATE TABLE ticket_tags (
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (ticket_id, tag_id)
);

-- Enable RLS
ALTER TABLE ticket_tags ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Ticket tags are viewable by authenticated users" 
  ON ticket_tags FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Ticket tags can be managed by authenticated users" 
  ON ticket_tags FOR ALL USING (auth.role() = 'authenticated');
```

### `status_types` Table

Defines custom status types for the kanban board.

```sql
CREATE TABLE status_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6', -- Tailwind blue-500 as default
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sort_order INTEGER NOT NULL
);

-- Insert default statuses
INSERT INTO status_types (name, display_name, color, description, is_default, sort_order)
VALUES
  ('new', 'New', '#EF4444', 'Newly created tickets', TRUE, 10),
  ('in-progress', 'In Progress', '#F59E0B', 'Tickets being actively worked on', TRUE, 20),
  ('on-me', 'On Me', '#3B82F6', 'Assigned to current user', TRUE, 30),
  ('on-dev-team', 'On Dev Team', '#8B5CF6', 'Escalated to development team', TRUE, 40),
  ('closed', 'Closed', '#10B981', 'Resolved tickets', TRUE, 50);

-- Enable RLS
ALTER TABLE status_types ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Status types are viewable by authenticated users" 
  ON status_types FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Status types can be managed by admins" 
  ON status_types FOR ALL USING (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));
```

## Functions and Triggers

### Update Ticket Last Activity Timestamp

```sql
CREATE OR REPLACE FUNCTION update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tickets
  SET updated_at = NOW()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ticket_timestamp
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_ticket_timestamp();
```

### Update Ticket Media Flag

```sql
CREATE OR REPLACE FUNCTION update_ticket_media_flag()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tickets
  SET has_media = TRUE
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ticket_media_flag
AFTER INSERT ON attachments
FOR EACH ROW
EXECUTE FUNCTION update_ticket_media_flag();
```

### Update Message Has Attachments Flag

```sql
CREATE OR REPLACE FUNCTION update_message_attachments_flag()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE messages
  SET has_attachments = TRUE
  WHERE id = NEW.message_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_message_attachments_flag
AFTER INSERT ON attachments
FOR EACH ROW
EXECUTE FUNCTION update_message_attachments_flag();
```

## Real-time Subscriptions

Enable real-time functionality by setting up Supabase realtime publication:

```sql
-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
```

## Storage Buckets

Set up the following storage buckets in Supabase:

1. `ticket-attachments` - For storing message attachments
2. `profile-avatars` - For user profile pictures

## Performance Optimization

Additional indexes for performance optimization:

```sql
-- Tickets with certain tags
CREATE INDEX ticket_tags_tag_id_idx ON ticket_tags(tag_id);

-- Search by customer email or name
CREATE INDEX tickets_customer_email_idx ON tickets(customer_email);
CREATE INDEX tickets_customer_name_idx ON tickets(customer_name);

-- Full-text search
CREATE INDEX tickets_fts_idx ON tickets USING GIN (to_tsvector('english', title || ' ' || description));
CREATE INDEX messages_fts_idx ON messages USING GIN (to_tsvector('english', content));
```
