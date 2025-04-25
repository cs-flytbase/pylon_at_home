"use client";

import { Suspense, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { TicketPageHeader } from '@/components/tickets/ticket-page-header';
import { KanbanView } from '@/components/tickets/views/kanban-view';
import { ListView } from '@/components/tickets/views/list-view';
import { CalendarView } from '@/components/tickets/views/calendar-view';
import { TicketsPageSkeleton } from '@/components/tickets/tickets-page-skeleton';
import { AnimatePresence } from 'framer-motion';

type ViewOption = 'kanban' | 'list' | 'calendar';

export default function TicketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentView, setCurrentView] = useState<ViewOption>('kanban');
  const pathname = usePathname();
  const hasOverlay = pathname !== '/tickets';

  // Function to render the current view based on selection
  const renderCurrentView = () => {
    switch (currentView) {
      case 'list':
        return <ListView />;
      case 'calendar':
        return <CalendarView />;
      case 'kanban':
      default:
        return <KanbanView />;
    }
  };

  return (
    <div className={`container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-4 md:space-y-6 relative ${hasOverlay ? 'tickets-page-has-overlay' : ''}`}>
      <TicketPageHeader 
        currentView={currentView} 
        onViewChange={(view) => setCurrentView(view)} 
      />
      {/* Always render the ticket views */}
      <div className="ticket-list-view p-0 md:p-1 overflow-x-hidden">
        <Suspense fallback={<TicketsPageSkeleton />}>
          {renderCurrentView()}
        </Suspense>
      </div>
      
      {/* Child routes (like ticket/[id]) will be rendered here with animation */}
      <AnimatePresence mode="wait" >
        {children}
      </AnimatePresence>
    </div>
  );
}
