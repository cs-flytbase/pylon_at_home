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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Organization, OrganizationInsert, OrganizationType } from "@/types/customer";
import { createClient } from "@/utils/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface OrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization?: Organization;
  onOrganizationCreated?: (organization: Organization) => void;
  onOrganizationUpdated?: (organization: Organization) => void;
}

export function OrganizationDialog({
  open,
  onOpenChange,
  organization,
  onOrganizationCreated,
  onOrganizationUpdated,
}: OrganizationDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<OrganizationInsert>({
    name: "",
    website: "",
    industry: "",
    description: "",
    status: "active",
    type: "end_customer",
  });

  // Load organization data when editing
  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name,
        website: organization.website || "",
        industry: organization.industry || "",
        description: organization.description || "",
        status: organization.status,
        type: organization.type,
      });
    } else {
      // Reset form when creating a new organization
      setFormData({
        name: "",
        website: "",
        industry: "",
        description: "",
        status: "active",
        type: "end_customer",
      });
    }
  }, [organization, open]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();
      
      if (organization) {
        // Update existing organization
        const { data, error } = await supabase
          .from("organizations")
          .update(formData)
          .eq("id", organization.id)
          .select()
          .single();

        if (error) {
          toast.error("Failed to update organization", {
            description: error.message,
          });
          return;
        }

        toast.success("Organization updated successfully");
        if (onOrganizationUpdated) {
          onOrganizationUpdated(data as Organization);
        }
      } else {
        // Create new organization
        const { data, error } = await supabase
          .from("organizations")
          .insert(formData)
          .select()
          .single();

        if (error) {
          toast.error("Failed to create organization", {
            description: error.message,
          });
          return;
        }

        toast.success("Organization created successfully");
        if (onOrganizationCreated) {
          onOrganizationCreated(data as Organization);
        }
      }

      router.refresh();
      onOpenChange(false);
    } catch (err) {
      console.error("Error creating/updating organization:", err);
      toast.error(`Failed to ${organization ? "update" : "create"} organization`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {organization ? "Edit Organization" : "Create New Organization"}
          </DialogTitle>
          <DialogDescription>
            {organization
              ? "Update organization details"
              : "Add a new organization to associate with customers"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Organization Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleSelectChange("type", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="end_customer">End Customer</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="ex">Ex-Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleInputChange}
                placeholder="Technology, Healthcare, etc."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              placeholder="Brief description of the organization"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleSelectChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
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
              {organization ? "Update Organization" : "Create Organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
