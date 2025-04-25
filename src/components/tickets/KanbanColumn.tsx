"use client";

import { useState } from 'react';
import { TicketCard } from './TicketCard';
import { PlusCircleIcon } from '@/components/ui/icons';
import { Ticket } from '@/types/ticket';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

type KanbanColumnProps = {
  id: string;
  title: string;
  tickets: Ticket[];
  loading: boolean;
};

export function KanbanColumn({ id, title, tickets, loading }: KanbanColumnProps) {
  // Generate loading placeholders if in loading state
  if (loading) {
    return (
      <div className="bg-card rounded-lg p-4 space-y-4 border border-border">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium flex items-center">
            <div className="h-6 w-24 bg-muted animate-pulse rounded" />
          </h3>
          <span className="text-muted-foreground text-sm">
            <div className="h-5 w-6 bg-muted animate-pulse rounded" />
          </span>
        </div>
        {Array(id === 'new' ? 3 : id === 'in-progress' ? 4 : id === 'on-me' ? 2 : 1)
          .fill(0)
          .map((_, index) => (
            <div key={index} className="bg-background rounded-md p-4 border border-border space-y-3">
              <div className="h-5 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
              <div className="flex justify-between items-center">
                <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
                <div className="h-4 bg-muted animate-pulse rounded w-16" />
              </div>
            </div>
          ))}
      </div>
    );
  }

  // Set up droppable area with dnd-kit
  const { setNodeRef, isOver } = useDroppable({
    id: id, // Use the column id as the droppable id
  });

  // Get ticket ids for this column for SortableContext
  const ticketIds = tickets.map(ticket => ticket.id);

  return (
    <div className="bg-card rounded-lg p-4 space-y-4 border border-border flex flex-col h-[calc(100vh-220px)] relative">
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-medium flex items-center">
          {title} <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{tickets.length}</span>
        </h3>
        <button 
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Add ticket"
          onClick={() => {
            // Here we would trigger a modal to create a new ticket with this status
            alert(`Create new ticket with status: ${id}`);
          }}
        >
          <PlusCircleIcon className="h-5 w-5" />
        </button>
      </div>
      
      <div 
        ref={setNodeRef}
        className={`flex-1 space-y-3 overflow-y-auto transition-colors duration-200 ${isOver ? 'ring-2 ring-primary/30 bg-accent/30' : ''}`}
      >
        {/* Pass the correct context for sorting tickets within this column */}
        <SortableContext items={ticketIds} strategy={verticalListSortingStrategy}>
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </SortableContext>

        {/* Empty state when there are no tickets */}
        {tickets.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground text-sm text-center py-5">
              No tickets
            </p>
          </div>
        )}
      </div>

      {/* Insertion indicator line that appears when dragging - controlled by dnd-kit */}
      {isOver && tickets.length === 0 && (
        <div className="absolute inset-x-4 top-20 border-t-2 border-primary pointer-events-none" />
      )}
    </div>
  );
}
