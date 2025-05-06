import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET /api/conversations/:id
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Note the await for params (Next.js 15 feature)
    const { id } = await params;
    const supabase = createServerClient();
    
    // Fetch the conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select(`
        id,
        platform,
        recipient,
        last_message,
        last_message_at,
        created_at,
        updated_at,
        user_id,
        profiles(id, full_name, avatar_url)
      `)
      .eq('id', id)
      .single();
    
    if (conversationError) {
      console.error('Error fetching conversation:', conversationError);
      return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
    }

    // Fetch messages for the conversation
    const { data: messages, error: messagesError } = await supabase
      .from('conversation_messages')
      .select(`
        id,
        content,
        created_at,
        direction,
        status,
        has_media,
        user_id,
        profiles(id, full_name, avatar_url)
      `)
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });
    
    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Format the response
    const formattedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      created_at: message.created_at,
      direction: message.direction,
      status: message.status,
      has_attachments: message.has_media || false,
      sender: message.profiles ? {
        id: message.profiles.id,
        name: message.profiles.full_name || 'Unknown User',
        avatar: message.profiles.avatar_url
      } : null
    }));

    return NextResponse.json({ 
      conversation, 
      messages: formattedMessages 
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching conversation details:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation details' }, { status: 500 });
  }
}

// POST /api/conversations/:id/messages - Send a new message
export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, userId } = body;

    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const supabase = createServerClient();
    
    // Use the real user ID or fallback to a default
    const actualUserId = userId || 'agent-1'; // Default to a system agent if no userId provided

    // First check if the conversation exists
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('platform, recipient')
      .eq('id', id)
      .single();

    if (conversationError) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Insert the new message
    const { data: message, error: messageError } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: id,
        content,
        direction: 'outbound',
        user_id: actualUserId,
        status: 'pending',
        has_media: false
      })
      .select(`
        id,
        content,
        created_at,
        direction,
        status,
        has_media,
        user_id,
        profiles(id, full_name, avatar_url)
      `)
      .single();

    if (messageError) {
      throw messageError;
    }

    // Update the conversation's last_message and last_message_at
    await supabase
      .from('conversations')
      .update({
        last_message: content,
        last_message_at: new Date().toISOString()
      })
      .eq('id', id);

    // Format the response
    const formattedMessage = {
      id: message.id,
      content: message.content,
      created_at: message.created_at,
      direction: message.direction,
      status: message.status,
      has_attachments: message.has_media || false,
      sender: message.profiles ? {
        id: message.profiles.id,
        name: message.profiles.full_name || 'Unknown User',
        avatar: message.profiles.avatar_url
      } : null
    };

    // In a real implementation, here we would send the message via the appropriate channel
    // (WhatsApp API, Telegram API, etc.) and update the message status based on the response
    
    return NextResponse.json({ message: formattedMessage }, { status: 201 });
  } catch (error) {  
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
