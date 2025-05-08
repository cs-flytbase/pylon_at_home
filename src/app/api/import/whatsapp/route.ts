import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-server';
import { PeriskopeApi } from '@periskope/periskope-client';

// Enforce dynamic usage to avoid caching
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/import/whatsapp
 * Imports messages from a Periskope WhatsApp chat
 * Body parameters:
 * - chatId: The Periskope chat ID to import messages from
 * - phoneNumber: The phone number associated with the WhatsApp account
 * - conversationId: (Optional) The existing conversation ID to add messages to
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatId, phoneNumber, userId, conversationId } = body;
    
    // Validate required parameters
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Initialize the Periskope client
    const periskopeAuthToken = process.env.PERISKOPE_API_KEY;
    if (!periskopeAuthToken) {
      return NextResponse.json({ error: 'Periskope API key is not configured' }, { status: 500 });
    }

    const client = new PeriskopeApi({
      authToken: periskopeAuthToken,
      phone: phoneNumber, // Use the phone number from the request
    });

    console.log(`Fetching messages for chat ID: ${chatId}`);

    // Fetch messages from Periskope
    const response = await client.chat.getChatMessages({
      chat_id: chatId,
      // Optional: You can add offset and limit parameters
      // offset: 0,
      // limit: 2000,
    });

    // Initialize Supabase with admin privileges
    const supabase = createAdminSupabaseClient();

    // Find or create a conversation
    let actualConversationId = conversationId;
    
    if (!actualConversationId) {
      // If no conversationId provided, create a new conversation
      // First get all chats and find the specific one by ID
      const response = await client.chat.getChats({});
      
      // The Periskope API returns data in a nested structure
      const chats = response.data?.chats || [];
      
      // Find the chat that matches our chatId
      const chatInfo = chats.find((chat: any) => chat.id === chatId) || {};

      // Log chat info for debugging
      console.log('Found chat info:', JSON.stringify(chatInfo, null, 2));
      
      // Extract the recipient information - be flexible with property names
      // since the API structure might change
      let recipient = phoneNumber;
      let isGroup = false;
      
      // Try to extract a better name from various possible properties
      if (typeof chatInfo === 'object' && chatInfo !== null) {
        // Use type assertion to properly access properties
        const chat = chatInfo as Record<string, any>;
        
        if (chat.chat_name) recipient = chat.chat_name;
        else if (chat.name) recipient = chat.name;
        else if (chat.title) recipient = chat.title;
        
        // Determine if it's a group chat
        isGroup = !!chat.is_group || chat.type === 'group' || 
                 (chat.participants && Array.isArray(chat.participants) && chat.participants.length > 1);
      }
      
      // Create a new conversation
      const { data: newConversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          platform: 'whatsapp',
          recipient: recipient,
          is_group: isGroup,
          user_id: userId || null, // Use provided userId or null
          // Set additional fields as needed
          metadata: JSON.stringify({
            periskope_chat_id: chatId,
            imported: true,
            import_date: new Date().toISOString(),
          }),
        })
        .select('id')
        .single();

      if (conversationError) {
        console.error('Error creating conversation:', conversationError);
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
      }

      actualConversationId = newConversation.id;
    }

    // Prepare messages for insertion
    const messages = response.messages || [];
    console.log(`Importing ${messages.length} messages to conversation ${actualConversationId}`);

    // Insert messages in batches
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      const messagesToInsert = batch.map(msg => {
        // Determine message direction
        const direction = msg.fromMe ? 'outbound' : 'inbound';
        
        return {
          conversation_id: actualConversationId,
          content: msg.text || msg.caption || '',
          direction,
          status: 'delivered', // Assume delivered since it's historical data
          has_media: Boolean(msg.media || msg.caption), // Message has media if media object exists
          created_at: new Date(msg.timestamp * 1000).toISOString(),
          // Store the original message ID for reference
          metadata: JSON.stringify({
            periskope_message_id: msg.id,
            media_type: msg.media?.type || null,
            media_url: msg.media?.url || null,
          }),
        };
      });

      // Skip empty batch
      if (messagesToInsert.length === 0) continue;

      const { data, error } = await supabase
        .from('conversation_messages')
        .insert(messagesToInsert);

      if (error) {
        console.error(`Error inserting batch ${i}-${i + batchSize}:`, error);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
      }
    }

    // Update the conversation's last message
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      await supabase
        .from('conversations')
        .update({
          last_message: lastMessage.text || lastMessage.caption || 'Media message',
          last_message_at: new Date(lastMessage.timestamp * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', actualConversationId);
    }

    return NextResponse.json({
      success: true,
      conversation_id: actualConversationId,
      total_messages: messages.length,
      imported_messages: successCount,
      failed_messages: errorCount,
    });

  } catch (error) {
    console.error('Error importing WhatsApp messages:', error);
    return NextResponse.json({
      error: 'Failed to import WhatsApp messages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
