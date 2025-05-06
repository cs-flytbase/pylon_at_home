"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PeriskopeService } from '@/lib/services/periskope.service';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const formSchema = z.object({
  phone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^\+?[0-9]+$/, 'Phone number should contain only digits and optionally a leading +'),
  apiKey: z.string()
    .min(16, 'API key must be at least 16 characters long'),
  accountName: z.string().optional(),
});

interface WhatsAppAccountSetupProps {
  userId: string;
  teamId: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

export function WhatsAppAccountSetup({ userId, teamId, onComplete, onCancel }: WhatsAppAccountSetupProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const periskopeService = new PeriskopeService();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: '',
      apiKey: '',
      accountName: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    try {
      await periskopeService.addWhatsAppAccount(
        userId,
        values.phone,
        values.apiKey,
        values.accountName || ''
      );
      
      toast.success('WhatsApp account connected successfully');
      form.reset();
      onComplete?.();
    } catch (error) {
      console.error('Failed to connect WhatsApp account:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect WhatsApp account');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect WhatsApp Account</CardTitle>
        <CardDescription>
          Connect your WhatsApp Business account to import conversations
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need a Periskope API key to connect your WhatsApp account. Visit the
            <a 
              href="https://periskope.com/signup" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-4 mx-1"
            >
              Periskope website
            </a>
            to create an account and get your API key.
          </AlertDescription>
        </Alert>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1234567890" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter your WhatsApp Business phone number with country code
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Periskope API Key</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Your Periskope API key" {...field} />
                  </FormControl>
                  <FormDescription>
                    The API key from your Periskope account
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="accountName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Main Business Account" {...field} />
                  </FormControl>
                  <FormDescription>
                    A friendly name to identify this WhatsApp account
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
          {isSubmitting ? 'Connecting...' : 'Connect Account'}
        </Button>
      </CardFooter>
    </Card>
  );
}
