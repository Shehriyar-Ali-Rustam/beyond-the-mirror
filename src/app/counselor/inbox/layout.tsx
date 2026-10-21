import { requireRole } from "@/lib/auth";
import { getTz } from "@/lib/tz";
import { InboxShell } from "@/components/counselor/inbox-shell";

export default async function InboxLayout({ children }: LayoutProps<"/counselor/inbox">) {
  const viewer = await requireRole("counselor");
  const tz = await getTz();
  return (
    <InboxShell counselorId={viewer.id} tz={tz}>
      {children}
    </InboxShell>
  );
}
