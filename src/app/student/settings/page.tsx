import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { PageHero } from "@/components/visual/page-hero";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StudentProfileForm } from "@/components/settings/student-profile-form";
import { PasswordForm } from "@/components/settings/password-form";

export const metadata: Metadata = { title: "Settings" };

export default async function StudentSettings() {
  const viewer = await requireRole("student");
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHero illustration="secure-login" tone="mint" title="Settings" />
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
    </div>
  );
}
