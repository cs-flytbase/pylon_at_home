"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { IconSidebar } from "./icon-sidebar";
import DetailsSidebar from "./details-sidebar";
import { ChevronLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [detailsSidebarOpen, setDetailsSidebarOpen] = useState(true);
  const pathname = usePathname();
  
  // Determine active section from pathname
  const getActiveSection = () => {
    // Extract the first part of the path (excluding leading slash)
    const section = pathname.split('/')[1];
    
    // If path is root, return dashboard as the active section
    if (!section) return 'dashboard';
    
    return section;
  };

  // Close mobile sidebar when path changes
  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      setDetailsSidebarOpen(false);
    }
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-background overflow-hidden">
      {/* Icon Sidebar - always visible */}
      <div className="fixed inset-y-0 left-0 z-50 w-16 flex-shrink-0">
        <IconSidebar />
      </div>

      {/* Details Sidebar - collapsible */}
      <DetailsSidebar 
        isOpen={detailsSidebarOpen} 
        onClose={() => setDetailsSidebarOpen(false)} 
        activeSection={getActiveSection()}
      />

      {/* Mobile details sidebar backdrop */}
      {detailsSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setDetailsSidebarOpen(false)}
        />
      )}

      {/* Main content - responsive position based on sidebar state */}
      <div className={cn(
        "fixed transition-all duration-300 ease-in-out right-0 top-0 bottom-0 flex flex-col overflow-hidden",
        detailsSidebarOpen ? "left-80" : "left-16"
      )}>
        {/* Header with toggle button */}
        <header className="flex items-center h-16 px-4 border-b bg-background z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDetailsSidebarOpen(!detailsSidebarOpen)}
            aria-label={detailsSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {detailsSidebarOpen ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
          
          <div className="ml-4 font-semibold">
            {pathname === "/conversations" && "Conversations"}
            {pathname === "/tickets" && "Tickets"}
            {pathname === "/inbox" && "Inbox"}
            {pathname === "/customers" && "Customers"}
            {pathname === "/reports" && "Reports"}
            {pathname === "/settings" && "Settings"}
            {pathname === "/dashboard" && "Dashboard"}
            {pathname === "/" && "Dashboard"}
          </div>
        </header>
        
        {/* Page content with scroll */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
