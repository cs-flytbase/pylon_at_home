"use client";

import React, { useMemo } from 'react';
import { TicketCard } from '../ticket-card';
import { Ticket } from '@/types/database';
import { DndContext, DragOverlay, closestCorners, useSensor, useSensors, PointerSensor, KeyboardSensor, DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export type KanbanDndComponentsProps = {
  columns: { id: string; title: string }[];
  ticketsByStatus: Record<string, Ticket[]>;
  loading: boolean;
  error: string | null;
  activeTicket: Ticket | null;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  findCard: (id: string) => Ticket | null;
  getTicketIds: () => string[];
};

// Simplified component without complex hook patterns
function SimplifiedKanban(props: KanbanDndComponentsProps) {
  const { columns, ticketsByStatus, loading, activeTicket, handleDragStart, handleDragOver, handleDragEnd } = props;
  
  // Create fixed sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-1 space-x-4 p-4">
        {columns.map(column => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            tickets={ticketsByStatus[column.id] || []}
            loading={loading}
          />
        ))}
      </div>
      <DragOverlay adjustScale={true} zIndex={999}>
        {activeTicket ? (
          <div className="opacity-80 rotate-3 scale-105">
            <TicketCard ticket={activeTicket} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Clean export as default to avoid any React hook issues
const KanbanDndComponents = SimplifiedKanban;

// Export the component as default
export default KanbanDndComponents;

interface KanbanColumnProps {
  id: string;
  title: string;
  tickets: Ticket[];
  loading: boolean;
};

// Column component using dnd-kit useDroppable
const KanbanColumn = ({ id, title, tickets, loading }: KanbanColumnProps) => {
  // Generate loading placeholders if in loading state
  if (loading) {
    return (
      <Card className="space-y-4">
        <CardHeader className="p-4 pb-2 space-y-0">
          <div className="flex justify-between items-center">
            <div className="h-6 w-24 bg-muted rounded" />
            <div className="h-5 w-6 bg-muted rounded" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          {Array(id === 'new' ? 3 : id === 'in-progress' ? 4 : id === 'on-me' ? 2 : 1)
            .fill(0)
            .map((_, index) => (
              <div key={index} className="bg-background/40 rounded-md p-4 border border-border space-y-3">
                <div className="h-5 w-3/4 bg-muted rounded" />
                <div className="flex gap-2">
                  <div className="h-4 w-16 bg-muted rounded" />
                  <div className="h-4 w-16 bg-muted rounded" />
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-4 w-20 bg-muted rounded" />
                  <div className="h-4 w-16 bg-muted rounded" />
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    );
  }

  // Set up droppable area with dnd-kit
  const { setNodeRef, isOver } = useDroppable({
    id: id, // Use the column id as the droppable id
  });

  // Get ticket ids for this column for SortableContext
  const ticketIds = tickets.map(ticket => ticket.id);

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
        ref={setNodeRef}
        className={`p-3 md:p-4 pt-0 flex-1 space-y-2 md:space-y-3 overflow-y-auto transition-colors duration-200 ${isOver ? 'ring-2 ring-primary/30 bg-accent/30' : ''}`}
        style={{ minHeight: '250px' }}
      >
        {/* Pass the correct context for sorting tickets within this column */}
        <SortableContext items={ticketIds} strategy={verticalListSortingStrategy}>
          {tickets.map((ticket) => (
            <SortableTicketCard 
              key={ticket.id} 
              ticket={ticket} 
            />
          ))}
        </SortableContext>

        {/* Empty state when there are no tickets */}
        {tickets.length === 0 && (
          <div className="h-32 flex items-center justify-center">
            <p className="text-muted-foreground text-sm text-center">
              No tickets
            </p>
          </div>
        )}

        {/* Insertion indicator line that appears when dragging - controlled by dnd-kit */}
        {isOver && tickets.length === 0 && (
          <div className="absolute inset-x-4 top-20 border-t-2 border-primary pointer-events-none" />
        )}
      </CardContent>
    </Card>
  );
};

// Sortable ticket card using dnd-kit's useSortable
const SortableTicketCard = ({ ticket }: { ticket: Ticket }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${isDragging ? 'ring-2 ring-primary/20 shadow-md' : ''}`}
    >
      <TicketCard ticket={ticket} />
    </div>
  );
};
