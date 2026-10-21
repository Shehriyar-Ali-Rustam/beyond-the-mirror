export function databaseUrls(): string[];
export function runMigrations(options: {
  migrations: { file: string; sql: string }[];
  log?: (message: string) => void;
}): Promise<{ status: "skipped" | "unreachable" | "ok" | "failed"; applied: string[]; error?: string }>;
