import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client - need to await it
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch all WhatsApp accounts for the authenticated user
    const { data: accounts, error } = await supabase
      .from('whatsapp_accounts')
      .select('*')
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error fetching WhatsApp accounts:', error);
      return NextResponse.json({ error: 'Failed to fetch WhatsApp accounts' }, { status: 500 });
    }
    
    // Return a successful response with the accounts data
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Unexpected error fetching WhatsApp accounts:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred while fetching WhatsApp accounts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
