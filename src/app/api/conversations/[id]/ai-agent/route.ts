import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerSupabase } from '@/lib/supabase-server';
import { aiAgentService } from '@/lib/services/ai-agent.service';

// Enable AI agent for a conversation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    const body = await request.json();
    const { config } = body;

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

    // Validate conversation ID
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Check if conversation exists and user has access
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, team_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Create or update AI agent for the conversation
    const result = await aiAgentService.createAgent(conversationId, config);

    return NextResponse.json({
      success: true,
      agentId: result.agentId,
      config: result.config,
    });
  } catch (error) {
    console.error('Error enabling AI agent:', error);
    return NextResponse.json(
      { error: 'Failed to enable AI agent' },
      { status: 500 }
    );
  }
}

// Update AI agent configuration
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    const body = await request.json();
    const { config } = body;

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

    // Validate conversation ID
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Check if conversation exists and user has access
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, metadata')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Parse metadata to check if AI agent is enabled
    let metadata;
    try {
      metadata = typeof conversation.metadata === 'string'
        ? JSON.parse(conversation.metadata)
        : conversation.metadata || {};
    } catch (e) {
      metadata = {};
    }

    if (!metadata.is_agent) {
      return NextResponse.json(
        { error: 'AI agent is not enabled for this conversation' },
        { status: 400 }
      );
    }

    // Update AI agent configuration
    const result = await aiAgentService.updateAgentConfig(conversationId, config);

    return NextResponse.json({
      success: true,
      agentId: result.agentId,
      config: result.config,
    });
  } catch (error) {
    console.error('Error updating AI agent configuration:', error);
    return NextResponse.json(
      { error: 'Failed to update AI agent configuration' },
      { status: 500 }
    );
  }
}

// Disable AI agent for a conversation
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

    // Validate conversation ID
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Update conversation metadata to remove AI agent information
    const { error } = await supabase
      .from('conversations')
      .update({
        metadata: {
          is_agent: false,
        },
      })
      .eq('id', conversationId);

    if (error) {
      console.error('Error disabling AI agent:', error);
      return NextResponse.json(
        { error: 'Failed to disable AI agent' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'AI agent disabled successfully',
    });
  } catch (error) {
    console.error('Error disabling AI agent:', error);
    return NextResponse.json(
      { error: 'Failed to disable AI agent' },
      { status: 500 }
    );
  }
}

