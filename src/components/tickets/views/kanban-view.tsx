"use client";

import { useState, useEffect } from 'react';
import { TicketCard } from '../ticket-card';
import { Ticket } from '@/types/database';
import { AlertCircle, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { logDatabaseError, formatErrorForUser } from '@/lib/error-logger';

// Column configuration for the Kanban board
const columns = [
  { id: 'new', title: 'New' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'on-me', title: 'On Me' },
  { id: 'resolved', title: 'Resolved' },  
];

type KanbanColumn = {
  id: string;
  title: string;
  tickets: Ticket[];
  loading: boolean;
  onTicketDrop: (ticketId: string, newStatus: string, sourceStatus: string) => Promise<void>;
};

const KanbanColumn = ({ id, title, tickets, loading, onTicketDrop }: KanbanColumn) => {
  // Generate loading placeholders if in loading state
  if (loading) {
    return (
      <Card className="space-y-4">
        <CardHeader className="p-4 pb-2 space-y-0">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-5 w-6" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          {Array(id === 'new' ? 3 : id === 'in-progress' ? 4 : id === 'on-me' ? 2 : 1)
            .fill(0)
            .map((_, index) => (
              <div key={index} className="bg-background/40 rounded-md p-4 border border-border space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[calc(100vh-300px)] md:h-[calc(100vh-260px)]" style={{ minWidth: '240px' }}>
      <CardHeader className="p-3 md:p-4 pb-2 space-y-0 sticky top-0 bg-card z-10">
        <div className="flex justify-between items-center">
          <h3 className="font-medium flex items-center text-sm md:text-base">
            {title} <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{tickets.length}</span>
          </h3>
          {id === 'new' && (
            <Button size="icon" variant="ghost" className="h-7 w-7 md:h-8 md:w-8" title="Add New Ticket">
              <Plus className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent 
        className="p-3 md:p-4 pt-0 flex-1 space-y-2 md:space-y-3 overflow-y-auto"
        style={{ minHeight: '250px' }}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('bg-accent/20');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('bg-accent/20');
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('bg-accent/20');
          const ticketId = e.dataTransfer.getData('ticketId');
          const sourceStatus = e.dataTransfer.getData('sourceStatus');
          
          if (ticketId && sourceStatus && sourceStatus !== id) {
            onTicketDrop(ticketId, id, sourceStatus);
          }
        }}
      >
        {tickets.map((ticket) => (
          <TicketCard 
            key={ticket.id} 
            ticket={ticket} 
          />
        ))}

        {/* Empty state when there are no tickets */}
        {tickets.length === 0 && (
          <div className="h-32 flex items-center justify-center">
            <p className="text-muted-foreground text-sm text-center">
              No tickets
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

type KanbanViewProps = {
  initialTickets?: Ticket[];
};

export function KanbanView({ initialTickets }: KanbanViewProps) {
  // State to hold tickets grouped by status
  const [ticketsByStatus, setTicketsByStatus] = useState<Record<string, Ticket[]>>({
    'new': [],
    'in-progress': [],
    'on-me': [],
    'resolved': [],
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tickets from Supabase
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true); // Only set loading on initial mount or full refresh
        console.log('Fetching tickets for Kanban board...');
        
        // Initialize the Supabase client
        const supabase = createClient();
        
        // Fetch tickets from Supabase with customer and assignee info
        console.log('Fetching tickets from Supabase...');
        const { data, error } = await supabase
          .from('tickets')
          .select(`
            *,
            customer:customer_id (
              id,
              full_name,
              email,
              avatar_url
            ),
            assignee:assignee_id (
              id,
              full_name,
              email,
              avatar_url,
              role
            )
          `)
          .order('updated_at', { ascending: false });
          
        if (error) {
          logDatabaseError(error, 'tickets', 'select.order');
          throw new Error(`Failed to fetch tickets: ${formatErrorForUser(error)}`);
        }
          
        if (!data || data.length === 0) {
          console.log('No tickets found in database.');
          console.log('This could be because: 1) No tickets exist yet, 2) Database connection issue, or 3) Permission/RLS issue');
        } else {
          console.log(`Successfully fetched ${data.length} tickets from Supabase`);
        }
          
        // Log the ticket statuses we found
        const statusCounts = data.reduce((counts: Record<string, number>, ticket: any) => {
          counts[ticket.status] = (counts[ticket.status] || 0) + 1;
          return counts;
        }, {});
        console.log('Status counts:', statusCounts);
          
        // Group tickets by status
        const tickets = data as Ticket[] || [];
        const grouped = tickets.reduce((acc: Record<string, Ticket[]>, ticket: any) => {
          // Make sure we have an array for this status
          if (!acc[ticket.status]) {
            acc[ticket.status] = [];
          }
            
          // Add ticket to the correct group
          acc[ticket.status].push(ticket);
          return acc;
        }, {
          'new': [],
          'in-progress': [],
          'on-me': [],
          'resolved': [],
        });
          
        console.log('Grouped tickets by status:', Object.keys(grouped).map(key => `${key}: ${grouped[key].length}`));
        setTicketsByStatus(grouped);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error loading tickets';
        setError(errorMessage);
        logDatabaseError(err, 'tickets', 'kanban_fetch');
        console.error('Error fetching tickets for Kanban board:', err);
      } finally {
        setLoading(false); // Always unlock the board after error recovery
      }
    };

    fetchTickets();
  }, [initialTickets]);

  // Handle updating a ticket's status using Supabase
  const handleStatusChange = async (ticketId: string, newStatus: string, sourceStatus: string) => {
    try {
      // Only set loading for the affected ticket/column if needed, but do not block the whole board
      // setLoading(true); // <-- Remove this line to prevent global loading lock
      console.log(`Updating ticket ${ticketId} status from ${sourceStatus} to ${newStatus}`);
      
      // Initialize the Supabase client
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('tickets')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
          // If moving to resolved status, set resolved_at timestamp
          ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {})
        })
        .eq('id', ticketId);
      
      if (error) {
        logDatabaseError(error, 'tickets', 'update.status');
        throw new Error(`Failed to update ticket status: ${formatErrorForUser(error)}`);
      }
      
      console.log(`Successfully updated ticket ${ticketId} status to ${newStatus}`);

      // Show success message
      toast.success(`Ticket moved to ${columns.find(c => c.id === newStatus)?.title}`);
    } catch (err) {
      // Log the error with our utility
      logDatabaseError(err, 'tickets', 'drag_drop');
      console.error('Failed to update ticket status:', err);
      
      // Show user-friendly error message
      toast.error('Error updating ticket status', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred'
      });
      
      // Roll back the UI change by fetching fresh data
      const fetchTickets = async () => {
        try {
          // setLoading(true); // Don't lock the board again here
          
          let tickets: Ticket[] = [];
          
          if (initialTickets) {
            tickets = initialTickets;
          } else {
            // Initialize Supabase client
            const supabase = createClient();
            
            // Fetch tickets from Supabase
            const { data, error } = await supabase
              .from('tickets')
              .select('*')
              .order('updated_at', { ascending: false });
              
            if (error) {
              throw error;
            }
            
            tickets = data as Ticket[] || [];
          }
          
          // Group tickets by status
          const grouped = tickets.reduce((acc: Record<string, Ticket[]>, ticket: Ticket) => {
            // Make sure we have an array for this status
            if (!acc[ticket.status]) {
              acc[ticket.status] = [];
            }
            
            // Add ticket to the correct group
            acc[ticket.status].push(ticket);
            return acc;
          }, {
            'new': [],
            'in-progress': [],
            'on-me': [],
            'resolved': [],
          });
          
          setTicketsByStatus(grouped);
          setError(null);
        } catch (err) {
          setError('Error loading tickets. Please try again.');
          console.error('Error fetching tickets:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchTickets();
    }
  };

  // Function to assign a ticket to the current user
  const handleAssignToMe = async (ticketId: string) => {
    try {
      // Initialize the Supabase client
      const supabase = createClient();

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Failed to get current user');
      }

      // Update the ticket
      const { error } = await supabase
        .from('tickets')
        .update({ 
          assignee_id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);
      
      if (error) {
        logDatabaseError(error, 'tickets', 'update.assignee');
        throw new Error(`Failed to assign ticket: ${formatErrorForUser(error)}`);
      }
      
      console.log(`Successfully assigned ticket ${ticketId} to the current user`);
    } catch (err) {
      // Log the error with our utility
      logDatabaseError(err, 'tickets', 'assign_to_me');
      console.error('Failed to assign ticket:', err);
      
      // Show user-friendly error message
      toast.error('Error assigning ticket', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred'
      });
    }
  };

  // If there's an error, show an error message
  if (error) {
    return (
      <Card className="flex flex-col items-center justify-center p-6 text-center">
        <CardContent className="pt-6">
          <AlertCircle className="h-12 w-12 text-destructive mb-4 mx-auto" />
          <p className="text-lg font-medium">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="pb-6 -mx-2 md:mx-0">
      {/* Mobile view: horizontal tabs for statuses */}
      <div className="md:hidden mb-4">
        <Tabs defaultValue="new" className="w-full">
          <TabsList className="w-full flex overflow-x-auto space-x-2 p-1 bg-transparent justify-start">
            {columns.map((column) => (
              <TabsTrigger 
                key={column.id} 
                value={column.id}
                className="flex-shrink-0 whitespace-nowrap"
              >
                {column.title} <span className="ml-1 text-xs bg-primary/10 px-1.5 py-0.5 rounded-full">{ticketsByStatus[column.id]?.length || 0}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          {columns.map((column) => (
            <TabsContent key={column.id} value={column.id} className="mt-2 pt-2">
              <div className="rounded-md border p-2">
                <h3 className="font-medium text-sm mb-2 px-2 flex items-center justify-between">
                  {column.title} <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{ticketsByStatus[column.id]?.length || 0}</span>
                  {column.id === 'new' && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Add New Ticket">
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </h3>
                
                <div className="space-y-3" 
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('bg-accent/20');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('bg-accent/20');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('bg-accent/20');
                    const ticketId = e.dataTransfer.getData('ticketId');
                    const sourceStatus = e.dataTransfer.getData('sourceStatus');
                    
                    if (ticketId && sourceStatus && sourceStatus !== column.id) {
                      handleStatusChange(ticketId, column.id, sourceStatus);
                    }
                  }}>
                  {loading ? (
                    Array(3).fill(0).map((_, index) => (
                      <div key={index} className="bg-background/40 rounded-md p-4 border border-border space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <div className="flex gap-2">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                        <div className="flex justify-between items-center">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      </div>
                    ))
                  ) : (
                    ticketsByStatus[column.id]?.map((ticket) => (
                      <TicketCard 
                        key={ticket.id} 
                        ticket={ticket} 
                      />
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
      
      {/* Desktop view: traditional kanban board */}
      <div className="hidden md:block overflow-x-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4" style={{ minWidth: '600px' }}>
          {columns.map((column) => (
            <KanbanColumn 
              key={column.id} 
              id={column.id} 
              title={column.title} 
              tickets={ticketsByStatus[column.id] || []} 
              loading={loading}
              onTicketDrop={handleStatusChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
