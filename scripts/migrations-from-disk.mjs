import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export async function migrationsFromDisk(dir = path.join(process.cwd(), "supabase", "migrations")) {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  return Promise.all(files.map(async (file) => ({ file, sql: await readFile(path.join(dir, file), "utf8") })));
}
