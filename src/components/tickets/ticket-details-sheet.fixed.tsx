"use client";

import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket } from '@/types/ticket';
import { X, User, Clock, MessageSquare, Paperclip, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatTimeAgo } from '@/lib/utils';
import React from 'react';
import { supabase } from '@/lib/supabase';

type Message = {
  id: string;
  content: string;
  sender_name: string;
  sender_avatar?: string;
  is_customer: boolean;
  created_at: string;
  has_attachments: boolean;
};

type TicketDetailsSheetProps = {
  ticketId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TicketDetailsSheet({ ticketId, open, onOpenChange }: TicketDetailsSheetProps): React.ReactNode {
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  
  // If the component is being used inside the ticket-detail-overlay, we want to
  // render the content directly without the Sheet wrapper
  const isStandaloneView = typeof document !== 'undefined' ? 
    !!document.querySelector('.ticket-detail-overlay') : false;

  // Fetch ticket details and messages from Supabase
  useEffect(() => {
    if (open && ticketId) {
      setLoading(true);

      const fetchTicketData = async () => {
        try {
          // Fetch ticket details from Supabase
          const { data: ticketData, error: ticketError } = await supabase
            .from('tickets')
            .select('*')
            .eq('id', ticketId)
            .single();

          if (ticketError) throw new Error('Failed to fetch ticket details');
          
          setTicket(ticketData as Ticket);
          
          // Fetch messages from Supabase
          const { data: messagesData, error: messagesError } = await supabase
            .from('messages')
            .select(`
              id, 
              content,
              has_media,
              created_at,
              profiles:user_id(id, full_name, avatar_url, role)
            `)
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

          if (messagesError) throw new Error('Failed to fetch messages');
          
          // Transform messages to match our component's expected format
          const formattedMessages = messagesData.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            sender_name: msg.profiles?.full_name || 'Unknown User',
            sender_avatar: msg.profiles?.avatar_url,
            is_customer: msg.profiles?.role === 'customer',
            created_at: msg.created_at,
            has_attachments: msg.has_media
          }));
          
          setMessages(formattedMessages);
        } catch (error) {
          console.error('Error fetching ticket data:', error);
          // Fallback to mock data if API fails
          const mockTicket: Ticket = {
            id: ticketId,
            title: 'Problem with checkout process',
            description: 'I tried to complete my purchase but the checkout page keeps showing an error when I click "Confirm Payment".',
            status: 'in-progress',
            priority: 'high',
            type: 'bug',
            customer_id: 'user-123',
            customer_name: 'John Smith',
            customer_email: 'john@example.com',
            assignee_id: null,
            created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
            updated_at: new Date(Date.now() - 3600000).toISOString(),
            has_media: true
          };

          setTicket(mockTicket);
          
          // Mock messages for this ticket
          const mockMessages: Message[] = [
            {
              id: '1',
              content: 'I tried to complete my purchase but the checkout page keeps showing an error when I click "Confirm Payment".',
              sender_name: 'John Smith',
              is_customer: true,
              created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
              has_attachments: true
            },
            {
              id: '2',
              content: 'Thanks for reporting this issue. Could you please let me know which payment method you were trying to use?',
              sender_name: 'Sarah (Support Agent)',
              sender_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
              is_customer: false,
              created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
              has_attachments: false
            },
            {
              id: '3',
              content: 'I was using a Visa credit card. I attached a screenshot of the error I\'m seeing.',
              sender_name: 'John Smith',
              is_customer: true,
              created_at: new Date(Date.now() - 3600000).toISOString(),
              has_attachments: true
            },
            {
              id: '4',
              content: 'I\'ve escalated this to our development team. They believe it might be related to a recent update. We\'ll get this fixed as soon as possible.',
              sender_name: 'Sarah (Support Agent)',
              sender_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
              is_customer: false,
              created_at: new Date(Date.now() - 1800000).toISOString(),
              has_attachments: false
            },
          ];

          setMessages(mockMessages);
        } finally {
          setLoading(false);
        }
      };
      
      fetchTicketData();
    }
  }, [open, ticketId]);

  // Handle closing the sheet
  const goBackToTickets = () => {
    if (isStandaloneView) {
      // Just navigate back if we're in standalone view
      router.push('/tickets');
    } else {
      // Use the sheet transition if we're in a sheet
      onOpenChange(false);
      setTimeout(() => router.push('/tickets'), 300);
    }
  };

  // Handle sending a new message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    // Add new message to the local state optimistically
    const tempId = `temp-${Date.now()}`;
    const newMsg: Message = {
      id: tempId,
      content: newMessage,
      sender_name: 'Support Agent',
      sender_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Agent',
      is_customer: false,
      created_at: new Date().toISOString(),
      has_attachments: false
    };

    setMessages([...messages, newMsg]);
    setNewMessage('');

    try {
      // Send the message to Supabase
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            ticket_id: ticketId,
            user_id: user.id,
            content: newMessage,
            has_media: false
          }
        ])
        .select('id, created_at');

      if (error) throw error;
      
      if (data && data[0]) {
        // Replace the temp message with the real one from server
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempId ? {
              ...msg,
              id: data[0].id,
              created_at: data[0].created_at,
            } : msg
          )
        );

        // Also update the ticket's updated_at timestamp
        await supabase
          .from('tickets')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', ticketId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the temp message if it failed
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== tempId));
      alert('Failed to send message. Please try again.');
    }
  };

  // Generate priority styles
  const getPriorityStyle = (priority: string) => {
    switch(priority) {
      case 'low': return 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'high': return 'bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300';
      case 'urgent': return 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300';
      default: return '';
    }
  };

  // Generate type styles
  const getTypeStyle = (type: string) => {
    switch(type) {
      case 'support': return 'bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300';
      case 'bug': return 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300';
      case 'feature': return 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300';
      default: return '';
    }
  };

  const renderContent = () => (
    <>
      <div className="sticky top-0 z-10 flex justify-between items-center p-3 md:p-6 bg-background border-b">
        <div className="flex-1 flex flex-col md:flex-row md:items-center gap-1 md:gap-2 overflow-hidden">
          <h2 className="text-lg md:text-2xl font-semibold tracking-tight truncate">
            {loading ? "Loading..." : ticket?.title}
          </h2>
          {ticket && (
            <div className="flex gap-2 md:ml-4">
              <Badge variant="outline" className={getPriorityStyle(ticket.priority)}>
                {ticket.priority}
              </Badge>
              <Badge variant="outline" className={getTypeStyle(ticket.type)}>
                {ticket.type}
              </Badge>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={goBackToTickets}
          className="h-8 w-8 p-0 shrink-0 ml-2"
          aria-label="Close ticket details"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile tabs navigation */}
      <div className="md:hidden border-b">
        <Tabs defaultValue="chat" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="chat">
              <MessageSquare className="h-4 w-4 mr-2" />
              Conversation
            </TabsTrigger>
            <TabsTrigger value="details">
              <User className="h-4 w-4 mr-2" />
              Details
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main content area */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Chat section */}
        <div className={`${activeTab === 'chat' ? 'flex' : 'hidden'} md:flex md:w-2/3 md:border-r flex-col overflow-hidden`}>
          <div className="hidden md:block px-4 py-2 border-b">
            <h3 className="text-sm font-medium">Conversation</h3>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
            {loading ? (
              <div className="space-y-4">
                <div className="animate-pulse flex items-start gap-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-muted"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/4 bg-muted rounded"></div>
                    <div className="h-10 bg-muted rounded"></div>
                  </div>
                </div>
                <div className="animate-pulse flex items-start gap-3 justify-end">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/4 bg-muted rounded ml-auto"></div>
                    <div className="h-10 bg-muted rounded"></div>
                  </div>
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-muted"></div>
                </div>
              </div>
            ) : messages.map((message) => (
              <div key={message.id} className={`flex items-start gap-2 md:gap-3 ${message.is_customer ? '' : 'justify-end'}`}>
                {message.is_customer && (
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {message.sender_name.charAt(0)}
                  </div>
                )}
                <div className={`max-w-[80%] ${message.is_customer ? '' : 'order-1'}`}>
                  <div className="flex items-center gap-1 md:gap-2 mb-1">
                    <span className="text-xs md:text-sm font-medium">{message.sender_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(message.created_at)}
                    </span>
                    {message.has_attachments && (
                      <Paperclip className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className={`p-2 md:p-3 rounded-lg text-sm ${
                    message.is_customer 
                    ? 'bg-muted' 
                    : 'bg-primary text-primary-foreground'
                  }`}>
                    {message.content}
                  </div>
                </div>
                {!message.is_customer && (
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                    {message.sender_avatar 
                      ? <img src={message.sender_avatar} alt={message.sender_name} className="h-8 w-8 md:h-10 md:w-10 rounded-full" /> 
                      : message.sender_name.charAt(0)
                    }
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Message input */}
          <div className="border-t p-2 md:p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 min-w-0 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button type="submit" size="sm" className="md:h-10">
                <Send className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Send</span>
              </Button>
            </form>
          </div>
        </div>

        {/* Details section */}
        <div className={`${activeTab === 'details' ? 'flex' : 'hidden'} md:flex md:w-1/3 flex-col overflow-hidden`}>
          <div className="hidden md:block px-4 py-2 border-b">
            <h3 className="text-sm font-medium">Details</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
            {loading ? (
              <div className="space-y-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 w-1/3 bg-muted rounded"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
                <div className="animate-pulse space-y-2">
                  <div className="h-4 w-1/3 bg-muted rounded"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              </div>
            ) : ticket && (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                    {ticket.description}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-1">Customer</h4>
                  <div className="flex items-center gap-3 bg-muted p-3 rounded-md">
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      {ticket.customer_name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-sm md:text-base">{ticket.customer_name}</div>
                      <div className="text-xs md:text-sm text-muted-foreground">{ticket.customer_email}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Status</h4>
                  <div className="flex items-center gap-2">
                    <Badge>{ticket.status.replace('-', ' ')}</Badge>
                    <Button variant="outline" size="sm" className="h-7">
                      Change
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Assignee</h4>
                  <div className="flex items-center gap-2">
                    {ticket.assignee_id ? (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium">
                            S
                          </div>
                          <span className="text-sm">Sarah Johnson</span>
                        </div>
                        <Button variant="outline" size="sm" className="h-7 ml-auto">
                          Change
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" className="h-7">
                        Assign
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Created</h4>
                  <div className="flex items-center gap-2 text-xs md:text-sm">
                    <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                    <span title={new Date(ticket.created_at).toLocaleString()}>
                      {formatTimeAgo(ticket.created_at)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Last Updated</h4>
                  <div className="flex items-center gap-2 text-xs md:text-sm">
                    <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                    <span title={new Date(ticket.updated_at).toLocaleString()}>
                      {formatTimeAgo(ticket.updated_at)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );

  // Return the appropriate container based on the context
  if (isStandaloneView) {
    return (
      <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] flex flex-col overflow-hidden bg-background">
        {renderContent()}
      </div>
    );
  }
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[90vw] md:w-[80vw] lg:w-[70vw] max-w-full p-0 flex flex-col">
        {renderContent()}
      </SheetContent>
    </Sheet>
  );
}
