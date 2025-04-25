# Message API

## Overview

The Message API enables communication features within the support platform, allowing agents and customers to exchange messages with rich text and media attachments.

## Base URL

All message API endpoints are located under the `/api/messages` path.

## Endpoints

### List Messages for a Ticket

**URL**: `/api/messages`  
**Method**: `GET`  
**Authentication**: Required  

#### Query Parameters

| Parameter   | Type    | Description                                   | Required |
|-------------|---------|-----------------------------------------------|----------|
| ticket_id   | string  | ID of the ticket to fetch messages for        | Yes      |
| page        | number  | Page number for pagination (default: 1)       | No       |
| limit       | number  | Number of messages per page (default: 50)     | No       |
| is_internal | boolean | Filter for internal notes                     | No       |

#### Response

```typescript
type ListMessagesResponse = {
  messages: Message[];
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
GET /api/messages?ticket_id=123e4567-e89b-12d3-a456-426614174000&page=1&limit=20

// Response
{
  "messages": [
    {
      "id": "789e4567-e89b-12d3-a456-426614174000",
      "ticket_id": "123e4567-e89b-12d3-a456-426614174000",
      "sender_type": "customer",
      "sender_id": null,
      "sender_name": "John Doe",
      "sender_avatar": null,
      "content": "I'm trying to log in but keep getting an error message",
      "created_at": "2025-04-23T10:20:30Z",
      "updated_at": "2025-04-23T10:20:30Z",
      "is_internal": false,
      "reply_type": "manual",
      "has_attachments": true,
      "is_read": true,
      "platform": "email",
      "external_id": null
    },
    // Additional messages...
  ],
  "pagination": {
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

#### Implementation

```typescript
// src/app/api/messages/route.ts
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
    const ticketId = searchParams.get('ticket_id');
    
    if (!ticketId) {
      return NextResponse.json(
        { error: "ticket_id is required" },
        { status: 400 }
      );
    }
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const isInternal = searchParams.get('is_internal');
    
    // Build query
    let query = supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .range((page - 1) * limit, page * limit - 1);
    
    // Apply internal filter if specified
    if (isInternal !== null) {
      query = query.eq('is_internal', isInternal === 'true');
    }
    
    // Execute query
    const { data: messages, count, error } = await query;
    
    if (error) throw error;
    
    // Update is_read flag for unread messages
    if (messages && messages.length > 0) {
      const unreadMessages = messages
        .filter(msg => !msg.is_read && msg.sender_type === 'customer')
        .map(msg => msg.id);
      
      if (unreadMessages.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadMessages);
      }
    }
    
    return NextResponse.json({
      messages: messages || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
```

### Get Message by ID

**URL**: `/api/messages/[id]`  
**Method**: `GET`  
**Authentication**: Required  

#### Path Parameters

| Parameter | Type   | Description                      | Required |
|-----------|--------|----------------------------------|----------|
| id        | string | The UUID of the message to fetch | Yes      |

#### Response

```typescript
type GetMessageResponse = {
  message: Message;
  attachments: Attachment[];
};
```

#### Example

```typescript
// Request
GET /api/messages/789e4567-e89b-12d3-a456-426614174000

// Response
{
  "message": {
    "id": "789e4567-e89b-12d3-a456-426614174000",
    "ticket_id": "123e4567-e89b-12d3-a456-426614174000",
    "sender_type": "customer",
    "sender_id": null,
    "sender_name": "John Doe",
    "sender_avatar": null,
    "content": "I'm trying to log in but keep getting an error message",
    "created_at": "2025-04-23T10:20:30Z",
    "updated_at": "2025-04-23T10:20:30Z",
    "is_internal": false,
    "reply_type": "manual",
    "has_attachments": true,
    "is_read": true,
    "platform": "email",
    "external_id": null
  },
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
  ]
}
```

#### Implementation

```typescript
// src/app/api/messages/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    // Await params - using Next.js 15's Promise-based route parameters
    const { id } = await params;
    
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();
    
    if (messageError) {
      if (messageError.code === 'PGRST116') {
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
      }
      throw messageError;
    }
    
    // Get attachments
    const { data: attachments, error: attachmentsError } = await supabase
      .from('attachments')
      .select('*')
      .eq('message_id', id);
    
    if (attachmentsError) throw attachmentsError;
    
    // Mark as read if it's a customer message and not read yet
    if (message.sender_type === 'customer' && !message.is_read) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', id);
      
      message.is_read = true;
    }
    
    return NextResponse.json({
      message,
      attachments: attachments || []
    });
  } catch (error) {
    console.error('Error fetching message:', error);
    return NextResponse.json(
      { error: "Failed to fetch message details" },
      { status: 500 }
    );
  }
}
```

### Create Message

**URL**: `/api/messages`  
**Method**: `POST`  
**Authentication**: Required  
**Content-Type**: `multipart/form-data` (for file uploads) or `application/json`

#### Request Body

```typescript
type CreateMessageRequest = {
  ticket_id: string;
  content: string;
  is_internal?: boolean; // Default: false
  reply_type?: 'manual' | 'ai' | 'template'; // Default: 'manual'
  platform?: string; // Default: null (reply through platform)
  attachments?: File[]; // For multipart/form-data
};
```

#### Response

```typescript
type CreateMessageResponse = {
  message: Message;
  attachments?: Attachment[];
};
```

#### Example

```typescript
// Request (JSON without attachments)
POST /api/messages
Content-Type: application/json

