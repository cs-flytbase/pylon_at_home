import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET /api/conversations
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Fetch conversations
    const { data: conversations, error } = await supabase
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
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    return NextResponse.json({ conversations }, { status: 200 });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// POST /api/conversations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, recipient, isGroup, message, userId } = body;

    if (!platform || !recipient) {
      return NextResponse.json({ 
        error: 'Platform and recipient are required' 
      }, { status: 400 });
    }

    // Validate platform
    const validPlatforms = ['whatsapp', 'telegram', 'email', 'slack'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json({ 
        error: 'Invalid platform. Must be one of: ' + validPlatforms.join(', ') 
      }, { status: 400 });
    }

    // Validate platform-specific fields based on chat type
    if (platform === 'whatsapp' && !isGroup && !recipient.match(/^\+[0-9]{1,15}$/)) {
      return NextResponse.json({ 
        error: 'Invalid phone number format. Must include country code (e.g., +123456789)' 
      }, { status: 400 });
    }

    if (platform === 'telegram' && !isGroup && !recipient.match(/^@[a-zA-Z0-9_]{5,32}$/)) {
      return NextResponse.json({ 
        error: 'Invalid Telegram username format. Must start with @ and be 5-32 characters' 
      }, { status: 400 });
    }

    // Group-specific validations
    if (isGroup) {
      if (platform === 'whatsapp' && !recipient) {
        return NextResponse.json({ 
          error: 'WhatsApp group ID is required' 
        }, { status: 400 });
      }

      if (platform === 'telegram' && !recipient) {
        return NextResponse.json({ 
          error: 'Telegram group ID is required' 
        }, { status: 400 });
      }
    }

    const supabase = createServerClient();
    
    // Use the real user ID or fallback to a default
    const actualUserId = userId || 'agent-1'; // Default to a system agent if no userId provided

    // Insert the new conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        platform,
        recipient,
        is_group: isGroup || false,
        last_message: message || null,
        last_message_at: new Date().toISOString(),
        user_id: actualUserId
      })
      .select()
      .single();

    if (conversationError) {
      throw conversationError;
    }

    // If there's an initial message, create it
    if (message) {
      const { error: messageError } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversation.id,
          content: message,
          direction: 'outbound',
          user_id: actualUserId,
          status: 'pending'
        });

      if (messageError) {
        console.error('Error creating initial message:', messageError);
        // Continue even if message creation fails
      }
    }

    // In a real implementation, here we would initiate the actual communication
    // via the selected platform (WhatsApp API, Telegram API, etc.)
    
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {  
    console.error('Error in conversations API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
