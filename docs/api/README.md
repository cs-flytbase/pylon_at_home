# Support Platform API Documentation

## Overview

Welcome to the API documentation for the Support Platform. This document provides a comprehensive guide to all API endpoints available in the system, enabling developers to integrate with and extend the platform's functionality.

## Authentication

Most API endpoints require authentication using JSON Web Tokens (JWT). Token-based authentication is handled by Supabase Auth.

Authentication flow:
1. Register or login using the `/api/auth/register` or `/api/auth/login` endpoints
2. Use the returned access token in the `Authorization` header for subsequent requests
3. Tokens expire after a set time and can be refreshed using the refresh token

Format for API requests:
```
Authorization: Bearer <access_token>
```

## Important Notes for Next.js 15 API Routes

Please note that due to Next.js 15's route parameter handling, all dynamic route parameters are now returned as Promises that must be awaited. For example:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  // Must await params
  const { id } = await params;
  
  // Rest of the handler code
}
```

This pattern applies to all API routes with dynamic parameters.

## API Documentation

### Core APIs

- [**Ticket API**](./ticket-api.md) - Endpoints for ticket management, including CRUD operations and filters
- [**Message API**](./message-api.md) - Communication endpoints for threaded conversations within tickets
- [**Attachment API**](./attachment-api.md) - File handling endpoints for uploads, downloads, and management
- [**Tags API**](./tags-api.md) - Endpoints for creating and managing ticket tags
- [**User API**](./user-api.md) - User authentication, profile management, and admin operations

## Common Response Formats

All API endpoints follow a standardized response format:

### Success Responses

Successful responses include the requested data and a 2xx status code:

```json
{
  "resource": { ... },  // Or array of resources
  "pagination": { ... } // If applicable
}
```

### Error Responses

Errors follow a consistent format with appropriate HTTP status codes:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common error status codes:
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Pagination

Endpoints that return collections support pagination using the following query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default varies by endpoint)

Paginated responses include a pagination object:

```json
{
  "resources": [ ... ],
  "pagination": {
    "total": 45,      // Total items
    "page": 1,        // Current page
    "limit": 10,      // Items per page
    "totalPages": 5   // Total pages
  }
}
```

## Filtering and Sorting

Many endpoints support filtering and sorting through query parameters. See individual endpoint documentation for supported filters and sort fields.

## Real-time Updates

The platform supports real-time updates for certain resources using Supabase Realtime. This enables clients to subscribe to events like new messages, ticket status changes, etc. Refer to the Supabase Realtime documentation for implementation details.

## Rate Limiting

API endpoints implement rate limiting to prevent abuse. Rate limits vary by endpoint and user role, with higher limits for authenticated administrative users.

## API Changelog

- **v1.0.0** (Current)
  - Initial API release with core functionality
  - Next.js 15 API routes with Promise-based parameters
