import { createServerClient } from '@/lib/supabase';

export class WhatsAppService {
  private apiUrl = 'https://graph.facebook.com/v17.0';
  private phoneNumberId: string;
  private apiToken: string;

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.apiToken = process.env.WHATSAPP_API_TOKEN || '';
  }

  async importConversations(userId: string, days = 7) {
    try {
      // Fetch conversations from WhatsApp API
      const response = await fetch(
        `${this.apiUrl}/${this.phoneNumberId}/conversations?limit=20`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch WhatsApp conversations');
      }

      const data = await response.json();
      const supabase = createServerClient();
      
      // Process and save each conversation
      for (const conversation of data.data) {
        // Check if conversation already exists
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('platform', 'whatsapp')
          .eq('external_id', conversation.id)
          .maybeSingle();
          
        if (!existingConv) {
          // Insert new conversation
          const { data: newConv, error } = await supabase
            .from('conversations')
            .insert({
              platform: 'whatsapp',
              recipient: conversation.display_phone_number,
              external_id: conversation.id,
              user_id: userId,
              last_message_at: new Date().toISOString(),
            })
            .select()
            .single();
            
          if (error) throw error;
          
          // Fetch and import messages for this conversation
          await this.importMessages(newConv.id, conversation.id, userId);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error importing WhatsApp conversations:', error);
      return { success: false, error };
    }
  }

  private async importMessages(conversationId: string, whatsappConversationId: string, userId: string) {
    try {
      // Fetch messages for the conversation
      const response = await fetch(
        `${this.apiUrl}/${whatsappConversationId}/messages?limit=50`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch WhatsApp messages');
      }

      const data = await response.json();
      const supabase = createServerClient();
      
      // Process and save each message
      for (const message of data.data) {
        // Only insert if message doesn't exist
        const { data: existingMsg } = await supabase
          .from('conversation_messages')
          .select('id')
          .eq('external_id', message.id)
          .maybeSingle();
          
        if (!existingMsg) {
          await supabase
            .from('conversation_messages')
            .insert({
              conversation_id: conversationId,
              content: message.text?.body || '[Media message]',
              external_id: message.id,
              direction: message.from === this.phoneNumberId ? 'outbound' : 'inbound',
              status: message.status || 'delivered',
              has_media: !!message.media,
              created_at: new Date(message.timestamp).toISOString(),
              user_id: userId,
            });
        }
      }
    } catch (error) {
      console.error('Error importing WhatsApp messages:', error);
    }
  }
}
