# Attachment API

## Overview

The Attachment API manages file uploads and attachments for ticket messages, supporting various file types including images, videos, documents, and compressed files.

## Base URL

All attachment API endpoints are located under the `/api/attachments` path.

## Endpoints

### List Attachments

**URL**: `/api/attachments`  
**Method**: `GET`  
**Authentication**: Required  

#### Query Parameters

| Parameter   | Type    | Description                                   | Required |
|-------------|---------|-----------------------------------------------|----------|
| ticket_id   | string  | ID of the ticket to fetch attachments for     | No       |
| message_id  | string  | ID of the message to fetch attachments for    | No       |
| type        | string  | Filter by attachment type                     | No       |

**Note**: Either `ticket_id` or `message_id` must be provided.

#### Response

```typescript
type ListAttachmentsResponse = {
  attachments: Attachment[];
};
```

#### Example

```typescript
// Request
GET /api/attachments?ticket_id=123e4567-e89b-12d3-a456-426614174000

// Response
{
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
      "created_at": "2025-04-23T10:20:30Z",
      "url": "https://example.supabase.co/storage/v1/object/public/ticket-attachments/error-screenshot.png"
    },
    // Additional attachments...
  ]
}
```

#### Implementation

```typescript
// src/app/api/attachments/route.ts
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
    const messageId = searchParams.get('message_id');
    const type = searchParams.get('type');
    
    if (!ticketId && !messageId) {
      return NextResponse.json(
        { error: "Either ticket_id or message_id is required" },
        { status: 400 }
      );
    }
    
    // Build query
    let query = supabase
      .from('attachments')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (ticketId) query = query.eq('ticket_id', ticketId);
    if (messageId) query = query.eq('message_id', messageId);
    if (type) query = query.eq('type', type);
    
    // Execute query
    const { data: attachments, error } = await query;
    
    if (error) throw error;
    
    // Add public URLs to each attachment
    const attachmentsWithUrls = attachments?.map(attachment => {
      const { data } = supabase
        .storage
        .from('ticket-attachments')
        .getPublicUrl(attachment.file_path);
      
      return {
        ...attachment,
        url: data.publicUrl
      };
    }) || [];
    
    return NextResponse.json({ attachments: attachmentsWithUrls });
  } catch (error) {
    console.error('Error fetching attachments:', error);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}
```

### Get Attachment by ID

**URL**: `/api/attachments/[id]`  
**Method**: `GET`  
**Authentication**: Required  

#### Path Parameters

| Parameter | Type   | Description                          | Required |
|-----------|--------|--------------------------------------|----------|
| id        | string | The UUID of the attachment to fetch  | Yes      |

#### Response

```typescript
type GetAttachmentResponse = {
  attachment: Attachment & { url: string };
};
```

#### Example

```typescript
// Request
GET /api/attachments/101e4567-e89b-12d3-a456-426614174000

// Response
{
  "attachment": {
    "id": "101e4567-e89b-12d3-a456-426614174000",
    "message_id": "789e4567-e89b-12d3-a456-426614174000",
    "ticket_id": "123e4567-e89b-12d3-a456-426614174000",
    "type": "image",
    "filename": "error-screenshot.png",
    "file_path": "/ticket-attachments/error-screenshot.png",
    "file_size": 125000,
    "mime_type": "image/png",
    "created_at": "2025-04-23T10:20:30Z",
    "url": "https://example.supabase.co/storage/v1/object/public/ticket-attachments/error-screenshot.png"
  }
}
```

#### Implementation

```typescript
// src/app/api/attachments/[id]/route.ts
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
    
    // Get attachment
    const { data: attachment, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
      }
      throw error;
    }
    
    // Get public URL
    const { data } = supabase
      .storage
      .from('ticket-attachments')
      .getPublicUrl(attachment.file_path);
    
    return NextResponse.json({
      attachment: {
        ...attachment,
        url: data.publicUrl
      }
    });
  } catch (error) {
    console.error('Error fetching attachment:', error);
    return NextResponse.json(
      { error: "Failed to fetch attachment details" },
      { status: 500 }
    );
  }
}
```

