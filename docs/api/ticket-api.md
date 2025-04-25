# Ticket API

## Overview

The Ticket API provides endpoints for managing support tickets, including creating, retrieving, updating, and deleting tickets. It also supports status changes, assignment, and filtering.

## Base URL

All ticket API endpoints are located under the `/api/tickets` path.

## Endpoints

### List Tickets

**URL**: `/api/tickets`  
**Method**: `GET`  
**Authentication**: Required  

#### Query Parameters

| Parameter   | Type    | Description                                   | Required |
|-------------|---------|-----------------------------------------------|----------|
| status      | string  | Filter by ticket status                       | No       |
| priority    | string  | Filter by priority level                      | No       |
| type        | string  | Filter by ticket type                         | No       |
| assignee_id | string  | Filter by assignee                            | No       |
| page        | number  | Page number for pagination (default: 1)       | No       |
| limit       | number  | Number of tickets per page (default: 20)      | No       |
| sort        | string  | Field to sort by (default: created_at)        | No       |
| order       | string  | Sort order ('asc' or 'desc')                  | No       |

#### Response

```typescript
type ListTicketsResponse = {
  tickets: Ticket[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};
```

#### Example

```typescript
// Request
GET /api/tickets?status=in-progress&priority=high&page=1&limit=10

// Response
{
  "tickets": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Cannot access account",
      "description": "I'm trying to log in but keep getting an error message",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "source": "email",
      "status": "in-progress",
      "priority": "high",
      "type": "support",
      "assignee_id": "456e4567-e89b-12d3-a456-426614174000",
      "created_at": "2025-04-23T10:20:30Z",
      "updated_at": "2025-04-24T14:15:16Z",
      "has_media": false
    },
    // Additional tickets...
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

#### Implementation

```typescript
// src/app/api/tickets/route.ts
export async function GET(
  request: NextRequest
): Promise<Response> {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const type = searchParams.get('type');
    const assigneeId = searchParams.get('assignee_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';
    
    // Build query
    let query = supabase
      .from('tickets')
      .select('*', { count: 'exact' })
      .order(sort, { ascending: order === 'asc' })
      .range((page - 1) * limit, page * limit - 1);
    
    // Apply filters
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (type) query = query.eq('type', type);
    if (assigneeId) query = query.eq('assignee_id', assigneeId);
    
    // Execute query
    const { data: tickets, count, error } = await query;
    
    if (error) throw error;
    
    return NextResponse.json({
      tickets,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}
```

### Get Ticket by ID

**URL**: `/api/tickets/[id]`  
**Method**: `GET`  
**Authentication**: Required  

#### Path Parameters

| Parameter   | Type    | Description                     | Required |
|-------------|---------|---------------------------------|----------|
| id          | string  | The UUID of the ticket to fetch | Yes      |

#### Response

```typescript
type GetTicketResponse = {
  ticket: Ticket;
  messages: Message[];
  attachments: Attachment[];
  tags: Tag[];
};
```

#### Example

```typescript
// Request
GET /api/tickets/123e4567-e89b-12d3-a456-426614174000

// Response
{
  "ticket": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Cannot access account",
    "description": "I'm trying to log in but keep getting an error message",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "source": "email",
    "status": "in-progress",
    "priority": "high",
    "type": "support",
    "assignee_id": "456e4567-e89b-12d3-a456-426614174000",
    "created_at": "2025-04-23T10:20:30Z",
    "updated_at": "2025-04-24T14:15:16Z",
    "has_media": true
  },
  "messages": [
    {
      "id": "789e4567-e89b-12d3-a456-426614174000",
      "ticket_id": "123e4567-e89b-12d3-a456-426614174000",
      "sender_type": "customer",
      "sender_name": "John Doe",
      "content": "I'm trying to log in but keep getting an error message",
      "created_at": "2025-04-23T10:20:30Z",
      "updated_at": "2025-04-23T10:20:30Z",
      "has_attachments": true,
      "is_read": true,
      "platform": "email"
    },
    // Additional messages...
  ],
  "attachments": [
    {
      "id": "101e4567-e89b-12d3-a456-426614174000",
      "message_id": "789e4567-e89b-12d3-a456-426614174000",
      "ticket_id": "123e4567-e89b-12d3-a456-426614174000",
      "type": "image",
      "filename": "error-screenshot.png",
      "file_path": "/ticket-attachments/error-screenshot.png",
      "file_size": 125000,
      "mime_type": "image/png",
      "created_at": "2025-04-23T10:20:30Z"
    }
  ],
  "tags": [
    {
      "id": "201e4567-e89b-12d3-a456-426614174000",
      "name": "login-issue",
      "color": "#FF5733"
    }
  ]
}
```

#### Implementation

```typescript
// src/app/api/tickets/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    // Note the await for params - new in Next.js 15
    const { id } = await params;
    
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();
    
    if (ticketError) {
      if (ticketError.code === 'PGRST116') {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }
      throw ticketError;
    }
    
    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });
    
    if (messagesError) throw messagesError;
    
    // Get attachments
    const { data: attachments, error: attachmentsError } = await supabase
      .from('attachments')
      .select('*')
      .eq('ticket_id', id);
    
    if (attachmentsError) throw attachmentsError;
    
    // Get tags
    const { data: ticketTags, error: ticketTagsError } = await supabase
      .from('ticket_tags')
      .select('tag_id')
      .eq('ticket_id', id);
    
    if (ticketTagsError) throw ticketTagsError;
    
    const tagIds = ticketTags.map(tt => tt.tag_id);
    
    let tags = [];
    if (tagIds.length > 0) {
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .in('id', tagIds);
      
      if (tagsError) throw tagsError;
      tags = tagsData;
    }
    
    return NextResponse.json({
      ticket,
      messages: messages || [],
      attachments: attachments || [],
      tags
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: "Failed to fetch ticket details" },
      { status: 500 }
    );
  }
}
```

### Create Ticket

**URL**: `/api/tickets`  
**Method**: `POST`  
**Authentication**: Required  

#### Request Body

```typescript
type CreateTicketRequest = {
  title: string;
  description?: string;
  customer_name: string;
  customer_email: string;
  source: 'email' | 'whatsapp' | 'telegram' | 'slack';
  status?: string; // Default: 'new'
  priority?: 'low' | 'medium' | 'high' | 'urgent'; // Default: 'medium'
  type?: 'support' | 'bug' | 'feature'; // Default: 'support'
  assignee_id?: string;
};
```

#### Response

```typescript
type CreateTicketResponse = {
  ticket: Ticket;
};
```

#### Example

```typescript
// Request
POST /api/tickets
Content-Type: application/json

