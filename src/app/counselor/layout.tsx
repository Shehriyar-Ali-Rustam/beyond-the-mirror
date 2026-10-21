import { requireRole } from "@/lib/auth";
import { getTz } from "@/lib/tz";
import { getUnreadConversationCount, getUnreadNotificationCount } from "@/lib/queries";
import { AppShell } from "@/components/shell/app-shell";

export default async function CounselorLayout({ children }: LayoutProps<"/counselor">) {
  const viewer = await requireRole("counselor");
  const [unread, notifications, tz] = await Promise.all([
    getUnreadConversationCount(viewer),
    getUnreadNotificationCount(viewer.id),
    getTz(),
  ]);
  return (
    <AppShell viewer={viewer} badges={{ unread }} unreadNotifications={notifications} tz={tz}>
      {children}
    </AppShell>
  );
}
