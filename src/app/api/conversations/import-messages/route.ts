import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { PeriskopeService } from '@/lib/services/periskope.service';

// POST /api/conversations/import-messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, whatsappAccountId } = body;

    if (!conversationId || !whatsappAccountId) {
      return NextResponse.json({ 
        error: 'Conversation ID and WhatsApp account ID are required' 
      }, { status: 400 });
    }

    const supabase = createServerClient();
    
    // Get the conversation details
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    
    if (convError) {
      console.error('Error fetching conversation:', convError);
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get the WhatsApp account details from PeriskopeService instead of direct Supabase query
    const periskopeService = new PeriskopeService();
    let whatsappAccount;
    
    try {
      // This will handle the database query internally in the service
      whatsappAccount = await periskopeService.getWhatsAppAccountById(whatsappAccountId);
    } catch (error) {
      console.error('Error fetching WhatsApp account:', error);
      return NextResponse.json({ error: 'WhatsApp account not found' }, { status: 404 });
    }
    
    if (!whatsappAccount) {
      return NextResponse.json({ error: 'WhatsApp account not found' }, { status: 404 });
    }

    // Periskope service already initialized above

    // Determine if this is a group chat or direct message
    const chatId = conversation.recipient;
    const isGroup = conversation.is_group || false;

    // Fetch recent messages from the Periskope API
    let messagesResponse;
    try {
      // If group chat, use the chat ID, otherwise use the phone number
      if (isGroup) {
        messagesResponse = await periskopeService.getChatMessages(
          whatsappAccountId, 
          chatId,
          20 // Limit to 20 recent messages
        );
      } else {
        // For direct messages, we need to use the phone number format
        messagesResponse = await periskopeService.getContactMessages(
          whatsappAccountId,
          chatId, // phone number
          20 // Limit to 20 recent messages
        );
      }
    } catch (apiError) {
      console.error('Failed to fetch messages from Periskope API:', apiError);
      return NextResponse.json({ error: 'Failed to fetch messages from WhatsApp API' }, { status: 500 });
    }

    // If no messages found, return an empty list
    if (!messagesResponse || !messagesResponse.messages || messagesResponse.messages.length === 0) {
      return NextResponse.json({ messageCount: 0, messages: [] }, { status: 200 });
    }

    // Process and store messages in the database
    const messages = messagesResponse.messages;
    const createdMessages = [];

    for (const msg of messages) {
      try {
        // Insert message into conversation_messages table
        const { data: newMessage, error: msgError } = await supabase
          .from('conversation_messages')
          .insert({
            conversation_id: conversationId,
            content: msg.body || '(Media message)',
            direction: msg.from_me ? 'outbound' : 'inbound',
            status: periskopeService.mapMessageStatus(parseInt(msg.ack || '0')),
            sent_at: msg.timestamp,
            user_id: conversation.user_id,
            meta: {
              message_type: msg.message_type,
              has_media: !!msg.media,
              media_url: msg.media?.path || null,
              media_type: msg.media?.mimetype || null,
              whatsapp_message_id: msg.message_id,
            }
          })
          .select()
          .single();

        if (msgError) {
          console.error('Error inserting message:', msgError);
          continue; // Skip this message and continue with others
        }

        createdMessages.push(newMessage);

        // Update conversation with the latest message
        if (createdMessages.length === 1) {
          await supabase
            .from('conversations')
            .update({
              last_message: msg.body || '(Media message)',
              last_message_at: msg.timestamp,
              updated_at: new Date().toISOString()
            })
            .eq('id', conversationId);
        }
      } catch (msgProcessError) {
        console.error('Error processing message:', msgProcessError);
        // Continue with other messages
      }
    }

    return NextResponse.json({
      success: true,
      messageCount: createdMessages.length,
      messages: createdMessages
    }, { status: 200 });

  } catch (error) {
    console.error('Error in import-messages API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
