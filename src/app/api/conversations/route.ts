import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerSupabase } from '@/lib/supabase-server';
import { isValidUUID, ensureValidUUID, getDefaultAgentUUID } from '@/lib/utils/uuid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Ensure we're using Node.js runtime for better auth support

// GET /api/conversations
export async function GET(request: NextRequest) {
  try {
    console.log('Fetching conversations from database');
    const supabase = createRouteHandlerSupabase();
    
    // Get the user for filtering (if needed)
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user for conversations query:', user?.id || 'Not authenticated');
    
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
      return NextResponse.json({ error: 'Failed to fetch conversations', details: error.message }, { 
        status: 500,
        headers: {
          // Add cache control headers to prevent browser caching
          'Cache-Control': 'no-store, max-age=0',
          'Pragma': 'no-cache'
        } 
      });
    }

    // Add cache control headers to the successful response as well
    return NextResponse.json({ conversations }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Pragma': 'no-cache'
      } 
    });
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch conversations', 
      details: error?.message || 'Unknown error' 
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Pragma': 'no-cache'
      } 
    });
  }
}

// POST /api/conversations
export async function POST(request: NextRequest) {
  // Add more debugging for the incoming request
  console.log('Received POST /api/conversations request');
  try {
    // Initialize Supabase client with auth cookie support
    const supabase = createRouteHandlerSupabase();

    // Authenticate the user and log the result for debugging
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json({
        error: 'Authentication failed',
        details: authError.message
      }, { status: 401 });
    }
    
    if (user) {
      console.log('Authenticated user ID:', user.id);
    } else {
      console.warn('No authenticated user found in cookies');
    }

    // Log the cookies to help debug auth issues
    console.log('Processing request with auth cookies');
    
    // Parse the request body and log it for debugging
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, (key, value) => {
      // Sanitize logs by truncating long strings
      if (typeof value === 'string' && value.length > 50) {
        return value.substring(0, 47) + '...';
      }
      return value;
    }));
    const { platform, isGroup, message, userId, whatsappAccountId, isAgent } = body;
    // Make recipient mutable so we can update it if needed
    let recipient = body.recipient;

    if (!platform || !recipient) {
      return NextResponse.json({ 
        error: 'Platform and recipient are required' 
      }, { status: 400 });
    }

    // Validate platform
    const validPlatforms = ['whatsapp', 'telegram', 'email', 'slack', 'ai'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json({ 
        error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` 
      }, { status: 400 });
    }

    // Use provided userId or the authenticated user's ID
    let actualUserId = userId || user?.id;
    
    // Handle the case when this is an AI agent conversation
    if (platform === 'ai' && isAgent) {
      console.log('Creating AI agent conversation');
      // For AI agents, we'll store the agent ID in metadata instead of using it as user_id
      if (!actualUserId) {
        // If no user ID is provided but it's an agent conversation, use the authenticated user's ID
        actualUserId = user?.id;
      }
      
      // For AI agents, use our predefined agent if needed
      try {
        // Log the agent ID for debugging
        console.log(`Working with AI agent ID: ${recipient}`);
        
        // If we can't validate the agent UUID properly, use our fallback agent ID
        if (!isValidUUID(recipient)) {
          // If not a valid UUID, use our fallback agent ID
          console.log(`Invalid agent ID format: ${recipient}, using fallback ID`);
          recipient = getDefaultAgentUUID();
        }
      } catch (agentError) {
        console.error('Error in AI agent handling:', agentError);
        // Use fallback ID if there was an error
        recipient = getDefaultAgentUUID();
      }
    }

    // If no user ID is provided, use the authenticated user's ID
    if (!actualUserId && user) {
      console.log('No explicit user ID provided, using authenticated user ID:', user.id);
      actualUserId = user.id;
    }
    
    if (!actualUserId) {
      console.error('User authentication error - details:', { 
        providedUserId: userId,
        hasAuthUser: !!user,
        authUserId: user?.id,
        platform,
        recipient: recipient?.substring(0, 10) + '...' // Log partial recipient for privacy
      });
      
      return NextResponse.json({
        error: 'User ID is required - no user ID provided and no authenticated user found'
      }, { status: 400 });
    }
    
    // Log request details for debugging
    console.log('Conversation creation request:', {
      platform,
      recipient,
      isAgent,
      actualUserId
    });

    // If platform is AI, we don't need to validate the user ID as a UUID
    // For other platforms, validate that the user ID is a valid UUID
    if (platform !== 'ai' && actualUserId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(actualUserId)) {
        console.log('Invalid UUID format for user ID:', actualUserId);
        return NextResponse.json({ 
          error: `Invalid user ID format '${actualUserId}'. Must be a valid UUID.` 
        }, { status: 400 });
      }
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

    // Note: supabase client is already created above, don't recreate
    // Note: actualUserId is already properly handled above

    // Prepare conversation data
    const conversationData: any = {
      platform,
      recipient,
      is_group: isGroup || false,
      last_message: message || null,
      last_message_at: new Date().toISOString(),
      user_id: actualUserId
    };
    
    // Add agent metadata if this is an AI agent conversation
    if (platform === 'ai' && isAgent) {
      if (!conversationData.metadata) {
        conversationData.metadata = {};
      } else if (typeof conversationData.metadata === 'string') {
        try {
          conversationData.metadata = JSON.parse(conversationData.metadata);
        } catch (e) {
          conversationData.metadata = {};
        }
      }
      
      // For AI platforms, set a descriptive recipient name
      try {
        // For now, just use 'AI Assistant' as the display name
        conversationData.recipient = 'AI Assistant';
        
        // The actual agent ID is stored in metadata
        console.log('Using AI Assistant as display name');
      } catch (e) {
        console.error('Error setting AI recipient name:', e);
      }
      
      // Store agent information in metadata
      conversationData.metadata.agent_id = recipient;
      conversationData.metadata.is_agent = true;
      conversationData.metadata = JSON.stringify(conversationData.metadata);
    }
    
    // Handle WhatsApp specific settings
    if (platform === 'whatsapp') {
      // Store WhatsApp information in metadata JSON
      try {
        // Attempt to validate the WhatsApp account
        const { PeriskopeService } = await import('@/lib/services/periskope.service');
        const periskopeService = new PeriskopeService();
        
        console.log(`Validating WhatsApp account ID: '${whatsappAccountId}'`);
        const account = await periskopeService.getWhatsAppAccountById(whatsappAccountId);
        
        if (!account) {
          console.warn(`WhatsApp account validation warning: Account with ID '${whatsappAccountId}' could not be found or accessed.`);
        } else {
          console.log(`Successfully validated WhatsApp account: ${account.account_name || account.phone_number}`);
        }
      } catch (error) {
        console.error('WhatsApp account validation error:', error);
      }
      
      // Always include metadata for WhatsApp info in case the column doesn't exist
      if (!conversationData.metadata) {
        conversationData.metadata = {};
      } else if (typeof conversationData.metadata === 'string') {
        try {
          conversationData.metadata = JSON.parse(conversationData.metadata);
        } catch (e) {
          conversationData.metadata = {};
        }
      }
      
      // Add WhatsApp info to metadata
      conversationData.metadata.whatsapp_account_id = whatsappAccountId;
      conversationData.metadata = JSON.stringify(conversationData.metadata);
      
      // Try to add the column directly, but handle errors gracefully
      try {
        // Attempt to add whatsapp_account_id - this will fail if the column doesn't exist
        conversationData.whatsapp_account_id = whatsappAccountId;
      } catch (columnError) {
        // If this errors, we'll just continue - the metadata field has the info as backup
        console.warn('Could not add whatsapp_account_id to conversation - column might not exist');
      }
    }

    // Insert the new conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert(conversationData)
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

    // For WhatsApp, initiate the communication if we have a valid account ID
    if (platform === 'whatsapp' && whatsappAccountId) {
      try {
        // Import the Periskope service
        const { PeriskopeService } = await import('@/lib/services/periskope.service');
        const periskopeService = new PeriskopeService();
        
        // If there's an initial message, send it via Periskope API
        if (message) {
          await periskopeService.sendWhatsAppMessage(
            whatsappAccountId,
            recipient,
            message,
            isGroup
          );
          
          // Update the message status to sent
          await supabase
            .from('conversation_messages')
            .update({ status: 'sent' })
            .eq('conversation_id', conversation.id)
            .eq('content', message);
        }
        
        // Import recent messages from the WhatsApp chat
        try {
          // Call our import-messages endpoint to fetch and store chat history
          const importResponse = await fetch(`${request.nextUrl.origin}/api/conversations/import-messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              conversationId: conversation.id,
              whatsappAccountId
            })
          });
          
          if (!importResponse.ok) {
            console.warn('Failed to import WhatsApp messages, but conversation was created successfully');
          } else {
            const importResult = await importResponse.json();
            console.log(`Imported ${importResult.messageCount} messages`);
          }
        } catch (importError) {
          console.error('Error importing WhatsApp messages:', importError);
          // Continue even if message import fails
        }
      } catch (error) {
        console.error('Error communicating with WhatsApp API:', error);
        // Continue even if sending message fails
      }
    }
    
    // For other platforms, we would initiate the actual communication here
    // (Telegram, Email, Slack API calls would go here)
    
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {  
    console.error('Error in conversations API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
