"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppAccounts } from '@/components/whatsapp/whatsapp-accounts';
import { WhatsAppImport } from '@/components/whatsapp/whatsapp-import';
import { useUser } from '@/hooks/auth';
import { PageTitle } from '@/components/ui/page-title';
import { MessageSquare, UserPlus } from 'lucide-react';

export default function WhatsAppPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<string>('accounts');
  
  if (!user) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageTitle 
        title="WhatsApp Integration"
        description="Connect and import WhatsApp conversations for your team"
        icon={<MessageSquare className="h-6 w-6" />}
      />
      
      <Tabs defaultValue="accounts" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Import
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="accounts" className="space-y-4">
            <WhatsAppAccounts userId={user.id} />
          </TabsContent>
          
          <TabsContent value="import" className="space-y-4">
            <WhatsAppImport userId={user.id} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
