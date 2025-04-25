"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Customer, CustomerInsert, Organization } from "@/types/customer";
import { createClient } from "@/utils/supabase/client";
import { Loader2, Building, Plus } from "lucide-react";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { useRouter } from "next/navigation";
import { OrganizationDialog } from "./organization-dialog";

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  onCustomerCreated?: (customer: Customer) => void;
  onCustomerUpdated?: (customer: Customer) => void;
}

export function CustomerDialog({
  open,
  onOpenChange,
  customer,
  onCustomerCreated,
  onCustomerUpdated,
}: CustomerDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CustomerInsert>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    job_title: "",
    notes: "",
    organization_id: undefined,
    status: "active",
  });

  // Load customer data when editing
  useEffect(() => {
    if (customer) {
      setFormData({
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        phone: customer.phone || "",
        job_title: customer.job_title || "",
        notes: customer.notes || "",
        organization_id: customer.organization_id,
        status: customer.status,
      });
    } else {
      // Reset form when creating a new customer
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        job_title: "",
        notes: "",
        organization_id: undefined,
        status: "active",
      });
    }
  }, [customer, open]);

  // Fetch organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      setIsLoadingOrgs(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("organizations")
          .select("*")
          .order("name");

        if (error) {
          console.error("Error fetching organizations:", error);
          toast.error("Failed to load organizations");
          return;
        }

        setOrganizations(data || []);
      } catch (err) {
        console.error("Error in organization fetch:", err);
        toast.error("Failed to load organizations");
      } finally {
        setIsLoadingOrgs(false);
      }
    };

    if (open) {
      fetchOrganizations();
    }
  }, [open]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();
      
      if (customer) {
        // Update existing customer
        const { data, error } = await supabase
          .from("customers")
          .update(formData)
          .eq("id", customer.id)
          .select(`
            *,
            organization:organization_id (
              id,
              name,
              type
            )
          `)
          .single();

        if (error) {
          toast.error("Failed to update customer", {
            description: error.message,
          });
          return;
        }

        toast.success("Customer updated successfully");
        if (onCustomerUpdated) {
          onCustomerUpdated(data as Customer);
        }
      } else {
        // Create new customer
        const { data, error } = await supabase
          .from("customers")
          .insert(formData)
          .select(`
            *,
            organization:organization_id (
              id,
              name,
              type
            )
          `)
          .single();

        if (error) {
          toast.error("Failed to create customer", {
            description: error.message,
          });
          return;
        }

        toast.success("Customer created successfully");
        if (onCustomerCreated) {
          onCustomerCreated(data as Customer);
        }
      }

      router.refresh();
      onOpenChange(false);
    } catch (err) {
      console.error("Error creating/updating customer:", err);
      toast.error(`Failed to ${customer ? "update" : "create"} customer`);
    } finally {
      setIsLoading(false);
    }
  };

  // Create organization combobox options
  const orgOptions = organizations.map((org) => ({
    label: org.name,
    description: org.type,
    value: org.id,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {customer ? "Edit Customer" : "Create New Customer"}
          </DialogTitle>
          <DialogDescription>
            {customer
              ? "Update customer details and organization"
              : "Add a new customer and assign to an organization"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                name="job_title"
                value={formData.job_title}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Organization</Label>
            {isLoadingOrgs ? (
              <div className="flex items-center space-x-2 h-10 border rounded-md px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground">Loading organizations...</span>
              </div>
            ) : (
              <Combobox
                items={orgOptions}
                value={formData.organization_id || ""}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, organization_id: value }))
                }
                placeholder="Select an organization"
                emptyMessage={
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Building className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No organizations found</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setIsOrgDialogOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Create New Organization
                    </Button>
                  </div>
                }
                className="w-full"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {customer ? "Update Customer" : "Create Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      
      {/* Organization Dialog */}
      <OrganizationDialog
        open={isOrgDialogOpen}
        onOpenChange={setIsOrgDialogOpen}
        onOrganizationCreated={(newOrg) => {
          // Add new organization to the list and select it
          setOrganizations([...organizations, newOrg]);
          setFormData((prev) => ({ ...prev, organization_id: newOrg.id }));
          toast.success(`Organization ${newOrg.name} created successfully`);
        }}
      />
    </Dialog>
  );
}
