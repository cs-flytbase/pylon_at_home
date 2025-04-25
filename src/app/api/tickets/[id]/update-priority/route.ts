import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// PATCH /api/tickets/[id]/update-priority
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // In Next.js 15, route parameters are returned as Promises that must be awaited
    const { id } = await params;
    const body = await request.json();
    const { priority } = body;

    if (!priority) {
      return NextResponse.json({ error: 'Priority is required' }, { status: 400 });
    }

    // Validate priority is one of the allowed values
    const allowedPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!allowedPriorities.includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority value' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Update the ticket priority
    const { data: updatedTicket, error } = await supabase
      .from('tickets')
      .update({
        priority,
        updated_at: new Date().toISOString() // Update the timestamp
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating ticket priority:', error);
      return NextResponse.json({ error: 'Failed to update ticket priority' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Ticket priority updated successfully',
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Error in update ticket priority API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
