# Architecture Overview

## Folder Structure

The support platform follows a well-organized folder structure:

```
support-platform/
├── .env.local                    # Environment variables (gitignored)
├── .env.example                  # Example environment variables
├── next.config.js                # NextJS configuration
├── package.json                  # Project dependencies
├── tailwind.config.js            # Tailwind CSS configuration (v4)
├── components.json               # Shadcn UI configuration
│
├── src/
│   ├── app/                      # App router pages
│   │   ├── (auth)/               # Auth layout group
│   │   │   ├── login/
│   │   │   │   ├── page.tsx      # Login page
│   │   │   │   └── components/   # Login-specific components
│   │   │   │       └── login-form.tsx
│   │   │   ├── register/
│   │   │   │   ├── page.tsx      # Register page
│   │   │   │   └── components/   # Registration-specific components
│   │   │   │       └── registration-form.tsx
│   │   │   └── layout.tsx        # Auth layout
│   │   │
│   │   ├── (dashboard)/          # Dashboard layout group
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx      # Main dashboard page
│   │   │   │   └── components/   # Dashboard-specific components
│   │   │   │       ├── stats-cards.tsx
│   │   │   │       ├── recent-activity.tsx
│   │   │   │       └── ticket-distribution-chart.tsx
│   │   │   │
│   │   │   ├── tickets/
│   │   │   │   ├── page.tsx      # Tickets list page
│   │   │   │   ├── components/   # Tickets page components
│   │   │   │   │   ├── ticket-header.tsx
│   │   │   │   │   ├── view-switcher.tsx
│   │   │   │   │   └── ticket-filters.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx  # Individual ticket page
│   │   │   │       └── components/ # Ticket detail page components
│   │   │   │           ├── ticket-detail-header.tsx
│   │   │   │           ├── ticket-info-sidebar.tsx
│   │   │   │           └── ticket-action-buttons.tsx
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   ├── page.tsx      # Reports page
│   │   │   │   └── components/   # Report-specific components
│   │   │   │       ├── sentiment-chart.tsx
│   │   │   │       ├── feature-requests-list.tsx
│   │   │   │       └── performance-metrics.tsx
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx      # Settings page
│   │   │   │   └── components/   # Settings-specific components
│   │   │   │       ├── profile-settings.tsx
│   │   │   │       └── notification-preferences.tsx
│   │   │   │
│   │   │   └── layout.tsx        # Dashboard layout
│   │   │
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Global CSS including Tailwind imports
│   │
│   ├── components/               # Shared UI components
│   │   ├── layout/               # Layout components
│   │   │   ├── app-sidebar.tsx   # Main sidebar component
│   │   │   ├── header.tsx        # Header component
│   │   │   └── main-layout.tsx   # Main layout wrapper
│   │   │
│   │   ├── tickets/              # Shared ticket components
│   │   │   ├── ticket-card.tsx           # Reusable ticket card component
│   │   │   ├── message-bubble.tsx        # Message display with link detection
│   │   │   ├── reply-composer.tsx        # Reply composer with rich text
│   │   │   └── views/                    # Different view implementations
│   │   │       ├── kanban-view.tsx       # Kanban board view
│   │   │       ├── list-view.tsx         # List view
│   │   │       ├── calendar-view.tsx     # Calendar view
│   │   │       └── timeline-view.tsx     # Timeline view
│   │   │
│   │   ├── ui/                   # Shadcn UI components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── ... (other shadcn components)
│   │   │
│   │   ├── theme-provider.tsx    # Theme provider component
│   │   └── mode-toggle.tsx       # Dark/light mode toggle
│   │
│   ├── context/                  # Context providers
│   │   └── ticket-view-context.tsx   # Context for ticket view state
│   │
│   ├── lib/                      # Utility libraries
│   │   ├── data/                 # Dummy data
│   │   │   └── dummy-tickets.ts  # Sample ticket data
│   │   └── utils.ts              # Utility functions
│   │
│   └── types/                    # Type definitions
│       └── index.ts              # Shared TypeScript types
│
└── public/                       # Static assets
    ├── favicon.ico
    └── images/
        └── logo.svg
```

## Core Architecture Patterns

### Route Groups and Layouts

The application uses Next.js App Router route groups to organize pages with similar layouts:

- `(auth)`: Contains authentication-related pages with a simplified layout
- `(dashboard)`: Contains the main application pages with the dashboard layout

### Component Structure

Components follow a modular structure:

1. **Page Components**: Handle data fetching and overall page structure
2. **Feature Components**: Implement specific features within pages
3. **UI Components**: Basic building blocks for the interface
4. **Layout Components**: Handle the overall layout structure

### State Management

The application uses several state management approaches:

1. **Zustand**: Global state management for tickets, filters, and user preferences
2. **React Context**: For theme, authentication, and view mode context
3. **Server Components**: For data that can be fetched directly on the server

### Data Flow

Data flows through the application in the following way:

1. **Supabase Client**: Connects to the Supabase database
2. **Server Actions/API Routes**: Handle data mutations and complex queries
3. **State Stores**: Manage application state client-side
4. **Components**: Consume and display data from stores

## Key Implementation Patterns

### Authentication Flow

1. User submits credentials via login form
2. Server action authenticates with Supabase
3. On success, session cookie is set
4. Middleware redirects to dashboard
5. Protected routes check for valid session

### Ticket Management Flow

1. Tickets are fetched using Supabase client or API
2. State is managed in the ticket store
3. UI components render based on the current state
4. Actions (create, update, assign) are processed via server actions
5. Real-time updates are handled via Supabase subscriptions

### Theme System

1. Theme preferences are stored in localStorage
2. ThemeProvider manages theme state
3. CSS variables in globals.css define theme colors
4. Components use Tailwind classes that respect the theme

## Next.js 15 Features

The application leverages new features in Next.js 15:

1. **Promise-Based Route Parameters**: Route handlers use `await params` to access parameters
2. **Server Components**: Optimized data fetching with server components
3. **Server Actions**: Form submission and data mutations via server actions
4. **Middleware**: Used for authentication checks and redirects