{
  "title": "New feature request",
  "description": "I would like to request a new feature for the platform",
  "customer_name": "Jane Smith",
  "customer_email": "jane@example.com",
  "source": "email",
  "priority": "medium",
  "type": "feature"
}

// Response
{
  "ticket": {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "title": "New feature request",
    "description": "I would like to request a new feature for the platform",
    "customer_name": "Jane Smith",
    "customer_email": "jane@example.com",
    "source": "email",
    "status": "new",
    "priority": "medium",
    "type": "feature",
    "assignee_id": null,
    "created_at": "2025-04-24T15:30:45Z",
    "updated_at": "2025-04-24T15:30:45Z",
    "has_media": false
  }
}
```

#### Implementation

```typescript
// src/app/api/tickets/route.ts
export async function POST(
  request: NextRequest
): Promise<Response> {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    
    // Basic validation
    if (!body.title || !body.customer_name || !body.customer_email || !body.source) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Create ticket
    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        title: body.title,
        description: body.description,
        customer_name: body.customer_name,
        customer_email: body.customer_email,
        source: body.source,
        status: body.status || 'new',
        priority: body.priority || 'medium',
        type: body.type || 'support',
        assignee_id: body.assignee_id
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Create initial message if description exists
    if (body.description) {
      await supabase
        .from('messages')
        .insert({
          ticket_id: ticket.id,
          sender_type: 'customer',
          sender_name: body.customer_name,
          content: body.description,
          platform: body.source
        });
    }
    
    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}
