# Theme System

## Overview

The Support Platform implements a robust theme system that supports light mode, dark mode, and system preference. This document explains how the theme system works and how to use it in your components.

## Theme Implementation

The theme system is built on three main components:

1. **CSS Variables**: Defined in `globals.css` for both light and dark themes
2. **Theme Provider**: React context provider for managing theme state
3. **Mode Toggle**: UI component for switching between themes

## CSS Variables

The theme variables are defined in `globals.css` and include colors for various UI elements:

```css
:root {
  --radius: 0.5rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.141 0.005 285.823);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.141 0.005 285.823);
  --primary: oklch(0.21 0.006 285.885);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.967 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --accent: oklch(0.967 0.001 286.375);
  --accent-foreground: oklch(0.21 0.006 285.885);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.92 0.004 286.32);
  --input: oklch(0.92 0.004 286.32);
  --ring: oklch(0.705 0.015 286.067);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.141 0.005 285.823);
  --sidebar-primary: oklch(0.21 0.006 285.885);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.967 0.001 286.375);
  --sidebar-accent-foreground: oklch(0.21 0.006 285.885);
  --sidebar-border: oklch(0.92 0.004 286.32);
  --sidebar-ring: oklch(0.705 0.015 286.067);
}

.dark {
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.21 0.006 285.885);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.21 0.006 285.885);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.92 0.004 286.32);
  --primary-foreground: oklch(0.21 0.006 285.885);
  --secondary: oklch(0.274 0.006 286.033);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.274 0.006 286.033);
  --muted-foreground: oklch(0.705 0.015 286.067);
  --accent: oklch(0.274 0.006 286.033);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.552 0.016 285.938);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.21 0.006 285.885);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.274 0.006 286.033);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.552 0.016 285.938);
}
```

These variables are then accessed by Tailwind CSS classes throughout the application.

## Theme Provider

The theme provider is implemented in `src/components/theme-provider.tsx` and provides the theme context and functions for changing the theme.

```tsx
// src/components/theme-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const savedTheme = localStorage.getItem(storageKey);
    
    if (savedTheme && ["dark", "light", "system"].includes(savedTheme)) {
      setTheme(savedTheme as Theme);
    }
  }, [storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;
    
    root.classList.remove("light", "dark");
    
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      
      root.classList.add(systemTheme);
      return;
    }
    
    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  
  return context;
};
```

## Mode Toggle Component

The mode toggle component provides a user interface for switching between light, dark, and system themes.

```tsx
// src/components/mode-toggle.tsx
"use client";

import { useTheme } from "./theme-provider";
import { useState, useEffect } from "react";
import { SunIcon, MoonIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="flex items-center space-x-2 rounded-md border p-1">
      <button
        onClick={() => setTheme("light")}
        className={`p-2 rounded-md ${
          theme === "light" ? "bg-secondary text-secondary-foreground" : ""
        }`}
        aria-label="Light mode"
      >
        <SunIcon className="h-5 w-5" />
      </button>
      
      <button
        onClick={() => setTheme("dark")}
        className={`p-2 rounded-md ${
          theme === "dark" ? "bg-secondary text-secondary-foreground" : ""
        }`}
        aria-label="Dark mode"
      >
        <MoonIcon className="h-5 w-5" />
      </button>
      
      <button
        onClick={() => setTheme("system")}
        className={`p-2 rounded-md ${
          theme === "system" ? "bg-secondary text-secondary-foreground" : ""
        }`}
        aria-label="System preference"
      >
        <ComputerDesktopIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
```

## Integration with Root Layout

The theme provider is added to the root layout to make it available throughout the application:

```tsx
// src/app/layout.tsx
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

## Using the Theme System

### 1. Accessing Theme in Components

To access and modify the current theme in a component:

```tsx
"use client";

import { useTheme } from "@/components/theme-provider";

export function ThemeAwareComponent() {
  const { theme, setTheme } = useTheme();
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={() => setTheme("light")}>Light</button>
      <button onClick={() => setTheme("dark")}>Dark</button>
    </div>
  );
}
```

### 2. Tailwind CSS Dark Mode Classes

Tailwind CSS is configured to use the `dark` class for dark mode styles. You can use the `dark:` prefix for any Tailwind class to apply it only in dark mode:

```tsx
export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 text-black dark:text-white p-4 rounded-md shadow-md">
      {children}
    </div>
  );
}
```

### 3. Using CSS Variables

The theme CSS variables can be used directly in CSS or in combination with Tailwind:

```tsx
export function StyledButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md">
      {children}
    </button>
  );
}
```

## System Preference Detection

The theme system automatically detects the user's system preference when the "system" theme is selected. This is done using the `prefers-color-scheme` media query:

```javascript
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
  ? "dark"
  : "light";
```

It also listens for changes to the system preference and updates the theme accordingly.

## Theme Persistence

The selected theme is persisted to `localStorage` so that it will be remembered across page refreshes and sessions:

```javascript
setTheme: (theme: Theme) => {
  localStorage.setItem(storageKey, theme);
  setTheme(theme);
}
```

## Handling Hydration Issues

To prevent hydration mismatches (which occur when the server-rendered HTML doesn't match the client-side rendered HTML), two approaches are used:

1. The `suppressHydrationWarning` attribute on the `html` element
2. Delayed rendering of theme-dependent components until after mount

```tsx
const [mounted, setMounted] = useState(false);

// Avoid hydration mismatch by only rendering after mount
useEffect(() => setMounted(true), []);
if (!mounted) return null;
```

## Custom Styling

The support platform includes additional theme variables for specific UI elements:

- Chart colors for consistent data visualization
- Sidebar-specific colors for differentiated UI sections

These can be used in the same way as the standard theme variables.

## Best Practices

1. **Always use Tailwind classes with dark mode variants** instead of manual CSS when possible
2. **Use the CSS variables** for custom components or styles
3. **Handle hydration carefully** by delaying render of theme-dependent UI until after mount
4. **Provide good contrast** in both light and dark themes for accessibility
5. **Test both themes** to ensure consistent user experience
