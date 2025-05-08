"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday, isYesterday } from "date-fns";
import { Bot, MessageSquare, Plus } from "lucide-react";
import { NewConversationModal } from "./new-conversation-modal";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  last_message: string | null;
  last_message_time: string | null;
  channel_type: string;
  status: string;
  metadata?: any;
}

export function ConversationsList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const router = useRouter();

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
  }, []);

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    router.push(`/conversations/${id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return format(date, "MMM d");
    }
  };

  const getChannelIcon = (channelType: string) => {
    switch (channelType) {
      case "whatsapp":
        return (
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
              <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Z" />
              <path d="M14 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Z" />
              <path d="M9.5 13.5c.5 1.5 2.5 2 5 0" />
            </svg>
          </div>
        );
      case "email":
        return (
          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
            <MessageSquare className="h-4 w-4" />
          </div>
        );
    }
  };

  // Check if a conversation has AI enabled
  const isAIEnabled = (conversation: Conversation) => {
    if (!conversation.metadata) return false;
    
    try {
      const metadata = typeof conversation.metadata === 'string'
        ? JSON.parse(conversation.metadata)
        : conversation.metadata;
      
      return metadata.is_agent === true;
    } catch (e) {
      return false;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Conversations</h2>
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-md">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-destructive">{error}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-xl font-semibold">Conversations</h2>
        <Button size="icon" onClick={() => setShowNewModal(true)}>
          <Plus className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No conversations yet</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setShowNewModal(true)}
            >
              Start a conversation
            </Button>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-md cursor-pointer hover:bg-accent",
                  selectedId === conversation.id && "bg-accent"
                )}
                onClick={() => handleSelectConversation(conversation.id)}
              >
                {getChannelIcon(conversation.channel_type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{conversation.title}</h3>
                    {isAIEnabled(conversation) && (
                      <Bot className="h-3 w-3 text-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.last_message || "No messages yet"}
                  </p>
                </div>
                {conversation.last_message_time && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(conversation.last_message_time)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <NewConversationModal 
        open={showNewModal} 
        onOpenChange={setShowNewModal}
        onSuccess={(id) => {
          router.push(`/conversations/${id}`);
        }}
      />
    </div>
  );
}
