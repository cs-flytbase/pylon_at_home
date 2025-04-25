"use client";

import React from "react";
import CustomerKanbanBoard from "@/components/customers/CustomerKanbanBoard";

export default function CustomerKanbanPage() {
  return (
    <main className="p-6 min-h-screen bg-muted/40">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center">Customer Kanban Board</h1>
      <CustomerKanbanBoard />
    </main>
  );
}
