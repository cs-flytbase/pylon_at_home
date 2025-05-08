import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerSupabase } from '@/lib/supabase-server';

// Note: We'll use createServerClient which handles auth cookies automatically

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Initialize Supabase client with auth cookie support
    const supabase = createRouteHandlerSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const conversationId = params.id;
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Check if this is an AI agent conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')  // Select all fields first
      .eq('id', conversationId)
      .maybeSingle();
    
    if (convError) {
      console.error('Error fetching conversation:', convError);
    }

    let isAiConversation = false;
    let agentId = null;

    // Handle metadata from conversation if it exists
    if (conversation) {
      // Use type assertion to access potentially missing properties
      // This is necessary because the TypeScript types might not include metadata yet
      const convWithMetadata = conversation as any;
      
      if (convWithMetadata.metadata) {
        try {
          // Parse metadata if it's a string
          const metadata = typeof convWithMetadata.metadata === 'string'
            ? JSON.parse(convWithMetadata.metadata)
            : convWithMetadata.metadata;
            
          if (metadata && metadata.is_agent && metadata.agent_id) {
            isAiConversation = true;
            agentId = metadata.agent_id;
            console.log('Found AI agent conversation with agent ID:', agentId);
          }
        } catch (error) {
          console.error('Error parsing conversation metadata:', error);
        }
      }
    }

    // Get messages for the conversation
    const { data: messages, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      messages, 
      isAiConversation,
      agentId
    });
  } catch (error) {
    console.error('Error in GET messages route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { content } = body;
    const conversationId = params.id;

    // Initialize Supabase client with auth cookie support
    const supabase = createRouteHandlerSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Define interface for conversation data with optional metadata
    interface Conversation {
      id: string;
      metadata?: string | Record<string, any>;
    }

    // Check if this is an AI agent conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('metadata')
      .eq('id', conversationId)
      .maybeSingle<Conversation>();
    
    // Log error if there's an issue with the query
    if (error) {
      console.error('Error fetching conversation metadata:', error);
    }

    let isAiConversation = false;
    let agentId = null;

    // Check if conversation exists and has metadata
    if (conversation && 'metadata' in conversation && conversation.metadata) {
      try {
        const metadata = typeof conversation.metadata === 'string' 
          ? JSON.parse(conversation.metadata) 
          : conversation.metadata;
        
        if (metadata.is_agent && metadata.agent_id) {
          isAiConversation = true;
          agentId = metadata.agent_id;
          console.log('This is an AI agent conversation with agent:', agentId);
        }
      } catch (error) {
        console.error('Error parsing conversation metadata:', error);
      }
    }

    // Add the user's message to the conversation
    const { data: userMessage, error: messageError } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        user_id: user.id, // Using user_id instead of sender_id to match schema
        content: content,
        direction: 'outbound', // Add direction which is required
        status: 'sent' // Add status field

      })
      .select()
      .single();

    if (messageError) {
      console.error('Error sending message:', messageError);
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }

    // If this is an AI conversation, generate a response
    if (isAiConversation && agentId) {
      try {
        // In a real implementation, this would call an external AI service
        // For now, just send a dummy response from the AI
        const aiResponse = "I'm an AI assistant ready to help you! What can I assist you with today?";
        
        const { data: aiMessage, error: aiError } = await supabase
          .from('conversation_messages')
          .insert({
            conversation_id: conversationId,
            // For AI messages, use a system ID as user_id
            user_id: '00000000-0000-0000-0000-000000000000', // System/AI user ID
            content: aiResponse,
            direction: 'inbound', // AI messages come inbound
            status: 'delivered', // Mark as delivered
            // Store AI metadata in a separate column if needed
            // You may need to add these columns to your schema

          })
          .select()
          .single();

        if (aiError) {
          console.error('Error sending AI response:', aiError);
          return NextResponse.json({ 
            message: userMessage,
            error: 'Failed to generate AI response'
          });
        }

        // Return both messages
        return NextResponse.json({ 
          userMessage,
          aiMessage
        });
      } catch (aiServiceError) {
        console.error('Error with AI service:', aiServiceError);
        return NextResponse.json({ 
          message: userMessage,
          error: 'AI service error'
        });
      }
    }

    // For non-AI conversations, just return the user message
    return NextResponse.json({ message: userMessage });
  } catch (error) {
    console.error('Error in POST messages route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
