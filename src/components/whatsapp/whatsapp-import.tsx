"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useTeam } from '@/context/team-context';
import { PeriskopeService } from '@/lib/services/periskope.service';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Loader2, MessageSquare, RefreshCw } from 'lucide-react';

interface WhatsAppAccount {
  id: string;
  account_name: string;
  phone_number: string;
}

interface WhatsAppChat {
  id: string;
  name: string;
  phone: string;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
}

interface WhatsAppImportProps {
  userId: string;
}

export function WhatsAppImport({ userId }: WhatsAppImportProps) {
  const { currentTeam } = useTeam();
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [availableChats, setAvailableChats] = useState<WhatsAppChat[]>([]);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  
  const periskopeService = new PeriskopeService();
  
  useEffect(() => {
    loadAccounts();
  }, []);
  
  async function loadAccounts() {
    if (!userId) return;
    
    setIsLoadingAccounts(true);
    try {
      const userAccounts = await periskopeService.getUserWhatsAppAccounts(userId);
      setAccounts(userAccounts);
      
      // Select the first account by default if available
      if (userAccounts.length > 0 && !selectedAccount) {
        setSelectedAccount(userAccounts[0].id);
      }
    } catch (error) {
      console.error('Failed to load WhatsApp accounts:', error);
      toast.error('Failed to load your WhatsApp accounts');
    } finally {
      setIsLoadingAccounts(false);
    }
  }
  
  async function loadChats() {
    if (!selectedAccount) return;
    
    setIsLoadingChats(true);
    setAvailableChats([]);
    setSelectedChats([]);
    
    try {
      const chats = await periskopeService.fetchAvailableChats(selectedAccount);
      setAvailableChats(chats);
    } catch (error) {
      console.error('Failed to load WhatsApp chats:', error);
      toast.error('Failed to load chats from your WhatsApp account');
    } finally {
      setIsLoadingChats(false);
    }
  }
  
  async function importSelectedChats() {
    if (!selectedAccount || selectedChats.length === 0 || !currentTeam) return;
    
    setIsImporting(true);
    setImportProgress(0);
    const totalChats = selectedChats.length;
    let importedCount = 0;
    
    try {
      for (const chatId of selectedChats) {
        try {
          await periskopeService.importChat(
            selectedAccount,
            chatId,
            currentTeam.id,
            userId
          );
          importedCount++;
          setImportProgress((importedCount / totalChats) * 100);
        } catch (error) {
          console.error(`Failed to import chat ${chatId}:`, error);
          // Continue with other chats even if one fails
        }
      }
      
      toast.success(`Successfully imported ${importedCount} of ${totalChats} conversations`);
      setSelectedChats([]);
    } catch (error) {
      console.error('Failed to import chats:', error);
      toast.error('There was an error importing your WhatsApp conversations');
    } finally {
      setIsImporting(false);
    }
  }
  
  function handleCheckChat(chatId: string, checked: boolean) {
    if (checked) {
      setSelectedChats(prev => [...prev, chatId]);
    } else {
      setSelectedChats(prev => prev.filter(id => id !== chatId));
    }
  }
  
  function handleSelectAllChats(checked: boolean) {
    if (checked) {
      setSelectedChats(availableChats.map(chat => chat.id));
    } else {
      setSelectedChats([]);
    }
  }
  
  // Format the date/time for display
  function formatDate(dateString?: string) {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  }

  // Check if we have any accounts
  const hasAccounts = accounts.length > 0;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Import WhatsApp Conversations</CardTitle>
        <CardDescription>
          Import conversations from your connected WhatsApp Business accounts
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {!hasAccounts ? (
          <div className="py-8 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-1">No WhatsApp Accounts</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You need to connect a WhatsApp account before you can import conversations
            </p>
            <Button variant="outline" disabled={isLoadingAccounts} onClick={loadAccounts}>
              {isLoadingAccounts ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                'Refresh Accounts'
              )}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-4">
              <Select 
                value={selectedAccount} 
                onValueChange={(value) => {
                  setSelectedAccount(value);
                  setAvailableChats([]);
                  setSelectedChats([]);
                }}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select a WhatsApp account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_name || account.phone_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                onClick={loadChats} 
                disabled={!selectedAccount || isLoadingChats}
              >
                {isLoadingChats ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading Chats...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Load Chats
                  </>
                )}
              </Button>
            </div>
            
            {availableChats.length > 0 ? (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox 
                            checked={selectedChats.length === availableChats.length}
                            onCheckedChange={handleSelectAllChats}
                          />
                        </TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Last Message</TableHead>
                        <TableHead className="text-right">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableChats.map((chat) => (
                        <TableRow key={chat.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedChats.includes(chat.id)}
                              onCheckedChange={(checked) => handleCheckChat(chat.id, !!checked)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {chat.name || chat.phone}
                            {chat.unread_count ? (
                              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                                {chat.unread_count}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {chat.last_message || 'No messages'}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {formatDate(chat.last_message_time)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {isImporting && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Importing {selectedChats.length} conversations...
                    </p>
                    <Progress value={importProgress} className="h-2" />
                  </div>
                )}
              </>
            ) : isLoadingChats ? (
              <div className="py-12 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Loading conversations...</p>
              </div>
            ) : (
              <div className="py-8 text-center border rounded-md">
                <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click "Load Chats" to fetch conversations from your WhatsApp account
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
      
      <CardFooter>
        <Button
          onClick={importSelectedChats}
          disabled={selectedChats.length === 0 || isImporting || !currentTeam}
          className="ml-auto"
        >
          {isImporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            `Import ${selectedChats.length} Conversation${selectedChats.length !== 1 ? 's' : ''}`
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
