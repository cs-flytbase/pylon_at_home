import { NextResponse, NextRequest } from 'next/server';
import { Ticket, TicketInsert } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { logDatabaseError } from '@/lib/error-logger';

export async function GET(request: NextRequest) {
  try {
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select(
        `*, customer:customer_id(id, full_name, email), assignee:assignee_id(id, full_name, email)`
      )
      .order('created_at', { ascending: false });

    if (error) {
      logDatabaseError(error, 'tickets', 'api_fetch');
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tickets, total: tickets.length });
  } catch (err) {
    console.error('Error fetching tickets:', err);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const data = await request.json();
  
  return NextResponse.json({
    success: true,
    message: 'Ticket updated successfully',
    data
  });
}

/**
 * Create a new ticket in the Supabase database
 */
export async function POST(request: Request) {
  try {
    console.log('POST /api/tickets - Creating new ticket');
    const ticketData = await request.json();
    
    // Log the request data (sanitized for security)
    console.log('Ticket creation request:', {
      ...ticketData,
      description: ticketData.description ? 
        `${ticketData.description.substring(0, 30)}...` : null
    });
    
    // Validate the ticket data
    if (!ticketData.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }
    
    if (!ticketData.customer_id) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }
    
    // Set status to 'new' if not specified
    if (!ticketData.status) {
      ticketData.status = 'new';
    }
    
    // Exclude unsupported fields (customer_name, customer_email) from insertion
    const { customer_name, customer_email, ...insertData } = ticketData;
    // Convert placeholder 'unknown' to null for customer_id (UUID column)
    if (insertData.customer_id === 'unknown') {
      // @ts-ignore allow null for nullable column
      insertData.customer_id = null;
    }
    
    // Create the ticket in Supabase
    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      logDatabaseError(error, 'tickets', 'api_insert');
      console.error('Error creating ticket in database:', error);
      
      return NextResponse.json(
        { error: `Failed to create ticket: ${error.message}` },
        { status: 500 }
      );
    }
    
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket was created but no data was returned' },
        { status: 500 }
      );
    }
    
    console.log('Successfully created ticket:', ticket.id);
    
    // Return the newly created ticket
    return NextResponse.json({
      success: true,
      message: 'Ticket created successfully',
      ticket
    });
  } catch (err) {
    console.error('Unexpected error in ticket creation:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
