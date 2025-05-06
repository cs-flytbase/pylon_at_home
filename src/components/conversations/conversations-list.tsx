"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Platform = "whatsapp" | "telegram" | "slack" | "email";

interface Conversation {
  id: string;
  platform: Platform;
  recipient: string;
  last_message: string | null;
  last_message_at: string;
  created_at: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export function ConversationsList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const activeConversationId = pathname.startsWith('/conversations/') 
    ? pathname.split('/').pop() 
    : null;

  useEffect(() => {
    async function fetchConversations() {
      try {
        setLoading(true);
        const response = await fetch("/api/conversations");
        
        if (!response.ok) {
          throw new Error("Failed to fetch conversations");
        }
        
        const data = await response.json();
        setConversations(data.conversations || []);
      } catch (err) {
        console.error("Error fetching conversations:", err);
        setError("Failed to load conversations");
      } finally {
        setLoading(false);
      }
    }
    
    fetchConversations();

    // Set up a polling interval to refresh conversations
    const intervalId = setInterval(fetchConversations, 30000); // every 30 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg border flex gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">{error}</p>
        <p className="text-muted-foreground mt-2">
          Try refreshing the page or check your connection.
        </p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        No conversations yet. Start one by clicking the button above.
      </div>
    );
  }

  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case "whatsapp":
        return (
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
              <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Z" />
              <path d="M14 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Z" />
              <path d="M9.5 13.5c.5 1.5 2.5 2 5 0" />
            </svg>
          </div>
        );
      case "telegram":
        return (
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 3-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 3" />
              <path d="M2 3v18l10-5.1 10 5.1V3" />
            </svg>
          </div>
        );
      case "email":
        return (
          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
        );
      case "slack":
        return (
          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="13" y="2" width="3" height="8" rx="1.5" />
              <path d="M19 8.5V10h1.5A1.5 1.5 0 1 0 19 8.5" />
              <rect x="8" y="14" width="3" height="8" rx="1.5" />
              <path d="M5 15.5V14H3.5A1.5 1.5 0 1 0 5 15.5" />
              <rect x="14" y="13" width="8" height="3" rx="1.5" />
              <path d="M15.5 19H14v1.5a1.5 1.5 0 1 0 1.5-1.5" />
              <rect x="2" y="8" width="8" height="3" rx="1.5" />
              <path d="M8.5 5H10V3.5A1.5 1.5 0 1 0 8.5 5" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="space-y-3">
      {conversations.map((conversation) => (
        <Link
          key={conversation.id}
          href={`/conversations/${conversation.id}`}
          className={`block p-4 rounded-lg border transition-colors ${activeConversationId === conversation.id ? 'border-primary bg-accent' : 'hover:border-primary hover:bg-accent'}`}
        >
          <div className="flex gap-4">
            {getPlatformIcon(conversation.platform)}
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className="font-medium">
                  {conversation.recipient}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(conversation.last_message_at), "MMM d, h:mm a")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                {conversation.last_message || "No messages yet"}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
