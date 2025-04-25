"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { TicketInsert } from "@/types/database";
import { useAuth } from "@/context/auth-context";
import { logDatabaseError, formatErrorForUser } from "@/lib/error-logger";
import { CustomerSelector } from "@/components/customers/customer-selector";
import { Customer, UNKNOWN_CUSTOMER } from "@/types/customer";

type CreateTicketDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateTicketDialog({ open, onOpenChange }: CreateTicketDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  // Using sonner toast directly
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "support",
    priority: "medium",
    customerId: UNKNOWN_CUSTOMER.id,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string): void => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Check if user is logged in using the auth context
      if (!user) {
        throw new Error("You must be logged in to create a ticket");
      }

      // Determine customer info based on selected customer
      let customerName = "Unknown Customer";
      let customerEmail = "";
      let customerId = formData.customerId;
      
      // If a customer was selected, use their information
      if (selectedCustomer && formData.customerId !== UNKNOWN_CUSTOMER.id) {
        customerName = `${selectedCustomer.first_name} ${selectedCustomer.last_name}`;
        customerEmail = selectedCustomer.email;
        customerId = selectedCustomer.id;
      }
      
      // Get user profile information (the agent/staff member creating the ticket)
      let agentProfile = null;
      const agentId = user.id;
      
      // In development mode with mock user (id starts with 'dev-'), create a mock profile
      if (user.id.startsWith('dev-')) {
        console.log('DEVELOPMENT MODE: Using mock profile for testing');
        agentProfile = {
          id: user.id,
          full_name: user.user_metadata?.full_name || 'Development User',
          email: user.email
        };
      } else {
        // For real users, get profile from database
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        // If profile doesn't exist, create one
        if (profileError?.code === 'PGRST116' || !profileData) {
          console.log('Profile not found, creating new profile for user:', user.id);
          
          // Create a new profile for the user
          const newProfile = {
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User',
            avatar_url: user.user_metadata?.avatar_url || null,
            role: 'agent',  // Default role - adjust as needed
          };
          
          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();
            
          if (createError) {
            logDatabaseError(createError, 'profiles', 'create');
            console.error('Failed to create profile:', createError);
            // Continue with the newProfile object even if DB insert failed
            agentProfile = newProfile;
          } else {
            agentProfile = createdProfile;
            console.log('Successfully created new profile');
          }
        } else if (profileError) {
          logDatabaseError(profileError, 'profiles', 'select.single');
          throw new Error("Could not retrieve user profile: " + formatErrorForUser(profileError));
        } else {
          agentProfile = profileData;
        }
      }

      // Create new ticket
      const newTicket: TicketInsert = {
        title: formData.title,
        description: formData.description,
        type: formData.type as 'support' | 'bug' | 'feature',
        priority: formData.priority as 'low' | 'medium' | 'high' | 'urgent',
        status: 'new',
        customer_id: customerId, // Use selected customer ID
        customer_name: customerName, // Use selected customer name
        customer_email: customerEmail, // Use selected customer email
        // Store agent ID in metadata or another field if needed in the future
        department: null,  // Adding required fields from database schema
        resolved_at: null,
      };
      
      // Track extra metadata about who created the ticket in the database
      // We would need to update the tickets table schema to add a created_by field
      
      // Log the ticket creation attempt with sanitized data (for debugging)
      console.log('Attempting to create ticket:', {
        ...newTicket,
        description: newTicket.description && newTicket.description.length > 30 ? 
          `${newTicket.description.substring(0, 30)}...` : newTicket.description
      });
      
      // Instead of using Supabase directly, use the API endpoint
      console.log('Sending ticket creation request to API');
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTicket),
      });
      
      // Parse the response
      const responseData = await response.json();
      
      // Check if the request was successful
      if (!response.ok) {
        logDatabaseError({
          message: responseData.error || 'API Error',
          status: response.status,
        }, 'tickets', 'api_create');
        
        throw new Error(responseData.error || 'Failed to create ticket via API');
      }
      
      // Get the ticket from the response
      const ticket = responseData.ticket;
      
      if (!ticket) {
        const err = new Error("Ticket created but no data returned from API");
        logDatabaseError(err, 'tickets', 'api_no_return');
        throw err;
      }
      
      console.log('Successfully created ticket via API:', ticket.id);

      // Reset form
      setFormData({
        title: "",
        description: "",
        type: "support",
        priority: "medium",
        customerId: UNKNOWN_CUSTOMER.id,
      });
      setSelectedCustomer(null);

      // Close dialog
      onOpenChange(false);

      // Show success message
      toast.success("Ticket created", {
        description: "Your new ticket has been submitted successfully.",
      });

      // Refresh tickets list
      router.refresh();

      // Navigate to the new ticket
      router.push(`/tickets/${ticket.id}`);
    } catch (error) {
      // Log the error with detailed information
      console.error("Error creating ticket:", error);
      
      // Get an appropriate user-facing message
      const userMessage = error instanceof Error ? 
        error.message : 
        "An unexpected error occurred while creating your ticket";
      
      // Show a toast with the user-friendly message
      toast.error("Failed to create ticket", {
        description: userMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Ticket</DialogTitle>
          <DialogDescription>
            Please provide details about your issue or request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              autoFocus
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Customer</Label>
            <CustomerSelector
              value={formData.customerId}
              onChange={(customerId) => setFormData(prev => ({ ...prev, customerId }))}
              onCustomerChange={setSelectedCustomer}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Detailed description of your issue"
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: string) => handleSelectChange("type", value)}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value: string) => handleSelectChange("priority", value)}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
