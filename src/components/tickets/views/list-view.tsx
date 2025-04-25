"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TicketCard } from '../ticket-card';
import { Ticket } from '@/types/database';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatTimeAgo } from '@/lib/utils';
import { Eye, User, Clock, Paperclip } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

type ListViewProps = {
  initialTickets?: Ticket[];
};

export function ListView({ initialTickets }: ListViewProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets || []);
  const [loading, setLoading] = useState(!initialTickets);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialTickets) {
      const fetchTickets = async () => {
        try {
          setLoading(true);
          setError(null);
          
          // Initialize the Supabase client
          const supabase = createClient();
          
          // Fetch tickets with customer and assignee information
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
            .order('created_at', { ascending: false });
          
          if (error) {
            console.error('Error fetching tickets:', error);
            throw error;
          }
          
          console.log(`Successfully fetched ${data?.length || 0} tickets from database`);
          // Cast the data to our Ticket type as it comes from Supabase
          setTickets(data as Ticket[] || []);
        } catch (err) {
          console.error('Failed to fetch tickets:', err);
          setError('Failed to load tickets. Please try again.');
          toast.error('Failed to load tickets');
          // Don't use mock data - just show empty state
          setTickets([]);
        } finally {
          setLoading(false);
        }
      };

      fetchTickets();
    }
  }, [initialTickets]);

  // Function to get style class based on priority
  const getPriorityClass = (priority: string) => {
    switch(priority) {
      case 'low': return 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'high': return 'bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300';
      case 'urgent': return 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300';
      default: return '';
    }
  };
  
  // Function to get style class based on type
  const getTypeClass = (type: string) => {
    switch(type) {
      case 'support': return 'bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300';
      case 'bug': return 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300';
      case 'feature': return 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300';
      default: return '';
    }
  };

  // Function to get style class based on status
  const getStatusClass = (status: string) => {
    switch(status) {
      case 'new': return 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'on-me': return 'bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300';
      case 'resolved': return 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300';
      default: return '';
    }
  };

  // Render loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="rounded-md overflow-hidden border">
              <div className="p-4 bg-muted/30 flex items-center space-x-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-32" />
              </div>
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="p-4 border-t flex items-center space-x-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card className="border-destructive/50 text-destructive">
        <CardHeader>
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            Error Loading Tickets
          </div>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 text-primary underline"
          >
            Try Again
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="rounded-md overflow-hidden border">
            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {tickets.map(ticket => (
                <Card key={ticket.id} className="overflow-hidden">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <Link href={`/tickets/${ticket.id}`} className="font-medium hover:text-primary transition-colors text-base">
                        {ticket.title}
                      </Link>
                      <div className="flex items-center space-x-1">
                        {ticket.has_media && <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />}
                        <Button size="icon" variant="ghost" className="h-8 w-8 -mr-2" asChild>
                          <Link href={`/tickets/${ticket.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className={getStatusClass(ticket.status)}>
                        {ticket.status.replace('-', ' ')}
                      </Badge>
                      <Badge variant="outline" className={getPriorityClass(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                      <Badge variant="outline" className={getTypeClass(ticket.type)}>
                        {ticket.type}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <User className="h-3.5 w-3.5 mr-1" />
                        <span className="truncate max-w-[120px]">{ticket.customer_name}</span>
                      </div>
                      <div className="flex items-center text-muted-foreground" title={new Date(ticket.created_at).toLocaleString()}>
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        <span>{formatTimeAgo(ticket.created_at)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map(ticket => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <Link href={`/tickets/${ticket.id}`} className="font-medium hover:text-primary transition-colors">
                          {ticket.title}
                        </Link>
                      </TableCell>
                      <TableCell>{ticket.customer_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusClass(ticket.status)}>
                          {ticket.status.replace('-', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPriorityClass(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTypeClass(ticket.type)}>
                          {ticket.type}
                        </Badge>
                      </TableCell>
                      <TableCell title={new Date(ticket.created_at).toLocaleString()}>
                        {formatTimeAgo(ticket.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" asChild>
                          <Link href={`/tickets/${ticket.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
