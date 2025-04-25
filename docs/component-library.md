# Component Library

## Overview

The Support Platform uses a custom component library built on top of Tailwind CSS. This document provides an overview of the key components available in the system and how to use them.

## Layout Components

### `app-sidebar.tsx`

Provides the main navigation sidebar for the dashboard.

**Usage:**

```tsx
import { AppSidebar } from "@/components/layout/app-sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <AppSidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

### `header.tsx`

Provides the application header with user information and theme toggle.

**Usage:**

```tsx
import { Header } from "@/components/layout/header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

### `main-layout.tsx`

Combines sidebar and header into a complete dashboard layout.

**Usage:**

```tsx
import { MainLayout } from "@/components/layout/main-layout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}
```

## Ticket Components

### `ticket-card.tsx`

Displays a ticket in a card format for use in list or kanban views.

**Props:**

```typescript
interface TicketCardProps {
  ticket: Ticket;
  onClick?: (ticket: Ticket) => void;
  isDraggable?: boolean;
}
```

**Usage:**

```tsx
import { TicketCard } from "@/components/tickets/ticket-card";

export default function TicketsList({ tickets }: { tickets: Ticket[] }) {
  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
}
```

### `message-bubble.tsx`

Displays a message in a conversation thread with appropriate styling based on sender type.

**Props:**

```typescript
interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
}
```

**Usage:**

```tsx
import { MessageBubble } from "@/components/tickets/message-bubble";

export default function MessageThread({ messages, currentUserId }: { messages: Message[], currentUserId: string }) {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageBubble 
          key={message.id} 
          message={message} 
          isCurrentUser={message.sender_id === currentUserId}
        />
      ))}
    </div>
  );
}
```

### `reply-composer.tsx`

Rich text editor for composing replies to tickets.

**Props:**

```typescript
interface ReplyComposerProps {
  ticketId: string;
  onSend: (content: string, attachments: File[]) => Promise<void>;
  placeholder?: string;
  isSubmitting?: boolean;
}
```

**Usage:**

```tsx
import { ReplyComposer } from "@/components/tickets/reply-composer";

export default function TicketDetail({ ticketId }: { ticketId: string }) {
  const handleSendReply = async (content: string, attachments: File[]) => {
    // Implementation to send reply
  };
  
  return (
    <div className="space-y-4">
      {/* Message thread */}
      <ReplyComposer 
        ticketId={ticketId}
        onSend={handleSendReply}
        placeholder="Type your reply..."
      />
    </div>
  );
}
```

## View Components

### `kanban-view.tsx`

Implements a kanban board view for tickets.

**Props:**

```typescript
interface KanbanViewProps {
  tickets: Ticket[];
  statusTypes: StatusType[];
  onStatusChange: (ticketId: string, newStatus: string) => Promise<void>;
}
```

**Usage:**

```tsx
import { KanbanView } from "@/components/tickets/views/kanban-view";

export default function TicketsPage() {
  // Fetch tickets and status types
  
  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    // Implementation to update ticket status
  };
  
  return (
    <KanbanView 
      tickets={tickets} 
      statusTypes={statusTypes}
      onStatusChange={handleStatusChange}
    />
  );
}
```

### `list-view.tsx`

Implements a sortable and filterable list view for tickets.

**Props:**

```typescript
interface ListViewProps {
  tickets: Ticket[];
  onSort: (field: string, direction: 'asc' | 'desc') => void;
  onFilter: (filters: TicketFilters) => void;
}
```

**Usage:**

```tsx
import { ListView } from "@/components/tickets/views/list-view";

export default function TicketsPage() {
  // Fetch tickets and handle sort/filter
  
  return (
    <ListView 
      tickets={tickets} 
      onSort={handleSort}
      onFilter={handleFilter}
    />
  );
}
```

### `calendar-view.tsx`

Implements a calendar view for tickets.

**Props:**

```typescript
interface CalendarViewProps {
  tickets: Ticket[];
  onDateSelect: (date: Date) => void;
}
```

**Usage:**

```tsx
import { CalendarView } from "@/components/tickets/views/calendar-view";

export default function TicketsPage() {
  // Fetch tickets
  
  const handleDateSelect = (date: Date) => {
    // Implementation
  };
  
  return (
    <CalendarView 
      tickets={tickets} 
      onDateSelect={handleDateSelect}
    />
  );
}
```

### `timeline-view.tsx`