### Upload Attachment (Direct Upload)

**URL**: `/api/attachments/upload`  
**Method**: `POST`  
**Authentication**: Required  
**Content-Type**: `multipart/form-data`

#### Request Body

```typescript
type UploadAttachmentRequest = {
  ticket_id: string;
  message_id?: string; // Optional if attachment is being uploaded before message creation
  file: File;
};
```

#### Response

```typescript
type UploadAttachmentResponse = {
  attachment: Attachment & { url: string };
};
```

#### Example

```typescript
// Request as multipart/form-data
POST /api/attachments/upload
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="ticket_id"

123e4567-e89b-12d3-a456-426614174000
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="message_id"

789e4567-e89b-12d3-a456-426614174000
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="error-screenshot.png"
Content-Type: image/png

[Binary file data...]
------WebKitFormBoundary7MA4YWxkTrZu0gW--

// Response
{
  "attachment": {
    "id": "101e4567-e89b-12d3-a456-426614174000",
    "message_id": "789e4567-e89b-12d3-a456-426614174000",
    "ticket_id": "123e4567-e89b-12d3-a456-426614174000",
    "type": "image",
    "filename": "error-screenshot.png",
    "file_path": "/ticket-attachments/123e4567-e89b-12d3-a456-426614174000/error-screenshot.png",
    "file_size": 125000,
    "mime_type": "image/png",
    "created_at": "2025-04-23T10:20:30Z",
    "url": "https://example.supabase.co/storage/v1/object/public/ticket-attachments/123e4567-e89b-12d3-a456-426614174000/error-screenshot.png"
  }
}
```

#### Implementation

```typescript
// src/app/api/attachments/upload/route.ts
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
    
    // Parse form data
    const formData = await request.formData();
    const ticketId = formData.get('ticket_id') as string;
    const messageId = formData.get('message_id') as string;
    const file = formData.get('file') as File;
    
    // Validation
    if (!ticketId) {
      return NextResponse.json(
        { error: "ticket_id is required" },
        { status: 400 }
      );
    }
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }
    
    // Validate file type and size
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds the 10MB limit" },
        { status: 400 }
      );
    }
    
    // Check if ticket exists
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', ticketId)
      .single();
    
    if (ticketError) {
      if (ticketError.code === 'PGRST116') {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }
      throw ticketError;
    }
    
    // Check if message exists if message_id is provided
    if (messageId) {
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select('id')
        .eq('id', messageId)
        .single();
      
      if (messageError) {
        if (messageError.code === 'PGRST116') {
          return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }
        throw messageError;
      }
    }
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${ticketId}/${fileName}`;
    
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
    
    // Determine attachment type
    let type = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.includes('pdf')) type = 'pdf';
    
    // Insert attachment record
    const { data: attachment, error: attachmentError } = await supabase
      .from('attachments')
      .insert({
        message_id: messageId || null,
        ticket_id: ticketId,
        type,
        filename: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type
      })
      .select()
      .single();
    
    if (attachmentError) throw attachmentError;
    
    // Update message has_attachments flag if message_id is provided
    if (messageId) {
      await supabase
        .from('messages')
        .update({ has_attachments: true })
        .eq('id', messageId);
    }
    
    // Update ticket has_media flag
    await supabase
      .from('tickets')
      .update({ has_media: true })
      .eq('id', ticketId);
    
    return NextResponse.json({
      attachment: {
        ...attachment,
        url: publicUrlData.publicUrl
      }
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    return NextResponse.json(
      { error: "Failed to upload attachment" },
      { status: 500 }
    );
  }
}
```

### Delete Attachment

**URL**: `/api/attachments/[id]`  
**Method**: `DELETE`  
**Authentication**: Required  

#### Path Parameters

| Parameter | Type   | Description                          | Required |
|-----------|--------|--------------------------------------|----------|
| id        | string | The UUID of the attachment to delete | Yes      |

#### Response

```typescript
type DeleteAttachmentResponse = {
  message: string;
};
```

#### Example

```typescript
// Request
DELETE /api/attachments/101e4567-e89b-12d3-a456-426614174000

