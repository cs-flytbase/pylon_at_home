import { PageTitle } from "@/components/ui/page-title";
import { SettingsContent } from "@/components/settings/settings-content";

export default function SettingsPage() {
  
  return (
    <div className="container py-6 space-y-6">
      <PageTitle title="Settings" description="Manage your account settings and integrations" />
      <SettingsContent />
    </div>
  );
}
