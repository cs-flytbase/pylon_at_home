"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { logDatabaseError } from "@/lib/error-logger";
import { cookies } from "next/headers";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  name?: string;
}

// Email login action
export async function login(data: LoginCredentials) {

  const supabase = await createClient();

  // Validate input
  if (!data.email || !data.password) {
    return { error: { message: "Email and password are required" } };
  }

  try {
    const { error } = await supabase.auth.signInWithPassword(data);

    if (error) {
      logDatabaseError(error, 'auth', 'login');
      return { error };
    }

    return redirect("/tickets");
  } catch (err) {
    logDatabaseError(err, 'auth', 'login_exception');
    return { error: { message: "An unexpected error occurred during login" } };
  }
}

// Google login action
export async function loginWithGoogle() {

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      logDatabaseError(error, 'auth', 'google_login');
      return { error };
    }

    return { url: data.url };
  } catch (err) {
    logDatabaseError(err, 'auth', 'google_login_exception');
    return { error: { message: "An unexpected error occurred with Google login" } };
  }
}

// Sign up action
export async function signup(data: SignupCredentials) {

  const supabase = await createClient();

  // Validate input
  if (!data.email || !data.password) {
    return { error: { message: "Email and password are required" } };
  }

  try {
    // Create user profile metadata
    const userData = {
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.name || "",
          role: "customer",
        },
      },
    };

    const { error } = await supabase.auth.signUp(userData);

    if (error) {
      logDatabaseError(error, 'auth', 'signup');
      return { error };
    }

    return redirect("/login?message=Check your email to confirm your account");
  } catch (err) {
    logDatabaseError(err, 'auth', 'signup_exception');
    return { error: { message: "An unexpected error occurred during signup" } };
  }
}

// Logout action
export async function logout() {

  const supabase = await createClient();
  
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      logDatabaseError(error, 'auth', 'logout');
      return { error };
    }

    return redirect("/login");
  } catch (err) {
    logDatabaseError(err, 'auth', 'logout_exception');
    return { error: { message: "An unexpected error occurred during logout" } };
  }
}
