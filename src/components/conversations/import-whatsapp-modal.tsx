"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTeam } from "@/context/team-context";
import { PeriskopeService } from "@/lib/services/periskope.service";
import { WhatsAppAccountSetup } from "@/components/whatsapp/whatsapp-account-setup";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Loader2, MessageSquare, RefreshCw, Plus } from 'lucide-react';

// Interfaces
interface WhatsAppAccount {
  id: string;
  account_name: string;
  phone_number: string;
  periskope_api_key: string;
}

interface WhatsAppChat {
  chat_id: string;
  chat_name: string;
  chat_type: string;
  chat_image: string | null;
  member_count: number;
  latest_message: any;
  invite_link: string | null;
  updated_at: string;
}

interface ImportWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function ImportWhatsAppModal({ isOpen, onClose, userId }: ImportWhatsAppModalProps) {
  const { currentTeam } = useTeam();
  const [activeTab, setActiveTab] = useState<string>("accounts");
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [availableChats, setAvailableChats] = useState<WhatsAppChat[]>([]);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  
  const periskopeService = new PeriskopeService();
  
  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);
  
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
      const response = await periskopeService.fetchGroupChats(selectedAccount);
      
      if (response && response.chats && Array.isArray(response.chats)) {
        setAvailableChats(response.chats);
      } else {
        toast.error('Invalid response format from WhatsApp API');
      }
    } catch (error) {
      console.error('Failed to load WhatsApp chats:', error);
      toast.error('Failed to load chats from your WhatsApp account');
    } finally {
      setIsLoadingChats(false);
    }
  }
  
  async function importSelectedChats() {
    if (!selectedAccount || selectedChats.length === 0 || !currentTeam) {
      toast.error('Please select at least one chat to import');
      return;
    }
    
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
      
      // Close the modal after successful import
      if (importedCount > 0) {
        onClose();
      }
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
      setSelectedChats(availableChats.map(chat => chat.chat_id));
    } else {
      setSelectedChats([]);
    }
  }
  
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

  function handleAccountSetupComplete() {
    loadAccounts();
    setActiveTab("import");
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>WhatsApp Integration</DialogTitle>
          <DialogDescription>
            Connect your WhatsApp Business accounts and import conversations
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="accounts">WhatsApp Accounts</TabsTrigger>
            <TabsTrigger value="import" disabled={accounts.length === 0}>Import Chats</TabsTrigger>
          </TabsList>
          
          <TabsContent value="accounts" className="mt-4">
            {accounts.length > 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Your WhatsApp Accounts</h3>
                      <Button onClick={() => setActiveTab("new-account")} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Account
                      </Button>
                    </div>
                    
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account Name</TableHead>
                            <TableHead>Phone Number</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {accounts.map((account) => (
                            <TableRow key={account.id}>
                              <TableCell className="font-medium">{account.account_name || 'Unnamed Account'}</TableCell>
                              <TableCell>{account.phone_number}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAccount(account.id);
                                    setActiveTab("import");
                                  }}
                                >
                                  Import Chats
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 pb-6">
                  <div className="py-8 text-center">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-semibold mb-1">No WhatsApp Accounts Connected</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      You need to connect a WhatsApp account before you can import conversations
                    </p>
                    <Button onClick={() => setActiveTab("new-account")}>
                      Connect WhatsApp Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="new-account" className="mt-4">
            <WhatsAppAccountSetup 
              userId={userId} 
              teamId={currentTeam?.id || ''}
              onComplete={handleAccountSetupComplete}
              onCancel={() => setActiveTab("accounts")}
            />
          </TabsContent>
          
          <TabsContent value="import" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
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
                                  checked={selectedChats.length === availableChats.length && availableChats.length > 0}
                                  onCheckedChange={handleSelectAllChats}
                                />
                              </TableHead>
                              <TableHead>Group Name</TableHead>
                              <TableHead>Members</TableHead>
                              <TableHead className="text-right">Last Updated</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {availableChats.map((chat) => (
                              <TableRow key={chat.chat_id}>
                                <TableCell>
                                  <Checkbox 
                                    checked={selectedChats.includes(chat.chat_id)}
                                    onCheckedChange={(checked) => handleCheckChat(chat.chat_id, !!checked)}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {chat.chat_name || 'Unnamed Group'}
                                </TableCell>
                                <TableCell>{chat.member_count} members</TableCell>
                                <TableCell className="text-right text-sm text-muted-foreground">
                                  {formatDate(chat.updated_at)}
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
                </div>
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
                    `Import ${selectedChats.length} ${selectedChats.length === 1 ? 'Conversation' : 'Conversations'}`
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
