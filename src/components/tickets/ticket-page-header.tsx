"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateTicketDialog } from '@/components/tickets/create-ticket-dialog';

type ViewOption = 'kanban' | 'list' | 'calendar';

type TicketPageHeaderProps = {
  currentView?: ViewOption;
  onViewChange?: (view: ViewOption) => void;
};

export function TicketPageHeader({ currentView = 'kanban', onViewChange }: TicketPageHeaderProps) {
  const [view, setView] = useState<ViewOption>(currentView);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleViewChange = (newView: ViewOption) => {
    setView(newView);
    if (onViewChange) {
      onViewChange(newView);
    }
  };

  return (
    <div className="flex flex-col items-start justify-between gap-3 mb-4 md:mb-6">
      <div className="w-full flex flex-row items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Tickets</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage support tickets and track their status</p>
        </div>
        
        <Button
          size="sm"
          className="h-9 px-2 md:px-3"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4 md:mr-1" />
          <span className="hidden md:inline">New Ticket</span>
        </Button>
        
        <CreateTicketDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
      </div>
      
      <div className="w-full flex items-center justify-center md:justify-end">
        <Tabs 
          defaultValue={view} 
          className="w-full md:w-auto max-w-[400px]"
          onValueChange={(value: string) => handleViewChange(value as ViewOption)}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="kanban" className="text-xs md:text-sm py-1.5">Kanban</TabsTrigger>
            <TabsTrigger value="list" className="text-xs md:text-sm py-1.5">List</TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs md:text-sm py-1.5">Calendar</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
