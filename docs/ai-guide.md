# AI Guide: Support Platform Development

## Overview

This guide documents the ongoing development of the support platform, tracking user preferences, requirements, decisions, and context from our conversations. It serves as a reference point for future interactions to ensure continuity and alignment with the user's vision.

**Last Updated:** April 24, 2025 at 21:43

## Project Scope

The project involves building a comprehensive support platform with the following characteristics:

### Core Technologies
- Next.js 15 with App Router
- TypeScript for type safety
- Tailwind CSS v4 for styling
- Supabase for authentication, database, and real-time features
- Zustand for state management

### Key Features
- **Authentication System**: User registration, login, and role-based access control
- **Ticket Management**: Creation, assignment, status tracking, and filtering
- **Communication Tools**: Threaded conversations with multi-channel support
- **Media Handling**: File attachments, image/video uploads
- **Real-time Updates**: Instant notifications and message delivery
- **Theme System**: Light/dark mode toggle and system preference detection
- **Analytics**: Reporting dashboard for ticket metrics

## User Preferences

### Features the User Likes
- **Well-structured organization**: Clear folder structure and code organization
- **Comprehensive documentation**: Detailed docs for architecture, API, and components
- **Theme system**: Dark/light mode toggle with system preference detection
- **Real-time capabilities**: Instant updates for new messages and notifications
- **Multi-channel communication**: Support for email, WhatsApp, Telegram, and Slack
- **Drag-and-drop in Kanban view**: Ability to move tickets between status columns

### Features the User Dislikes/Wants to Avoid
- **Overly complex architectures**: Preference for clean, maintainable patterns
- **Excessive boilerplate**: Focused on productive, pragmatic code
- **Monolithic files**: Preference for modular, component-based approach

## Project Structure

The project follows this organized folder structure:

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

## Key Decisions and Implementation Details

### Authentication
- Using Supabase Auth with custom UI
- Server-side route protection via middleware
- Role-based access control (admin, agent, developer roles)

### Database Schema
- **profiles**: User profiles with role-based access
- **tickets**: Core ticket information
- **messages**: Conversation threads within tickets
- **attachments**: Media files for messages
- **tags**: Tag definitions for categorization
- **ticket_tags**: Junction table for ticket-tag relationships

### Ticket Management
- Kanban board with drag-and-drop functionality between status columns
- Status transitions (new → in progress → on me → resolved → closed)
- Visual indicators for priority and type

### API Implementation
- RESTful API design with Next.js API routes
- Promise-based route parameters (Next.js 15 pattern)
- Comprehensive error handling and validation
- Real-time subscriptions for instant updates

### UI Components
- Modular component architecture
- Responsive design for all screen sizes
- Accessible according to WCAG standards
- Theme-aware using CSS variables

## Communication History

### Session 1: Project Setup and Planning
- Initial discussion of project requirements and technology stack
- Created folder structure and base documentation
- Set up environment configuration

### Session 2: Documentation
- Created comprehensive documentation covering:
  - Project overview (README.md)
  - Getting started guide
  - Architecture documentation
  - Database schema
  - Component library documentation
  - Theme system documentation
  - Authentication system documentation
  - API reference

### Session 3: API Design
- Created detailed API documentation for:
  - Ticket management
  - Message handling
  - File attachments
  - Tag management
  - User authentication and profiles

### Session 4: Ticket Management Features
- Added requirement for drag-and-drop functionality in Kanban board view
- Started implementation of the Kanban board but encountered React version compatibility issues
  - Found that react-beautiful-dnd doesn't support React 19 yet
  - Decided to create a custom implementation to ensure compatibility
- Created core components for the ticket management system:
  - KanbanBoard component for ticket organization by status
  - KanbanColumn component for droppable status columns
  - TicketCard component for draggable ticket items
  - Responsive UI with loading states and error handling
- Implemented custom button component to avoid dependency issues
- Received detailed folder structure preferences from the user
  - Updated project organization to match the specified structure
  - Created appropriate subdirectories for components and pages

## Next Steps and Priorities

1. Complete ticket detail view page
2. Implement API route handlers based on the documentation
3. Add ticket creation and editing functionality
4. Implement message threads and attachments for tickets
5. Set up real-time features using Supabase Realtime
6. Create comprehensive tests
7. Implement authentication middleware for role-based access

## Special Notes for AI Assistant

- Remember to follow the Next.js 15 pattern for dynamic route parameters (they are now Promises)
- Maintain the modular component structure
- Focus on clean, maintainable code patterns
- Always implement proper error handling
- Update this guide after each conversation to keep it current
- Be mindful of React 19 compatibility issues with third-party libraries
- When encountering compatibility issues, prefer to implement custom solutions rather than downgrading React

---

*This guide will be updated after each conversation to maintain an accurate record of the project's development.*
