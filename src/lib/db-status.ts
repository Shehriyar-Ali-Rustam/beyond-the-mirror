import "server-only";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServiceClient, hasServiceKey } from "@/lib/supabase/service";
import { databaseUrls, runMigrations } from "../../scripts/migrate-core.mjs";
import { MIGRATIONS } from "./generated/migrations";

export type DbStatus = "unconfigured" | "no-service-key" | "missing-tables" | "ready";

async function tablesReady() {
  const { error } = await createServiceClient().from("profiles").select("id").limit(1);
  return !error;
}

/**
 * Is the database usable? If it's connected but the tables are missing (e.g.
 * the build couldn't reach it), create them now — the site heals itself.
 */
export const getDatabaseStatus = cache(async (): Promise<DbStatus> => {
  if (!isSupabaseConfigured()) return "unconfigured";
  if (!hasServiceKey()) return "no-service-key";
  if (await tablesReady()) return "ready";

  if (databaseUrls().length) {
    const result = await runMigrations({ migrations: MIGRATIONS, log: (m) => console.log(m) });
    if (result.status === "ok") {
      // The API reloads its schema cache asynchronously; give it a moment.
      for (let i = 0; i < 12; i++) {
        if (await tablesReady()) return "ready";
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }
  return "missing-tables";
});
