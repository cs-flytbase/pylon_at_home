"use client";

import { useState, useEffect } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { AlertCircleIcon } from '@/components/ui/icons';
import { Ticket } from '@/types/ticket';
import { DndContext, DragOverlay, closestCorners, useSensor, useSensors, PointerSensor, DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TicketCard } from './TicketCard';

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
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  // Configure the drag sensors (for pointer/mouse and touch)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // Only start dragging after moving 5px
    })
  );

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

  // Handle when drag starts
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const ticketId = active.id as string;
    
    // Find the ticket from all columns
    for (const status in ticketsByStatus) {
      const foundTicket = ticketsByStatus[status].find(ticket => ticket.id === ticketId);
      if (foundTicket) {
        setActiveTicket(foundTicket);
        break;
      }
    }
  };

  // Handle when drag is over a droppable area
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    
    // If the item is dropped over itself, do nothing
    if (activeId === overId) return;

    // Get the column id and ticket info from the dragged item
    let activeColId: string | null = null;
    let activeTicketIndex = -1;
    let activeTicket: Ticket | null = null;

    // Find the source column and ticket
    for (const colId in ticketsByStatus) {
      const ticketIndex = ticketsByStatus[colId].findIndex(ticket => ticket.id === activeId);
      if (ticketIndex >= 0) {
        activeColId = colId;
        activeTicketIndex = ticketIndex;
        activeTicket = ticketsByStatus[colId][ticketIndex];
        break;
      }
    }

    if (!activeColId || !activeTicket) return;

    // Check if over id is a column id
    const isOverColumn = columns.some(col => col.id === overId);

    if (isOverColumn) {
      // Handle dropping on a column
      const newColumn = overId;
      
      // If column hasn't changed, do nothing
      if (activeColId === newColumn) return;

      const updatedTickets = {...ticketsByStatus};
      
      // Remove from original column
      updatedTickets[activeColId] = ticketsByStatus[activeColId].filter(
        ticket => ticket.id !== activeId
      );
      
      // Add to new column
      updatedTickets[newColumn] = [
        ...ticketsByStatus[newColumn],
        { ...activeTicket, status: newColumn }
      ];
      
      setTicketsByStatus(updatedTickets);
    } else {
      // Handle reordering within a column or moving to a specific position in another column
      let overColId: string | null = null;
      let overTicketIndex = -1;
      
      // Find the target column and position
      for (const colId in ticketsByStatus) {
        const ticketIndex = ticketsByStatus[colId].findIndex(ticket => ticket.id === overId);
        if (ticketIndex >= 0) {
          overColId = colId;
          overTicketIndex = ticketIndex;
          break;
        }
      }

      if (!overColId) return;

      const updatedTickets = {...ticketsByStatus};

      // Same column reordering
      if (activeColId === overColId) {
        updatedTickets[activeColId] = arrayMove(
          ticketsByStatus[activeColId],
          activeTicketIndex,
          overTicketIndex
        );
      } else {
        // Move to a different column at a specific position
        const ticketToMove = { ...activeTicket, status: overColId };
        
        // Remove from original position
        updatedTickets[activeColId] = ticketsByStatus[activeColId].filter(
          ticket => ticket.id !== activeId
        );
        
        // Insert at specific position in new column
        const newColTickets = [...ticketsByStatus[overColId]];
        newColTickets.splice(overTicketIndex, 0, ticketToMove);
        updatedTickets[overColId] = newColTickets;
      }
      
      setTicketsByStatus(updatedTickets);
    }
  };

  // Handle when drag ends
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active } = event;
    setActiveTicket(null);
    
    const ticketId = active.id as string;
    let newStatus: string | null = null;
    
    // Find the ticket's current status
    for (const status in ticketsByStatus) {
      if (ticketsByStatus[status].some(ticket => ticket.id === ticketId)) {
        newStatus = status;
        break;
      }
    }
    
    if (!newStatus) return;
    
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
      console.error('Error updating ticket status:', err);
      // We could add a toast notification for error feedback
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

  // Get all ticket IDs for the SortableContext
  const getTicketIds = () => {
    const ids: string[] = [];
    for (const status in ticketsByStatus) {
      for (const ticket of ticketsByStatus[status]) {
        ids.push(ticket.id);
      }
    }
    return ids;
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <SortableContext items={getTicketIds()} strategy={verticalListSortingStrategy}>
          {columns.map((column) => (
            <KanbanColumn 
              key={column.id} 
              id={column.id} 
              title={column.title} 
              tickets={ticketsByStatus[column.id] || []} 
              loading={loading}
            />
          ))}
        </SortableContext>
      </div>
      
      {/* Drag overlay to show the ticket being dragged */}
      <DragOverlay adjustScale={true}>
        {activeTicket ? (
          <div className="w-full opacity-80">
            <TicketCard ticket={activeTicket} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
