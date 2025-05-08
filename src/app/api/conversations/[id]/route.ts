import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerSupabase } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    
    // Initialize Supabase client
    const supabase = createRouteHandlerSupabase();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get conversation details
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    
    if (convError) {
      console.error('Error fetching conversation:', convError);
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    // Get messages for the conversation
    const { data: messages, error: msgError } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (msgError) {
      console.error('Error fetching messages:', msgError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }
    
    // Check if this is an AI agent conversation
    let isAiConversation = false;
    let agentConfig = null;
    
    if (conversation.metadata) {
      try {
        const metadata = typeof conversation.metadata === 'string'
          ? JSON.parse(conversation.metadata)
          : conversation.metadata;
        
        if (metadata.is_agent) {
          isAiConversation = true;
          agentConfig = metadata.agent_config || null;
        }
      } catch (error) {
        console.error('Error parsing conversation metadata:', error);
      }
    }
    
    return NextResponse.json({
      conversation,
      messages,
      isAiConversation,
      agentConfig
    });
  } catch (error) {
    console.error('Error in GET conversation route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    const body = await request.json();
    
    // Initialize Supabase client
    const supabase = createRouteHandlerSupabase();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Update conversation
    const { data, error } = await supabase
      .from('conversations')
      .update(body)
      .eq('id', conversationId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating conversation:', error);
      return NextResponse.json(
        { error: 'Failed to update conversation' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ conversation: data });
  } catch (error) {
    console.error('Error in PATCH conversation route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    
    // Initialize Supabase client
    const supabase = createRouteHandlerSupabase();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Delete conversation
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);
    
    if (error) {
      console.error('Error deleting conversation:', error);
      return NextResponse.json(
        { error: 'Failed to delete conversation' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE conversation route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
