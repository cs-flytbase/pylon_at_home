"use client";

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WhatsAppSettings } from "@/components/settings/whatsapp-settings";
import { createClient } from "@/utils/supabase/client";

export function SettingsContent() {
  const [userId, setUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getUserId() {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUserId(data.session.user.id);
      }
      setIsLoading(false);
    }

    getUserId();
  }, []);

  return (
    <Tabs defaultValue="whatsapp" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        <TabsTrigger value="telegram">Telegram</TabsTrigger>
        <TabsTrigger value="slack">Slack</TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
      </TabsList>
      
      <TabsContent value="whatsapp" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp Integration</CardTitle>
            <CardDescription>
              Connect your WhatsApp Business accounts through Periskope API
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isLoading && userId && <WhatsAppSettings userId={userId} />}
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="telegram" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Telegram Integration</CardTitle>
            <CardDescription>
              Connect your Telegram bots and channels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center text-muted-foreground">
              Telegram integration coming soon
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="slack" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Slack Integration</CardTitle>
            <CardDescription>
              Connect your Slack workspaces and channels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center text-muted-foreground">
              Slack integration coming soon
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="email" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Email Integration</CardTitle>
            <CardDescription>
              Connect your email accounts for communication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center text-muted-foreground">
              Email integration coming soon
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
