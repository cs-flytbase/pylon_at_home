"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Clock, User, Paperclip, GripVertical, MessageSquare, MoreVertical, CheckCircle, UserPlus, AlertTriangle, Tag, Trash2 } from 'lucide-react';
import { Ticket } from '@/types/ticket';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useEffect } from 'react';
type TicketCardProps = {
  ticket: Ticket & {
    lastMessage?: {
      id: string;
      content: string;
      sender_name: string;
      created_at: string;
    };
  };
};

// Helper function to format date
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  // Less than a minute
  if (seconds < 60) {
    return 'just now';
  }
  
  // Less than an hour
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  
  // Less than a day
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  
  // Less than a week
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  
  // Format as date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

import { useAuth } from '@/context/auth-context';
export function TicketCard({ ticket }: TicketCardProps) {
  const [lastMessage, setLastMessage] = useState(ticket.lastMessage || null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Supabase client import
  // If you use a custom supabase client, import it here
  // import { supabase } from '@/lib/supabase';
  const supabase = require('@/lib/supabase').supabase;

  // Real-time subscription for new messages on this ticket
  useEffect(() => {
    const channel = supabase
      .channel(`ticket-card-${ticket.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `ticket_id=eq.${ticket.id}`
      }, (payload: any) => {
        const msg = payload.new;
        setLastMessage({
          id: msg.id,
          content: msg.content,
          sender_name: msg.sender_name || 'Unknown',
          created_at: msg.created_at
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticket.id]);

  // If lastMessage not provided, fetch it on mount
  useEffect(() => {
    if (!lastMessage) {
      (async () => {
        const { data, error } = await supabase
          .from('messages')
          .select('id,content,created_at,profiles: user_id(full_name)')
          .eq('ticket_id', ticket.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (data) {
          setLastMessage({
            id: data.id,
            content: data.content,
            sender_name: data.profiles?.full_name || 'Unknown',
            created_at: data.created_at
          });
        }
      })();
    }
  }, [ticket.id, lastMessage]);

  // Handle reply submit
  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    if (!user) {
      setError('You must be logged in to reply.');
      return;
    }
    setSending(true);
    setError(null);

    // Optimistic UI: create a temp message
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const senderIsCustomer = user?.user_metadata?.role === 'customer';
    const optimisticMsg = {
      id: tempId,
      content: reply,
      sender_name: user?.user_metadata?.full_name || user?.email || 'Support Agent',
      created_at: new Date().toISOString(),
    };
    setLastMessage(optimisticMsg);
    setReply('');

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user.id)) {
      setError('Internal error: Invalid user ID. Please reload and try again.');
      setLastMessage(null);
      setSending(false);
      return;
    }
    if (!uuidRegex.test(ticket.id)) {
      setError('Internal error: Invalid ticket ID. Please reload and try again.');
      setLastMessage(null);
      setSending(false);
      return;
    }

    try {
      // Insert message into the messages table
      const { data: insertedMessage, error: insertError } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user.id,
            sender_type: senderIsCustomer ? 'customer' : 'agent',
            ticket_id: ticket.id,
            content: optimisticMsg.content,
            user_id: user.id,
            has_media: false,
          }
        ])
        .select()
        .single();
      if (insertError) throw insertError;
      setLastMessage({
        id: insertedMessage.id,
        content: insertedMessage.content,
        sender_name: user.user_metadata?.full_name || user.email || 'You',
        created_at: insertedMessage.created_at
      });
      // Optionally update ticket's updated_at timestamp
      await supabase
        .from('tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticket.id);
      // Webhook notification (optional, as in ticket-details-sheet)
      try {
        await fetch('https://flytbasecs69.app.n8n.cloud/webhook/b2217366-5d68-45c0-92c9-49573ed6cff2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: optimisticMsg.content,
            user_id: user.id,
            ticket_id: ticket.id
          })
        });
      } catch (webhookError) {
        // Do not block UI on webhook error
        console.error('Webhook error:', webhookError);
      }
    } catch (err: any) {
      setError('Failed to send reply');
      setLastMessage(null);
    } finally {
      setSending(false);
    }
  };

  const [isDragging, setIsDragging] = useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  
  // Helper functions for badge colors
  const getPriorityClass = (priority: string) => {
    switch(priority) {
      case 'low': return 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'high': return 'bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300';
      case 'urgent': return 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300';
      default: return '';
    }
  };
  
  const getTypeClass = (type: string) => {
    switch(type) {
      case 'support': return 'bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300';
      case 'bug': return 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300';
      case 'feature': return 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300';
      default: return '';
    }
  };

  return (
    <Card
      draggable
      data-component="ticket-card"
      ref={cardRef}
      onDragStart={(e) => {
        e.dataTransfer.setData('ticketId', ticket.id);
        e.dataTransfer.setData('sourceStatus', ticket.status);
        e.dataTransfer.effectAllowed = 'move';
        setIsDragging(true);
        // Custom drag image: clone the card and use it as the drag image
        if (cardRef.current) {
          const node = cardRef.current;
          const clone = node.cloneNode(true) as HTMLElement;
          clone.style.position = 'absolute';
          clone.style.top = '-9999px';
          clone.style.left = '-9999px';
          clone.style.boxShadow = '0 8px 24px 0 rgba(0,0,0,0.18)';
          clone.style.opacity = '1';
          clone.style.background = 'white';
          clone.style.pointerEvents = 'none';
          clone.style.transform = 'scale(1.03)';
          document.body.appendChild(clone);
          e.dataTransfer.setDragImage(clone, node.offsetWidth / 2, node.offsetHeight / 2);
          setTimeout(() => document.body.removeChild(clone), 0);
        }
      }}
      onDragEnd={() => {
        setIsDragging(false);
      }}
      className={`shadow-sm hover:shadow transition-all cursor-grab focus:outline-none focus:ring-2 focus:ring-primary/40 ${isDragging ? 'z-50 scale-105 shadow-2xl border-primary/70 ring-2 ring-primary/30 opacity-90' : ''}`}
      tabIndex={0}
      aria-grabbed={isDragging}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <div
              onClick={() => window.location.href = `/tickets/${ticket.id}`}
              className="font-medium hover:text-primary transition-colors line-clamp-1 cursor-pointer"
            >
              {ticket.title}
            </div>
          </div>
          <div className="flex space-x-1">
            {ticket.has_media && (
              <span className="text-muted-foreground" title="Has attachments">
                <Paperclip className="h-4 w-4" />
              </span>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0 ml-1" aria-label="More options">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Ticket Options</DropdownMenuLabel>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuGroup>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      <span>Change Status</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const response = await fetch(`/api/tickets/${ticket.id}/update-status`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'new' })
                            });
                            if (!response.ok) throw new Error('Failed to update status');
                            window.location.reload(); // Reload to reflect changes
                          } catch (error) {
                            console.error('Error updating status:', error);
                            alert('Failed to update ticket status');
                          }
                        }}>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 mr-2">
                            New
                          </Badge>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const response = await fetch(`/api/tickets/${ticket.id}/update-status`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'in-progress' })
                            });
                            if (!response.ok) throw new Error('Failed to update status');
                            window.location.reload(); // Reload to reflect changes
                          } catch (error) {
                            console.error('Error updating status:', error);
                            alert('Failed to update ticket status');
                          }
                        }}>
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 mr-2">
                            In Progress
                          </Badge>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const response = await fetch(`/api/tickets/${ticket.id}/update-status`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'on-me' })
                            });
                            if (!response.ok) throw new Error('Failed to update status');
                            window.location.reload(); // Reload to reflect changes
                          } catch (error) {
                            console.error('Error updating status:', error);
                            alert('Failed to update ticket status');
                          }
                        }}>
                          <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 mr-2">
                            On Me
                          </Badge>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const response = await fetch(`/api/tickets/${ticket.id}/update-status`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'resolved' })
                            });
                            if (!response.ok) throw new Error('Failed to update status');
                            window.location.reload(); // Reload to reflect changes
                          } catch (error) {
                            console.error('Error updating status:', error);
                            alert('Failed to update ticket status');
                          }
                        }}>
                          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 mr-2">
                            Resolved
                          </Badge>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span>Assign To</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const response = await fetch(`/api/tickets/${ticket.id}/assign`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ assignee_id: 'agent-1' }) // Using agent-1 ID for Sarah
                            });
                            if (!response.ok) throw new Error('Failed to assign ticket');
                            window.location.reload(); // Reload to reflect changes
                          } catch (error) {
                            console.error('Error assigning ticket:', error);
                            alert('Failed to assign ticket');
                          }
                        }}>
                          <div className="w-6 h-6 rounded-full bg-primary/20 mr-2 flex items-center justify-center">
                            <span className="text-xs">S</span>
                          </div>
                          <span>Sarah Johnson</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const response = await fetch(`/api/tickets/${ticket.id}/assign`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ assignee_id: 'agent-2' }) // Using agent-2 ID for Michael
                            });
                            if (!response.ok) throw new Error('Failed to assign ticket');
                            window.location.reload(); // Reload to reflect changes
                          } catch (error) {
                            console.error('Error assigning ticket:', error);
                            alert('Failed to assign ticket');
                          }
                        }}>
                          <div className="w-6 h-6 rounded-full bg-primary/20 mr-2 flex items-center justify-center">
                            <span className="text-xs">M</span>
                          </div>
                          <span>Michael Chen</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const response = await fetch(`/api/tickets/${ticket.id}/assign`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ assignee_id: 'agent-3' }) // Using agent-3 ID for Jessica
                            });
                            if (!response.ok) throw new Error('Failed to assign ticket');
                            window.location.reload(); // Reload to reflect changes
                          } catch (error) {
                            console.error('Error assigning ticket:', error);
                            alert('Failed to assign ticket');
                          }
                        }}>
                          <div className="w-6 h-6 rounded-full bg-primary/20 mr-2 flex items-center justify-center">
                            <span className="text-xs">J</span>
                          </div>
                          <span>Jessica Lee</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const response = await fetch(`/api/tickets/${ticket.id}/assign`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ assignee_id: null }) // null to unassign
                            });
                            if (!response.ok) throw new Error('Failed to unassign ticket');
                            window.location.reload(); // Reload to reflect changes
                          } catch (error) {
                            console.error('Error unassigning ticket:', error);
                            alert('Failed to unassign ticket');
                          }
                        }}>
                          <span className="text-muted-foreground">Unassign</span>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      <span>Change Priority</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const response = await fetch(`/api/tickets/${ticket.id}/update-priority`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ priority: 'low' })
                            });
                            if (!response.ok) throw new Error('Failed to update priority');
                            window.location.reload(); // Reload to reflect changes
                          } catch (error) {
                            console.error('Error updating priority:', error);
                            alert('Failed to update ticket priority');
                          }
                        }}>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 mr-2">
                            Low
                          </Badge>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const response = await fetch(`/api/tickets/${ticket.id}/update-priority`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ priority: 'medium' })
                            });
                            if (!response.ok) throw new Error('Failed to update priority');
                            window.location.reload(); // Reload to reflect changes
                          } catch (error) {
                            console.error('Error updating priority:', error);
                            alert('Failed to update ticket priority');
                          }
                        }}>
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 mr-2">
                            Medium
                          </Badge>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const response = await fetch(`/api/tickets/${ticket.id}/update-priority`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ priority: 'high' })
                            });
                            if (!response.ok) throw new Error('Failed to update priority');
                            window.location.reload(); // Reload to reflect changes
                          } catch (error) {
                            console.error('Error updating priority:', error);
                            alert('Failed to update ticket priority');
                          }
                        }}>
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 mr-2">
                            High
                          </Badge>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const response = await fetch(`/api/tickets/${ticket.id}/update-priority`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ priority: 'urgent' })
                            });
                            if (!response.ok) throw new Error('Failed to update priority');
                            window.location.reload(); // Reload to reflect changes
                          } catch (error) {
                            console.error('Error updating priority:', error);
                            alert('Failed to update ticket priority');
                          }
                        }}>
                          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 mr-2">
                            Urgent
                          </Badge>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </DropdownMenuGroup>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/tickets/${ticket.id}`;
                }}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>View Details</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem className="text-destructive" onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm('Are you sure you want to delete this ticket?')) {
                    try {
                      const response = await fetch(`/api/tickets/${ticket.id}/delete`, {
                        method: 'DELETE'
                      });
                      if (!response.ok) throw new Error('Failed to delete ticket');
                      window.location.reload(); // Reload to reflect changes
                    } catch (error) {
                      console.error('Error deleting ticket:', error);
                      alert('Failed to delete ticket');
                    }
                  }
                }}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete Ticket</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0 pb-2">
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge variant="outline" className={getPriorityClass(ticket.priority)}>
            {ticket.priority}
          </Badge>
          <Badge variant="outline" className={getTypeClass(ticket.type)}>
            {ticket.type}
          </Badge>
        </div>
        {/* Last message display */}
        {lastMessage ? (
          <div className="mb-2 p-2 rounded bg-muted text-xs">
            <div className="font-semibold text-primary mb-1">{lastMessage.sender_name}</div>
            <div>{lastMessage.content}</div>
            <div className="text-muted-foreground mt-1 text-[10px]">{formatTimeAgo(lastMessage.created_at)}</div>
          </div>
        ) : (
          <div className="mb-2 text-xs text-muted-foreground">No messages yet</div>
        )}
        {/* Inline reply box */}
        <form onSubmit={handleReply} className="flex gap-2 mt-2">
          <input
            type="text"
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Reply..."
            className="flex-1 min-w-0 border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={sending}
          />
          <Button type="submit" size="sm" disabled={sending || !reply.trim()}>
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </form>
        {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex items-center justify-between text-sm">
        <div className="flex items-center text-muted-foreground">
          <User className="h-3.5 w-3.5 mr-1" />
          <span className="truncate max-w-[100px]" title={ticket.customer_name}>
            {ticket.customer_name}
          </span>
        </div>
        <div className="flex items-center text-muted-foreground" title={new Date(ticket.created_at).toLocaleString()}>
          <Clock className="h-3.5 w-3.5 mr-1" />
          <span>{formatTimeAgo(ticket.created_at)}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

