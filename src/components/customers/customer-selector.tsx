"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Customer, UNKNOWN_CUSTOMER } from "@/types/customer";
import { createClient } from "@/utils/supabase/client";
import { Plus, Loader2 } from "lucide-react";
import { CustomerDialog } from "@/components/customers/customer-dialog";
import { toast } from "sonner";

interface CustomerSelectorProps {
  value?: string;
  onChange: (customerId: string) => void;
  onCustomerChange?: (customer: Customer | null) => void;
}

export function CustomerSelector({
  value,
  onChange,
  onCustomerChange,
}: CustomerSelectorProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch customers on mount and when search term changes
  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        let query = supabase
          .from("customers")
          .select(`
            *,
            organization:organization_id (
              id,
              name
            )
          `)
          .order("full_name");
        
        // Apply search filter if search term exists
        if (searchTerm) {
          query = query.or(
            `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
          );
        }

        const { data, error } = await query;
        
        if (error) {
          console.error("Error fetching customers:", error);
          toast.error("Failed to load customers");
          return;
        }
        
        // Include the unknown customer option
        const allCustomers = [UNKNOWN_CUSTOMER, ...(data || [])];
        setCustomers(allCustomers);
        
        // Update selected customer if value is provided
        if (value) {
          const customer = allCustomers.find((c) => c.id === value) || null;
          setSelectedCustomer(customer);
          if (onCustomerChange) onCustomerChange(customer);
        }
      } catch (err) {
        console.error("Error in customer selector:", err);
        toast.error("Failed to load customers");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [value, searchTerm, onCustomerChange]);

  // Create combobox options from customers
  const options = customers.map((customer) => ({
    label: `${customer.full_name} ${
      customer.organization ? `(${customer.organization.name})` : ""
    }`,
    value: customer.id,
    customer,
  }));

  const handleSelect = (customerId: string) => {
    onChange(customerId);
    const customer = customers.find((c) => c.id === customerId) || null;
    setSelectedCustomer(customer);
    if (onCustomerChange) onCustomerChange(customer);
  };

  const handleCreateNewCustomer = async (newCustomer: Customer) => {
    setCustomers([...customers, newCustomer]);
    onChange(newCustomer.id);
    setSelectedCustomer(newCustomer);
    if (onCustomerChange) onCustomerChange(newCustomer);
    setIsCreateDialogOpen(false);
    toast.success("Customer created successfully");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <div className="flex-1">
          {isLoading ? (
            <div className="flex items-center space-x-2 h-10 border rounded-md px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">Loading customers...</span>
            </div>
          ) : (
            <Combobox
              items={options}
              value={value || "unknown"}
              onChange={handleSelect}
              placeholder="Select a customer"
              emptyMessage="No customers found"
              onInputChange={setSearchTerm}
              className="w-full"
            />
          )}
        </div>
        <Button
          type="button"
          onClick={() => setIsCreateDialogOpen(true)}
          variant="outline"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
      </div>

      <CustomerDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCustomerCreated={handleCreateNewCustomer}
      />
    </div>
  );
}
