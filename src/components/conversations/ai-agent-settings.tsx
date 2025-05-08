"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AIAgentConfig, DEFAULT_AI_AGENT_CONFIG } from "@/lib/services/ai-agent.service";

interface AIAgentSettingsProps {
  conversationId: string;
  initialEnabled?: boolean;
  initialConfig?: Partial<AIAgentConfig>;
}

export function AIAgentSettings({ 
  conversationId, 
  initialEnabled = false,
  initialConfig = {} 
}: AIAgentSettingsProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<AIAgentConfig>({
    ...DEFAULT_AI_AGENT_CONFIG,
    ...initialConfig
  });

  // Fetch current settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch(`/api/conversations/${conversationId}`);
        if (!response.ok) throw new Error("Failed to fetch conversation");
        
        const data = await response.json();
        const metadata = data.conversation.metadata || {};
        
        if (typeof metadata === 'string') {
          try {
            const parsedMetadata = JSON.parse(metadata);
            if (parsedMetadata.is_agent) {
              setIsEnabled(true);
              if (parsedMetadata.agent_config) {
                setConfig({
                  ...DEFAULT_AI_AGENT_CONFIG,
                  ...parsedMetadata.agent_config
                });
              }
            }
          } catch (e) {
            console.error("Error parsing metadata:", e);
          }
        } else if (metadata.is_agent) {
          setIsEnabled(true);
          if (metadata.agent_config) {
            setConfig({
              ...DEFAULT_AI_AGENT_CONFIG,
              ...metadata.agent_config
            });
          }
        }
      } catch (error) {
        console.error("Error fetching AI agent settings:", error);
        toast.error("Failed to load AI agent settings");
      }
    }
    
    fetchSettings();
  }, [conversationId]);

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      
      const response = await fetch(`/api/conversations/${conversationId}/ai-agent`, {
        method: isEnabled ? "POST" : "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: isEnabled ? JSON.stringify({ config }) : undefined
      });
      
      if (!response.ok) throw new Error("Failed to save settings");
      
      toast.success(isEnabled ? "AI agent enabled" : "AI agent disabled");
    } catch (error) {
      console.error("Error saving AI agent settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Agent Settings
        </CardTitle>
        <CardDescription>
          Enable an AI agent to automatically respond to messages in this conversation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <Label htmlFor="ai-agent-toggle">Enable AI Agent</Label>
            <p className="text-sm text-muted-foreground">
              When enabled, the AI will automatically respond to new messages
            </p>
          </div>
          <Switch
            id="ai-agent-toggle"
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
        </div>

        {isEnabled && (
          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Settings</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="system-prompt">System Prompt</Label>
                <Textarea
                  id="system-prompt"
                  placeholder="Instructions for the AI agent..."
                  value={config.systemPrompt}
                  onChange={(e) => setConfig({...config, systemPrompt: e.target.value})}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  This prompt guides how the AI responds. Be specific about tone, knowledge, and limitations.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="model-select">AI Model</Label>
                <select
                  id="model-select"
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={config.model}
                  onChange={(e) => setConfig({...config, model: e.target.value})}
                >
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster, Lower Cost)</option>
                  <option value="gpt-4">GPT-4 (More Capable, Higher Cost)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo (Latest Model)</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="temperature">Temperature: {config.temperature}</Label>
                </div>
                <Slider
                  id="temperature"
                  min={0}
                  max={1}
                  step={0.1}
                  value={[config.temperature]}
                  onValueChange={(value) => setConfig({...config, temperature: value[0]})}
                />
                <p className="text-xs text-muted-foreground">
                  Lower values (0-0.3) make responses more focused and deterministic.
                  Higher values (0.7-1.0) make responses more creative and varied.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max-tokens">Max Response Length</Label>
                <Input
                  id="max-tokens"
                  type="number"
                  min={50}
                  max={4000}
                  value={config.maxTokens}
                  onChange={(e) => setConfig({...config, maxTokens: parseInt(e.target.value) || 500})}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum length of AI responses in tokens (roughly 4 characters per token).
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setConfig(DEFAULT_AI_AGENT_CONFIG)}>
          Reset to Default
        </Button>
        <Button onClick={handleSaveSettings} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Settings"}
          {!isSaving && <Save className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function EnableAIAgentButton({ conversationId }: { conversationId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleEnableAI = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/conversations/${conversationId}/ai-agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ config: DEFAULT_AI_AGENT_CONFIG })
      });
      
      if (!response.ok) throw new Error("Failed to enable AI agent");
      
      toast.success("AI agent enabled successfully");
      
      // Reload the page to show the updated UI
      window.location.reload();
    } catch (error) {
      console.error("Error enabling AI agent:", error);
      toast.error("Failed to enable AI agent");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Button 
      onClick={handleEnableAI} 
      disabled={isLoading}
      className="gap-2"
    >
      <Sparkles className="h-4 w-4" />
      {isLoading ? "Enabling..." : "Enable AI Assistant"}
    </Button>
  );
}

