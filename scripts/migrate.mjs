// Applies supabase/migrations/*.sql to the database during `npm run build`.
//
// Runs only when a direct Postgres URL is available — e.g. the variables the
// Vercel ↔ Supabase integration adds (POSTGRES_URL_NON_POOLING). Without one it
// does nothing, and you apply the SQL yourself (see README).
//
// Applied versions are recorded in supabase_migrations.schema_migrations, the
// same table the Supabase CLI uses. A migration may start with
//   -- skip-if: <sql returning one boolean>
// so schemas created by hand (SQL editor) are detected instead of re-run.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const candidates = [
  process.env.POSTGRES_URL_NON_POOLING,
  process.env.SUPABASE_DB_URL,
  process.env.DATABASE_URL,
  process.env.POSTGRES_URL, // pooled fallback (IPv4) if the direct host isn't reachable
].filter(Boolean);

if (!candidates.length) {
  console.log("[migrate] No database URL set — skipping automatic migrations.");
  process.exit(0);
}

function connect(raw) {
  // Keep only sslmode; integration URLs can carry extra params Postgres rejects.
  const url = new URL(raw);
  for (const key of [...url.searchParams.keys()]) if (key !== "sslmode") url.searchParams.delete(key);
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  return postgres(url.toString(), {
    ssl: local ? false : "require",
    max: 1,
    onnotice: () => {},
    connect_timeout: 15,
    prepare: false,
  });
}

let sql;
for (const raw of [...new Set(candidates)]) {
  const attempt = connect(raw);
  try {
    await attempt`select 1`;
    sql = attempt;
    break;
  } catch (e) {
    console.warn(`[migrate] Connection to ${new URL(raw).hostname} failed (${e.message}).`);
    await attempt.end({ timeout: 1 }).catch(() => {});
  }
}
if (!sql) {
  console.warn("[migrate] Could not reach the database — skipping. Apply supabase/migrations manually if needed.");
  process.exit(0);
}

const dir = path.join(process.cwd(), "supabase", "migrations");

try {
  await sql`create schema if not exists supabase_migrations`;
  await sql`create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text)`;
  const applied = new Set((await sql`select version from supabase_migrations.schema_migrations`).map((r) => r.version));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const [version, ...rest] = file.replace(/\.sql$/, "").split("_");
    const name = rest.join("_");
    if (applied.has(version)) continue;
    const body = await readFile(path.join(dir, file), "utf8");

    const skipIf = body.match(/^--\s*skip-if:\s*(.+)$/m)?.[1];
    if (skipIf) {
      const [row] = await sql.unsafe(skipIf);
      if (row && Object.values(row)[0] === true) {
        await sql`insert into supabase_migrations.schema_migrations (version, name) values (${version}, ${name})`;
        console.log(`[migrate] ${file} already present — recorded.`);
        continue;
      }
    }

    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into supabase_migrations.schema_migrations (version, name) values (${version}, ${name})`;
    });
    console.log(`[migrate] Applied ${file}`);
  }
  // Make the Supabase API pick up new tables/functions immediately.
  await sql`notify pgrst, 'reload schema'`;
  console.log("[migrate] Database is up to date.");
} catch (e) {
  console.error(`[migrate] Migration failed: ${e.message}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
