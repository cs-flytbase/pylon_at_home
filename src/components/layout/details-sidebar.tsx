"use client";

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTeam } from '@/context/team-context';
import { X, User, Users, MessageSquare, Settings, Clipboard, ChevronRight } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Search, PlusCircle, Bell, ChevronDown } from "lucide-react";

interface DetailsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: string;
}

interface SidebarItemProps {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
}

function SidebarItem({ label, icon, href, onClick, isActive }: SidebarItemProps) {
  const content = (
    <div className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
      isActive ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
    }`}>
      {icon && <div className="w-4 h-4 flex items-center justify-center">{icon}</div>}
      <span className="flex-1">{label}</span>
      {href && <ChevronRight className="h-4 w-4 opacity-50" />}
    </div>
  );
  
  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  
  return <div onClick={onClick}>{content}</div>;
}

export default function DetailsSidebar({ isOpen, onClose, activeSection }: DetailsSidebarProps) {
  const router = useRouter();
  const { currentTeam } = useTeam();
  const pathname = usePathname();
  
  // Determine which section to show based on the current path
  const section = pathname.split('/')[1] || 'dashboard';
  
  return (
    <div 
      className={cn(
        "fixed inset-y-0 left-16 z-40 bg-background border-r transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "w-64" // 16rem (64px) width
      )}
      aria-hidden={!isOpen}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">
            {activeSection === 'dashboard' && 'Dashboard'}
            {activeSection === 'conversations' && 'Conversations'}
            {activeSection === 'tickets' && 'Tickets'}
            {activeSection === 'customers' && 'Customers'}
            {activeSection === 'reports' && 'Reports'}
            {activeSection === 'settings' && 'Settings'}
            {activeSection === 'teams' && 'Teams'}
            {activeSection === 'whatsapp' && 'WhatsApp'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search..." 
              className="pl-8"
            />
          </div>
        </div>
        
        {/* Content - Changes based on the active section */}
        <ScrollArea className="flex-1">
          {activeSection === 'dashboard' && (
            <div>
              <h3 className="font-medium mb-2">Dashboard Options</h3>
              <ul className="space-y-2">
                <li><SidebarItem label="Overview" /></li>
                <li><SidebarItem label="Performance" /></li>
                <li><SidebarItem label="Activity" /></li>
              </ul>
            </div>
          )}
          
          {activeSection === 'conversations' && (
            <div>
              <h3 className="font-medium mb-2">Conversation Channels</h3>
              <ul className="space-y-2">
                <li><SidebarItem label="All Conversations" /></li>
                <li><SidebarItem label="Unassigned" /></li>
                <li><SidebarItem label="Assigned to me" /></li>
                <li><SidebarItem label="Archived" /></li>
                <li><SidebarItem label="WhatsApp" icon={<MessageSquare className="h-4 w-4" />} href="/whatsapp" /></li>
              </ul>
            </div>
          )}
          
          {activeSection === 'tickets' && (
            <div>
              <h3 className="font-medium mb-2">Ticket Views</h3>
              <ul className="space-y-2">
                <li><SidebarItem label="All Tickets" /></li>
                <li><SidebarItem label="Open Issues" /></li>
                <li><SidebarItem label="Backlog" /></li>
                <li><SidebarItem label="Completed" /></li>
              </ul>
            </div>
          )}
          
          {activeSection === 'customers' && (
            <div>
              <h3 className="font-medium mb-2">Customer Management</h3>
              <ul className="space-y-2">
                <li><SidebarItem label="All Customers" /></li>
                <li><SidebarItem label="Active" /></li>
                <li><SidebarItem label="Inactive" /></li>
                <li><SidebarItem label="Import/Export" /></li>
              </ul>
            </div>
          )}
          
          {activeSection === 'reports' && (
            <div>
              <h3 className="font-medium mb-2">Report Types</h3>
              <ul className="space-y-2">
                <li><SidebarItem label="Performance Metrics" /></li>
                <li><SidebarItem label="Customer Satisfaction" /></li>
                <li><SidebarItem label="Team Analytics" /></li>
                <li><SidebarItem label="Custom Reports" /></li>
              </ul>
            </div>
          )}
          
          {activeSection === 'settings' && (
            <div>
              <h3 className="font-medium mb-2">Settings</h3>
              <ul className="space-y-2">
                <li><SidebarItem label="General" /></li>
                <li><SidebarItem label="Profile" icon={<User className="h-4 w-4" />} /></li>
                <li><SidebarItem label="Team Members" icon={<Users className="h-4 w-4" />} href="/settings/team" /></li>
                <li><SidebarItem label="Notifications" /></li>
                <li><SidebarItem label="API & Integrations" /></li>
              </ul>
            </div>
          )}
          
          {activeSection === 'teams' && (
            <div>
              <h3 className="font-medium mb-2">Team Management</h3>
              <ul className="space-y-2">
                <li><SidebarItem label={`${currentTeam?.name || 'Your Team'}`} icon={<Users className="h-4 w-4" />} /></li>
                <li><SidebarItem label="Members" href="/teams/members" /></li>
                <li><SidebarItem label="Invite Members" href="/teams/invite" /></li>
                <li><SidebarItem label="Team Settings" href="/teams/settings" /></li>
              </ul>
            </div>
          )}
          
          {activeSection === 'whatsapp' && (
            <div>
              <h3 className="font-medium mb-2">WhatsApp Integration</h3>
              <ul className="space-y-2">
                <li><SidebarItem label="Accounts" href="/whatsapp?tab=accounts" /></li>
                <li><SidebarItem label="Import Conversations" href="/whatsapp?tab=import" /></li>
                <li><SidebarItem label="Settings" href="/whatsapp/settings" /></li>
              </ul>
            </div>
          )}
        </ScrollArea>
        
        {/* Footer */}
        <div className="p-4 border-t">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Support Team</span>
              <span className="text-xs text-muted-foreground">5 members</span>
            </div>
            <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

function InboxSidebarContent() {
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        <Button variant="ghost" className="w-full justify-start gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500"></span>
          All messages
          <Badge className="ml-auto" variant="secondary">128</Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500"></span>
          Assigned to me
          <Badge className="ml-auto" variant="secondary">28</Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2">
          <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
          Unassigned
          <Badge className="ml-auto" variant="secondary">52</Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500"></span>
          Urgent
          <Badge className="ml-auto" variant="secondary">14</Badge>
        </Button>
      </div>
      
      <Separator />
      
      <div className="space-y-1">
        <h3 className="text-sm font-medium px-2 py-1.5">Channels</h3>
        <Button variant="ghost" className="w-full justify-start gap-2">
          WhatsApp
          <Badge className="ml-auto" variant="secondary">64</Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2">
          Email
          <Badge className="ml-auto" variant="secondary">32</Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2">
          Telegram
          <Badge className="ml-auto" variant="secondary">16</Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2">
          Slack
          <Badge className="ml-auto" variant="secondary">8</Badge>
        </Button>
      </div>
    </div>
  )
}

function ConversationsSidebarContent() {
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        <Button variant="ghost" className="w-full justify-start gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500"></span>
          All conversations
          <Badge className="ml-auto" variant="secondary">156</Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500"></span>
          Resolved
          <Badge className="ml-auto" variant="secondary">84</Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2">
          <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
          Active
          <Badge className="ml-auto" variant="secondary">48</Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500"></span>
          Needs attention
          <Badge className="ml-auto" variant="secondary">24</Badge>
        </Button>
      </div>
      
      <Separator />
      
      <div className="space-y-1">
        <div className="flex justify-between items-center px-2 py-1.5">
          <h3 className="text-sm font-medium">Teams</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="ghost" className="w-full justify-start">
          Support Engineering
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          Sales
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          Product
        </Button>
      </div>
      
      <Separator />
      
      <Link href="/conversations/new" passHref>
        <Button className="w-full gap-2">
          <PlusCircle className="h-4 w-4" />
          New conversation
        </Button>
      </Link>
    </div>
  )
}

function TicketsSidebarContent() {
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        <Button variant="ghost" className="w-full justify-start gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500"></span>
          All tickets
          <Badge className="ml-auto" variant="secondary">124</Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500"></span>
          Open
          <Badge className="ml-auto" variant="secondary">68</Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2">
          <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
          In progress
          <Badge className="ml-auto" variant="secondary">32</Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500"></span>
          Blocked
          <Badge className="ml-auto" variant="secondary">12</Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2">
          <span className="h-2 w-2 rounded-full bg-green-700"></span>
          Resolved
          <Badge className="ml-auto" variant="secondary">42</Badge>
        </Button>
      </div>
      
      <Separator />
      
      <div className="space-y-1">
        <div className="flex justify-between items-center px-2 py-1.5">
          <h3 className="text-sm font-medium">Views</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="ghost" className="w-full justify-start">
          Kanban
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          List
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          Calendar
        </Button>
      </div>
      
      <Separator />
      
      <Link href="/tickets/new" passHref>
        <Button className="w-full gap-2">
          <PlusCircle className="h-4 w-4" />
          New ticket
        </Button>
      </Link>
    </div>
  )
}

function CustomersSidebarContent() {
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        <Button variant="ghost" className="w-full justify-start gap-2">
          All customers
          <Badge className="ml-auto" variant="secondary">1,248</Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2">
          Active
          <Badge className="ml-auto" variant="secondary">865</Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2">
          New
          <Badge className="ml-auto" variant="secondary">124</Badge>
        </Button>
      </div>
      
      <Separator />
      
      <div className="space-y-1">
        <h3 className="text-sm font-medium px-2 py-1.5">Segments</h3>
        <Button variant="ghost" className="w-full justify-start gap-2">
          Enterprise
          <Badge className="ml-auto" variant="secondary">24</Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2">
          SMB
          <Badge className="ml-auto" variant="secondary">156</Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2">
          Startup
          <Badge className="ml-auto" variant="secondary">685</Badge>
        </Button>
      </div>
      
      <Separator />
      
      <Link href="/customers/new" passHref>
        <Button className="w-full gap-2">
          <PlusCircle className="h-4 w-4" />
          Add customer
        </Button>
      </Link>
    </div>
  )
}

function DashboardSidebarContent() {
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        <Button variant="ghost" className="w-full justify-start">
          Overview
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          Analytics
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          Performance
        </Button>
      </div>
      
      <Separator />
      
      <div className="space-y-1">
        <h3 className="text-sm font-medium px-2 py-1.5">Alerts</h3>
        <Button variant="ghost" className="w-full justify-start gap-2">
          <Bell className="h-4 w-4 text-red-500" />
          High priority
          <Badge className="ml-auto" variant="secondary">3</Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2">
          <Bell className="h-4 w-4 text-yellow-500" />
          Medium priority
          <Badge className="ml-auto" variant="secondary">7</Badge>
        </Button>
      </div>
    </div>
  )
}

function ReportsSidebarContent() {
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        <Button variant="ghost" className="w-full justify-start">
          Performance
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          Conversation metrics
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          Response times
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          Team activity
        </Button>
      </div>
      
      <Separator />
      
      <div className="space-y-1">
        <h3 className="text-sm font-medium px-2 py-1.5">Saved reports</h3>
        <Button variant="ghost" className="w-full justify-start">
          Q2 Performance
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          Support SLAs
        </Button>
      </div>
      
      <Separator />
      
      <Button className="w-full gap-2">
        <PlusCircle className="h-4 w-4" />
        Create report
      </Button>
    </div>
  )
}

function SettingsSidebarContent() {
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        <Button variant="ghost" className="w-full justify-start">
          General
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          Team members
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          Notifications
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          API & Integrations
        </Button>
      </div>
      
      <Separator />
      
      <div className="space-y-1">
        <h3 className="text-sm font-medium px-2 py-1.5">Integrations</h3>
        <Button variant="ghost" className="w-full justify-start">
          WhatsApp (Periskope)
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          Telegram
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          Slack
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          Email
        </Button>
      </div>
      
      <Separator />
      
      <div className="space-y-1">
        <h3 className="text-sm font-medium px-2 py-1.5">AI Settings</h3>
        <Button variant="ghost" className="w-full justify-start">
          LLM providers
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          Knowledge base
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          Auto-response rules
        </Button>
      </div>
    </div>
  )
}
