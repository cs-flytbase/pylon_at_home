import { createClient } from '@/utils/supabase/client';

export class PeriskopeService {
  private apiBaseUrl = 'https://api.periskope.app/v1';
  
  // Fetch user's WhatsApp accounts from the database
  async getUserWhatsAppAccounts(userId: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('whatsapp_accounts')
      .select('*')
      .eq('user_id', userId);
      
    if (error) throw error;
    return data || [];
  }
  
  // Add a new WhatsApp account for the user
  async addWhatsAppAccount(userId: string, phone: string, apiKey: string, accountName: string) {
    const supabase = createClient();
    
    // Validate the API key first by making a test request
    const isValid = await this.validateApiKey(apiKey, phone);
    if (!isValid) {
      throw new Error('Invalid Periskope API key or phone number');
    }
    
    const { data, error } = await supabase
      .from('whatsapp_accounts')
      .insert({
        user_id: userId,
        phone_number: phone,
        periskope_api_key: apiKey,
        account_name: accountName || `WhatsApp (${phone.slice(-4)})`,
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
  
  // Validate the API key with Periskope
  private async validateApiKey(apiKey: string, phone: string) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ phone_number: phone })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Failed to validate Periskope API key:', error);
      return false;
    }
  }
  
  // Fetch available chats from a WhatsApp account
  async fetchAvailableChats(accountId: string, chatType?: 'personal' | 'group' | 'all') {
    const supabase = createClient();
    
    // Get the account details
    const { data: account, error: accountError } = await supabase
      .from('whatsapp_accounts')
      .select('*')
      .eq('id', accountId)
      .single();
      
    if (accountError) throw accountError;
    
    // Prepare query parameters if chat type is specified
    const params = new URLSearchParams();
    if (chatType && chatType !== 'all') {
      params.append('chat_type', chatType);
    }
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    // Call Periskope API to get chats
    const response = await fetch(`${this.apiBaseUrl}/chats${queryString}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${account.periskope_api_key}`,
        'x-phone': account.phone_number
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch WhatsApp chats: ${await response.text()}`);
    }
    
    const chats = await response.json();
    return chats;
  }
  
  // Fetch group chats from a WhatsApp account
  async fetchGroupChats(accountId: string) {
    return this.fetchAvailableChats(accountId, 'group');
  }
  
  // Fetch group chats using phone number and API key directly
  async fetchGroupChatsByPhone(phone: string, apiKey: string) {
    try {
      // Call Periskope API to get group chats
      const response = await fetch(`${this.apiBaseUrl}/chats?chat_type=group`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'x-phone': phone
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch WhatsApp group chats: ${await response.text()}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching WhatsApp group chats:', error);
      throw error;
    }
  }
  
  // Import a specific chat
  async importChat(accountId: string, chatId: string, teamId: string, userId: string) {
    const supabase = createClient();
    
    // Get the account details
    const { data: account, error: accountError } = await supabase
      .from('whatsapp_accounts')
      .select('*')
      .eq('id', accountId)
      .single();
      
    if (accountError) throw accountError;
    
    // Call Periskope API to get chat details and messages
    const response = await fetch(`${this.apiBaseUrl}/chats/${chatId}/messages`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${account.periskope_api_key}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch chat messages');
    }
    
    const chatData = await response.json();
    
    // First, create a new conversation in the conversations table
    const { data: newConversation, error: newConvError } = await supabase
      .from('conversations')
      .insert({
        title: chatData.contact.name || chatData.contact.phone,
        status: 'open',
        priority: 'medium',
        channel_type: 'whatsapp',
        channel_id: chatId,
        user_id: userId,
        team_id: teamId,
        metadata: {
          contact_phone: chatData.contact.phone,
          periskope_account_id: accountId
        }
      })
      .select()
      .single();
      
    if (newConvError) throw newConvError;
    
    // Create WhatsApp conversation record
    const { data: whatsappConversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .insert({
        account_id: accountId,
        conversation_id: newConversation.id,
        whatsapp_conversation_id: chatId,
        contact_name: chatData.contact.name,
        contact_phone: chatData.contact.phone,
        last_message: chatData.messages[0]?.text || '',
        last_message_time: chatData.messages[0]?.timestamp || new Date().toISOString(),
        team_id: teamId,
        imported_by: userId
      })
      .select()
      .single();
      
    if (convError) throw convError;
    
    // Import the messages
    for (const msg of chatData.messages) {
      // Create a message in conversation_messages table
      const { data: newMessage, error: msgError } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: newConversation.id,
          content: msg.text,
          user_id: userId,
          is_from_customer: msg.from !== account.phone_number
        })
        .select()
        .single();
        
      if (msgError) continue; // Skip if error, continue with next message
      
      // Store WhatsApp specific message details
      await supabase
        .from('whatsapp_messages')
        .insert({
          message_id: newMessage.id,
          whatsapp_message_id: msg.id,
          sender_phone: msg.from,
          sender_name: msg.sender_name,
          is_from_me: msg.from === account.phone_number,
          media_url: msg.media?.url || null,
          media_type: msg.media?.type || null,
          sent_at: msg.timestamp
        });
    }
    
    return { conversation: newConversation, messageCount: chatData.messages.length };
  }
  
  // Send a reply to a WhatsApp conversation
  async sendWhatsAppReply(conversationId: string, message: string, userId: string) {
    const supabase = createClient();
    
    // Get the conversation and associated WhatsApp account
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        channel_id,
        metadata,
        whatsapp:whatsapp_conversations!inner(
          account:account_id(id, periskope_api_key, phone_number)
        )
      `)
      .eq('id', conversationId)
      .single();
    
    if (convError) throw convError;
    
    // TypeScript type handling for the nested structure
    // Need to use type assertions since the query returns a complex structure
    interface WhatsAppAccount { 
      id: string; 
      periskope_api_key: string; 
      phone_number: string; 
    }
    
    // The account is nested in a structure from a join query
    // First cast to any to bypass TypeScript's type checking, then access the properties
    const whatsappData = conversation.whatsapp as any[];
    if (!whatsappData || !whatsappData[0] || !whatsappData[0].account) {
      throw new Error('WhatsApp account information is missing');
    }
    
    const accountData = whatsappData[0].account;
    const whatsappAccount = {
      id: accountData.id,
      periskope_api_key: accountData.periskope_api_key,
      phone_number: accountData.phone_number
    };
    
    // Send message via Periskope API
    const response = await fetch(`${this.apiBaseUrl}/chats/${conversation.channel_id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${whatsappAccount.periskope_api_key}`,
        'x-phone': whatsappAccount.phone_number
      },
      body: JSON.stringify({
        text: message
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to send WhatsApp message');
    }
    
    const sentMessage = await response.json();
    
    // Add message to conversation_messages
    const { data: newMessage, error: msgError } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        content: message,
        user_id: userId,
        is_from_customer: false
      })
      .select()
      .single();
      
    if (msgError) throw msgError;
    
    // Store WhatsApp specific message details
    await supabase
      .from('whatsapp_messages')
      .insert({
        message_id: newMessage.id,
        whatsapp_message_id: sentMessage.id,
        sender_phone: whatsappAccount.phone_number,
        is_from_me: true,
        sent_at: new Date().toISOString()
      });
    
    return newMessage;
  }

  // Map message status codes to readable status
  private mapMessageStatus(ack: number): 'pending' | 'sent' | 'delivered' | 'read' | 'failed' {
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
