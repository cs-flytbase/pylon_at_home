# API Reference

## Overview

This document provides a reference for the API endpoints used in the Support Platform. The platform uses two types of API implementations:

1. **Next.js API Routes**: Server endpoints in the `src/app/api` directory
2. **Server Actions**: Functions using the "use server" directive for secure data mutations

## API Routes

The platform implements several API routes for various functionalities. Each route is documented in detail in separate files:

- [Ticket API](./api/ticket-api.md) - Endpoints for ticket management
- [Message API](./api/message-api.md) - Endpoints for message operations
- [User API](./api/user-api.md) - Endpoints for user management
- [Webhook API](./api/webhook-api.md) - Endpoints for external integrations

## Next.js 15 Promise-Based Route Parameters

Next.js 15 introduced a change in how route parameters are handled. Route parameters are now returned as Promises that must be awaited:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    // The key change: await params
    const { id } = await params;
    
    // Process the request using the id
    // ...
    
    return NextResponse.json({ /* response data */ });
  } catch (error) {
    return NextResponse.json({ error: "Error message" }, { status: 500 });
  }
}
```

## Server Actions

Server Actions are used for secure data mutations and are defined using the "use server" directive. These are documented in detail in separate files:

- [Auth Actions](./api/auth-actions.md) - Authentication operations
- [Ticket Actions](./api/ticket-actions.md) - Ticket creation and updates
- [Message Actions](./api/message-actions.md) - Message operations

## Authentication

All API routes except public endpoints and webhooks require authentication. Authentication is handled using Supabase Auth:

```typescript
// Example of checking authentication in an API route
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest): Promise<Response> {
  const supabase = await createClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Authenticated request handling
  // ...
}
```

## Error Handling

API routes follow a consistent error handling pattern:

```typescript
try {
  // Operation
  
  return NextResponse.json({ data });
} catch (error) {
  console.error('Error:', error);
  
  return NextResponse.json(
    { 
      error: error instanceof Error ? error.message : "An unexpected error occurred" 
    }, 
    { status: 500 }
  );
}
```

## Rate Limiting

API routes implement rate limiting to prevent abuse:

```typescript
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest): Promise<Response> {
  const ip = request.ip || '127.0.0.1';
  
  const rateLimitResult = await rateLimit(ip);
  
  if (rateLimitResult) {
    return rateLimitResult; // Returns 429 Too Many Requests
  }
  
  // Normal request handling
  // ...
}
```

## WebSocket Connections

Real-time features use Supabase Realtime subscriptions rather than direct WebSocket connections.

## API Documentation Structure

Each API endpoint is documented with:

1. **URL**: The endpoint path
2. **Method**: HTTP method (GET, POST, PUT, DELETE)
3. **Purpose**: What the endpoint does
4. **Authentication**: Whether authentication is required
5. **Parameters**: Required and optional parameters
6. **Response**: Expected response format
7. **Example**: Usage example

Refer to the specific API documentation files for detailed information about each endpoint.
