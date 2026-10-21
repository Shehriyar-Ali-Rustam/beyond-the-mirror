import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTz } from "@/lib/tz";
import { getUnreadNotificationCount } from "@/lib/queries";
import { AppShell } from "@/components/shell/app-shell";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await requireRole("admin");
  const supabase = await createClient();
  const [{ count: pending }, notifications, tz] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
    getUnreadNotificationCount(viewer.id),
    getTz(),
  ]);
  return (
    <AppShell viewer={viewer} badges={{ pending: pending ?? 0 }} unreadNotifications={notifications} tz={tz}>
      {children}
    </AppShell>
  );
}
