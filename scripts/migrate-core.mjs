// Applies supabase/migrations/*.sql to the database. Used by the build
// (scripts/migrate.mjs) and, as a fallback, by the running site when it finds
// the tables missing.
//
// Connects with a direct Postgres URL, e.g. the variables the Vercel ↔ Supabase
// integration adds (POSTGRES_URL_NON_POOLING / POSTGRES_URL).
//
// Applied versions are recorded in supabase_migrations.schema_migrations, the
// same table the Supabase CLI uses. A migration may start with
//   -- skip-if: <sql returning one boolean>
// so schemas created by hand (SQL editor) are detected instead of re-run.
import postgres from "postgres";

export function databaseUrls() {
  return [
    ...new Set(
      [
        process.env.POSTGRES_URL_NON_POOLING,
        process.env.SUPABASE_DB_URL,
        process.env.DATABASE_URL,
        process.env.POSTGRES_URL, // pooled fallback (IPv4) if the direct host isn't reachable
      ].filter(Boolean),
    ),
  ];
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

/**
 * @param {{ migrations: { file: string; sql: string }[]; log?: (m: string) => void }} options
 * @returns {Promise<{ status: "skipped" | "unreachable" | "ok" | "failed", applied: string[], error?: string }>}
 */
export async function runMigrations({ migrations, log = console.log }) {
  const urls = databaseUrls();
  if (!urls.length) return { status: "skipped", applied: [] };

  let sql;
  for (const raw of urls) {
    const attempt = connect(raw);
    try {
      await attempt`select 1`;
      sql = attempt;
      break;
    } catch (e) {
      log(`[migrate] Connection to ${new URL(raw).hostname} failed (${e.message}).`);
      await attempt.end({ timeout: 1 }).catch(() => {});
    }
  }
  if (!sql) return { status: "unreachable", applied: [] };

  const applied = [];
  try {
    // Everything runs in one transaction with a transaction-scoped lock, so the
    // build and a first page view can't race (safe behind poolers, too).
    await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(727274)`;
      await tx`create schema if not exists supabase_migrations`;
      await tx`create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text)`;
      const done = new Set((await tx`select version from supabase_migrations.schema_migrations`).map((r) => r.version));
      for (const { file, sql: body } of [...migrations].sort((a, b) => a.file.localeCompare(b.file))) {
        const [version, ...rest] = file.replace(/\.sql$/, "").split("_");
        const name = rest.join("_");
        if (done.has(version)) continue;

        const skipIf = body.match(/^--\s*skip-if:\s*(.+)$/m)?.[1];
        const [row] = skipIf ? await tx.unsafe(skipIf) : [];
        if (row && Object.values(row)[0] === true) {
          log(`[migrate] ${file} already present, recorded.`);
        } else {
          await tx.unsafe(body);
          applied.push(file);
          log(`[migrate] Applied ${file}`);
        }
        await tx`insert into supabase_migrations.schema_migrations (version, name) values (${version}, ${name})`;
      }
      // Make the Supabase API pick up new tables/functions (sent on commit).
      await tx`notify pgrst, 'reload schema'`;
    });
    log("[migrate] Database is up to date.");
    return { status: "ok", applied };
  } catch (e) {
    log(`[migrate] Migration failed: ${e.message}`);
    return { status: "failed", applied: [], error: e.message };
  } finally {
    await sql.end({ timeout: 5 });
  }
}
