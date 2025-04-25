"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { login, signup, logout, loginWithGoogle } from "@/lib/auth-actions";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{
    error: any | null;
  }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{
    error: any | null;
  }>;
  signInWithGoogle: () => Promise<{ error?: any, url?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        // Get user and session data
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);

        // In development mode, if there's no user, create a mock one
        // DEVELOPMENT MODE: Remove this in production!
        if (process.env.NODE_ENV === 'development' && !session?.user) {
          console.log('DEVELOPMENT MODE: Creating mock user for testing');
          const mockUser = {
            id: 'dev-user-id',
            email: 'dev@example.com',
            user_metadata: {
              full_name: 'Development User'
            },
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            role: '',
            updated_at: new Date().toISOString()
          } as unknown as User;
          setUser(mockUser);
          setSession({ user: mockUser } as Session);
        }
      } catch (error) {
        console.error("Error getting auth state:", error);
      }
      setIsLoading(false);
    };

    getSession();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await login({ email, password });
    
    if (!result.error) {
      router.refresh();
    }
    
    return result;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const result = await signup({ 
      email, 
      password, 
      name: fullName 
    });
    
    if (!result.error) {
      router.refresh();
    }
    
    return result;
  };

  const signInWithGoogle = async () => {
    const result = await loginWithGoogle();
    return result;
  };

  const signOut = async () => {
    await logout();
    // Force navigation to login page after logout
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
