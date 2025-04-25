// Re-export the Ticket type from database types to ensure consistency
import { Ticket as DatabaseTicket } from './database';

// Export the Supabase Ticket type to be used throughout the application
export type Ticket = DatabaseTicket;
