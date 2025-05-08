"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PeriskopeService } from "@/lib/services/periskope.service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PlatformType = "whatsapp" | "telegram" | "email" | "slack" | "ai";
type ChatType = "solo" | "group";

// Fixed JSX namespace by importing React
interface PlatformOption {
  value: PlatformType;
  label: string;
  icon: React.ReactNode;
  supportsGroupChat?: boolean;
}

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewConversationModal({ isOpen, onClose }: NewConversationModalProps) {
  // Initialize Supabase client
  const supabase = createClientComponentClient();

  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | null>(null);
  const [chatType, setChatType] = useState<ChatType>("solo");
  const [formData, setFormData] = useState({
    phoneNumber: "",     // For WhatsApp solo
    username: "",        // For Telegram solo
    whatsappGroupId: "", // For WhatsApp group
    telegramGroupId: "", // For Telegram group
    message: "",         // Common for all platforms
  });
  
  // WhatsApp integration state
  const [whatsappAccounts, setWhatsappAccounts] = useState<any[]>([]);
  const [selectedWhatsappAccount, setSelectedWhatsappAccount] = useState<string>("");
  const [availableWhatsappChats, setAvailableWhatsappChats] = useState<any[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [whatsappTab, setWhatsappTab] = useState("direct");
  const [selectedWhatsappChat, setSelectedWhatsappChat] = useState<string>("");
  
  // State for AI agents
  const [aiAgents, setAiAgents] = useState<Array<{id: string, name: string, description?: string}>>([]);
  // Using let declaration in state setter pattern to allow reassigning in fallback logic
  const [selectedAiAgent, setSelectedAiAgent] = useState<string>('');
  const [isLoadingAiAgents, setIsLoadingAiAgents] = useState(false);

  const periskopeService = new PeriskopeService();
  
  // Load WhatsApp accounts when the modal is opened
  useEffect(() => {
    if (isOpen && selectedPlatform === 'whatsapp') {
      loadWhatsappAccounts();
    }
  }, [isOpen, selectedPlatform]);

  // When platform changes to WhatsApp, load accounts
  useEffect(() => {
    if (selectedPlatform === 'whatsapp') {
      loadWhatsappAccounts();
    }
  }, [selectedPlatform]);
  
  // Load WhatsApp accounts from the database
  const loadWhatsappAccounts = async () => {
    try {
      setIsLoadingAccounts(true);
      // We don't have user ID in props, so we need to fetch it from Supabase
      const supabase = await import('@/utils/supabase/client').then(mod => mod.createClient());
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You need to be logged in to use WhatsApp integration');
        return;
      }
      
      // Debug: Check accounts directly from the database
      const { data: directDbAccounts, error: directDbError } = await supabase
        .from('whatsapp_accounts')
        .select('*')
        .eq('user_id', user.id);
      
      if (directDbError) {
        console.error('Direct DB query error:', directDbError);
      } else {
        console.log('Direct DB query - WhatsApp accounts:', directDbAccounts);
      }
      
      // Also get accounts through the service
      const accounts = await periskopeService.getUserWhatsAppAccounts(user.id);
      console.log('Service returned WhatsApp accounts:', accounts);
      
      setWhatsappAccounts(accounts);
      
      // Debug: Check if accounts exist in the database first
      if (accounts.length > 0) {
        const account = accounts[0];
        const exists = await periskopeService.checkWhatsAppAccountExists(account.id);
        console.log(`Account ${account.id} exists in database: ${exists}`);
      }
      
      // Set the first account as selected if there are accounts available
      if (accounts.length > 0) {
        const defaultAccount = accounts[0];
        console.log('Setting default WhatsApp account:', defaultAccount.id);
        setSelectedWhatsappAccount(defaultAccount.id);
        
        // Also check the account using our new API endpoint for diagnostic purposes
        try {
          const response = await fetch('/api/whatsapp/accounts');
          if (response.ok) {
            const data = await response.json();
            console.log('API endpoint whatsapp/accounts returned:', data);
          } else {
            console.error('API endpoint failed:', await response.text());
          }
        } catch (apiError) {
          console.error('Error calling diagnostic API:', apiError);
        }
      } else {
        console.warn('No WhatsApp accounts found. Please add one in Settings.');
        toast.warning('No WhatsApp accounts found. Please add one in Settings.', {
          duration: 5000,
          position: 'bottom-right'
        });
      }
    } catch (error) {
      console.error('Failed to load WhatsApp accounts:', error);
      toast.error('Failed to load your WhatsApp accounts');
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  // Load chats for the selected WhatsApp account
  const loadWhatsappChats = async () => {
    if (!selectedWhatsappAccount) {
      toast.error('Please select a WhatsApp account first');
      return;
    }

    try {
      setIsLoadingChats(true);
      const response = await periskopeService.fetchGroupChats(selectedWhatsappAccount);
      
      if (response && response.chats && Array.isArray(response.chats)) {
        setAvailableWhatsappChats(response.chats);
      } else {
        toast.error('Invalid response format from WhatsApp API');
      }
    } catch (error) {
      console.error('Failed to load WhatsApp chats:', error);
      toast.error('Failed to load chats from your WhatsApp account');
    } finally {
      setIsLoadingChats(false);
    }
  };

  // Load AI agents when platform changes to 'ai'
  useEffect(() => {
    if (selectedPlatform === 'ai') {
      loadAiAgents();
    }
  }, [selectedPlatform]);

  // Function to load AI agents
  const loadAiAgents = async () => {
    try {
      setIsLoadingAiAgents(true);
      const supabase = await import('@/utils/supabase/client').then(mod => mod.createClient());
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You need to be logged in to use AI agents');
        return;
      }
      
      // Fetch AI agents from the database
      const { data: agents, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching AI agents:', error);
        toast.error('Failed to load AI agents');
        return;
      }
      
      console.log('Loaded AI agents:', agents);
      setAiAgents(agents || []);
      
      // If there are agents, select the first one
      if (agents && agents.length > 0) {
        setSelectedAiAgent(agents[0].id);
      } else {
        // Use our pre-created test agent
        setSelectedAiAgent('5dc8f92e-1a42-4763-856a-1449b012ab68');
      }
    } catch (error) {
      console.error('Failed to load AI agents:', error);
      toast.error('Failed to load AI agents');
    } finally {
      setIsLoadingAiAgents(false);
    }
  };

  const platforms: PlatformOption[] = [
    {
      value: "whatsapp",
      label: "WhatsApp",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
          <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Z" />
          <path d="M14 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Z" />
          <path d="M9.5 13.5c.5 1.5 2.5 2 5 0" />
        </svg>
      ),
      supportsGroupChat: true,
    },
    {
      value: "telegram",
      label: "Telegram",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="m22 8-12 8-7.5-4.5" />
          <path d="M2 14.5V18h15.5" />
          <path d="M2 8.5 9 12l2-3" />
          <path d="M18 3h4v4" />
          <path d="m22 7-7 7" />
        </svg>
      ),
      supportsGroupChat: true,
    },
    {
      value: "email",
      label: "Email",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      ),
    },
    {
      value: "slack",
      label: "Slack",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <rect width="3" height="8" x="13" y="2" rx="1.5" />
          <path d="M19 8.5V10h1.5A1.5 1.5 0 1 0 19 8.5" />
          <rect width="3" height="8" x="8" y="14" rx="1.5" />
          <path d="M5 15.5V14H3.5A1.5 1.5 0 1 0 5 15.5" />
          <rect width="8" height="3" x="14" y="13" rx="1.5" />
          <path d="M15.5 19H14v1.5a1.5 1.5 0 1 0 1.5-1.5" />
          <rect width="8" height="3" x="2" y="8" rx="1.5" />
          <path d="M8.5 5H10V3.5A1.5 1.5 0 1 0 8.5 5" />
        </svg>
      ),
    },
    {
      value: "ai",
      label: "AI Agent",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M12 2a8 8 0 0 1 8 8v12l-4-4H4a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4h8z" />
          <path d="M12 11v.01" />
          <path d="M8 11V11.01" />
          <path d="M16 11V11.01" />
        </svg>
      ),
    },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Render WhatsApp account selection and chat browsing options
  const renderWhatsAppOptions = () => {
    if (whatsappAccounts.length === 0) {
      return (
        <div className="p-4 border rounded-md">
          <p className="text-sm text-muted-foreground mb-3">
            You don't have any WhatsApp accounts connected yet. Please add an account in the Settings page first.
          </p>
          <a 
            href="/settings" 
            className="text-sm text-primary underline"
            onClick={(e) => {
              e.preventDefault();
              onClose();
              window.location.href = '/settings';
            }}
          >
            Go to Settings
          </a>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>WhatsApp Account</Label>
          <Select
            value={selectedWhatsappAccount}
            onValueChange={(value) => {
              console.log('Selected WhatsApp account ID:', value);
              setSelectedWhatsappAccount(value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a WhatsApp account" />
            </SelectTrigger>
            <SelectContent>
              {whatsappAccounts.map(account => (
                <SelectItem key={account.id} value={account.id}>
                  {account.account_name || account.phone_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={whatsappTab} onValueChange={setWhatsappTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct">Direct Message</TabsTrigger>
            <TabsTrigger value="group">Group Chat</TabsTrigger>
          </TabsList>
          
          <TabsContent value="direct" className="pt-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                placeholder="+1234567890"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the full phone number with country code (e.g., +1 for US)
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="group" className="pt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Available Group Chats</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={loadWhatsappChats}
                  disabled={isLoadingChats || !selectedWhatsappAccount}
                >
                  {isLoadingChats ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Load Chats
                    </>
                  )}
                </Button>
              </div>
              
              {isLoadingChats ? (
                <div className="h-40 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : availableWhatsappChats.length > 0 ? (
                <div className="border rounded-md h-40 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Group Name</TableHead>
                        <TableHead className="w-20">Members</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableWhatsappChats.map(chat => (
                        <TableRow key={chat.chat_id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedWhatsappChat === chat.chat_id}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedWhatsappChat(chat.chat_id);
                                  setFormData(prev => ({
                                    ...prev,
                                    whatsappGroupId: chat.chat_id
                                  }));
                                } else {
                                  setSelectedWhatsappChat('');
                                  setFormData(prev => ({
                                    ...prev,
                                    whatsappGroupId: ''
                                  }));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>{chat.chat_name}</TableCell>
                          <TableCell>{chat.member_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="h-40 border rounded-md flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    No group chats found. Click "Load Chats" to fetch available groups.
                  </p>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                Select a group from the list above to start a conversation with that WhatsApp group.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  // Render AI agent fields
  const renderAiAgentFields = () => {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="aiAgent">Select AI Agent</Label>
          <Select
            value={selectedAiAgent}
            onValueChange={(value) => {
              console.log('Selected AI agent:', value);
              setSelectedAiAgent(value);
            }}
            disabled={isLoadingAiAgents}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an AI agent" />
            </SelectTrigger>
            <SelectContent>
              {aiAgents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
              {/* Add our test agent */}
              <SelectItem value="5dc8f92e-1a42-4763-856a-1449b012ab68">
                Customer Service Bot
              </SelectItem>
            </SelectContent>
          </Select>
          {isLoadingAiAgents && <p className="text-xs text-muted-foreground">Loading AI agents...</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="message">Initial Message</Label>
          <Textarea
            id="message"
            name="message"
            placeholder="Enter your initial message to the AI agent..."
            value={formData.message}
            onChange={handleInputChange}
            className="min-h-[100px]"
          />
        </div>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlatform) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      console.log('Creating conversation with platform:', selectedPlatform);
      
      // Determine the recipient based on platform and chat type
      let recipient = "";
      let isGroup = false;
      let whatsappAccountId = "";
      let isAgent = false;
      
      // Handle different platforms - each has different requirements
      if (selectedPlatform === "whatsapp") {
        // For WhatsApp, we need the account ID and proper platform-specific data
        isGroup = whatsappTab === "group";
        whatsappAccountId = selectedWhatsappAccount;
        recipient = isGroup ? formData.whatsappGroupId : formData.phoneNumber;
        
        // Validate WhatsApp-specific fields
        if (!whatsappAccountId) {
          throw new Error('Please select a WhatsApp account');
        }
        
        // Also validate recipient
        if (!recipient) {
          throw new Error(isGroup ? 'Please select a WhatsApp group' : 'Please enter a valid phone number');
        }
      } 
      else if (selectedPlatform === "telegram") {
        isGroup = chatType === "group";
        recipient = isGroup ? formData.telegramGroupId : formData.username;
      } 
      else if (selectedPlatform === "email") {
        // Email would only have solo chat option
        recipient = formData.username; // Using username field for email address
      } 
      else if (selectedPlatform === "slack") {
        // Slack would only have solo chat option
        recipient = formData.username; // Using username field for slack channel
      }
      else if (selectedPlatform === "ai") {
        // For AI agents, set the recipient as the agent ID
        let agentId = selectedAiAgent;
        if (!agentId) {
          // If somehow no agent is selected, use our test agent
          agentId = '5dc8f92e-1a42-4763-856a-1449b012ab68';
          console.log('No AI agent selected, using default agent ID:', agentId);
        }
        
        recipient = agentId;
        isAgent = true;
        console.log('Creating AI agent conversation with agent ID:', recipient);
      }
      
      // Validate recipient for all platforms
      if (!recipient) {
        throw new Error(`Please enter a valid ${selectedPlatform} ${isGroup ? 'group' : 'contact'}`);
      }
      
      // For WhatsApp, we need to include the account ID
      const body: any = {
        platform: selectedPlatform,
        recipient,
        isGroup,
        message: formData.message
        // We'll rely on the server to get the user ID from the auth session
      };
      
      // Add platform-specific data
      if (selectedPlatform === "whatsapp") {
        console.log('Adding WhatsApp account ID to request:', whatsappAccountId);
        
        // Make sure account ID isn't empty
        if (!whatsappAccountId) {
          // Get the first account from the list if available
          if (whatsappAccounts.length > 0) {
            whatsappAccountId = whatsappAccounts[0].id;
            console.log('Auto-selecting first WhatsApp account:', whatsappAccountId);
          } else {
            throw new Error('No WhatsApp account selected or available. Please add a WhatsApp account in Settings first.');
          }
        }
        
        // Get the current user's ID if possible
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id) {
            body.userId = user.id;
            console.log('Adding user ID to request:', user.id);
          }
        } catch (userError) {
          console.warn('Could not get current user ID:', userError);
        }
        
        body.whatsappAccountId = whatsappAccountId;
        
        // Debug log the entire request body for WhatsApp
        console.log('WhatsApp conversation request body:', JSON.stringify(body));
      }
      
      // Add AI agent specific data
      if (selectedPlatform === "ai") {
        console.log('Adding AI agent ID to request:', selectedAiAgent);
        body.isAgent = true;
        
        // Make sure we're sending the complete message
        if (!body.message && formData.message) {
          body.message = formData.message;
        }
        
        // Debug log the entire request body for AI
        console.log('AI agent conversation request body:', JSON.stringify(body));
      }
      
      // Call the API to create the conversation - include credentials to send cookies
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include', // This is critical to include auth cookies
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        try {
          // Print the full response status and text for debugging
          console.log('API response status:', response.status, response.statusText);
          
          // Log the original request body for debugging
          console.log('Original request body:', body);
          
          const errorData = await response.json();
          console.error('API error response:', errorData);
          
          // Format the error message for better user feedback
          const errorMessage = errorData.error || "Failed to create conversation";
          
          // Check for specific error types and provide helpful messages
          if (errorMessage.includes('WhatsApp account')) {
            throw new Error(`WhatsApp account error: ${errorMessage}. Please check your WhatsApp accounts in Settings.`);
          } else if (errorMessage.includes('User ID')) {
            throw new Error(`User ID error: ${errorMessage}`);
          } else if (errorMessage.includes('platform')) {
            throw new Error(`Platform error: ${errorMessage}`);
          } else {
            throw new Error(errorMessage);
          }
        } catch (jsonError) {
          // Handle case where response isn't valid JSON
          console.error('Failed to parse error response:', jsonError);
          throw new Error("Failed to create conversation - server returned an invalid response");
        }
      }
      
      const data = await response.json();
      
      // Reset form and close modal
      setSelectedPlatform(null);
      setChatType("solo");
      setFormData({ 
        phoneNumber: "", 
        username: "", 
        whatsappGroupId: "", 
        telegramGroupId: "", 
        message: "" 
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPlatformFields = () => {
    if (!selectedPlatform) return null;
    
    const selectedPlatformOption = platforms.find(p => p.value === selectedPlatform);
    const supportsGroupChat = selectedPlatformOption?.supportsGroupChat || false;

    // If WhatsApp is selected, we need to show a different UI for account selection
    if (selectedPlatform === "whatsapp") {
      return renderWhatsAppOptions();
    }

    if (selectedPlatform === "ai") {
      return renderAiAgentFields();
    }

    return (
      <div className="space-y-4">
        {/* Chat Type Selection for platforms that support group chat */}
        {supportsGroupChat && (
          <div className="space-y-2">
            <Label>Chat Type</Label>
            <RadioGroup
              value={chatType}
              onValueChange={(value) => setChatType(value as ChatType)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="solo" id="solo" />
                <Label htmlFor="solo" className="cursor-pointer">Solo Chat</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="group" id="group" />
                <Label htmlFor="group" className="cursor-pointer">Group Chat</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Platform-specific fields (non-WhatsApp) */}
        {selectedPlatform === "telegram" && (
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              placeholder="@username"
              value={formData.username}
              onChange={handleInputChange}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the Telegram username (with @ symbol)
            </p>
          </div>
        )}

        {/* WhatsApp specific UI is handled in renderWhatsAppOptions */}

        {selectedPlatform === "telegram" && (
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              placeholder="@username"
              value={formData.username}
              onChange={handleInputChange}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the Telegram username (with @ symbol)
            </p>
          </div>
        )}

        {selectedPlatform === "telegram" && chatType === "group" && (
          <div className="space-y-2">
            <Label htmlFor="telegramGroupId">Telegram Group ID</Label>
            <Input
              id="telegramGroupId"
              name="telegramGroupId"
              placeholder="Group ID or Invite Link"
              value={formData.telegramGroupId}
              onChange={handleInputChange}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the Telegram group ID or invite link
            </p>
          </div>
        )}
        
        {/* Add fields for other platforms as needed */}
        {selectedPlatform === "email" && (
          <div className="space-y-2">
            <Label htmlFor="username">Email Address</Label>
            <Input
              id="username"
              name="username"
              type="email"
              placeholder="example@domain.com"
              value={formData.username}
              onChange={handleInputChange}
              required
            />
          </div>
        )}
        
        {selectedPlatform === "slack" && (
          <div className="space-y-2">
            <Label htmlFor="username">Channel or User ID</Label>
            <Input
              id="username"
              name="username"
              placeholder="#channel or @username"
              value={formData.username}
              onChange={handleInputChange}
              required
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle>Start a New Conversation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={isSubmitting} className="space-y-4">
            <div className="space-y-2">
              <Label>Select Platform</Label>
              <RadioGroup
                value={selectedPlatform || ""}
                onValueChange={(value) => setSelectedPlatform(value as PlatformType)}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2"
              >
                {platforms.map((platform) => (
                  <div key={platform.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={platform.value} id={platform.value} />
                    <Label
                      htmlFor={platform.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      {platform.icon}
                      {platform.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {selectedPlatform && renderPlatformFields()}

            {selectedPlatform && (
              <div className="space-y-2">
                <Label htmlFor="message">Initial Message</Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Type your message here..."
                  rows={2}
                  value={formData.message}
                  onChange={handleInputChange}
                  className="resize-none"
                />
              </div>
            )}
          </fieldset>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedPlatform || isSubmitting}
              className="min-w-[90px]"
              size="sm"
            >
              Create Conversation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
