# Ticket Management System

## Overview

The ticket management system enables agents to create, view, and respond to support tickets. The system is fully integrated with Supabase for real-time data management and provides a responsive UI that works on both desktop and mobile devices.

## Key Features

- **Ticket Creation**: Create new tickets with details such as title, description, priority, and type.
- **Ticket Listing**: View tickets in both list and kanban board views.
- **Ticket Details**: Examine ticket details and reply to customer messages.
- **Real-time Updates**: All data is synchronized with Supabase in real-time.
- **Toast Notifications**: User feedback via Sonner toast notifications for actions like ticket creation and message sending.
- **Responsive Design**: Mobile-friendly interface that adapts to different screen sizes.

## Technical Implementation

### Supabase Integration

The ticket system uses Supabase (PostgreSQL) for data storage and retrieval. Key database tables include:

- `tickets`: Stores main ticket information
- `messages`: Stores conversations related to tickets
- `profiles`: Stores user profile information for assignees
- `attachments`: Stores files attached to messages

To set up Supabase, you need to configure the following environment variables in a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### Component Structure

1. **Ticket Views**:
   - `ListView`: Displays tickets in a list format with sorting and filtering options
   - `KanbanView`: Displays tickets in a board format organized by status

2. **Ticket Actions**:
   - `CreateTicketDialog`: Modal for creating new tickets
   - `TicketDetailsSheet`: Side panel for viewing and replying to tickets

3. **UI Components**:
   - Uses Radix UI and Shadcn UI for interface elements
   - Sonner for toast notifications

### Data Flow

1. **Fetching Data**:
   ```typescript
   const { data, error } = await supabase
     .from('tickets')
     .select('*')
     .order('updated_at', { ascending: false });
   ```

2. **Creating Records**:
   ```typescript
   const { data: ticket, error } = await supabase
     .from('tickets')
     .insert(newTicket)
     .select()
     .single();
   ```

3. **Updating Records**:
   ```typescript
   const { error } = await supabase
     .from('tickets')
     .update({ 
       status: newStatus,
       updated_at: new Date().toISOString() 
     })
     .eq('id', ticketId);
   ```

## Dependencies

The ticket system relies on the following packages:

- `@supabase/supabase-js` - Supabase client
- `@radix-ui/react-dialog` - Dialog component
- `@radix-ui/react-tabs` - Tabs component
- `@radix-ui/react-select` - Select component
- `@radix-ui/react-label` - Form label component
- `sonner` - Toast notifications

## Best Practices

1. **Error Handling**: Always provide user feedback for database operations using toast notifications
2. **Optimistic Updates**: Update the UI immediately before confirming with the database
3. **Type Safety**: Use TypeScript types from the database schema for data consistency
4. **Mobile Responsiveness**: Test all interfaces on mobile viewports

## Future Enhancements

- Real-time notifications using Supabase subscriptions
- Advanced filtering and search capabilities
- Rich text formatting in messages
- Integration with other communication channels
- Analytics dashboard for ticket metrics
