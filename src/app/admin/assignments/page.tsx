import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchX } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ListFilters } from "@/components/shared/list-filters";
import { AssignSelect } from "@/components/admin/assign-select";

export const metadata: Metadata = { title: "Assignments" };

export default async function AdminAssignments({ searchParams }: PageProps<"/admin/assignments">) {
  await requireRole("admin");
  const sp = await searchParams;
  const view = sp.status === "unassigned" ? "unassigned" : "all";
  const q = typeof sp.q === "string" ? sp.q.toLowerCase().trim() : "";
  const supabase = await createClient();

  const [{ data: students }, { data: counselors }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, username, grade, section, avatar_hue, counselor_id").eq("role", "student").eq("status", "active").order("full_name").limit(1000),
    supabase.from("profiles").select("id, full_name").eq("role", "counselor").eq("status", "active").order("full_name"),
  ]);
  const load = new Map<string, number>();
  for (const s of students ?? []) if (s.counselor_id) load.set(s.counselor_id, (load.get(s.counselor_id) ?? 0) + 1);
  const options = (counselors ?? []).map((c) => ({ id: c.id, name: c.full_name, load: load.get(c.id) ?? 0 }));
  const unassigned = (students ?? []).filter((s) => !s.counselor_id).length;
  const rows = (students ?? [])
    .filter((s) => view === "all" || !s.counselor_id)
    .filter((s) => !q || s.full_name.toLowerCase().includes(q) || s.username.includes(q) || (s.grade ?? "").toLowerCase().includes(q))
    .sort((a, b) => Number(!!a.counselor_id) - Number(!!b.counselor_id));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Assignments"
        description="Match each student with a counselor. Open requests move to the new counselor so nothing is dropped. Students without one are auto-matched to the lightest caseload when they first write in."
      />
      <Suspense>
        <ListFilters
          tabs={[
            { value: "all", label: "All students", count: students?.length ?? 0 },
            { value: "unassigned", label: "Unassigned", count: unassigned },
          ]}
          searchPlaceholder="Search students"
        />
      </Suspense>
      <Card className="mt-5 overflow-hidden">
        {rows.length ? (
          <ul className="divide-y divide-line">
            {rows.map((s) => (
              <li key={s.id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center">
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={s.full_name} hue={s.avatar_hue} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{s.full_name}</span>
                    <span className="block truncate text-xs text-ink-3">
                      @{s.username}
                      {s.grade || s.section ? ` · ${[s.grade, s.section].filter(Boolean).join(", ")}` : ""}
                    </span>
                  </span>
                </span>
                <AssignSelect studentId={s.id} current={s.counselor_id} counselors={options} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<SearchX />} title={view === "unassigned" ? "Everyone has a counselor" : "No students found"} description={view === "unassigned" ? "Nice, every active student is matched." : "Try a different search."} />
        )}
      </Card>
    </div>
  );
}