Implements a timeline view for tickets.

**Props:**

```typescript
interface TimelineViewProps {
  tickets: Ticket[];
  activities: TicketActivity[];
}
```

**Usage:**

```tsx
import { TimelineView } from "@/components/tickets/views/timeline-view";

export default function TicketsPage() {
  // Fetch tickets and activities
  
  return (
    <TimelineView 
      tickets={tickets} 
      activities={activities}
    />
  );
}
```

## UI Components

### `button.tsx`

Reusable button component with variants and sizes.

**Props:**

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'destructive' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}
```

**Usage:**

```tsx
import { Button } from "@/components/ui/button";

export default function Example() {
  return (
    <div className="space-x-4">
      <Button>Default</Button>
      <Button variant="primary">Primary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button size="sm">Small</Button>
      <Button size="lg">Large</Button>
      <Button isLoading>Loading</Button>
    </div>
  );
}
```

### `input.tsx`

Styled input component with optional label and error state.

**Props:**

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
```

**Usage:**

```tsx
import { Input } from "@/components/ui/input";

export default function Example() {
  return (
    <div className="space-y-4">
      <Input 
        label="Email"
        type="email"
        placeholder="Enter your email"
      />
      
      <Input 
        label="Password"
        type="password"
        error="Password is required"
      />
    </div>
  );
}
```

### `card.tsx`

Stylized card component for content grouping.

**Props:**

```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  footer?: React.ReactNode;
}
```

**Usage:**

```tsx
import { Card } from "@/components/ui/card";

export default function Example() {
  return (
    <Card title="User Information" footer={<Button>Save</Button>}>
      <div className="p-4">
        <p>Card content goes here</p>
      </div>
    </Card>
  );
}
```

### `dropdown-menu.tsx`

Dropdown menu component for actions and options.

**Usage:**

```tsx
import { DropdownMenu } from "@/components/ui/dropdown-menu";

export default function Example() {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger>
        <Button>Options</Button>
      </DropdownMenu.Trigger>
      
      <DropdownMenu.Content>
        <DropdownMenu.Item>Profile</DropdownMenu.Item>
        <DropdownMenu.Item>Settings</DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item>Logout</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
```

## Theme Components

### `theme-provider.tsx`

Provides theme context and management for the application.

**Usage:**

```tsx
import { ThemeProvider } from "@/components/theme-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### `mode-toggle.tsx`

Toggle component for switching between light, dark, and system themes.

**Usage:**

```tsx
import { ModeToggle } from "@/components/mode-toggle";

export default function Header() {
  return (
    <header className="flex justify-between items-center">
      <h1>Support Platform</h1>
      <ModeToggle />
    </header>
  );
}
```

## Form Components

### `login-form.tsx`

Provides a complete login form with validation and error handling.

**Usage:**

```tsx
import { LoginForm } from "@/app/(auth)/login/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoginForm />
    </div>
  );
}
```

### `registration-form.tsx`

Provides a complete registration form with validation and error handling.

**Usage:**

```tsx
import { RegistrationForm } from "@/app/(auth)/register/components/registration-form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <RegistrationForm />
    </div>
  );
}
```

## Dashboard Components

### `stats-cards.tsx`

Displays key statistics on the dashboard.

**Usage:**

```tsx
import { StatsCards } from "@/app/(dashboard)/dashboard/components/stats-cards";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <StatsCards />
      {/* Other dashboard content */}
    </div>
  );
}
```

### `recent-activity.tsx`

Displays recent activity feed on the dashboard.

**Usage:**

```tsx
import { RecentActivity } from "@/app/(dashboard)/dashboard/components/recent-activity";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Other dashboard content */}
      <RecentActivity />
    </div>
  );
}
```

## Using Components with the Theme System

All components are designed to work with the theme system and will automatically adapt to light and dark modes. The Tailwind classes use the CSS variables defined in `globals.css`.

```tsx
// Example of a component using theme variables
const Card = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-card text-card-foreground shadow rounded-lg p-4">
      {children}
    </div>
  );
};
```

## Creating New Components

When creating new components for the platform:

1. Place them in the appropriate directory based on their purpose
2. Use existing UI components as building blocks when possible
3. Ensure they respect the theme by using the appropriate Tailwind classes
4. Include proper TypeScript typing for props
5. Keep components focused on a single responsibility
6. Document usage with examples

This approach ensures consistency and maintainability across the platform.
