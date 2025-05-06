"use client";

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ConversationsHeader } from '@/components/conversations/conversations-header';
import { ConversationsList } from '@/components/conversations/conversations-list';
import { AnimatePresence } from 'framer-motion';

export default function ConversationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hasOverlay = pathname !== '/conversations';

  return (
    <div className={`container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-4 md:space-y-6 relative ${hasOverlay ? 'conversations-page-has-overlay' : ''}`}>
      <ConversationsHeader />
      
      {/* Render the conversations list */}
      <div className="conversations-list-view p-0 md:p-1 overflow-x-hidden">
        <ConversationsList />
      </div>
      
      {/* Child routes (like conversations/[id]) will be rendered here with animation */}
      <AnimatePresence mode="wait">
        {children}
      </AnimatePresence>
    </div>
  );
}
