import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { WhatsAppService } from '@/lib/services/whatsapp.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, days = 7 } = body;
    
    // Validate required parameters
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Initialize WhatsApp service
    const whatsappService = new WhatsAppService();
    
    // Trigger import
    const result = await whatsappService.importConversations(userId, days);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Failed to import WhatsApp conversations' }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'WhatsApp conversations imported successfully' });
  } catch (error) {
    console.error('Error in WhatsApp import API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
