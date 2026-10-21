import type { Profile } from "@/lib/types";
import { PageHeader } from "@/components/shell/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
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
          {viewer.role === "admin" ? (
            <p className="text-sm leading-relaxed text-ink-2">
              The administrator login is built in. To change it, set <code className="rounded bg-surface-2 px-1.5 py-0.5">ADMIN_USERNAME</code> /{" "}
              <code className="rounded bg-surface-2 px-1.5 py-0.5">ADMIN_PASSWORD</code> in your hosting settings (Vercel → Settings →
              Environment Variables) and redeploy.
            </p>
          ) : (
            <PasswordForm />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
