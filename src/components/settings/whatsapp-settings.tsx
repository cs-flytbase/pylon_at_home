"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { PeriskopeService } from "@/lib/services/periskope.service";
import { toast } from "sonner";
import { useTeam } from "@/context/team-context";
import { WhatsAppAccountSetup } from "@/components/whatsapp/whatsapp-account-setup";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// Using shadcn/ui alert-dialog component
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WhatsAppAccount {
  id: string;
  account_name: string;
  phone_number: string;
  created_at: string;
}

interface WhatsAppSettingsProps {
  userId: string;
}

export function WhatsAppSettings({ userId }: WhatsAppSettingsProps) {
  const { currentTeam } = useTeam();
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  
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
  
  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;
    
    try {
      const supabase = await import('@/utils/supabase/client').then(mod => mod.createClient());
      
      // Delete the account from the database
      const { error } = await supabase
        .from('whatsapp_accounts')
        .delete()
        .eq('id', accountToDelete);
      
      if (error) throw error;
      
      // Update the UI
      setAccounts(prev => prev.filter(account => account.id !== accountToDelete));
      toast.success('WhatsApp account removed successfully');
    } catch (error) {
      console.error('Failed to delete WhatsApp account:', error);
      toast.error('Failed to remove WhatsApp account');
    } finally {
      setAccountToDelete(null);
    }
  };
  
  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Connected WhatsApp Accounts</h3>
        <Button onClick={() => setShowAddAccountModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </div>
      
      {isLoading ? (
        <div className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Loading your WhatsApp accounts...</p>
        </div>
      ) : accounts.length > 0 ? (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Name</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Connected On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">
                    {account.account_name || 'Unnamed Account'}
                  </TableCell>
                  <TableCell>{account.phone_number}</TableCell>
                  <TableCell>{formatDate(account.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setAccountToDelete(account.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="py-12 text-center border rounded-md">
          <p className="text-sm text-muted-foreground mb-4">
            You haven't connected any WhatsApp accounts yet
          </p>
          <Button onClick={() => setShowAddAccountModal(true)}>
            Connect WhatsApp Account
          </Button>
        </div>
      )}
      
      {/* Add Account Modal */}
      <Dialog open={showAddAccountModal} onOpenChange={setShowAddAccountModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Connect WhatsApp Account</DialogTitle>
            <DialogDescription>
              Connect your WhatsApp Business account through Periskope API
            </DialogDescription>
          </DialogHeader>
          
          <WhatsAppAccountSetup
            userId={userId}
            teamId={currentTeam?.id || ''}
            onComplete={() => {
              setShowAddAccountModal(false);
              loadAccounts();
              toast.success('WhatsApp account connected successfully');
            }}
            onCancel={() => setShowAddAccountModal(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!accountToDelete} onOpenChange={(open: boolean) => !open && setAccountToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove WhatsApp Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the WhatsApp account connection.
              All imported conversations will remain but you won't be able to
              send or receive new messages with this account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteAccount}
            >
              Remove Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
