import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock, ShieldOff } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { signOut } from "@/actions/auth";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ApprovalWatcher } from "@/components/account/approval-watcher";

export const metadata: Metadata = { title: "Account pending" };

export default async function PendingPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.status === "active") redirect(`/${viewer.role}`);
  const suspended = viewer.status === "suspended";

  return (
    <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
      <Logo />
      <main className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-line bg-surface shadow-sm">
          <EmptyState
            icon={suspended ? <ShieldOff /> : <Clock />}
            title={suspended ? "This account is paused" : `Thanks, ${viewer.full_name.split(" ")[0]}, you're almost in`}
            description={
              suspended
                ? "An administrator has paused access to this account. Please contact your school if you think this is a mistake."
                : "A school administrator needs to approve counselor accounts before they can see student information. This page checks automatically and takes you to your dashboard the moment you're approved."
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {!suspended && <ApprovalWatcher />}
                <form action={signOut}>
                  <Button variant="secondary" type="submit">
                    Log out
                  </Button>
                </form>
              </div>
            }
          />
        </div>
      </main>
    </div>
  );
}
