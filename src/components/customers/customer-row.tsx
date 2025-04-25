"use client";

import { Customer } from "@/types/customer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Mail, Building, Phone, Edit, Trash } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

interface CustomerRowProps {
  customer: Customer;
  onEdit: () => void;
}

export function CustomerRow({ customer, onEdit }: CustomerRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${customer.first_name} ${customer.last_name}?`)) {
      setIsDeleting(true);
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("customers")
          .update({ status: "inactive" })
          .eq("id", customer.id);
          
        if (error) {
          throw error;
        }
        
        toast.success("Customer deactivated successfully");
        // You would typically refresh the list here or update the UI
      } catch (err) {
        console.error("Error deactivating customer:", err);
        toast.error("Failed to deactivate customer");
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  return (
    <div className="flex items-center justify-between p-4 rounded-md border">
      <div className="flex items-center space-x-4">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {getInitials(customer.first_name, customer.last_name)}
          </AvatarFallback>
        </Avatar>
        
        <div>
          <div className="font-medium">
            {customer.first_name} {customer.last_name}
            <Badge 
              variant="secondary" 
              className={cn("ml-2", getStatusColor(customer.status))}
            >
              {customer.status}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground flex items-center">
            <Mail className="h-3 w-3 mr-1" />
            <a href={`mailto:${customer.email}`} className="hover:underline">
              {customer.email}
            </a>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        {customer.organization && (
          <div className="hidden md:flex items-center">
            <Building className="h-4 w-4 mr-1 text-muted-foreground" />
            <span className="text-sm">{customer.organization.name}</span>
          </div>
        )}
        
        {customer.phone && (
          <div className="hidden md:flex items-center">
            <Phone className="h-4 w-4 mr-1 text-muted-foreground" />
            <span className="text-sm">{customer.phone}</span>
          </div>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Customer
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleDelete} 
              className="text-destructive focus:text-destructive"
              disabled={isDeleting}
            >
              <Trash className="h-4 w-4 mr-2" />
              {isDeleting ? "Deactivating..." : "Deactivate Customer"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
