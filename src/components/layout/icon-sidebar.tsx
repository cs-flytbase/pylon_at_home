"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, TicketIcon, UserRound, Settings, Inbox, BarChart3, MessageSquare, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SidebarNavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
  label?: string;
};

const items: SidebarNavItem[] = [
  {
    title: "Help Desk",
    href: "/dashboard",
    icon: <HelpCircle className="w-5 h-5" />,
  },
  {
    title: "Inbox",
    href: "/inbox",
    icon: <Inbox className="w-5 h-5" />,
    label: "5",
  },
  {
    title: "Conversations",
    href: "/conversations",
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    title: "Tickets",
    href: "/tickets",
    icon: <TicketIcon className="w-5 h-5" />,
  },
  {
    title: "Customers",
    href: "/customers",
    icon: <UserRound className="w-5 h-5" />,
  },
  {
    title: "WhatsApp",
    href: "/whatsapp",
    icon: <MessageSquare className="w-5 h-5" />,
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

export function IconSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full w-16 bg-background border-r">
      {/* Logo */}
      <div className="flex justify-center py-4">
        <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-lg">P</span>
        </div>
      </div>
      
      {/* Divider */}
      <div className="h-px bg-border mx-3 my-2" />
      
      {/* Nav Items */}
      <TooltipProvider delayDuration={300}>
        <div className="flex flex-col items-center gap-1 py-2">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-md relative",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    )}
                  >
                    {item.icon}
                    {item.label && (
                      <span className="absolute top-0 right-0 -mt-1 -mr-1 bg-destructive text-destructive-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {item.label}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
      
      {/* Teams Section - You can expand this for the team selector */}
      <div className="mt-auto mb-4 flex flex-col items-center gap-1">
        <div className="h-px bg-border mx-3 my-2 w-full" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground hover:bg-accent/80 transition-colors">
              <span className="text-sm font-medium">SE</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Support Engineering Team
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
