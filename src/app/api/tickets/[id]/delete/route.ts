import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// DELETE /api/tickets/[id]/delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // In Next.js 15, route parameters are returned as Promises that must be awaited
    const { id } = await params;
    const supabase = createServerClient();

    // First, delete any messages associated with this ticket
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('ticket_id', id);

    if (messagesError) {
      console.error('Error deleting ticket messages:', messagesError);
      return NextResponse.json({ error: 'Failed to delete ticket messages' }, { status: 500 });
    }

    // Then delete any ticket_tags relationships
    const { error: tagRelationsError } = await supabase
      .from('ticket_tags')
      .delete()
      .eq('ticket_id', id);

    if (tagRelationsError) {
      console.error('Error deleting ticket tag relations:', tagRelationsError);
      return NextResponse.json({ error: 'Failed to delete ticket tag relations' }, { status: 500 });
    }

    // Finally delete the ticket itself
    const { error: ticketError } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);

    if (ticketError) {
      console.error('Error deleting ticket:', ticketError);
      return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Ticket deleted successfully'
    });
  } catch (error) {
    console.error('Error in delete ticket API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
