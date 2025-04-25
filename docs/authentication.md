# Authentication System

## Overview

The Support Platform uses Supabase Authentication to manage user access and sessions. This document explains how authentication is implemented and how to use authentication features in the application.

## Authentication Architecture

The authentication system is built on the following components:

1. **Supabase Auth**: Backend authentication service
2. **Server-side Auth Actions**: Secure authentication operations
3. **Auth Middleware**: Route protection and session handling 
4. **UI Components**: Login and registration forms

## Setup and Configuration

### Supabase Client Utilities

Two client utilities are used for authentication:

#### Client-side Authentication (`src/lib/supabase/client.ts`)

```typescript
import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database";

export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};
```

#### Server-side Authentication (`src/lib/supabase/server.ts`)

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

export async function createClient() {
  const cookieStore = cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}
```

## Authentication Actions

Server actions are used to handle authentication operations securely:

### `src/lib/auth-actions.ts`

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

// Login action
export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  try {
    // Validate input
    loginSchema.parse({ email, password });
    
    const supabase = await createClient();
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return { error: error.message };
    }
    
    return redirect('/dashboard');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "An unexpected error occurred" };
  }
}

// Register action
export async function register(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;
  
  try {
    // Validate input
    registerSchema.parse({ email, password, name });
    
    const supabase = await createClient();
    
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });
    
    if (signUpError) {
      return { error: signUpError.message };
    }
    
    // Create profile record
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Insert profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          name,
          email,
          role: 'agent', // Default role
        });
      
      if (profileError) {
        console.error('Error creating profile:', profileError);
      }
    }
    
    return redirect('/login?message=Check your email to confirm your account');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "An unexpected error occurred" };
  }
}

// Logout action
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  return redirect('/login');
}
```

## Authentication Middleware

The middleware protects routes and handles redirects based on authentication status:

### `src/middleware.ts`

```typescript
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protect dashboard routes
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Redirect authenticated users away from auth pages
  if (session && (req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/register'))) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

## Login Page Implementation

### `src/app/(auth)/login/page.tsx`

```tsx
"use client";

import Link from "next/link";
import { LoginForm } from "./components/login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { message?: string; redirectedFrom?: string };
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Or{" "}
          <Link
            href="/register"
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            create a new account
          </Link>
        </p>
      </div>

      {searchParams?.message && (
        <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/50">
            <p className="text-sm text-blue-700 dark:text-blue-200">
              {searchParams.message}
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10 dark:bg-gray-800">
          <LoginForm redirectedFrom={searchParams?.redirectedFrom} />
        </div>
      </div>
    </div>
  );
}
```

### `src/app/(auth)/login/components/login-form.tsx`

```tsx
"use client";

import { useState } from "react";
import { login } from "@/lib/auth-actions";

export function LoginForm({ redirectedFrom }: { redirectedFrom?: string }) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setErrorMessage(null);
    
    const result = await login(formData);
    
    if (result?.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
    }
    // If login succeeds, the action will redirect
  }
  
  return (
    <form className="space-y-6" action={handleSubmit}>
      {errorMessage && (
        <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/50">
          <p className="text-sm text-red-700 dark:text-red-200">{errorMessage}</p>
        </div>
      )}
      
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Email address
        </label>
        <div className="mt-1">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Password
        </label>
        <div className="mt-1">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </form>
  );
}
```

## Registration Page Implementation

### `src/app/(auth)/register/page.tsx`

```tsx
"use client";

import Link from "next/link";
import { RegistrationForm } from "./components/registration-form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Create a new account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Or{" "}
          <Link
            href="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            sign in to your account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10 dark:bg-gray-800">
          <RegistrationForm />
        </div>
      </div>
    </div>
  );
}
```

### `src/app/(auth)/register/components/registration-form.tsx`

```tsx
"use client";

import { useState } from "react";
import { register } from "@/lib/auth-actions";

export function RegistrationForm() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setErrorMessage(null);
    
    const result = await register(formData);
    
    if (result?.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
    }
    // If registration succeeds, the action will redirect
  }
  
  return (
    <form className="space-y-6" action={handleSubmit}>
      {errorMessage && (
        <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/50">
          <p className="text-sm text-red-700 dark:text-red-200">{errorMessage}</p>
        </div>
      )}
      
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Full name
        </label>
        <div className="mt-1">
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Email address
        </label>
        <div className="mt-1">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Password
        </label>
        <div className="mt-1">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          {isLoading ? "Creating account..." : "Create account"}
        </button>
      </div>
    </form>
  );
}
```

## Role-Based Access Control

The support platform implements role-based access control using Supabase Row-Level Security (RLS) and the profiles table.

### User Roles

The platform supports the following roles:

- **Agent**: Regular support team members who can view and respond to tickets
- **Admin**: Administrators who can manage team members and system settings
- **Developer**: Development team members who can access technical tickets

### Authorization Checks

For client-side authorization checks:

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useUserRole() {
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRole() {
      try {
        const supabase = createClient();
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setRole(null);
          setIsLoading(false);
          return;
        }
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (error) throw error;
        
        setRole(profile?.role || null);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchUserRole();
  }, []);

  return { role, isLoading };
}
```

For server-side authorization checks:

```tsx
// In a server component or server action
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { error: "Unauthorized" };
  }
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
    
  if (error || profile?.role !== 'admin') {
    return { error: "Unauthorized: Admin access required" };
  }
  
  return { userId: session.user.id, role: profile.role };
}
```

## Protected Components

Components that require authentication can check the session status:

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";

export function ProtectedComponent({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        redirect('/login');
      }
      
      setIsAuthenticated(true);
      setIsLoading(false);
    }
    
    checkAuth();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
```

## Auth Hooks

Custom hooks can be used to access authentication state in components:

```tsx
"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  profile: any | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    async function getUser() {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting auth session:', error);
        setIsLoading(false);
        return;
      }
      
      if (session?.user) {
        setUser(session.user);
        
        // Fetch user profile
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profileError) {
          console.error('Error fetching profile:', profileError);
        } else {
          setProfile(data);
        }
      }
      
      setIsLoading(false);
    }
    
    getUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
        
        if (session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          setProfile(data);
        } else {
          setProfile(null);
        }
        
        setIsLoading(false);
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

## Best Practices

1. **Always Validate Input**: Use Zod or similar libraries to validate user input before processing.

2. **Secure Password Storage**: Supabase Auth handles password hashing and secure storage.

3. **Session Management**: Use the built-in session management from Supabase Auth.

4. **Role-Based Authorization**: Implement proper authorization checks based on user roles.

5. **Error Handling**: Provide clear error messages for authentication failures.

6. **Security Headers**: Next.js automatically sets security headers, but consider adding additional headers as needed.

7. **Rate Limiting**: Implement rate limiting for authentication endpoints to prevent brute force attacks.

8. **Password Reset Flow**: Implement a secure password reset flow using Supabase Auth's password reset functionality.