```

### Update Ticket

**URL**: `/api/tickets/[id]`  
**Method**: `PATCH`  
**Authentication**: Required  

#### Path Parameters

| Parameter   | Type    | Description                     | Required |
|-------------|---------|---------------------------------|----------|
| id          | string  | The UUID of the ticket to update| Yes      |

#### Request Body

```typescript
type UpdateTicketRequest = {
  title?: string;
  description?: string;
  status?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  type?: 'support' | 'bug' | 'feature';
  assignee_id?: string | null;
};
```

#### Response

```typescript
type UpdateTicketResponse = {
  ticket: Ticket;
};
```

#### Example

```typescript
// Request
PATCH /api/tickets/123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json

{
  "status": "in-progress",
  "assignee_id": "456e4567-e89b-12d3-a456-426614174000"
}

// Response
{
  "ticket": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Cannot access account",
    "description": "I'm trying to log in but keep getting an error message",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "source": "email",
    "status": "in-progress",
    "priority": "high",
    "type": "support",
    "assignee_id": "456e4567-e89b-12d3-a456-426614174000",
    "created_at": "2025-04-23T10:20:30Z",
    "updated_at": "2025-04-24T15:45:30Z",
    "has_media": true
  }
}
```

#### Implementation

```typescript
// src/app/api/tickets/[id]/route.ts
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    
    // Check if ticket exists
    const { data: existingTicket, error: checkError } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', id)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }
      throw checkError;
    }
    
    // Update fields that are provided
    const updates: any = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status !== undefined) updates.status = body.status;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.type !== undefined) updates.type = body.type;
    if (body.assignee_id !== undefined) updates.assignee_id = body.assignee_id;
    
    // Record first response time if status is changing from 'new'
    const { data: oldTicket } = await supabase
      .from('tickets')
      .select('status, first_response_at')
      .eq('id', id)
      .single();
      
    if (oldTicket && oldTicket.status === 'new' && body.status && body.status !== 'new' && !oldTicket.first_response_at) {
      updates.first_response_at = new Date().toISOString();
    }
    
    // Record resolved time if status is changing to 'closed'
    if (body.status === 'closed') {
      updates.resolved_at = new Date().toISOString();
    }
    
    // Update ticket
    const { data: ticket, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 }
    );
  }
}
```

### Delete Ticket

**URL**: `/api/tickets/[id]`  
**Method**: `DELETE`  
**Authentication**: Required (Admin only)  

#### Path Parameters

| Parameter   | Type    | Description                     | Required |
|-------------|---------|---------------------------------|----------|
| id          | string  | The UUID of the ticket to delete| Yes      |

#### Response

```typescript
type DeleteTicketResponse = {
  message: string;
};
```

#### Example

```typescript
// Request
DELETE /api/tickets/123e4567-e89b-12d3-a456-426614174000

// Response
{
  "message": "Ticket deleted successfully"
}
```

#### Implementation

```typescript
// src/app/api/tickets/[id]/route.ts
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    
    const supabase = await createClient();
    
    // Check authentication and admin role
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
      
    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }
    
    // Check if ticket exists
    const { data: existingTicket, error: checkError } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', id)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }
      throw checkError;
    }
    
    // Delete ticket (cascade will handle messages, attachments, and tags)
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return NextResponse.json({ message: "Ticket deleted successfully" });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return NextResponse.json(
      { error: "Failed to delete ticket" },
      { status: 500 }
    );
  }
}
```

## Additional API Features

### Ticket Tags

Endpoints for managing ticket tags are available at `/api/tickets/[id]/tags` with methods for adding and removing tags.

### Ticket Assignment

A dedicated endpoint for ticket assignment is available at `/api/tickets/[id]/assign` to make assignment changes easier to track.

### Bulk Actions

Bulk actions for tickets are available at `/api/tickets/bulk` with support for:
- Bulk status updates
- Bulk assignment
- Bulk tagging

## Error Handling

All ticket API endpoints follow a consistent error handling pattern with appropriate HTTP status codes:

- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Ticket not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Rate Limiting

The ticket API implements rate limiting to prevent abuse. Limits are higher for authenticated users with admin roles.
