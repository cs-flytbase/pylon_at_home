# Getting Started with Support Platform

## Prerequisites

- Node.js 18+ installed
- Supabase account
- Git

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd support-platform
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Database Setup

1. Create a new Supabase project

2. Set up the database schema by running the SQL scripts from [Database Schema](./database-schema.md)

3. Enable Row Level Security (RLS) policies

## Running the Development Server

Start the development server:

```bash
npm run dev
```

The application will be available at http://localhost:3000.

## Initial Configuration

### Creating an Admin User

1. Register a new user through the registration page
2. Using the Supabase dashboard, update the user's role to 'admin' in the profiles table

### Setting Up Status Types

The system comes with default status types:
- New
- In Progress
- On Me
- On Dev Team
- Closed

You can add custom status types through the admin interface or directly in the Supabase dashboard.

## Next Steps

- Explore the [Architecture Overview](./architecture.md)
- Learn about the [Component Library](./component-library.md)
- Understand the [Theme System](./theme-system.md)
