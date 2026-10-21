import type { Profile } from "@/lib/types";
import { PageHeader } from "@/components/shell/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { StaffProfileForm } from "./staff-profile-form";
import { PasswordForm } from "./password-form";

export function StaffSettingsPage({ viewer }: { viewer: Profile }) {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title={viewer.role === "counselor" ? "Profile & settings" : "Settings"} />
      <Card>
        <CardHeader title="Profile" description={viewer.role === "counselor" ? "How students see you." : undefined} />
        <CardBody>
          <StaffProfileForm profile={viewer} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Password" />
        <CardBody>
          <PasswordForm />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Appearance" description="Choose light, dark, or match your device." action={<ThemeToggle />} />
        <CardBody className="pt-2" />
      </Card>
    </div>
  );
}
