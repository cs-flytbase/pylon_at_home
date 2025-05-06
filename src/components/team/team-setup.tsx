"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { TeamService } from '@/lib/services/team.service';

const createTeamSchema = z.object({
  teamName: z.string().min(2, 'Team name must be at least 2 characters').max(50, 'Team name cannot exceed 50 characters'),
});

const joinTeamSchema = z.object({
  inviteToken: z.string().min(10, 'Invalid invitation token'),
});

interface TeamSetupProps {
  userId: string;
  onComplete?: () => void;
}

export function TeamSetup({ userId, onComplete }: TeamSetupProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const teamService = new TeamService();
  
  const createForm = useForm<z.infer<typeof createTeamSchema>>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      teamName: '',
    },
  });
  
  const joinForm = useForm<z.infer<typeof joinTeamSchema>>({
    resolver: zodResolver(joinTeamSchema),
    defaultValues: {
      inviteToken: '',
    },
  });

  async function handleCreateTeam(values: z.infer<typeof createTeamSchema>) {
    setIsSubmitting(true);
    
    try {
      await teamService.createTeam(userId, values.teamName);
      
      toast.success(`Team "${values.teamName}" created successfully`);
      onComplete?.();
      router.push('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create team');
    } finally {
      setIsSubmitting(false);
    }
  }
  
  async function handleJoinTeam(values: z.infer<typeof joinTeamSchema>) {
    setIsSubmitting(true);
    
    try {
      await teamService.joinTeamWithToken(userId, values.inviteToken);
      
      toast.success('You have joined the team successfully');
      onComplete?.();
      router.push('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join team with provided token');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Team Setup</CardTitle>
        <CardDescription>Create a new team or join an existing one</CardDescription>
      </CardHeader>
      
      <Tabs defaultValue="create" value={activeTab} onValueChange={(value) => setActiveTab(value as 'create' | 'join')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create a Team</TabsTrigger>
          <TabsTrigger value="join">Join a Team</TabsTrigger>
        </TabsList>
        
        <CardContent className="pt-6">
          <TabsContent value="create">
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateTeam)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="teamName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Support Engineering Team" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creating Team..." : "Create Team"}
                </Button>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="join">
            <Form {...joinForm}>
              <form onSubmit={joinForm.handleSubmit(handleJoinTeam)} className="space-y-4">
                <FormField
                  control={joinForm.control}
                  name="inviteToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invitation Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your invitation code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Joining Team..." : "Join Team"}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </CardContent>
      </Tabs>
      
      <CardFooter className="flex justify-center text-sm text-muted-foreground">
        {activeTab === 'create' ? (
          <>
            Already have an invitation? 
            <Button variant="link" className="px-2 h-auto" onClick={() => setActiveTab('join')}>
              Join an existing team
            </Button>
          </>
        ) : (
          <>
            Want to create your own team?
            <Button variant="link" className="px-2 h-auto" onClick={() => setActiveTab('create')}>
              Create a new team
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
