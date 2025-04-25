# Tags API

## Overview

The Tags API provides endpoints for managing ticket tags, enabling better organization and categorization of support tickets.

## Base URL

All tag API endpoints are located under the `/api/tags` path.

## Endpoints

### List Tags

**URL**: `/api/tags`  
**Method**: `GET`  
**Authentication**: Required  

#### Query Parameters

| Parameter   | Type    | Description                         | Required |
|-------------|---------|-------------------------------------|----------|
| search      | string  | Search term for tag name            | No       |

#### Response

```typescript
type ListTagsResponse = {
  tags: Tag[];
};
```

#### Example

```typescript
// Request
GET /api/tags

// Response
{
  "tags": [
    {
      "id": "201e4567-e89b-12d3-a456-426614174000",
      "name": "login-issue",
      "color": "#FF5733",
      "created_at": "2025-04-20T10:30:40Z"
    },
    {
      "id": "202e4567-e89b-12d3-a456-426614174000",
      "name": "feature-request",
      "color": "#33FF57",
      "created_at": "2025-04-21T11:31:41Z"
    }
    // Additional tags...
  ]
}
```

#### Implementation

```typescript
// src/app/api/tags/route.ts
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
    const search = searchParams.get('search');
    
    // Build query
    let query = supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true });
    
    // Apply search if provided
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    
    // Execute query
    const { data: tags, error } = await query;
    
    if (error) throw error;
    
    return NextResponse.json({ tags: tags || [] });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
```

### Create Tag

**URL**: `/api/tags`  
**Method**: `POST`  
**Authentication**: Required  

#### Request Body

```typescript
type CreateTagRequest = {
  name: string;
  color: string; // Hex color code
};
```

#### Response

```typescript
type CreateTagResponse = {
  tag: Tag;
};
```

#### Example

```typescript
// Request
POST /api/tags
Content-Type: application/json

{
  "name": "urgent-review",
  "color": "#FF0000"
}

// Response
{
  "tag": {
    "id": "203e4567-e89b-12d3-a456-426614174000",
    "name": "urgent-review",
    "color": "#FF0000",
    "created_at": "2025-04-24T18:15:30Z"
  }
}
```

#### Implementation

```typescript
// src/app/api/tags/route.ts
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
    
    // Check if user has permission (admin or agent)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
      
    if (profileError) throw profileError;
    
    if (profile.role !== 'admin' && profile.role !== 'agent') {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validation
    if (!body.name || !body.color) {
      return NextResponse.json(
        { error: "Name and color are required" },
        { status: 400 }
      );
    }
    
    // Validate color is a hex code
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!colorRegex.test(body.color)) {
      return NextResponse.json(
        { error: "Color must be a valid hex code" },
        { status: 400 }
      );
    }
    
    // Check if tag already exists
    const { data: existingTag, error: existingError } = await supabase
      .from('tags')
      .select('id')
      .eq('name', body.name)
      .single();
    
    if (existingTag) {
      return NextResponse.json(
        { error: "Tag with this name already exists" },
        { status: 409 }
      );
    }
    
    // Create tag
    const { data: tag, error } = await supabase
      .from('tags')
      .insert({
        name: body.name,
        color: body.color
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ tag });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 }
    );
  }
}
```

### Update Tag

**URL**: `/api/tags/[id]`  
**Method**: `PATCH`  
**Authentication**: Required  

#### Path Parameters

| Parameter | Type   | Description                   | Required |
|-----------|--------|-------------------------------|----------|
| id        | string | The UUID of the tag to update | Yes      |

#### Request Body

```typescript
type UpdateTagRequest = {
  name?: string;
  color?: string; // Hex color code
};
```

#### Response

```typescript
type UpdateTagResponse = {
  tag: Tag;
};
```

#### Example

```typescript
// Request
PATCH /api/tags/201e4567-e89b-12d3-a456-426614174000
Content-Type: application/json

{
  "color": "#3366FF"
}

// Response
{
  "tag": {
    "id": "201e4567-e89b-12d3-a456-426614174000",
    "name": "login-issue",
    "color": "#3366FF",
    "created_at": "2025-04-20T10:30:40Z"
  }
}
```

#### Implementation

