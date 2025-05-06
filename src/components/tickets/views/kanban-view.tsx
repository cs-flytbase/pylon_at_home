"use client";

import { useState, useEffect, useMemo } from 'react';
import { TicketCard } from '../ticket-card';
import { Ticket } from '@/types/database';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { logDatabaseError, formatErrorForUser } from '@/lib/error-logger';

// Import DnD components directly to avoid dynamic import errors
import { 
  DragStartEvent, 
  DragOverEvent, 
  DragEndEvent, 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  KeyboardSensor,
  useDroppable
} from '@dnd-kit/core';

import { 
  SortableContext, 
  verticalListSortingStrategy, 
  sortableKeyboardCoordinates, 
  useSortable,
  arrayMove 
} from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';

// Column configuration for the Kanban board
const columns = [
  { id: 'new', title: 'New' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'on-me', title: 'On Me' },
  { id: 'resolved', title: 'Resolved' },  
];

// Type definitions
interface KanbanViewProps {
  initialTickets?: Ticket[];
}

// Define KanbanColumnProps interface
interface KanbanColumnProps {
  id: string;
  title: string;
  tickets: Ticket[];
  loading?: boolean;
  isOver?: boolean;
}

export function KanbanView({ initialTickets }: KanbanViewProps) {
  // State to hold tickets grouped by status
  const [ticketsByStatus, setTicketsByStatus] = useState<Record<string, Ticket[]>>({
    'new': [],
    'in-progress': [],
    'on-me': [],
    'resolved': []
  });
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  
  // Set up DnD sensors - only use PointerSensor to prevent keyboard activation
  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { distance: 5 } 
    })
    // Removed KeyboardSensor to prevent Enter key from activating drag
  );
  
  // Initialize Supabase client
  const supabase = createClient();
  
  // Fetch tickets from Supabase on component mount
  useEffect(() => {
    async function fetchTickets() {
      try {
        setLoading(true);
        setError(null);
        
        // If initialTickets prop is provided, use it instead of fetching
        if (initialTickets && initialTickets.length > 0) {
          // Group tickets by status
          const grouped: Record<string, Ticket[]> = {
            'new': [],
            'in-progress': [],
            'on-me': [],
            'resolved': []
          };
          
          initialTickets.forEach(ticket => {
            const status = ticket.status;
            if (grouped[status]) {
              grouped[status].push(ticket);
            } else {
              grouped['new'].push(ticket); // Default to 'new' if unknown status
            }
          });
          
          setTicketsByStatus(grouped);
          setLoading(false);
          return;
        }
        
        // Fetch tickets from Supabase
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .order('updated_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        // Group tickets by status
        const grouped: Record<string, Ticket[]> = {
          'new': [],
          'in-progress': [],
          'on-me': [],
          'resolved': []
        };
        
        data.forEach((ticket: Ticket) => {
          const status = ticket.status;
          if (grouped[status]) {
            grouped[status].push(ticket);
          } else {
            grouped['new'].push(ticket); // Default to 'new' if unknown status
          }
        });
        
        setTicketsByStatus(grouped);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        logDatabaseError(error);
        setError(formatErrorForUser(error) || 'Failed to load tickets. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchTickets();
  }, [initialTickets, supabase]);
  
  // Update ticket status in the database
  const handleUpdateTicketStatus = async (ticketId: string, newStatus: string, sourceStatus: string) => {
    try {
      // Update local state first for immediate feedback
      setTicketsByStatus(prev => {
        const updated = { ...prev };
        
        // Find the ticket to move
        const ticketToMove = updated[sourceStatus].find(t => t.id === ticketId);
        
        if (!ticketToMove) return prev; // If ticket not found, do nothing
        
        // Remove ticket from source column
        updated[sourceStatus] = updated[sourceStatus].filter(t => t.id !== ticketId);
        
        // Update the ticket's status
        ticketToMove.status = newStatus;
        
        // Add ticket to destination column
        updated[newStatus] = [...updated[newStatus], ticketToMove];
        
        return updated;
      });
      
      // Then update in the database
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', ticketId);
      
      if (error) {
        throw error;
      }
      
      toast.success(`Ticket moved to ${columns.find(col => col.id === newStatus)?.title || newStatus}`);
    } catch (error) {
      console.error('Error updating ticket status:', error);
      logDatabaseError(error);
      toast.error(formatErrorForUser(error) || 'Failed to update ticket status. Please try again.');
      
      // Revert the state change on error
      setTicketsByStatus(prev => {
        const updated = { ...prev };
        
        // Find the ticket to move back
        const ticketToMove = updated[newStatus].find(t => t.id === ticketId);
        
        if (!ticketToMove) return prev; // If ticket not found, do nothing
        
        // Remove ticket from destination column
        updated[newStatus] = updated[newStatus].filter(t => t.id !== ticketId);
        
        // Update the ticket's status back to original
        ticketToMove.status = sourceStatus;
        
        // Add ticket back to source column
        updated[sourceStatus] = [...updated[sourceStatus], ticketToMove];
        
        return updated;
      });
    }
  };
  
  // Loading column component for server-side rendering
  function LoadingColumn({ id, title }: { id: string; title: string }) {
    return (
      <div className="min-w-[280px] max-w-[350px] flex-shrink-0">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-sm">{title}</h3>
              <div className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-md">
                <Skeleton className="h-4 w-8" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto pb-6 pt-2 px-2">
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full rounded-md" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Sortable ticket card component with drag handle
  function SortableTicketCard({ ticket }: { ticket: Ticket }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: ticket.id,
      data: {
        type: 'ticket',
        ticket,
      },
    });
    
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.4 : 1,
      zIndex: isDragging ? 1000 : 1,
    };
    
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        {...attributes} 
        {...listeners}
        className="touch-manipulation"
      >
        <TicketCard ticket={ticket} />
      </div>
    );
  }
  
  // Kanban column component with drop zone
  function KanbanColumn({ id, title, tickets = [], loading = false }: KanbanColumnProps) {
    // Setup the droppable area for this column
    const { setNodeRef, isOver } = useDroppable({
      id,
      data: {
        type: 'column',
        column: id,
      }
    });
    
    return (
      <div ref={setNodeRef} className={`min-w-[280px] max-w-[350px] flex-shrink-0`}>
        <Card className={`h-full flex flex-col ${isOver ? 'ring-2 ring-primary ring-opacity-50' : ''}`}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-sm">{title}</h3>
              <div className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-md">
                {tickets.length}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto pb-6 pt-2 px-2">
            <div className="space-y-3 min-h-[50px]">
              {tickets.map((ticket) => (
                <SortableTicketCard key={ticket.id} ticket={ticket} />
              ))}
              {tickets.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center h-24 border border-dashed rounded-md p-4 text-muted-foreground text-sm">
                  <p>No tickets</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Function to find a ticket by its ID across all columns
  const findCard = (id: string) => {
    for (const status in ticketsByStatus) {
      const ticket = ticketsByStatus[status]?.find(t => t.id === id);
      if (ticket) return ticket;
    }
    return null;
  };
  
  // Function to get all ticket IDs for SortableContext - using useMemo to avoid recalculations
  const ticketIds = useMemo(() => {
    return Object.values(ticketsByStatus).flat().map(ticket => ticket.id);
  }, [ticketsByStatus]);
  
  // Handle the start of a drag operation
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const ticketId = active.id as string;
    
    // Find the ticket being dragged and set it as active
    const ticket = findCard(ticketId);
    if (ticket) setActiveTicket(ticket);
  };
  
  // Handle drag over event for real-time feedback
  const handleDragOver = (event: DragOverEvent) => {
    // Can be used for advanced feedback during drag
    // We're keeping it simple for now
  };
  
  // Handle the end of a drag operation
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      // Reset active ticket if dropped outside a valid target
      setActiveTicket(null);
      return;
    }
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Find which column the active ticket is from
    let activeColumnId = '';
    let ticketToMove: Ticket | null = null;
    
    for (const status in ticketsByStatus) {
      const ticket = ticketsByStatus[status]?.find(t => t.id === activeId);
      if (ticket) {
        activeColumnId = status;
        ticketToMove = ticket;
        break;
      }
    }
    
    if (!ticketToMove) {
      setActiveTicket(null);
      return; // Couldn't find the ticket
    }
    
    // Check if dropped on a column
    if (columns.some(col => col.id === overId)) {
      // Dropping on a column - move to the end of that column
      const targetColumnId = overId;
      
      if (activeColumnId !== targetColumnId) {
        // Only update if moving to a different column
        await handleUpdateTicketStatus(activeId, targetColumnId, activeColumnId);
      }
    } else {
      // Dropped on another ticket
      const overTicket = findCard(overId);
      if (!overTicket) {
        setActiveTicket(null);
        return;
      }
      
      // Find which column the target ticket is in
      let overColumnId = '';
      for (const status in ticketsByStatus) {
        if (ticketsByStatus[status]?.some(t => t.id === overId)) {
          overColumnId = status;
          break;
        }
      }
      
      if (activeColumnId === overColumnId) {
        // Reordering within the same column
        const oldIndex = ticketsByStatus[activeColumnId].findIndex(t => t.id === activeId);
        const newIndex = ticketsByStatus[overColumnId].findIndex(t => t.id === overId);
        
        if (oldIndex !== newIndex) {
          // Create a new array with the updated order
          const reorderedTickets = arrayMove(
            ticketsByStatus[activeColumnId],
            oldIndex,
            newIndex
          );
          
          // Update the state
          setTicketsByStatus(prev => ({
            ...prev,
            [activeColumnId]: reorderedTickets
          }));
          
          // Here you would normally persist the order change to the database
          // But we're keeping it simple for this example
        }
      } else {
        // Moving to a different column
        await handleUpdateTicketStatus(activeId, overColumnId, activeColumnId);
      }
    }
    
    // Reset the active ticket
    setActiveTicket(null);
  };
  
  // Show error message if something went wrong
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-background/60 border border-border rounded-lg">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{error}</p>
        <Button
          onClick={() => window.location.reload()}
          className="mt-4"
          variant="default"
        >
          Retry
        </Button>
      </div>
    );
  }

  // Server-side or loading state render
  // Show loading UI when fetching data
  if (loading) {
    return (
      <div className="flex space-x-4 overflow-x-auto pb-4 -mx-4 px-4 md:-mx-6 md:px-6">
        {columns.map((column) => (
          <LoadingColumn 
            key={column.id} 
            id={column.id} 
            title={column.title}
          />
        ))}
      </div>
    );
  }
  
  // Full Kanban board with drag-and-drop functionality
  return (
    <div className="space-y-6">
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex space-x-4 overflow-x-auto pb-4 -mx-4 px-4 md:-mx-6 md:px-6">
          <SortableContext items={ticketIds} strategy={verticalListSortingStrategy}>
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                tickets={ticketsByStatus[column.id] || []}
              />
            ))}
          </SortableContext>
        </div>

        {/* Overlay for the dragged ticket - removed rotation for cleaner drag appearance */}
        <DragOverlay>
          {activeTicket && (
            <div className="opacity-80 scale-105 shadow-lg">
              <TicketCard ticket={activeTicket} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
