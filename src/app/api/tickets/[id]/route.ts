import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET /api/tickets/:id
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // In Next.js 15, route parameters are returned as Promises that must be awaited
    const { id } = await params;
    const supabase = createServerClient();
    
    // Fetch ticket details from Supabase
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        type,
        created_at,
        updated_at,
        has_media,
        assignee_id,
        customer:profiles!customer_id(id, full_name, email, avatar_url)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching ticket:', error);
      return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 });
    }

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Format the response
    const formattedTicket = {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      type: ticket.type,
      customer_id: ticket.customer?.id,
      customer_name: ticket.customer?.full_name,
      customer_email: ticket.customer?.email,
      assignee_id: ticket.assignee_id,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      has_media: ticket.has_media
    };

    return NextResponse.json({ ticket: formattedTicket });
  } catch (error) {
    console.error('Error in ticket API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/tickets/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createServerClient();
    
    // Only allow updating certain fields
    const allowedFields = ['title', 'description', 'status', 'priority', 'type', 'assignee_id'];
    const updateData = Object.keys(body)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {} as Record<string, any>);
    
    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();
    
    const { data: updatedTicket, error } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating ticket:', error);
      return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
    }
    
    return NextResponse.json({ ticket: updatedTicket });
  } catch (error) {
    console.error('Error in update ticket API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
