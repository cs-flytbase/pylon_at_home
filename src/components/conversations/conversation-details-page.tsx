"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Platform = "whatsapp" | "telegram" | "slack" | "email";
type MessageDirection = "inbound" | "outbound";
type MessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";

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

interface Message {
  id: string;
  content: string;
  created_at: string;
  direction: MessageDirection;
  status: MessageStatus;
  has_attachments: boolean;
  sender: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
}

interface ConversationDetailsPageProps {
  id: string;
}

export function ConversationDetailsPage({ id }: ConversationDetailsPageProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    async function fetchConversation() {
      try {
        setLoading(true);
        const response = await fetch(`/api/conversations/${id}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch conversation");
        }
        
        const data = await response.json();
        setConversation(data.conversation);
        setMessages(data.messages || []);
      } catch (err) {
        console.error("Error fetching conversation:", err);
        setError("Failed to load conversation");
      } finally {
        setLoading(false);
      }
    }
    
    fetchConversation();
  }, [id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;
    
    try {
      setSending(true);
      
      const response = await fetch(`/api/conversations/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: newMessage
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      
      const data = await response.json();
      
      // Add the new message to the messages list
      setMessages(prev => [...prev, data.message]);
      
      // Clear the input
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
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
      case "telegram":
        return (
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 3-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 3" />
              <path d="M2 3v18l10-5.1 10 5.1V3" />
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
      case "slack":
        return (
          <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        return null;
    }
  };

  if (loading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/conversations" className="hover:text-primary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="border rounded-lg p-6 h-[calc(100vh-200px)] flex flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] ${i % 2 === 0 ? 'bg-accent' : 'bg-primary text-primary-foreground'} p-3 rounded-lg`}>
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24 mt-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/conversations" className="hover:text-primary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Error</h1>
        </div>
        <div className="p-8 text-center">
          <p className="text-destructive">{error || "Conversation not found"}</p>
          <p className="text-muted-foreground mt-2">
            Try refreshing the page or check your connection.
          </p>
          <Button asChild className="mt-4">
            <Link href="/conversations">Back to Conversations</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/conversations" className="hover:text-primary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {getPlatformIcon(conversation.platform)}
        <div>
          <h1 className="text-xl font-medium">{conversation.recipient}</h1>
          <p className="text-sm text-muted-foreground">
            {conversation.platform.charAt(0).toUpperCase() + conversation.platform.slice(1)}
          </p>
        </div>
      </div>

      <div className="border rounded-lg p-4 h-[calc(100vh-220px)] flex flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-2">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No messages yet. Start the conversation by sending a message below.
            </div>
          ) : (
            messages.map((message) => (
              <div 
                key={message.id} 
                className={cn(
                  "flex",
                  message.direction === "outbound" ? "justify-end" : "justify-start"
                )}
              >
                <div 
                  className={cn(
                    "max-w-[80%] p-3 rounded-lg",
                    message.direction === "outbound" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-accent"
                  )}
                >
                  <p>{message.content}</p>
                  <div className="flex justify-between items-center mt-1 text-xs opacity-70">
                    <span>
                      {format(new Date(message.created_at), "h:mm a")}
                    </span>
                    {message.direction === "outbound" && (
                      <span>
                        {message.status === "delivered" && "✓✓"}
                        {message.status === "read" && "✓✓"}
                        {message.status === "sent" && "✓"}
                        {message.status === "pending" && "🕒"}
                        {message.status === "failed" && "❌"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="resize-none min-h-[60px]"
            disabled={sending}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-[60px] w-[60px]"
            disabled={!newMessage.trim() || sending}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
