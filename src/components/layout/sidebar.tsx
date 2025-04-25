"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, TicketIcon, UserRound, Settings, Inbox, BarChart3 } from "lucide-react";

type SidebarNavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
};

const items: SidebarNavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    title: "Tickets",
    href: "/tickets",
    icon: <TicketIcon className="w-5 h-5" />,
  },
  {
    title: "Inbox",
    href: "/inbox",
    icon: <Inbox className="w-5 h-5" />,
  },
  {
    title: "Customers",
    href: "/customers",
    icon: <UserRound className="w-5 h-5" />,
  },
  {
    title: "Reports",
    href: "/reports",
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: <Settings className="w-5 h-5" />,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn("pb-12 border-r h-screen", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="flex items-center mb-8 px-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 mr-2 text-primary"
            >
              <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
            </svg>
            <h2 className="font-semibold text-lg">Pylon</h2>
          </div>
          <div className="space-y-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center py-2 px-3 text-sm font-medium rounded-md",
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                )}
              >
                {item.icon}
                <span className="ml-3">{item.title}</span>
                {item.title === "Inbox" && (
                  <span className="ml-auto bg-primary text-xs font-medium text-primary-foreground rounded-full px-2 py-0.5">5</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
