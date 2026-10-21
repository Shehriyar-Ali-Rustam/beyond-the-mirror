import { Logo } from "@/components/ui/logo";
import type { Profile } from "@/lib/types";
import { SidebarNav } from "./sidebar-nav";
import { MobileNav } from "./mobile-nav";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";
import { TimezoneSync } from "./timezone-sync";

export function AppShell({
  viewer,
  badges,
  unreadNotifications,
  tz,
  children,
}: {
  viewer: Profile;
  badges: Partial<Record<"unread" | "pending", number>>;
  unreadNotifications: number;
  tz: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-bg-deep/50 px-4 py-5 lg:flex">
        <div className="mb-8 px-2">
          <Logo href={`/${viewer.role}`} />
        </div>
        <SidebarNav role={viewer.role} badges={badges} />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-md sm:px-6 lg:px-10">
          <MobileNav role={viewer.role} badges={badges} />
          <div className="lg:hidden">
            <Logo href={`/${viewer.role}`} compact />
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <NotificationBell userId={viewer.id} initialUnread={unreadNotifications} />
            <UserMenu name={viewer.full_name} username={viewer.username} hue={viewer.avatar_hue} role={viewer.role} />
          </div>
        </header>
        <TimezoneSync serverTz={tz} />
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 animate-fade-up">
        {eyebrow && <p className="mb-1.5 text-sm font-medium text-ink-3">{eyebrow}</p>}
        <h1 className="font-display text-[1.85rem] leading-tight text-ink sm:text-[2.1rem]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
