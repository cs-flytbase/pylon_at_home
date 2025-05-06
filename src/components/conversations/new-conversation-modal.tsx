"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type PlatformType = "whatsapp" | "slack" | "email" | "telegram";
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
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | null>(null);
  const [chatType, setChatType] = useState<ChatType>("solo");
  const [formData, setFormData] = useState({
    phoneNumber: "",     // For WhatsApp solo
    username: "",        // For Telegram solo
    whatsappGroupId: "", // For WhatsApp group
    telegramGroupId: "", // For Telegram group
    message: "",         // Common for all platforms
  });

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
          <path d="m22 3-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 3" />
          <path d="M2 3v18l10-5.1 10 5.1V3" />
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
          <rect x="13" y="2" width="3" height="8" rx="1.5" />
          <path d="M19 8.5V10h1.5A1.5 1.5 0 1 0 19 8.5" />
          <rect x="8" y="14" width="3" height="8" rx="1.5" />
          <path d="M5 15.5V14H3.5A1.5 1.5 0 1 0 5 15.5" />
          <rect x="14" y="13" width="8" height="3" rx="1.5" />
          <path d="M15.5 19H14v1.5a1.5 1.5 0 1 0 1.5-1.5" />
          <rect x="2" y="8" width="8" height="3" rx="1.5" />
          <path d="M8.5 5H10V3.5A1.5 1.5 0 1 0 8.5 5" />
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlatform) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Determine the recipient based on platform and chat type
      let recipient = "";
      let isGroup = chatType === "group";
      
      if (selectedPlatform === "whatsapp") {
        recipient = isGroup ? formData.whatsappGroupId : formData.phoneNumber;
      } else if (selectedPlatform === "telegram") {
        recipient = isGroup ? formData.telegramGroupId : formData.username;
      } else if (selectedPlatform === "email") {
        // Email would only have solo chat option
        recipient = formData.username; // Using username field for email address
      } else if (selectedPlatform === "slack") {
        // Slack would only have solo chat option
        recipient = formData.username; // Using username field for slack channel
      }
      
      // Call the API to create the conversation
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          platform: selectedPlatform,
          recipient,
          isGroup,
          message: formData.message
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create conversation");
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

        {/* Platform-specific fields */}
        {selectedPlatform === "whatsapp" && chatType === "solo" && (
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
        )}

        {selectedPlatform === "whatsapp" && chatType === "group" && (
          <div className="space-y-2">
            <Label htmlFor="whatsappGroupId">WhatsApp Group ID</Label>
            <Input
              id="whatsappGroupId"
              name="whatsappGroupId"
              placeholder="Group ID or Invite Link"
              value={formData.whatsappGroupId}
              onChange={handleInputChange}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the WhatsApp group ID or invite link
            </p>
          </div>
        )}

        {selectedPlatform === "telegram" && chatType === "solo" && (
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
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a New Conversation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Platform</Label>
              <RadioGroup
                value={selectedPlatform || ""}
                onValueChange={(value) => setSelectedPlatform(value as PlatformType)}
                className="grid grid-cols-2 gap-4"
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
                  value={formData.message}
                  onChange={handleInputChange}
                  className="min-h-[100px]"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedPlatform}>
              Create Conversation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
