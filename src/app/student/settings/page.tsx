import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/shell/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { StudentProfileForm } from "@/components/settings/student-profile-form";
import { PasswordForm } from "@/components/settings/password-form";

export const metadata: Metadata = { title: "Settings" };

export default async function StudentSettings() {
  const viewer = await requireRole("student");
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Settings" />
      <Card>
        <CardHeader title="Profile" description="Your counselor sees these details." />
        <CardBody>
          <StudentProfileForm profile={viewer} />
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
