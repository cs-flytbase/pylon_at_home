"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Import, MessageCircle } from "lucide-react";
import { NewConversationModal } from "./new-conversation-modal";
import { ImportWhatsAppModal } from "./import-whatsapp-modal";
import { ConversationList } from "./conversation-list";
import { toast } from "sonner";

export function ConversationsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  // Toast can be used directly from the import

  // For demonstration purposes - in a real app, this would come from auth context
  const currentUserId = 'c9f5ed5e-5967-40dd-bde3-9926f9e13210';

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Conversations</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              setIsImportModalOpen(true);
              toast("Opening WhatsApp import", {
                description: "Please select your chat export file"
              });
            }}
            className="flex items-center gap-1"
          >
            <Import className="h-4 w-4" />
            <span className="hidden sm:inline">Import from</span>
            <MessageCircle className="h-4 w-4 text-green-600" />
          </Button>
          <Button 
            onClick={() => {
              setIsCreateModalOpen(true);
              toast("Creating new conversation");
            }}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Start a new conversation</span>
            <span className="inline sm:hidden">New</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        <ConversationList />
      </div>

      <NewConversationModal 
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          // Show success toast when modal is closed as an example
          // In a real app, you'd show this after successful form submission
          toast.success("New conversation created");
        }}
      />
      
      <ImportWhatsAppModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          // In a real app, you'd conditionally show this toast after successful import
          // For demonstration purposes only
          toast.success("WhatsApp conversations imported successfully");
        }}
        userId={currentUserId}
      />
    </div>
  );
}