{
  "ticket_id": "123e4567-e89b-12d3-a456-426614174000",
  "content": "<p>Thank you for reporting this issue. Could you please provide more details about the error message you're seeing?</p>",
  "is_internal": false,
  "reply_type": "manual"
}

// Response
{
  "message": {
    "id": "889e4567-e89b-12d3-a456-426614174000",
    "ticket_id": "123e4567-e89b-12d3-a456-426614174000",
    "sender_type": "agent",
    "sender_id": "456e4567-e89b-12d3-a456-426614174000",
    "sender_name": "Support Agent",
    "sender_avatar": "https://example.com/avatars/agent.jpg",
    "content": "<p>Thank you for reporting this issue. Could you please provide more details about the error message you're seeing?</p>",
    "created_at": "2025-04-24T16:30:45Z",
    "updated_at": "2025-04-24T16:30:45Z",
    "is_internal": false,
    "reply_type": "manual",
    "has_attachments": false,
    "is_read": true,
    "platform": null,
    "external_id": null
  }
}
```

#### Implementation

```typescript
// src/app/api/messages/route.ts
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
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, avatar_url')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) throw profileError;
    
    // Handle different content types (multipart/form-data or JSON)
    let ticketId, content, isInternal, replyType, platform;
    let files = [];
    
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data (with file uploads)
      const formData = await request.formData();
      ticketId = formData.get('ticket_id') as string;
      content = formData.get('content') as string;
      isInternal = formData.get('is_internal') === 'true';
      replyType = formData.get('reply_type') as string || 'manual';
      platform = formData.get('platform') as string || null;
      
      // Process file uploads
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('attachments') && value instanceof File) {
          files.push(value);
        }
      }
    } else {
      // Handle JSON data
      const body = await request.json();
      ticketId = body.ticket_id;
      content = body.content;
      isInternal = body.is_internal || false;
      replyType = body.reply_type || 'manual';
      platform = body.platform || null;
    }
    
    // Validate required fields
    if (!ticketId || !content) {
      return NextResponse.json(
        { error: "ticket_id and content are required" },
        { status: 400 }
      );
    }
    
    // Check if ticket exists
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, status')
      .eq('id', ticketId)
      .single();
    
    if (ticketError) {
      if (ticketError.code === 'PGRST116') {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }
      throw ticketError;
    }
    
    // Create message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        ticket_id: ticketId,
        sender_type: 'agent',
        sender_id: session.user.id,
        sender_name: profile.name,
        sender_avatar: profile.avatar_url,
        content,
        is_internal: isInternal,
        reply_type: replyType,
        has_attachments: files.length > 0,
        is_read: true,
        platform
      })
      .select()
      .single();
    
    if (messageError) throw messageError;
    
    // Handle attachments if any
    const uploadedAttachments = [];
    
    if (files.length > 0) {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${message.id}-${Date.now()}.${fileExt}`;
        const filePath = `ticket-attachments/${ticketId}/${fileName}`;
        
        // Upload file to Supabase Storage
        const { error: uploadError } = await supabase
          .storage
          .from('ticket-attachments')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: publicUrlData } = supabase
          .storage
          .from('ticket-attachments')
          .getPublicUrl(filePath);
        
        // Insert attachment record
        const { data: attachment, error: attachmentError } = await supabase
          .from('attachments')
          .insert({
            message_id: message.id,
            ticket_id: ticketId,
            type: file.type.startsWith('image/') ? 'image' : 
                  file.type.startsWith('video/') ? 'video' : 'file',
            filename: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type
          })
          .select()
          .single();
        
        if (attachmentError) throw attachmentError;
        
        uploadedAttachments.push(attachment);
      }
    }
    
    // Update ticket status if closed and this is a new message
    if (ticket.status === 'closed' && !isInternal) {
      await supabase
        .from('tickets')
        .update({ status: 'in-progress', resolved_at: null })
        .eq('id', ticketId);
    }
    
    return NextResponse.json({
      message,
      attachments: uploadedAttachments
    });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
```

### Update Message

**URL**: `/api/messages/[id]`  
**Method**: `PATCH`  
**Authentication**: Required  

#### Path Parameters

| Parameter | Type   | Description                      | Required |
|-----------|--------|----------------------------------|----------|
| id        | string | The UUID of the message to update| Yes      |

#### Request Body

```typescript
type UpdateMessageRequest = {
  content?: string;
  is_internal?: boolean;
};
```

#### Response

```typescript
type UpdateMessageResponse = {
  message: Message;
};
```

#### Example

```typescript
// Request
PATCH /api/messages/889e4567-e89b-12d3-a456-426614174000
Content-Type: application/json

{
  "content": "<p>Thank you for reporting this issue. Please provide screenshots of the error message.</p>",
  "is_internal": false
}

// Response
{
  "message": {
    "id": "889e4567-e89b-12d3-a456-426614174000",
    "ticket_id": "123e4567-e89b-12d3-a456-426614174000",
    "sender_type": "agent",
    "sender_id": "456e4567-e89b-12d3-a456-426614174000",
    "sender_name": "Support Agent",
    "sender_avatar": "https://example.com/avatars/agent.jpg",
    "content": "<p>Thank you for reporting this issue. Please provide screenshots of the error message.</p>",
    "created_at": "2025-04-24T16:30:45Z",
    "updated_at": "2025-04-24T16:45:30Z",
    "is_internal": false,
    "reply_type": "manual",
    "has_attachments": false,
    "is_read": true,
    "platform": null,
    "external_id": null
  }
}
```

#### Implementation

```typescript
// src/app/api/messages/[id]/route.ts
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    // Await params - Next.js 15 Promise-based route parameters
    const { id } = await params;
    
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get the message to check ownership
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();
    
    if (messageError) {
      if (messageError.code === 'PGRST116') {
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
      }
      throw messageError;
    }
    
    // Only allow message author or admin to update
    if (message.sender_id !== session.user.id) {
      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
        
      if (profileError || profile.role !== 'admin') {
        return NextResponse.json(
          { error: "You can only edit your own messages" },
          { status: 403 }
        );
      }
    }
    
    // Parse request body
    const body = await request.json();
    
    // Update fields that are provided
    const updates: any = {};
    if (body.content !== undefined) updates.content = body.content;
    if (body.is_internal !== undefined) updates.is_internal = body.is_internal;
    updates.updated_at = new Date().toISOString();
    
    // Update message
    const { data: updatedMessage, error } = await supabase
      .from('messages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ message: updatedMessage });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: "Failed to update message" },
      { status: 500 }
    );
  }
}
```

### Delete Message

**URL**: `/api/messages/[id]`  
**Method**: `DELETE`  
**Authentication**: Required  

#### Path Parameters

| Parameter | Type   | Description                      | Required |
|-----------|--------|----------------------------------|----------|
| id        | string | The UUID of the message to delete| Yes      |

#### Response

```typescript
type DeleteMessageResponse = {
  message: string;
};
```

#### Example

```typescript
// Request
DELETE /api/messages/889e4567-e89b-12d3-a456-426614174000

// Response
{
  "message": "Message deleted successfully"
}
```

#### Implementation

```typescript
// src/app/api/messages/[id]/route.ts
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    // Await params - Next.js 15 Promise-based route parameters
    const { id } = await params;
    
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get the message to check ownership and get attachments
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();
    
    if (messageError) {
      if (messageError.code === 'PGRST116') {
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
      }
      throw messageError;
    }
    
    // Only allow message author or admin to delete
    if (message.sender_id !== session.user.id) {
      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
        
      if (profileError || profile.role !== 'admin') {
        return NextResponse.json(
          { error: "You can only delete your own messages" },
          { status: 403 }
        );
      }
    }
    
    // Get attachments to delete from storage
    const { data: attachments } = await supabase
      .from('attachments')
      .select('file_path')
      .eq('message_id', id);
    
    // Delete message (cascade will handle attachments records)
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // Delete attachment files from storage if any
    if (attachments && attachments.length > 0) {
      const filePaths = attachments.map(attachment => attachment.file_path);
      
      await supabase
        .storage
        .from('ticket-attachments')
        .remove(filePaths);
    }
    
    return NextResponse.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}
```

## Additional Endpoints

### Mark Messages as Read

**URL**: `/api/messages/read`  
**Method**: `POST`  
**Authentication**: Required  

#### Request Body

```typescript
type MarkMessagesReadRequest = {
  message_ids: string[];
};
```

#### Response

```typescript
type MarkMessagesReadResponse = {
  message: string;
  count: number;
};
```

### Count Unread Messages

**URL**: `/api/messages/unread/count`  
**Method**: `GET`  
**Authentication**: Required  

#### Query Parameters

| Parameter | Type   | Description                      | Required |
|-----------|--------|----------------------------------|----------|
| ticket_id | string | Ticket ID to count unread for    | No       |

#### Response

```typescript
type UnreadCountResponse = {
  count: number;
};
```

## File Upload Handling

File uploads are handled through the Create Message endpoint with `multipart/form-data`. The process involves:

1. Receiving files via FormData
2. Uploading files to Supabase Storage
3. Creating attachment records in the database
4. Relating attachments to messages

File types supported include:
- Images (jpg, jpeg, png, gif, webp, svg)
- Videos (mp4, webm, mov, avi)
- Documents (pdf, doc, docx, xls, xlsx, ppt, pptx, txt, csv)
- Compressed files (zip, rar)

## Error Handling

All message API endpoints follow a consistent error handling pattern with appropriate HTTP status codes:

- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Message not found
- `500 Internal Server Error`: Server error

## Real-time Notifications

Message creation triggers real-time updates through Supabase Realtime. Clients can subscribe to message events for a specific ticket to receive instant updates when new messages are added.
