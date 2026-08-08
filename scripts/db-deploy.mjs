// Applies the Prisma schema to the database at build time when a connection
// string is present (Vercel / production). Locally, with no DATABASE_URL, it
// skips so `npm run build` still works offline.
import { execSync } from "node:child_process";

if (process.env.DATABASE_URL) {
  console.log("DATABASE_URL found — syncing schema (prisma db push)…");
  execSync("prisma db push --skip-generate --accept-data-loss", {
    stdio: "inherit",
  });
} else {
  console.log("No DATABASE_URL — skipping db push (local build).");
}
