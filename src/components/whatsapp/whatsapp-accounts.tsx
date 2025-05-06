"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PeriskopeService } from '@/lib/services/periskope.service';
import { WhatsAppAccountSetup } from './whatsapp-account-setup';
import { useTeam } from '@/context/team-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Loader2, Phone, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface WhatsAppAccount {
  id: string;
  account_name: string;
  phone_number: string;
  created_at: string;
}

interface WhatsAppAccountsProps {
  userId: string;
}

export function WhatsAppAccounts({ userId }: WhatsAppAccountsProps) {
  const { currentTeam } = useTeam();
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const periskopeService = new PeriskopeService();

  useEffect(() => {
    loadAccounts();
  }, [userId]);

  async function loadAccounts() {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const userAccounts = await periskopeService.getUserWhatsAppAccounts(userId);
      setAccounts(userAccounts);
    } catch (error) {
      console.error('Failed to load WhatsApp accounts:', error);
      toast.error('Failed to load your WhatsApp accounts');
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteAccount(accountId: string) {
    setIsDeletingId(accountId);
    try {
      const supabase = createClient();
      // First check if there are any conversations associated with this account
      const { count, error: countError } = await supabase
        .from('whatsapp_conversations')
        .select('*', { count: 'exact' })
        .eq('account_id', accountId);
      
      if (countError) throw countError;
      
      if (count && count > 0) {
        toast.error(`Cannot delete account with ${count} conversations. Archive conversations first.`);
        return;
      }
      
      // Delete the account
      const { error } = await supabase
        .from('whatsapp_accounts')
        .delete()
        .eq('id', accountId);
      
      if (error) throw error;
      
      toast.success('WhatsApp account deleted successfully');
      setAccounts(prev => prev.filter(acc => acc.id !== accountId));
    } catch (error) {
      console.error('Failed to delete WhatsApp account:', error);
      toast.error('Failed to delete WhatsApp account');
    } finally {
      setIsDeletingId(null);
    }
  }

  // Format date for display
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>WhatsApp Accounts</CardTitle>
            <CardDescription>
              Manage your connected WhatsApp Business accounts
            </CardDescription>
          </div>
          <Dialog open={isAddingAccount} onOpenChange={setIsAddingAccount}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add WhatsApp Account</DialogTitle>
                <DialogDescription>
                  Connect a new WhatsApp Business account
                </DialogDescription>
              </DialogHeader>
              <WhatsAppAccountSetup 
                userId={userId} 
                teamId={currentTeam?.id || ''}
                onComplete={() => {
                  setIsAddingAccount(false);
                  loadAccounts();
                }}
                onCancel={() => setIsAddingAccount(false)}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : accounts.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No WhatsApp accounts</AlertTitle>
              <AlertDescription>
                You don't have any WhatsApp accounts connected yet. Add an account to start importing conversations.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Added On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        {account.account_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {account.phone_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(account.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "text-destructive hover:text-destructive hover:bg-destructive/10",
                            isDeletingId === account.id && "pointer-events-none opacity-50"
                          )}
                          onClick={() => deleteAccount(account.id)}
                          disabled={isDeletingId === account.id}
                        >
                          {isDeletingId === account.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t px-6 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/whatsapp/import')}
            className="ml-auto"
          >
            Go to WhatsApp Import
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Helper to create Supabase client (needed for account deletion)
import { createClient } from '@/utils/supabase/client';
