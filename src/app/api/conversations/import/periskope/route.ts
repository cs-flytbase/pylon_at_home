import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { PeriskopeService } from '@/lib/services/periskope.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;
    
    // Validate required parameters
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Check for Periskope credentials
    if (!process.env.PERISKOPE_API_KEY || !process.env.PERISKOPE_PHONE_NUMBER) {
      return NextResponse.json({ 
        error: 'Periskope API credentials not configured' 
      }, { status: 500 });
    }
    
    // Initialize service and trigger import
    const periskopeService = new PeriskopeService();
    const result = await periskopeService.importConversations(userId);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: 'Failed to import WhatsApp conversations from Periskope' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: `WhatsApp conversations imported successfully (${result.imported} new conversations)` 
    });
  } catch (error) {
    console.error('Error in Periskope import API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
