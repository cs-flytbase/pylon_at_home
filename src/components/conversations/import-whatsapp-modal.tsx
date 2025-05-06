"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, MessageCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

interface ImportWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function ImportWhatsAppModal({ isOpen, onClose, userId }: ImportWhatsAppModalProps) {
  const [days, setDays] = useState(7);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    try {
      setImporting(true);
      
      // Check if WhatsApp API credentials are configured
      if (!process.env.NEXT_PUBLIC_WHATSAPP_ENABLED) {
        throw new Error('WhatsApp API integration is not configured.');
      }
      
      // Call import API
      const response = await fetch('/api/conversations/import/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          days,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import WhatsApp conversations');
      }
      
      toast({
        title: 'Success',
        description: 'WhatsApp conversations imported successfully',
      });
      
      onClose();
    } catch (error) {
      console.error('Error importing WhatsApp conversations:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import WhatsApp conversations',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import WhatsApp Conversations</DialogTitle>
          <DialogDescription>
            Import your recent WhatsApp conversations to manage them in this platform.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="days">Import conversations from the last</Label>
            <div className="flex items-center gap-2">
              <Input
                id="days"
                type="number"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value) || 7)}
                min={1}
                max={30}
                className="w-20"
              />
              <span>days</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              This will import conversations and messages from your connected WhatsApp Business account.
            </p>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={importing}>
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <MessageCircle className="mr-2 h-4 w-4" />
                Import Conversations
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
