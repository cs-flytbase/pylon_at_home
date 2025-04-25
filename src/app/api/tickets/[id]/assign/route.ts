import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// PATCH /api/tickets/[id]/assign
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // In Next.js 15, route parameters are returned as Promises that must be awaited
    const { id } = await params;
    const body = await request.json();
    const { assignee_id } = body;

    const supabase = createServerClient();

    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    // If assignee_id is null, it means we want to unassign the ticket
    // If it's provided, we want to assign it to a specific user
    updateData.assignee_id = assignee_id;

    // Update the ticket assignee
    const { data: updatedTicket, error } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        title,
        status,
        priority,
        type,
        assignee_id,
        created_at,
        updated_at,
        assignee:profiles!assignee_id(id, full_name, avatar_url, role)
      `)
      .single();

    if (error) {
      console.error('Error updating ticket assignee:', error);
      return NextResponse.json({ error: 'Failed to update ticket assignee' }, { status: 500 });
    }

    return NextResponse.json({
      message: assignee_id ? 'Ticket assigned successfully' : 'Ticket unassigned successfully',
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Error in assign ticket API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
