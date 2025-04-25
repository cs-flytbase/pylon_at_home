"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { Customer } from "@/types/customer";
import { CustomerDialog } from "./customer-dialog";
import { CustomerRow } from "@/components/customers/customer-row";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Plus, Search, Filter, User } from "lucide-react";

export function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);

  // Load customers on mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter customers when search term or active tab changes
  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm, activeTab]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("customers")
        .select(`
          *,
          organization:organization_id (
            id,
            name,
            type
          )
        `)
        .order("first_name");

      if (error) {
        console.error("Error fetching customers:", error);
        toast.error("Failed to load customers");
        return;
      }

      setCustomers(data || []);
    } catch (err) {
      console.error("Error in customer fetch:", err);
      toast.error("Failed to load customers");
    } finally {
      setIsLoading(false);
    }
  };

  const filterCustomers = () => {
    let result = [...customers];

    // Apply status filter
    if (activeTab !== "all") {
      result = result.filter((customer) => customer.status === activeTab);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(
        (customer) =>
          customer.first_name.toLowerCase().includes(searchLower) ||
          customer.last_name.toLowerCase().includes(searchLower) ||
          customer.email.toLowerCase().includes(searchLower) ||
          (customer.organization?.name || "").toLowerCase().includes(searchLower)
      );
    }

    setFilteredCustomers(result);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
  };

  const handleCustomerUpdated = (updatedCustomer: Customer) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c))
    );
    setEditingCustomer(undefined);
    toast.success("Customer updated successfully");
  };

  const handleCustomerCreated = (newCustomer: Customer) => {
    setCustomers((prev) => [...prev, newCustomer]);
    setIsCreateDialogOpen(false);
    toast.success("Customer created successfully");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Customer List</CardTitle>
              <CardDescription>
                Manage your customers and organizations
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setActiveTab("all")}>
                  All Customers
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("active")}>
                  Active Customers
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("inactive")}>
                  Inactive Customers
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} forceMount>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-lg">Loading customers...</span>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <User className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No customers found</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchTerm
                      ? "Try a different search term or clear the filter"
                      : "Get started by adding your first customer"}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="mt-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Customer
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCustomers.map((customer) => (
                    <CustomerRow
                      key={customer.id}
                      customer={customer}
                      onEdit={() => handleEdit(customer)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CustomerDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCustomerCreated={handleCustomerCreated}
      />

      {editingCustomer && (
        <CustomerDialog
          open={!!editingCustomer}
          onOpenChange={() => setEditingCustomer(undefined)}
          customer={editingCustomer}
          onCustomerUpdated={handleCustomerUpdated}
        />
      )}
    </>
  );
}
