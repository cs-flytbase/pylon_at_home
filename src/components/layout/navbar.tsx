"use client";

import { useState } from "react";
import { Bell, Search, Menu, LogOut, LogIn, UserPlus, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  onMenuToggle: () => void;
}

export function Navbar({ onMenuToggle }: NavbarProps) {
  const { user, session, signOut } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center">
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center space-x-4 lg:space-x-6 flex-1">
          <form className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search tickets..."
                className="pl-8 bg-background"
              />
            </div>
          </form>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />

          {user && (
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
            </Button>
          )}
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center space-x-2 cursor-pointer">
                  <Avatar className="h-8 w-8 bg-primary text-primary-foreground ring-2 ring-primary/20 hover:ring-primary/30 transition-all">
                    {user.user_metadata?.avatar_url ? (
                      <AvatarImage src={user.user_metadata.avatar_url} alt="Avatar" />
                    ) : (
                      <AvatarImage src={`https://api.dicebear.com/7.x/micah/svg?seed=${user.email}&background=%23007FFF`} alt="Avatar" />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground font-medium">{user.email?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium">{user.user_metadata?.full_name || user.email}</p>
                    <p className="text-xs text-muted-foreground flex items-center">
                      <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-1"></span>
                      {user.user_metadata?.role || 'User'}
                    </p>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={async () => {
                    try {
                      setIsSigningOut(true);
                      await signOut();
                      toast.success('Logged out successfully');
                    } catch (error) {
                      toast.error('Failed to log out');
                      console.error(error);
                    } finally {
                      setIsSigningOut(false);
                    }
                  }}
                  disabled={isSigningOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{isSigningOut ? 'Logging out...' : 'Log out'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => router.push('/login')}>
                <LogIn className="mr-2 h-4 w-4" />
                Log in
              </Button>
              <Button size="sm" onClick={() => {
                router.push('/login');
                // Set isSignUp to true (we'll handle this client-side in the login page)
                localStorage.setItem('isSignUp', 'true');
              }}>
                <UserPlus className="mr-2 h-4 w-4" />
                Sign up
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
