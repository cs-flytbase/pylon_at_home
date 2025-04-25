"use client";

import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ticket } from '@/types/ticket';
import { Profile, Organization } from '@/types/database';
import { X, User, Clock, MessageSquare, Paperclip, Send, Check, Plus, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatTimeAgo } from '@/lib/utils';
import React from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type Message = {
  id: string;
  content: string;
  sender_name: string;
  sender_avatar?: string | null;
  is_customer: boolean;
  created_at: string;
  has_attachments: boolean;
};

type TicketDetailsSheetProps = {
  ticketId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// No need to redefine Organization as we're importing it from database.ts

export function TicketDetailsSheet({ ticketId, open, onOpenChange }: TicketDetailsSheetProps): React.ReactNode {
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [assignees, setAssignees] = useState<Profile[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingAssignee, setIsUpdatingAssignee] = useState(false);
  const [isUpdatingOrganization, setIsUpdatingOrganization] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgWebsite, setNewOrgWebsite] = useState('');
  const [newOrgIndustry, setNewOrgIndustry] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  
  // If the component is being used inside the ticket-detail-overlay, we want to
  // render the content directly without the Sheet wrapper
  const isStandaloneView = typeof document !== 'undefined' ? 
    !!document.querySelector('.ticket-detail-overlay') : false;

  // Fetch all assignees (profiles) and organizations
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch assignees
        const { data: assigneeData, error: assigneeError } = await supabase
          .from('profiles')
          .select('*')
          .order('full_name', { ascending: true });

        if (assigneeError) {
          console.error('Failed to fetch assignees:', assigneeError);
        } else {
          setAssignees(assigneeData || []);
        }
        
        // Fetch organizations - using direct API call since Supabase types may not be updated
        try {
          const response = await fetch('/api/organizations');
          if (response.ok) {
            const data = await response.json();
            setOrganizations(data.organizations || []);
          } else {
            console.error('Failed to fetch organizations from API');
          }
        } catch (orgError) {
          console.error('Failed to fetch organizations:', orgError);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (open) {
      fetchData();
    }
  }, [open]);

  // Setup real-time subscription for ticket updates
  useEffect(() => {
    if (!open || !ticketId) return;

    // Function to setup realtime subscriptions
    const setupRealtimeSubscription = () => {
      // Create a channel for this specific ticket
      const channel = supabase
        .channel(`ticket-${ticketId}`)
        // Listen for ticket updates
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'tickets',
          filter: `id=eq.${ticketId}`
        }, (payload) => {
          console.log('Ticket updated:', payload);
          // Update the ticket state with new data
          setTicket(current => current ? { ...current, ...payload.new } : null);
        })
        // Listen for new messages
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `ticket_id=eq.${ticketId}`
        }, async (payload) => {
          console.log('New message received:', payload);
          
          // Fetch the profile for this message to get sender info
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, role')
            .eq('id', payload.new.user_id)
            .single();
            
          // Add the new message to the list
          const newMessage: Message = {
            id: payload.new.id,
            content: payload.new.content,
            sender_name: profileData?.full_name || 'Unknown User',
            sender_avatar: profileData?.avatar_url || undefined,
            is_customer: profileData?.role === 'customer',
            created_at: payload.new.created_at,
            has_attachments: payload.new.has_media || false
          };
          
          setMessages(current => [...current, newMessage]);
        })
        .subscribe();

      // Store the channel reference for cleanup
      realtimeChannelRef.current = channel;
    };

    // Initial data fetch
    const fetchTicketData = async () => {
      setLoading(true);
      try {
        // Fetch ticket details from Supabase
        const { data: ticketData, error: ticketError } = await supabase
          .from('tickets')
          .select('*')
          .eq('id', ticketId)
          .single();

        if (ticketError) {
          console.error('Failed to fetch ticket details:', ticketError);
          setLoading(false);
          return;
        }

        // Fetch assignee profile information if there is an assignee
        let assigneeProfile: Profile | null = null;
        if (ticketData.assignee_id) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', ticketData.assignee_id)
            .single();

          if (!profileError && profileData) {
            assigneeProfile = profileData;
          }
        }
        
        // Set the ticket data directly from the tickets table
        const ticket: Ticket = {
          ...ticketData as Ticket,
          has_media: ticketData.has_media || false
        };
        
        setTicket(ticket);
        
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

        if (messagesError) {
          console.error('Failed to fetch messages:', messagesError);
          setMessages([]);
        } else {
          // Transform messages to match our component's expected format
          const formattedMessages = messagesData.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            sender_name: msg.profiles?.full_name || 'Unknown User',
            sender_avatar: msg.profiles?.avatar_url,
            is_customer: msg.profiles?.role === 'customer',
            created_at: msg.created_at,
            has_attachments: msg.has_media || false
          }));
          
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Error fetching ticket data:', error);
        setTicket(null);
        setMessages([]);
      } finally {
        setLoading(false);
        
        // After data is loaded, setup the realtime subscription
        setupRealtimeSubscription();
      }
    };
    
    fetchTicketData();

    // Cleanup function to remove subscription when component unmounts
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
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
                      {ticket.customer_name && ticket.customer_name.length > 0 ? ticket.customer_name.charAt(0) : '?'}
                    </div>
                    <div>
                      <div className="font-medium text-sm md:text-base">
                        {ticket.customer_name || 'Unknown User'}
                      </div>
                      <div className="text-xs md:text-sm text-muted-foreground">
                        {ticket.customer_email || 'No email provided'}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Organization</h4>
                  {isUpdatingOrganization ? (
                    <div className="flex items-center gap-2">
                      <Select
                        defaultValue={ticket.organization_id || ""}
                        onValueChange={async (value) => {
                          try {
                            if (value === 'create_new') {
                              // Show organization creation dialog
                              setIsCreatingOrg(true);
                              return;
                            }
                            
                            // Using a direct API call for better compatibility
                            const response = await fetch(`/api/tickets/${ticket.id}`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({
                                organization_id: value || null
                              })
                            });
                              
                            if (!response.ok) throw new Error('Failed to update organization');
                            // Ticket will update via real-time subscription
                          } catch (err) {
                            console.error('Failed to update organization:', err);
                          } finally {
                            setIsUpdatingOrganization(false);
                          }
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {organizations.map(org => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="create_new" className="text-primary">
                            <span className="flex items-center">
                              <Plus className="mr-2 h-4 w-4" />
                              Create New Organization
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsUpdatingOrganization(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {ticket.organization_id ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {organizations.find(o => o?.id === ticket.organization_id)?.name || 'Unknown Organization'}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 ml-auto"
                            onClick={() => setIsUpdatingOrganization(true)}
                          >
                            Change
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7"
                          onClick={() => setIsUpdatingOrganization(true)}
                        >
                          Add Organization
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {/* Dialog for creating a new organization */}
                  <Dialog open={isCreatingOrg} onOpenChange={setIsCreatingOrg}>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Create New Organization</DialogTitle>
                        <DialogDescription>
                          Add a new organization for this customer. Click save when you're done.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">
                            Name*
                          </Label>
                          <Input
                            id="name"
                            value={newOrgName}
                            onChange={(e) => setNewOrgName(e.target.value)}
                            className="col-span-3"
                            placeholder="Organization name"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="website" className="text-right">
                            Website
                          </Label>
                          <Input
                            id="website"
                            value={newOrgWebsite}
                            onChange={(e) => setNewOrgWebsite(e.target.value)}
                            className="col-span-3"
                            placeholder="https://example.com"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="industry" className="text-right">
                            Industry
                          </Label>
                          <Input
                            id="industry"
                            value={newOrgIndustry}
                            onChange={(e) => setNewOrgIndustry(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g. Technology, Healthcare, etc."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsCreatingOrg(false);
                            setIsUpdatingOrganization(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          onClick={async () => {
                            if (!newOrgName.trim()) {
                              alert('Organization name is required');
                              return;
                            }
                            
                            try {
                              // Create new organization using API
                              const createResponse = await fetch('/api/organizations', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                  name: newOrgName.trim(),
                                  website: newOrgWebsite.trim() || null,
                                  industry: newOrgIndustry.trim() || null,
                                  status: 'active',
                                  type: 'end_customer'
                                })
                              });
                              
                              if (!createResponse.ok) throw new Error('Failed to create organization');
                              
                              const newOrgData = await createResponse.json();
                              const newOrg = newOrgData.organization;
                              
                              if (newOrg) {
                                // Update local state
                                setOrganizations([...organizations, newOrg]);
                                
                                // Update ticket with new organization
                                const updateResponse = await fetch(`/api/tickets/${ticket.id}`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    organization_id: newOrg.id
                                  })
                                });
                                  
                                if (!updateResponse.ok) throw new Error('Failed to update ticket');
                                
                                // Reset form
                                setNewOrgName('');
                                setNewOrgWebsite('');
                                setNewOrgIndustry('');
                                setIsCreatingOrg(false);
                                setIsUpdatingOrganization(false);
                              }
                            } catch (err) {
                              console.error('Failed to create organization:', err);
                              alert('Failed to create organization. Please try again.');
                            }
                          }}
                        >
                          Save
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Status</h4>
                  {isUpdatingStatus ? (
                    <div className="flex items-center gap-2">
                      <Select
                        defaultValue={ticket.status}
                        onValueChange={async (value) => {
                          try {
                            const { error } = await supabase
                              .from('tickets')
                              .update({ status: value })
                              .eq('id', ticket.id);
                              
                            if (error) throw error;
                            // Ticket will update via real-time subscription
                          } catch (err) {
                            console.error('Failed to update status:', err);
                          } finally {
                            setIsUpdatingStatus(false);
                          }
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="on-me">On Me</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsUpdatingStatus(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge className={
                        ticket.status === 'new' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        ticket.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        ticket.status === 'on-me' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                        ticket.status === 'resolved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        ''
                      }>
                        {ticket.status.replace('-', ' ')}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7"
                        onClick={() => setIsUpdatingStatus(true)}
                      >
                        Change
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Assignee</h4>
                  {isUpdatingAssignee ? (
                    <div className="flex items-center gap-2">
                      <Select
                        defaultValue={ticket.assignee_id || ""}
                        onValueChange={async (value) => {
                          try {
                            const { error } = await supabase
                              .from('tickets')
                              .update({ assignee_id: value || null })
                              .eq('id', ticket.id);
                              
                            if (error) throw error;
                            // Ticket will update via real-time subscription
                          } catch (err) {
                            console.error('Failed to update assignee:', err);
                          } finally {
                            setIsUpdatingAssignee(false);
                          }
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Assign to..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {assignees.map(assignee => (
                            <SelectItem key={assignee.id} value={assignee.id}>
                              {assignee.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsUpdatingAssignee(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {ticket.assignee_id ? (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium">
                              {assignees.find(a => a.id === ticket.assignee_id)?.full_name?.charAt(0) || '?'}
                            </div>
                            <span className="text-sm">{assignees.find(a => a.id === ticket.assignee_id)?.full_name || 'Unknown'}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 ml-auto"
                            onClick={() => setIsUpdatingAssignee(true)}
                          >
                            Change
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7"
                          onClick={() => setIsUpdatingAssignee(true)}
                        >
                          Assign
                        </Button>
                      )}
                    </div>
                  )}
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
