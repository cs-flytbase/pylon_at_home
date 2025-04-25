"use client";

import { useState, useEffect } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { AlertCircleIcon } from '@/components/ui/icons';
import { Ticket } from '@/types/ticket';



// Column configuration for the Kanban board
const columns = [
  { id: 'new', title: 'New' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'on-me', title: 'On Me' },
  { id: 'resolved', title: 'Resolved' },
];

export function KanbanBoard() {
  // State to hold tickets grouped by status
  const [ticketsByStatus, setTicketsByStatus] = useState<Record<string, Ticket[]>>({
    'new': [],
    'in-progress': [],
    'on-me': [],
    'resolved': [],
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tickets from the API
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/tickets');
        if (!response.ok) {
          throw new Error('Failed to fetch tickets');
        }
        
        const data = await response.json();
        
        // Group tickets by status
        const grouped = data.tickets.reduce((acc: Record<string, Ticket[]>, ticket: Ticket) => {
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
  }, []);

  // Handle ticket drop between columns
  const handleTicketDrop = async (ticketId: string, newStatus: string, sourceStatus: string) => {
    // Find the ticket
    const ticketToMove = ticketsByStatus[sourceStatus].find(ticket => ticket.id === ticketId);
    
    if (!ticketToMove) return;
    
    // Create a copy of the current state
    const newTicketsByStatus = {...ticketsByStatus};
    
    // Remove the ticket from its source status
    newTicketsByStatus[sourceStatus] = newTicketsByStatus[sourceStatus].filter(
      ticket => ticket.id !== ticketId
    );
    
    // Add the ticket to its new status
    newTicketsByStatus[newStatus] = [
      ...newTicketsByStatus[newStatus],
      { ...ticketToMove, status: newStatus }
    ];
    
    // Update the state optimistically
    setTicketsByStatus(newTicketsByStatus);
    
    // Update the ticket status on the server
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update ticket status');
      }
    } catch (err) {
      // Revert the state if the API call fails
      console.error('Error updating ticket status:', err);
      setTicketsByStatus({
        ...ticketsByStatus
      });
    }
  };

  // If there's an error, show an error message
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-background border border-border rounded-lg">
        <AlertCircleIcon className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {columns.map((column) => (
        <KanbanColumn 
          key={column.id} 
          id={column.id} 
          title={column.title} 
          tickets={ticketsByStatus[column.id] || []} 
          loading={loading}
          onTicketDrop={handleTicketDrop}
        />
      ))}
    </div>
  );
}
