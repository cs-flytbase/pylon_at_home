import { createServerClient } from '@/lib/supabase';

export class PeriskopeService {
  private apiUrl = 'https://api.periskope.app/v1';
  private apiKey: string;
  private phoneNumber: string;

  constructor() {
    this.apiKey = process.env.PERISKOPE_API_KEY || '';
    this.phoneNumber = process.env.PERISKOPE_PHONE_NUMBER || '';
  }

  private async request(endpoint: string, method = 'GET', data?: any) {
    try {
      const url = `${this.apiUrl}${endpoint}`;
      const headers = {
        'Authorization': `Bearer ${this.apiKey}`,
        'x-phone': this.phoneNumber,
        'Content-Type': 'application/json'
      };

      const options: RequestInit = { 
        method, 
        headers 
      };

      if (data && (method === 'POST' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Periskope API request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Periskope API error:', error);
      throw error;
    }
  }

  // Get all WhatsApp chats
  async getChats(limit = 20, page = 1) {
    return this.request(`/chats?limit=${limit}&page=${page}`);
  }

  // Get messages for a specific chat
  async getMessages(chatId: string, limit = 50) {
    return this.request(`/chats/${chatId}/messages?limit=${limit}`);
  }

  // Send a message
  async sendMessage(chatId: string, message: string, options: any = {}) {
    const payload = {
      chatId,
      message,
      ...options
    };
    return this.request('/messages', 'POST', payload);
  }

  // Import conversations into your database
  async importConversations(userId: string) {
    try {
      // Get chats from Periskope
      const chatsResponse = await this.getChats(50);
      const chats = chatsResponse.data;
      
      const supabase = createServerClient();
      let importedCount = 0;
      
      // Process each chat
      for (const chat of chats) {
        // Check if conversation already exists
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('platform', 'whatsapp')
          .eq('external_id', chat.id)
          .maybeSingle();
        
        if (!existingConv) {
          // Get contact name or phone number
          const recipient = chat.name || chat.phone || 'Unknown Contact';
          
          // Insert new conversation
          const { data: newConv, error } = await supabase
            .from('conversations')
            .insert({
              platform: 'whatsapp',
              recipient,
              external_id: chat.id,
              is_group: chat.isGroup || false,
              user_id: userId,
              last_message: chat.lastMessage?.body || null,
              last_message_at: chat.lastMessage?.timestamp || new Date().toISOString()
            })
            .select()
            .single();
          
          if (error) throw error;
          
          // Import messages for this conversation
          await this.importMessages(newConv.id, chat.id, userId);
          importedCount++;
        }
      }
      
      return { success: true, imported: importedCount };
    } catch (error) {
      console.error('Error importing Periskope conversations:', error);
      return { success: false, error };
    }
  }

  // Import messages for a specific conversation
  private async importMessages(conversationId: string, chatId: string, userId: string) {
    try {
      // Get messages from Periskope
      const messagesResponse = await this.getMessages(chatId);
      const messages = messagesResponse.data;
      
      const supabase = createServerClient();
      
      // Process each message
      for (const message of messages) {
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
              content: message.body || message.caption || '[Media message]',
              external_id: message.id,
              direction: message.fromMe ? 'outbound' : 'inbound',
              status: this.mapMessageStatus(message.ack),
              has_media: !!message.hasMedia,
              created_at: message.timestamp || new Date().toISOString(),
              user_id: userId
            });
        }
      }
    } catch (error) {
      console.error('Error importing Periskope messages:', error);
    }
  }

  // Map Periskope message status to your system
  private mapMessageStatus(ack?: number): 'pending' | 'sent' | 'delivered' | 'read' | 'failed' {
    if (ack === undefined) return 'pending';
    
    switch (ack) {
      case -1: return 'failed';
      case 0: return 'pending';
      case 1: return 'sent';
      case 2: return 'delivered';
      case 3: return 'read';
      default: return 'sent';
    }
  }
}
