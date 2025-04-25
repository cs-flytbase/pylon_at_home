import { MainLayout } from "@/components/layout/main-layout";

export const metadata = {
  title: "Pylon - Support Platform",
  description: "Modern ticket management system",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
