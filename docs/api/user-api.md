# User and Profile API

## Overview

The User and Profile API handles user management, authentication, and profile operations in the support platform. It enables account creation, authentication, role management, and profile customization.

## Base URL

User and profile endpoints are located under `/api/auth` and `/api/profiles` paths.

## Authentication Endpoints

### Register User

**URL**: `/api/auth/register`  
**Method**: `POST`  
**Authentication**: Not Required  

#### Request Body

```typescript
type RegisterRequest = {
  email: string;
  password: string;
  name: string;
};
```

#### Response

```typescript
type RegisterResponse = {
  user: {
    id: string;
    email: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
};
```

#### Example

```typescript
// Request
POST /api/auth/register
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}

// Response
{
  "user": {
    "id": "456e4567-e89b-12d3-a456-426614174000",
    "email": "john@example.com"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": 1683244800000
  }
}
```

#### Implementation

```typescript
// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema
const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters")
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient();
    
    // Parse and validate request body
    const body = await request.json();
    const validation = registerSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const { email, password, name } = validation.data;
    
    // Register user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name
        }
      }
    });
    
    if (authError) throw authError;
    
    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }
    
    // Create profile record (this may also be handled by a database trigger)
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        name,
        email,
        role: 'agent', // Default role
        avatar_url: null
      });
    
    if (profileError) throw profileError;
    
    return NextResponse.json({
      user: {
        id: authData.user.id,
        email: authData.user.email
      },
      session: authData.session
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific error cases
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('already registered')) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 }
    );
  }
}
```

### Login User

**URL**: `/api/auth/login`  
**Method**: `POST`  
**Authentication**: Not Required  

#### Request Body

```typescript
type LoginRequest = {
  email: string;
  password: string;
};
```

#### Response

```typescript
type LoginResponse = {
  user: {
    id: string;
    email: string;
    user_metadata: {
      name: string;
    };
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
};
```

#### Example

```typescript
// Request
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}

// Response
{
  "user": {
    "id": "456e4567-e89b-12d3-a456-426614174000",
    "email": "john@example.com",
    "user_metadata": {
      "name": "John Doe"
    }
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": 1683244800000
  }
}
```

#### Implementation

```typescript
// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient();
    
    // Parse and validate request body
    const body = await request.json();
    const validation = loginSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const { email, password } = validation.data;
    
    // Authenticate user with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      if (error.message === 'Invalid login credentials') {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }
      throw error;
    }
    
    return NextResponse.json({
      user: data.user,
      session: data.session
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
```

### Logout User

**URL**: `/api/auth/logout`  
**Method**: `POST`  
**Authentication**: Required  

#### Response

```typescript
type LogoutResponse = {
  message: string;
};
```

#### Example

```typescript
// Request
POST /api/auth/logout

// Response
{
  "message": "Successfully logged out"
}
```

#### Implementation

```typescript
// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient();
    
    // Sign out the current user
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    
    return NextResponse.json({
      message: "Successfully logged out"
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: "An error occurred during logout" },
      { status: 500 }
    );
  }
}
```

## Profile Endpoints

### Get Current User Profile

**URL**: `/api/profiles/me`  
**Method**: `GET`  
**Authentication**: Required  

#### Response

```typescript
type GetProfileResponse = {
  profile: Profile;
};
```

#### Example

```typescript
// Request
GET /api/profiles/me

// Response
{
  "profile": {
    "id": "456e4567-e89b-12d3-a456-426614174000",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "agent",
    "avatar_url": "https://example.com/avatars/john.jpg",
    "created_at": "2025-04-20T10:00:00Z",
    "updated_at": "2025-04-22T15:00:00Z",
    "bio": "Support agent with 5 years of experience",
    "status": "online",
    "preferences": {
      "theme": "dark",
      "notifications": true
    }
  }
}
```

#### Implementation

```typescript
// src/app/api/profiles/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (error) throw error;
    
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
```

### Update Profile

**URL**: `/api/profiles/me`  
**Method**: `PATCH`  
**Authentication**: Required  

#### Request Body

```typescript
type UpdateProfileRequest = {
  name?: string;
  bio?: string;
  avatar_url?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
  preferences?: Record<string, any>;
};
```

