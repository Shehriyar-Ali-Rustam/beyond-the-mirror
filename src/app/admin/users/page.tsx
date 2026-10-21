import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchX } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTz } from "@/lib/tz";
import { formatDate } from "@/lib/time";
import { ilikeTerm } from "@/lib/search";
import { PageHeader } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ListFilters } from "@/components/shared/list-filters";
import { RoleFilter, UserActions } from "@/components/admin/user-actions";
import { ROLE_LABEL } from "@/components/shell/nav-config";

export const metadata: Metadata = { title: "People" };

export default async function AdminUsers({ searchParams }: PageProps<"/admin/users">) {
  const viewer = await requireRole("admin");
  const sp = await searchParams;
  const status = sp.status === "pending" || sp.status === "active" || sp.status === "suspended" ? sp.status : "all";
  const role = sp.role === "student" || sp.role === "counselor" || sp.role === "admin" ? sp.role : null;
  const q = typeof sp.q === "string" ? sp.q : "";
  const supabase = await createClient();
  const tz = await getTz();

  let query = supabase.from("profiles").select("id, full_name, username, email, role, status, grade, section, avatar_hue, created_at, counselor_id").order("created_at", { ascending: false }).limit(300);
  if (status !== "all") query = query.eq("status", status);
  if (role) query = query.eq("role", role);
  const term = ilikeTerm(q);
  if (term) query = query.or(`full_name.ilike.${term},username.ilike.${term},email.ilike.${term}`);

  const [{ data: users }, { data: all }] = await Promise.all([query, supabase.from("profiles").select("status")]);
  const counts = {
    all: all?.length ?? 0,
    pending: all?.filter((u) => u.status === "pending").length ?? 0,
    active: all?.filter((u) => u.status === "active").length ?? 0,
    suspended: all?.filter((u) => u.status === "suspended").length ?? 0,
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="People" description="Approve counselor accounts, change roles, and pause access when needed." />
      <Suspense>
        <ListFilters
          tabs={[
            { value: "all", label: "Everyone", count: counts.all },
            { value: "pending", label: "Awaiting approval", count: counts.pending },
            { value: "active", label: "Active", count: counts.active },
            { value: "suspended", label: "Paused", count: counts.suspended },
          ]}
          searchPlaceholder="Search people"
          extra={<RoleFilter value={role ?? ""} />}
        />
      </Suspense>
      <Card className="mt-5 overflow-hidden">
        {users?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-2/50">
                <tr className="text-left text-xs text-ink-3">
                  <th className="px-5 py-3 font-medium">Person</th>
                  <th className="hidden px-3 py-3 font-medium md:table-cell">Role</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="hidden px-3 py-3 font-medium lg:table-cell">Joined</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((u) => (
                  <tr key={u.id} className="transition hover:bg-surface-2/40">
                    <td className="px-4 py-3 sm:px-5">
                      <span className="flex items-center gap-3">
                        <Avatar name={u.full_name} hue={u.avatar_hue} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">
                            {u.full_name}
                            {u.id === viewer.id && <span className="font-normal text-ink-3"> (you)</span>}
                          </span>
                          <span className="block truncate text-xs text-ink-3">
                            @{u.username}
                            {u.email ? ` · ${u.email}` : ""}
                          </span>
                          <span className="block text-xs text-ink-2 md:hidden">{ROLE_LABEL[u.role]}</span>
                        </span>
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 text-ink-2 md:table-cell">
                      {ROLE_LABEL[u.role]}
                      {u.role === "student" && (u.grade || u.section) && <span className="text-ink-3"> · {[u.grade, u.section].filter(Boolean).join(", ")}</span>}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={u.status === "active" ? "resolved" : u.status === "pending" ? "pending" : "neutral"} dot>
                        {u.status === "active" ? "Active" : u.status === "pending" ? "Pending" : "Paused"}
                      </Badge>
                    </td>
                    <td className="hidden px-3 py-3 text-ink-3 lg:table-cell">{formatDate(u.created_at, tz, true)}</td>
                    <td className="px-4 py-3 text-right sm:px-5">{u.id !== viewer.id && <UserActions user={u} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<SearchX />} title="No one matches" description="Try a different filter or search." />
        )}
      </Card>
    </div>
  );
}
