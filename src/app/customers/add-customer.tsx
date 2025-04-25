"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function AddCustomerPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Call API or Supabase to add customer
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-2xl font-bold mb-2 text-center">Add New Customer</CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <Input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Customer Name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="customer@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Avatar URL (optional)</label>
              <Input
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <Button type="submit" className="w-full mt-4">Add Customer</Button>
          </form>
          {submitted && (
            <div className="mt-4 text-green-600 text-center">Customer added! (API integration pending)</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
