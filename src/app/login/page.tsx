"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { login, signup, loginWithGoogle } from "@/lib/auth-actions";
import { LogIn } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Check for error or message in query parameters
  useEffect(() => {
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    
    if (error) {
      toast.error("Authentication Error", {
        description: error === 'oauth_callback_error' ? 
          "There was an error with your Google sign in. Please try again." : 
          "An error occurred during authentication. Please try again."
      });
    }
    
    if (message) {
      toast.info("Information", { description: message });
    }
  }, [searchParams]);
  
  // Check localStorage for isSignUp flag on component mount
  useEffect(() => {
    const signUpFlag = localStorage.getItem('isSignUp');
    if (signUpFlag === 'true') {
      setIsSignUp(true);
      localStorage.removeItem('isSignUp'); // Clear the flag after using it
    }
  }, []);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Use the server action for signup
        const result = await signup({
          email: formData.email,
          password: formData.password,
          name: formData.name
        });
        
        if (result.error) {
          toast.error("Signup failed", {
            description: result.error.message,
          });
        }
      } else {
        // Use the server action for login
        const result = await login({
          email: formData.email,
          password: formData.password,
        });
        
        if (result.error) {
          toast.error("Login failed", {
            description: result.error.message,
          });
        }
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Pylon Support</h1>
          <p className="text-muted-foreground mt-2">
            {isSignUp ? "Create a new account" : "Sign in to your account"}
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                required={isSignUp}
                placeholder="John Doe"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="•••••••••"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading
              ? "Processing..."
              : isSignUp
              ? "Create Account"
              : "Sign In"}
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={async () => {
              try {
                setIsGoogleLoading(true);
                const { error, url } = await loginWithGoogle();
                if (error) {
                  toast.error("Google login failed", {
                    description: error.message,
                  });
                  return;
                }
                if (url) {
                  window.location.href = url;
                }
              } catch (err) {
                toast.error("An unexpected error occurred");
                console.error(err);
              } finally {
                setIsGoogleLoading(false);
              }
            }}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              "Loading..."
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
                <span>Google</span>
              </>
            )}
          </Button>

          <div className="text-center text-sm">
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
