"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ComboboxItem {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  customer?: any; // For customer selector
}

interface ComboboxProps {
  items: ComboboxItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: React.ReactNode;
  className?: string;
  onInputChange?: (value: string) => void;
  disabled?: boolean;
}

export function Combobox({
  items,
  value,
  onChange,
  placeholder = "Select an option",
  emptyMessage = "No results found",
  className,
  onInputChange,
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [filteredItems, setFilteredItems] = React.useState(items);
  
  // Find selected item
  const selectedItem = React.useMemo(
    () => items.find((item) => item.value === value),
    [items, value]
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Filter items based on input
    const filtered = items.filter(item => 
      item.label.toLowerCase().includes(newValue.toLowerCase()) || 
      (item.description?.toLowerCase().includes(newValue.toLowerCase()))
    );
    setFilteredItems(filtered);
    
    if (onInputChange) {
      onInputChange(newValue);
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between"
        onClick={() => setOpen(!open)}
        disabled={disabled}
      >
        <span className="truncate">
          {selectedItem ? selectedItem.label : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      
      {open && (
        <div className="absolute top-full mt-1 z-50 w-full rounded-md border border-input bg-popover shadow-md">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder={`Search ${placeholder.toLowerCase()}`}
              value={inputValue}
              onChange={handleInputChange}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          
          <ScrollArea className="max-h-60 overflow-auto">
            {filteredItems.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              <div className="p-1">
                {filteredItems.map((item) => (
                  <div
                    key={item.value}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      value === item.value && "bg-accent text-accent-foreground",
                      item.disabled && "pointer-events-none opacity-50"
                    )}
                    onClick={() => {
                      if (!item.disabled) {
                        onChange(item.value);
                        setOpen(false);
                      }
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{item.label}</span>
                      {item.description && (
                        <span className="text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
