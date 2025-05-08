import { Suspense } from "react";
import { Metadata } from "next";
import { Heading } from "@/components/ui/heading";
import { CustomerList } from "@/components/customers/customer-list";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Customers | Pylon",
  description: "Manage your customers and organizations",
};

export default function CustomersPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between pb-4">
        <Heading
          title="Customers"
          subtitle="View and manage customers and their associated organizations"
        />
      </div>
      
      <Suspense fallback={<CustomersLoadingSkeleton />}>
        <CustomerList />
      </Suspense>
    </div>
  );
}

function CustomersLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4 pb-4">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-10 w-[100px]" />
      </div>
      
      <div className="border rounded-lg p-4">
        <div className="grid gap-6">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
              <div className="ml-auto flex items-center space-x-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
