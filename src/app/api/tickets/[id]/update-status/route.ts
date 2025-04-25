import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// PATCH /api/tickets/[id]/update-status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // In Next.js 15, route parameters are returned as Promises that must be awaited
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Validate status is one of the allowed values
    const allowedStatuses = ['new', 'in-progress', 'on-me', 'resolved'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Update the ticket status
    const { data: updatedTicket, error } = await supabase
      .from('tickets')
      .update({
        status,
        updated_at: new Date().toISOString() // Update the timestamp
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating ticket status:', error);
      return NextResponse.json({ error: 'Failed to update ticket status' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Ticket status updated successfully',
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Error in update ticket status API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
