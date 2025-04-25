import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Note the await for params (Next.js 15 feature)
    const { id } = await params;
    const supabase = createServerClient();
    
    // Fetch messages for the ticket
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        has_media,
        is_internal,
        channel,
        user_id,
        profiles(
          id,
          full_name,
          avatar_url,
          email,
          role
        )
      `)
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Format the response to match our component's expected format
    const formattedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      created_at: message.created_at,
      has_attachments: message.has_media || false, // Map has_media to has_attachments
      sender: {
        id: message.profiles.id,
        name: message.profiles.full_name || 'Unknown User',
        avatar: message.profiles.avatar_url,
        role: message.profiles.role
      }
    }));

    return NextResponse.json({ messages: formattedMessages }, { status: 200 });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/tickets/:id/messages
export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  // In Next.js 15, route parameters are returned as Promises that must be awaited
  const { id } = await params;

  try {
    const body = await request.json();
    const { content, userId } = body;

    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // In a real app, you would validate that the user has permission to post to this ticket
    const supabase = createServerClient();
    
    // Use the real user ID or fallback to a default
    const actualUserId = userId || 'agent-1'; // Default to a system agent if no userId provided

    // Insert the new message into Supabase
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        ticket_id: id,
        content,
        user_id: actualUserId,
        has_media: false,
        is_internal: false,
        channel: 'web'
      })
      .select(`
        id,
        content,
        created_at,
        updated_at,
        has_media,
        is_internal,
        channel,
        user_id,
        profiles(
          id,
          full_name,
          avatar_url,
          email,
          role
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    // Format the response to match our component expectations
    const formattedMessage = {
      id: message.id,
      content: message.content,
      created_at: message.created_at,
      has_attachments: message.has_media || false,
      sender: {
        id: message.profiles.id,
        name: message.profiles.full_name || 'Support Agent',
        avatar: message.profiles.avatar_url,
        role: message.profiles.role
      }
    };
    
    // Send data to the n8n webhook
    try {
      const webhookUrl = 'https://flytbasecs69.app.n8n.cloud/webhook/b2217366-5d68-45c0-92c9-49573ed6cff2';
      
      // Prepare the payload for the webhook
      const webhookPayload = {
        ticket_id: id,
        user_id: actualUserId,
        message_id: message.id,
        content: message.content,
        timestamp: new Date().toISOString(),
        action: 'message_sent'
      };
      
      // Fire and forget - don't await this to avoid blocking the response
      fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookPayload)
      }).then(response => {
        if (!response.ok) {
          console.error(`Webhook error: ${response.status}`);
        } else {
          console.log('Webhook notification sent successfully');
        }
      }).catch(err => {
        console.error('Error sending webhook notification:', err);
      });
      
      console.log('Webhook notification triggered for new message');
    } catch (webhookError) {
      // Log webhook errors but don't fail the main request
      console.error('Failed to trigger webhook notification:', webhookError);
    }
    
    return NextResponse.json({ message: formattedMessage });
  } catch (error) {  
    console.error('Error in messages API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
