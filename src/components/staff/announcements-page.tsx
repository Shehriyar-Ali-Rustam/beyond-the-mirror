import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTz } from "@/lib/tz";
import { AUDIENCES } from "@/lib/constants";
import type { Audience, Profile } from "@/lib/types";
import { PageHeader } from "@/components/shell/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AnnouncementList } from "@/components/shared/announcement-list";
import { AnnouncementForm } from "./announcement-form";
import { AnnouncementActions } from "./announcement-actions";

export async function AnnouncementsPage({ viewer }: { viewer: Profile }) {
  const supabase = await createClient();
  const tz = await getTz();
  const { data: items } = await supabase
    .from("announcements")
    .select("*")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  const ids = [...new Set((items ?? []).map((a) => a.author_id))];
  const { data: authors } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const authorMap = Object.fromEntries((authors ?? []).map((a) => [a.id, a.full_name]));
  const audiences: Audience[] = viewer.role === "admin" ? ["everyone", "all_students", "counselors"] : ["my_students", "all_students", "counselors"];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Announcements" description="Share drop-in hours, workshops and reminders. Students see them on their home page and under Resources." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader title="Published" />
          <CardBody className="pt-4">
            {items?.length ? (
              <AnnouncementList
                items={items}
                authors={authorMap}
                tz={tz}
                actions={(a) => (
                  <div className="flex items-center gap-2">
                    <Badge tone="outline">{AUDIENCES[a.audience]}</Badge>
                    {(a.author_id === viewer.id || viewer.role === "admin") && <AnnouncementActions id={a.id} pinned={a.pinned} />}
                  </div>
                )}
              />
            ) : (
              <EmptyState compact icon={<Megaphone />} title="Nothing published yet" description="Your first announcement will appear here." />
            )}
          </CardBody>
        </Card>
        <aside>
          <Card className="lg:sticky lg:top-24">
            <CardHeader title="New announcement" />
            <CardBody>
              <AnnouncementForm audiences={audiences} />
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
