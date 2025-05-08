import { NextRequest, NextResponse } from 'next/server';
import { PeriskopeApi } from '@periskope/periskope-client';

// Enforce dynamic usage to avoid caching
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/whatsapp/chats
 * Fetches WhatsApp chats from Periskope without requiring authentication
 * Body parameters:
 * - apiKey: Periskope API key (if not using environment variable)
 * - phoneNumber: The phone number associated with the WhatsApp account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, phoneNumber } = body;
    
    // Validate required parameters
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Initialize the Periskope client using either provided key or environment variable
    const periskopeAuthToken = apiKey || process.env.PERISKOPE_API_KEY;
    if (!periskopeAuthToken) {
      return NextResponse.json({ error: 'Periskope API key is not configured' }, { status: 500 });
    }

    const client = new PeriskopeApi({
      authToken: periskopeAuthToken,
      phone: phoneNumber,
    });

    // Fetch chats from Periskope
    const response = await client.chat.getChats();
    const chats = response.chats || [];

    // Transform the chat data to a more usable format
    const formattedChats = chats.map(chat => ({
      id: chat.id,
      title: chat.title || (chat.isGroup ? 'Group Chat' : chat.phone || 'Unknown'),
      phone: chat.phone,
      isGroup: chat.isGroup || false,
      lastMessageTimestamp: chat.lastMessageTimestamp,
      unreadCount: chat.unreadCount || 0,
    }));

    // Sort chats by lastMessageTimestamp in descending order
    formattedChats.sort((a, b) => {
      return (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0);
    });

    return NextResponse.json({
      success: true,
      chats: formattedChats,
    });

  } catch (error) {
    console.error('Error fetching WhatsApp chats:', error);
    return NextResponse.json({
      error: 'Failed to fetch WhatsApp chats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
