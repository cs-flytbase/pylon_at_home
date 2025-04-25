"use client";

import { useState } from 'react';
import { TicketCard } from './TicketCard';
import { PlusCircleIcon } from '@/components/ui/icons';
import { Ticket } from '@/types/ticket';

type KanbanColumnProps = {
  id: string;
  title: string;
  tickets: Ticket[];
  loading: boolean;
  onTicketDrop: (ticketId: string, newStatus: string, sourceStatus: string) => Promise<void>;
};

export function KanbanColumn({ id, title, tickets, loading, onTicketDrop }: KanbanColumnProps) {
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

  return (
    <div className="bg-card rounded-lg p-4 space-y-4 border border-border flex flex-col h-[calc(100vh-220px)]">
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
        className="flex-1 space-y-3 overflow-y-auto"
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('bg-accent/50');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('bg-accent/50');
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('bg-accent/50');
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
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground text-sm text-center py-5">
              No tickets
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
