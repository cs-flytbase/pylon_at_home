-- Add whatsapp_account_id column to conversations table
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS whatsapp_account_id UUID REFERENCES public.whatsapp_accounts(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversations_whatsapp_account_id ON public.conversations(whatsapp_account_id);

-- Update RLS policies to allow access to this column
CREATE POLICY "Enable read access for all users" ON public.conversations
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id" ON public.conversations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id" ON public.conversations
    FOR DELETE USING (auth.uid() = user_id);