// Response
{
  "message": "Attachment deleted successfully"
}
```

#### Implementation

```typescript
// src/app/api/attachments/[id]/route.ts
export async function DELETE(
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
    
    // Get attachment to check permissions and get file path
    const { data: attachment, error: attachmentError } = await supabase
      .from('attachments')
      .select('*, messages!inner(sender_id)')
      .eq('id', id)
      .single();
    
    if (attachmentError) {
      if (attachmentError.code === 'PGRST116') {
        return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
      }
      throw attachmentError;
    }
    
    // Check if user has permission to delete
    const isOwner = attachment.messages.sender_id === session.user.id;
    
    // If not owner, check if admin
    if (!isOwner) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
        
      if (profileError || profile.role !== 'admin') {
        return NextResponse.json(
          { error: "You don't have permission to delete this attachment" },
          { status: 403 }
        );
      }
    }
    
    // Delete file from storage
    const { error: storageError } = await supabase
      .storage
      .from('ticket-attachments')
      .remove([attachment.file_path]);
    
    if (storageError) throw storageError;
    
    // Delete attachment record
    const { error: deleteError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', id);
    
    if (deleteError) throw deleteError;
    
    // Update message has_attachments flag if this was the last attachment
    if (attachment.message_id) {
      const { data: remainingAttachments, error: countError } = await supabase
        .from('attachments')
        .select('id', { count: 'exact' })
        .eq('message_id', attachment.message_id);
      
      if (!countError && remainingAttachments.length === 0) {
        await supabase
          .from('messages')
          .update({ has_attachments: false })
          .eq('id', attachment.message_id);
      }
    }
    
    // Check if ticket still has media attachments
    const { data: remainingMedia, error: mediaCountError } = await supabase
      .from('attachments')
      .select('id', { count: 'exact' })
      .eq('ticket_id', attachment.ticket_id);
    
    if (!mediaCountError && remainingMedia.length === 0) {
      // No more attachments for this ticket
      await supabase
        .from('tickets')
        .update({ has_media: false })
        .eq('id', attachment.ticket_id);
    }
    
    return NextResponse.json({
      message: "Attachment deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}
```

## File Type Support

The Attachment API supports various file types, categorized as follows:

### Images
- JPG/JPEG
- PNG
- GIF
- WebP
- SVG

### Videos
- MP4
- WebM
- MOV
- AVI

### Documents
- PDF
- DOC/DOCX (Microsoft Word)
- XLS/XLSX (Microsoft Excel)
- PPT/PPTX (Microsoft PowerPoint)
- TXT
- CSV
- Markdown

### Compressed Files
- ZIP
- RAR

## File Storage Organization

Files are stored in Supabase Storage using a structured organization pattern:

```
bucket: ticket-attachments/
  ├── ticket-id/
  │   ├── timestamp-randomstring.extension
  │   ├── timestamp-randomstring.extension
  │   └── ...
  └── ...
```

## Security and Permissions

- Files are stored with public read permissions but require authentication to upload or delete
- Only file owners (message senders) and admins can delete attachments
- File sizes are limited to 10MB by default
- File types are validated on upload

## Integration with Messages

Attachments are primarily associated with messages and are typically created:

1. During message creation via the `/api/messages` endpoint with `multipart/form-data`
2. Before message creation via the direct upload endpoint, then associated with a message when it's created

## Error Handling

All attachment API endpoints follow a consistent error handling pattern with appropriate HTTP status codes:

- `400 Bad Request`: Invalid input or file too large
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Attachment, ticket, or message not found
- `500 Internal Server Error`: Server error
