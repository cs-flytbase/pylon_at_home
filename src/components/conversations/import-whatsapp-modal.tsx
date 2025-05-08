"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MessageCircle } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

// Type definitions for our WhatsApp chat data
interface WhatsAppChat {
  id: string;
  title: string;
  phone?: string;
  isGroup: boolean;
  lastMessageTimestamp?: number;
  unreadCount?: number;
}

interface ImportWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function ImportWhatsAppModal({ isOpen, onClose, userId }: ImportWhatsAppModalProps) {
  // Local state for inputs and API results
  const [phoneNumber, setPhoneNumber] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string>('');
  const [importStatus, setImportStatus] = useState<{
    total: number;
    imported: number;
    failed: number;
  } | null>(null);

  // Function to fetch WhatsApp chats
  const fetchChats = async () => {
    if (!phoneNumber || !apiKey) {
      toast.error('Please enter your phone number and API key');
      return;
    }

    setIsLoadingChats(true);
    setChats([]);

    try {
      const response = await fetch('/api/whatsapp/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, apiKey }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch chats');
      }

      const data = await response.json();
      if (data.success && data.chats?.length > 0) {
        setChats(data.chats);
        toast.success(`Found ${data.chats.length} chats`);
      } else {
        toast.info('No chats found. Please check your credentials.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error fetching chats');
      console.error('Error fetching chats:', error);
    } finally {
      setIsLoadingChats(false);
    }
  };

  // Function to import selected chat
  const importChat = async () => {
    if (!selectedChat) {
      toast.error('Please select a chat to import');
      return;
    }

    setIsImporting(true);
    setImportStatus(null);

    try {
      const response = await fetch('/api/import/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: selectedChat,
          phoneNumber,
          userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import messages');
      }

      const data = await response.json();
      setImportStatus({
        total: data.total_messages || 0,
        imported: data.imported_messages || 0,
        failed: data.failed_messages || 0,
      });

      // Show success message and close dialog after delay
      toast.success(`Successfully imported ${data.imported_messages} messages`);
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error importing chat');
      console.error('Error importing chat:', error);
    } finally {
      setIsImporting(false);
    }
  };

  // Reset form state
  const resetForm = () => {
    setSelectedChat('');
    setImportStatus(null);
    setChats([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        resetForm();
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import WhatsApp Chat</DialogTitle>
          <DialogDescription>
            Import messages from WhatsApp into your conversations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Setup Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1234567890 (with country code)"
                    className="col-span-3"
                    disabled={isLoadingChats || isImporting}
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="apiKey" className="text-right">
                    API Key
                  </Label>
                  <Input
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Periskope API Key"
                    className="col-span-3"
                    type="password"
                    disabled={isLoadingChats || isImporting}
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={fetchChats}
                    disabled={isLoadingChats || isImporting || !phoneNumber || !apiKey}
                  >
                    {isLoadingChats ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Fetch Chats'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Chat Selection Section */}
          {chats.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="chat" className="text-right">
                      Select Chat
                    </Label>
                    <div className="col-span-3">
                      <Select
                        value={selectedChat}
                        onValueChange={setSelectedChat}
                        disabled={isImporting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a chat to import" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Direct Chats</SelectLabel>
                            {chats
                              .filter(chat => !chat.isGroup)
                              .map(chat => (
                                <SelectItem key={chat.id} value={chat.id}>
                                  {chat.title || chat.phone || chat.id}
                                </SelectItem>
                              ))}
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>Group Chats</SelectLabel>
                            {chats
                              .filter(chat => chat.isGroup)
                              .map(chat => (
                                <SelectItem key={chat.id} value={chat.id}>
                                  {chat.title || chat.id}
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Import Status Section */}
          {importStatus && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    <span className="font-semibold">Import Results:</span>
                  </div>
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <p>Total messages: {importStatus.total}</p>
                    <p className="text-green-600">Imported: {importStatus.imported}</p>
                    {importStatus.failed > 0 && (
                      <p className="text-destructive">Failed: {importStatus.failed}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={importChat}
            disabled={isImporting || !selectedChat}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              'Import Chat'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