#### Response

```typescript
type UpdateProfileResponse = {
  profile: Profile;
};
```

#### Example

```typescript
// Request
PATCH /api/profiles/me
Content-Type: application/json

{
  "name": "John Smith",
  "bio": "Senior support agent with 6 years of experience",
  "status": "busy",
  "preferences": {
    "theme": "light",
    "notifications": true
  }
}

// Response
{
  "profile": {
    "id": "456e4567-e89b-12d3-a456-426614174000",
    "name": "John Smith",
    "email": "john@example.com",
    "role": "agent",
    "avatar_url": "https://example.com/avatars/john.jpg",
    "created_at": "2025-04-20T10:00:00Z",
    "updated_at": "2025-04-24T16:30:00Z",
    "bio": "Senior support agent with 6 years of experience",
    "status": "busy",
    "preferences": {
      "theme": "light",
      "notifications": true
    }
  }
}
```

#### Implementation

```typescript
// src/app/api/profiles/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema
const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  bio: z.string().optional(),
  avatar_url: z.string().url().optional().nullable(),
  status: z.enum(['online', 'away', 'busy', 'offline']).optional(),
  preferences: z.record(z.any()).optional()
});

export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validation = updateProfileSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }
    
    // Build update object with only provided fields
    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.bio !== undefined) updates.bio = body.bio;
    if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;
    if (body.status !== undefined) updates.status = body.status;
    if (body.preferences !== undefined) updates.preferences = body.preferences;
    updates.updated_at = new Date().toISOString();
    
    // Update profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
```

### Upload Avatar

**URL**: `/api/profiles/avatar`  
**Method**: `POST`  
**Authentication**: Required  
**Content-Type**: `multipart/form-data`

#### Request Body

```typescript
type UploadAvatarRequest = {
  avatar: File; // Image file
};
```

#### Response

```typescript
type UploadAvatarResponse = {
  avatar_url: string;
};
```

#### Example

```typescript
// Request as multipart/form-data with file upload

// Response
{
  "avatar_url": "https://example.supabase.co/storage/v1/object/public/avatars/456e4567-e89b-12d3-a456-426614174000.jpg"
}
```

## Admin User Management

### List Users (Admin Only)

**URL**: `/api/admin/users`  
**Method**: `GET`  
**Authentication**: Required (Admin only)  

#### Query Parameters

| Parameter | Type   | Description                     | Required |
|-----------|--------|---------------------------------|----------|
| role      | string | Filter by role                  | No       |
| search    | string | Search in name or email         | No       |
| page      | number | Page number (default: 1)        | No       |
| limit     | number | Users per page (default: 20)    | No       |

#### Response

```typescript
type ListUsersResponse = {
  users: Profile[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};
```

### Update User Role (Admin Only)

**URL**: `/api/admin/users/[id]/role`  
**Method**: `PATCH`  
**Authentication**: Required (Admin only)  

#### Path Parameters

| Parameter | Type   | Description                    | Required |
|-----------|--------|--------------------------------|----------|
| id        | string | The UUID of the user to update | Yes      |

#### Request Body

```typescript
type UpdateRoleRequest = {
  role: 'admin' | 'agent' | 'developer';
};
```

#### Response

```typescript
type UpdateRoleResponse = {
  profile: Profile;
};
```

## Password Management

### Request Password Reset

**URL**: `/api/auth/reset-password`  
**Method**: `POST`  
**Authentication**: Not Required  

#### Request Body

```typescript
type ResetPasswordRequest = {
  email: string;
};
```

#### Response

```typescript
type ResetPasswordResponse = {
  message: string;
};
```

### Set New Password

**URL**: `/api/auth/update-password`  
**Method**: `POST`  
**Authentication**: Required  

#### Request Body

```typescript
type UpdatePasswordRequest = {
  password: string;
};
```

#### Response

```typescript
type UpdatePasswordResponse = {
  message: string;
};
```

## Error Handling

All user and profile API endpoints follow a consistent error handling pattern with appropriate HTTP status codes:

- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User or profile not found
- `409 Conflict`: Email already registered
- `500 Internal Server Error`: Server error
