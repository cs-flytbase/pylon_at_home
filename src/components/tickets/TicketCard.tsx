"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ClockIcon, UserIcon, MessageIcon, TagIcon, PaperclipIcon, GripIcon } from '@/components/ui/icons';
import { Ticket } from '@/types/ticket';



type TicketCardProps = {
  ticket: Ticket;
};

// Helper function to format date
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  // Less than a minute
  if (seconds < 60) {
    return 'just now';
  }
  
  // Less than an hour
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  
  // Less than a day
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  
  // Less than a week
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  
  // Format as date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TicketCard({ ticket }: TicketCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  // Priority colors
  const priorityColors: Record<string, string> = {
    'low': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    'high': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    'urgent': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };
  
  // Type badges
  const typeBadges: Record<string, string> = {
    'support': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    'bug': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    'feature': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('ticketId', ticket.id);
        e.dataTransfer.setData('sourceStatus', ticket.status);
        e.dataTransfer.effectAllowed = 'move';
        setIsDragging(true);
      }}
      onDragEnd={() => {
        setIsDragging(false);
      }}
      className={`bg-background rounded-md p-4 border border-border shadow-sm hover:shadow transition-all ${isDragging ? 'shadow-md border-primary/50 ring-1 ring-primary/20 opacity-50' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <div 
            className="inline-flex items-center justify-center cursor-grab active:cursor-grabbing hover:text-primary transition-colors mr-1.5 -ml-1"
          >
            <GripIcon className="h-4 w-4" />
          </div>
          <Link href={`/tickets/${ticket.id}`} className="font-medium hover:text-primary transition-colors line-clamp-1">
            {ticket.title}
          </Link>
        </div>
            <div className="flex space-x-1">
              {ticket.has_media && (
                <span className="text-muted-foreground" title="Has attachments">
                  <PaperclipIcon className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
      
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[ticket.priority]}`}>
          {ticket.priority}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${typeBadges[ticket.type]}`}>
          {ticket.type}
        </span>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center text-muted-foreground">
          <UserIcon className="h-3.5 w-3.5 mr-1" />
          <span className="truncate max-w-[100px]" title={ticket.customer_name}>
            {ticket.customer_name}
          </span>
        </div>
        <div className="flex items-center text-muted-foreground" title={new Date(ticket.created_at).toLocaleString()}>
          <ClockIcon className="h-3.5 w-3.5 mr-1" />
          <span>{formatTimeAgo(ticket.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
