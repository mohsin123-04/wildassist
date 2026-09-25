// Run a .sql file against the database, reading the connection string from a
// local file so no password ever goes through the chat/transcript.
//
//   node scripts/run-sql.mjs <path-to-sql-file> [conn-file]
//
// conn-file defaults to /tmp/wa-dburl and should contain just the Postgres
// connection URI (from Supabase: Connect -> Session pooler / URI).
import { readFileSync } from "node:fs";
import pg from "pg";

const sqlPath = process.argv[2];
const connPath = process.argv[3] || "/tmp/wa-dburl";
if (!sqlPath) {
  console.error("usage: node scripts/run-sql.mjs <file.sql> [conn-file]");
  process.exit(1);
}

const connectionString = readFileSync(connPath, "utf8").trim();
const sql = readFileSync(sqlPath, "utf8");

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log(`OK: applied ${sqlPath}`);
} catch (e) {
  console.error("FAILED:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
