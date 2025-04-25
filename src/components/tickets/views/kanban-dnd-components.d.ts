// Use relative imports to avoid module resolution issues
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';

// Define Ticket interface here to avoid importing from database
interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  customer_id: string;
  customer_name: string;
  assignee_id: string | null;
  assignee_name: string | null;
  created_at: string;
  updated_at: string;
  organization_id: string | null;
  due_date: string | null;
}

export interface KanbanDndComponentsProps {
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
}

declare const KanbanDndComponents: React.FC<KanbanDndComponentsProps>;
export default KanbanDndComponents;
