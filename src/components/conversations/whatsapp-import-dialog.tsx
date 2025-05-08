"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

type WhatsAppChat = {
  id: string;
  title: string;
  phone?: string;
  isGroup: boolean;
};

type ImportDialogProps = {
  onSuccess?: (conversationId: string) => void;
  apiKey?: string;
  phoneNumber?: string;
  userId?: string;
};

export function WhatsAppImportDialog({
  onSuccess,
  apiKey,
  phoneNumber,
  userId,
}: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string>("");
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [importStatus, setImportStatus] = useState<{
    total: number;
    imported: number;
    failed: number;
  } | null>(null);

  // Local state for inputs if not provided as props
  const [localApiKey, setLocalApiKey] = useState(apiKey || "");
  const [localPhoneNumber, setLocalPhoneNumber] = useState(phoneNumber || "");

  const fetchChats = async () => {
    if (!localApiKey || !localPhoneNumber) {
      toast.error("API key and phone number are required");
      return;
    }

    setLoadingChats(true);
    try {
      const response = await fetch("/api/whatsapp/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: localApiKey,
          phoneNumber: localPhoneNumber,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch chats");
      }

      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch chats");
    } finally {
      setLoadingChats(false);
    }
  };

  const importMessages = async () => {
    if (!selectedChat) {
      toast.error("Please select a chat to import");
      return;
    }

    setIsLoading(true);
    setImportStatus(null);

    try {
      const response = await fetch("/api/import/whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId: selectedChat,
          phoneNumber: localPhoneNumber,
          userId: userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to import messages");
      }

      const data = await response.json();
      
      setImportStatus({
        total: data.total_messages,
        imported: data.imported_messages,
        failed: data.failed_messages,
      });

      toast.success(`Successfully imported ${data.imported_messages} messages`);
      
      // Call onSuccess callback with the conversation ID
      if (onSuccess && data.conversation_id) {
        onSuccess(data.conversation_id);
        setTimeout(() => setOpen(false), 2000);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import messages");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Import WhatsApp Chat</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import WhatsApp Chat</DialogTitle>
          <DialogDescription>
            Select a WhatsApp chat to import into your conversations.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {!phoneNumber && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input
                id="phone"
                value={localPhoneNumber}
                onChange={(e) => setLocalPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                className="col-span-3"
                disabled={isLoading || loadingChats}
              />
            </div>
          )}

          {!apiKey && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="apiKey" className="text-right">
                API Key
              </Label>
              <Input
                id="apiKey"
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                type="password"
                className="col-span-3"
                disabled={isLoading || loadingChats}
              />
            </div>
          )}

          {chats.length === 0 ? (
            <div className="flex justify-end">
              <Button
                onClick={fetchChats}
                disabled={isLoading || loadingChats || !localApiKey || !localPhoneNumber}
              >
                {loadingChats ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Fetch Chats"
                )}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="chat" className="text-right">
                Chat
              </Label>
              <Select
                value={selectedChat}
                onValueChange={setSelectedChat}
                disabled={isLoading}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a chat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Personal Chats</SelectLabel>
                    {chats
                      .filter((chat) => !chat.isGroup)
                      .map((chat) => (
                        <SelectItem key={chat.id} value={chat.id}>
                          {chat.title || chat.phone || chat.id}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Group Chats</SelectLabel>
                    {chats
                      .filter((chat) => chat.isGroup)
                      .map((chat) => (
                        <SelectItem key={chat.id} value={chat.id}>
                          {chat.title || chat.id}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          {importStatus && (
            <div className="mt-2 rounded-md bg-muted p-3 text-sm">
              <p>Total messages: {importStatus.total}</p>
              <p>Imported: {importStatus.imported}</p>
              {importStatus.failed > 0 && (
                <p className="text-destructive">Failed: {importStatus.failed}</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          {chats.length > 0 && (
            <Button
              type="submit"
              onClick={importMessages}
              disabled={isLoading || !selectedChat}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