```typescript
// src/app/api/tags/[id]/route.ts
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
    
    // Check if user has permission (admin or agent)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
      
    if (profileError) throw profileError;
    
    if (profile.role !== 'admin' && profile.role !== 'agent') {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }
    
    // Check if tag exists
    const { data: existingTag, error: checkError } = await supabase
      .from('tags')
      .select('id')
      .eq('id', id)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: "Tag not found" }, { status: 404 });
      }
      throw checkError;
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate input
    if (body.color) {
      const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!colorRegex.test(body.color)) {
        return NextResponse.json(
          { error: "Color must be a valid hex code" },
          { status: 400 }
        );
      }
    }
    
    if (body.name) {
      // Check if another tag already has this name
      const { data: nameExists, error: nameError } = await supabase
        .from('tags')
        .select('id')
        .eq('name', body.name)
        .neq('id', id)
        .single();
      
      if (nameExists) {
        return NextResponse.json(
          { error: "Tag with this name already exists" },
          { status: 409 }
        );
      }
    }
    
    // Build update object
    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.color !== undefined) updates.color = body.color;
    
    // Update tag
    const { data: tag, error } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ tag });
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: "Failed to update tag" },
      { status: 500 }
    );
  }
}
```

### Delete Tag

**URL**: `/api/tags/[id]`  
**Method**: `DELETE`  
**Authentication**: Required  

#### Path Parameters

| Parameter | Type   | Description                   | Required |
|-----------|--------|-------------------------------|----------|
| id        | string | The UUID of the tag to delete | Yes      |

#### Response

```typescript
type DeleteTagResponse = {
  message: string;
};
```

#### Example

```typescript
// Request
DELETE /api/tags/201e4567-e89b-12d3-a456-426614174000

// Response
{
  "message": "Tag deleted successfully"
}
```

#### Implementation

```typescript
// src/app/api/tags/[id]/route.ts
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
    
    // Only admins can delete tags
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
      
    if (profileError) throw profileError;
    
    if (profile.role !== 'admin') {
      return NextResponse.json(
        { error: "Admin permission required" },
        { status: 403 }
      );
    }
    
    // Check if tag exists
    const { data: existingTag, error: checkError } = await supabase
      .from('tags')
      .select('id')
      .eq('id', id)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: "Tag not found" }, { status: 404 });
      }
      throw checkError;
    }
    
    // Delete tag (this will also remove associations in ticket_tags due to foreign key constraints)
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return NextResponse.json({ message: "Tag deleted successfully" });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 }
    );
  }
}
```

## Ticket Tag Association Endpoints

### List Tags for a Ticket

**URL**: `/api/tickets/[ticket_id]/tags`  
**Method**: `GET`  
**Authentication**: Required  

#### Path Parameters

| Parameter | Type   | Description                            | Required |
|-----------|--------|----------------------------------------|----------|
| ticket_id | string | The UUID of the ticket to get tags for | Yes      |

#### Response

```typescript
type TicketTagsResponse = {
  tags: Tag[];
};
```

### Add Tag to Ticket

**URL**: `/api/tickets/[ticket_id]/tags`  
**Method**: `POST`  
**Authentication**: Required  

#### Path Parameters

| Parameter | Type   | Description                           | Required |
|-----------|--------|---------------------------------------|----------|
| ticket_id | string | The UUID of the ticket to add tag to | Yes      |

#### Request Body

```typescript
type AddTagRequest = {
  tag_id: string;
};
```

#### Response

```typescript
type AddTagResponse = {
  message: string;
};
```

### Remove Tag from Ticket

**URL**: `/api/tickets/[ticket_id]/tags/[tag_id]`  
**Method**: `DELETE`  
**Authentication**: Required  

#### Path Parameters

| Parameter | Type   | Description                               | Required |
|-----------|--------|-------------------------------------------|----------|
| ticket_id | string | The UUID of the ticket to remove tag from | Yes      |
| tag_id    | string | The UUID of the tag to remove             | Yes      |

#### Response

```typescript
type RemoveTagResponse = {
  message: string;
};
```

## Tag Usage Statistics

**URL**: `/api/tags/stats`  
**Method**: `GET`  
**Authentication**: Required  

#### Response

```typescript
type TagStatsResponse = {
  stats: {
    tag_id: string;
    tag_name: string;
    tag_color: string;
    count: number;
  }[];
};
```

## Error Handling

All tag API endpoints follow a consistent error handling pattern with appropriate HTTP status codes:

- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Tag or ticket not found
- `409 Conflict`: Tag already exists
- `500 Internal Server Error`: Server error
