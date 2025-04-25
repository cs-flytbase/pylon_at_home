-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, inactive
  type TEXT NOT NULL DEFAULT 'end_customer', -- 'partner', 'end_customer', 'ex'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  job_title TEXT,
  notes TEXT,
  organization_id UUID REFERENCES organizations(id),
  status TEXT NOT NULL DEFAULT 'active', -- active, inactive
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Update tickets table to reference customers instead of storing customer info directly
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON customers(organization_id);

-- Make sure we can still search tickets by customer email
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Create function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at fields
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at();

-- Add RLS policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all organizations and customers
CREATE POLICY "Users can read organizations"
  ON organizations
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read customers"
  ON customers
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert/update organizations and customers
CREATE POLICY "Users can insert organizations"
  ON organizations
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update organizations"
  ON organizations
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert customers"
  ON customers
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update customers"
  ON customers
  FOR UPDATE
  USING (auth.role() = 'authenticated');
