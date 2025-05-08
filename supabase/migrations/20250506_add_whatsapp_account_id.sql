-- Add WhatsApp account ID to conversations table
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS whatsapp_account_id UUID REFERENCES public.whatsapp_accounts(id);
