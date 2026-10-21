// Runs during `npm run build`. Never fails the build: if the database can't be
// prepared here, the site retries on first visit and explains what's wrong.
import { runMigrations } from "./migrate-core.mjs";
import { migrationsFromDisk } from "./migrations-from-disk.mjs";

const result = await runMigrations({ migrations: await migrationsFromDisk() });
if (result.status === "skipped") console.log("[migrate] No database URL set, skipping automatic migrations.");
if (result.status === "unreachable") console.warn("[migrate] Could not reach the database during the build. The site will retry at runtime.");
if (result.status === "failed") console.error("[migrate] ⚠ Database setup failed during the build. The site will retry at runtime. Error above.");
