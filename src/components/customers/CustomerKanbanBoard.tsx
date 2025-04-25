"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Demo columns for customer stages
const columns = [
  { id: "prospect", title: "Prospect" },
  { id: "active", title: "Active" },
  { id: "inactive", title: "Inactive" },
];

export type Customer = {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  status: string; // matches column id
};

const initialCustomers: Customer[] = [
  { id: "1", full_name: "Alice Smith", email: "alice@email.com", status: "prospect" },
  { id: "2", full_name: "Bob Jones", email: "bob@email.com", status: "active" },
  { id: "3", full_name: "Carol Lee", email: "carol@email.com", status: "inactive" },
];

export default function CustomerKanbanBoard() {
  const [customersByStatus, setCustomersByStatus] = useState<Record<string, Customer[]>>({
    prospect: initialCustomers.filter(c => c.status === "prospect"),
    active: initialCustomers.filter(c => c.status === "active"),
    inactive: initialCustomers.filter(c => c.status === "inactive"),
  });
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Handle drag start
  function onDragStart(id: string) {
    setDraggedId(id);
  }

  // Handle drop
  function onDrop(columnId: string) {
    if (!draggedId) return;
    const sourceColumn = Object.keys(customersByStatus).find(col => customersByStatus[col].some(c => c.id === draggedId));
    if (!sourceColumn || sourceColumn === columnId) return;
    const customer = customersByStatus[sourceColumn].find(c => c.id === draggedId)!;
    // Optimistically update UI
    setCustomersByStatus(prev => {
      const updated = { ...prev };
      updated[sourceColumn] = updated[sourceColumn].filter(c => c.id !== draggedId);
      updated[columnId] = [...updated[columnId], { ...customer, status: columnId }];
      return updated;
    });
    setDraggedId(null);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[60vh]">
      {columns.map(col => (
        <div
          key={col.id}
          className={`bg-card border border-border rounded-lg p-4 flex flex-col transition-colors duration-200 min-h-[400px] ${draggedId ? 'ring-2 ring-primary/30 bg-accent/20' : ''}`}
          onDragOver={e => e.preventDefault()}
          onDrop={() => onDrop(col.id)}
        >
          <h2 className="font-semibold text-lg mb-3 flex items-center justify-between">
            {col.title}
            <span className="ml-2 text-xs bg-muted rounded-full px-2 py-0.5">{customersByStatus[col.id].length}</span>
          </h2>
          <div className="flex-1 space-y-3">
            {customersByStatus[col.id].map(customer => (
              <Card
                key={customer.id}
                draggable
                onDragStart={() => onDragStart(customer.id)}
                onDragEnd={() => setDraggedId(null)}
                className={`shadow transition-all cursor-grab ${draggedId === customer.id ? 'opacity-60 scale-105 ring-2 ring-primary/40 z-20' : ''}`}
                tabIndex={0}
                aria-grabbed={draggedId === customer.id}
              >
                <div className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-lg font-bold">
                    {customer.avatar_url ? (
                      <img src={customer.avatar_url} alt={customer.full_name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      customer.full_name[0]
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{customer.full_name}</div>
                    <div className="text-xs text-muted-foreground">{customer.email}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
