import { readFileSync } from "fs";

// Read from environment variables (set via .env or shell)
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN env vars");
  process.exit(1);
}

// Convert libsql:// URL to HTTPS for the HTTP API
const httpUrl = TURSO_URL.replace("libsql://", "https://");

async function executeSQL(stmt: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${httpUrl}/v2/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TURSO_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql: stmt } },
        { type: "close" },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `HTTP ${res.status}: ${text}` };
  }

  const data = await res.json();
  const results = (data as { results?: Array<{ type: string; error?: { message: string } }> }).results;
  if (results && results[0]?.type === "error") {
    return { ok: false, error: results[0].error?.message ?? "Unknown error" };
  }

  return { ok: true };
}

async function main() {
  const sql = readFileSync("prisma/turso-schema.sql", "utf8");
  const statements = sql
    .split(";")
    .map((s: string) =>
      s
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("--") && !line.startsWith("Loaded"))
        .join("\n")
        .trim()
    )
    .filter((s: string) => s.length > 0);

  console.log(`Applying ${statements.length} statements to Turso...`);

  let ok = 0;
  let skip = 0;
  for (const stmt of statements) {
    const result = await executeSQL(stmt);
    if (result.ok) {
      ok++;
      console.log(`✓ ${stmt.substring(0, 60)}...`);
    } else {
      skip++;
      console.log(`⊘ SKIP: ${(result.error ?? "").substring(0, 80)}`);
    }
  }
  console.log(`\nDone! ${ok} applied, ${skip} skipped`);
}

main();
