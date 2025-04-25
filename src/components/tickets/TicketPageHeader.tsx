import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusIcon, FilterIcon, ViewIcon } from '@/components/ui/icons';

export function TicketPageHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
        <p className="text-muted-foreground">
          Manage and track support requests from your customers.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" size="sm">
            <FilterIcon className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <div className="rounded-md border border-input p-1">
            <div className="flex">
              <Link 
                href="/tickets"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <ViewIcon className="mr-2 h-4 w-4" />
                Kanban
              </Link>
              <Link 
                href="/tickets/list"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground"
              >
                List
              </Link>
            </div>
          </div>
        </div>
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          New Ticket
        </Button>
      </div>
    </div>
  );
}
