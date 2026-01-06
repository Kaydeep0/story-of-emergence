#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function listDirs(relDir) {
  const full = path.join(root, relDir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function listFiles(relDir) {
  const full = path.join(root, relDir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name);
}

function findMigrationContains(substr) {
  const dir = path.join(root, "supabase/migrations");
  if (!fs.existsSync(dir)) return [];
  const matches = [];
  const lowerSubstr = substr.toLowerCase();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".sql")) continue;
    const full = path.join(dir, file);
    const txt = fs.readFileSync(full, "utf8");
    if (txt.toLowerCase().includes(lowerSubstr)) matches.push(file);
  }
  return matches;
}

function header(title) {
  console.log(`\n${title}`);
}

function line(ok, label, detail = "") {
  const icon = ok ? "✓" : "✗";
  const suffix = detail ? `  ${detail}` : "";
  console.log(`${icon} ${label}${suffix}`);
}

function warn(label, detail = "") {
  const icon = "⚠";
  const suffix = detail ? `  ${detail}` : "";
  console.log(`${icon} ${label}${suffix}`);
}

function section(title, rows) {
  header(title);
  for (const r of rows) r();
}

console.log("Story of Emergence  Capability Snapshot");
console.log(`Repo  ${path.basename(root)}`);
console.log(`Time  ${new Date().toISOString()}`);

const lensDirNames = listDirs("src/app/insights");
const lensPages = lensDirNames
  .filter((d) => exists(`src/app/insights/${d}/page.tsx`))
  .sort();

const hasEntriesMigration =
  exists("supabase/migrations/022_create_entries_table.sql") ||
  findMigrationContains("create table public.entries").length > 0;

const hasWalletSharesLib = exists("src/app/lib/wallet_shares.ts");
const hasSharePackType = exists("src/app/lib/share/sharePack.ts");
const hasSharePackRenderer = exists("src/app/lib/share/SharePackRenderer.tsx");
const hasShareActionsBar = exists("src/app/insights/components/ShareActionsBar.tsx");

const legacyShareRoutes = [
  "src/app/shared/open/page.tsx",
  "src/app/shared/open/[id]/page.tsx",
].filter((p) => exists(p));

const meaningBridgesDir = exists("src/app/lib/meaningBridges");
const threadsRoutes =
  exists("src/app/reflections/thread/page.tsx") ||
  exists("src/app/reflections/thread/[id]/page.tsx") ||
  exists("src/app/threads");
const pinsRoutes = exists("src/app/reflections/pins/page.tsx");
const mindRoute = exists("src/app/reflections/mind/page.tsx");

const sourcesMigrations = listFiles("supabase/migrations")
  .filter((f) => f.includes("sources") && f.endsWith(".sql"))
  .sort();

section("Vault", [
  () => line(hasEntriesMigration, "entries schema in migrations", hasEntriesMigration ? "" : "missing"),
  () => {
    const entryRPC = findMigrationContains("create or replace function public.list_entries");
    line(entryRPC.length > 0, "entries RPCs present", entryRPC.length ? entryRPC[0] : "not found");
  },
]);

section("Lens", [
  () => line(lensPages.length > 0, "lenses discovered", lensPages.length ? lensPages.join(", ") : "none"),
  () => line(exists("src/app/insights/weekly/page.tsx"), "weekly"),
  () => line(exists("src/app/insights/summary/page.tsx"), "summary"),
  () => line(exists("src/app/insights/timeline/page.tsx"), "timeline"),
  () => line(exists("src/app/insights/distributions/page.tsx"), "distributions"),
  () => line(exists("src/app/insights/yearly/page.tsx"), "yearly"),
  () => line(exists("src/app/insights/yoy/page.tsx"), "yoy"),
  () => line(exists("src/app/insights/lifetime/page.tsx"), "lifetime"),
]);

section("Meaning", [
  () => line(meaningBridgesDir, "meaning bridges module", meaningBridgesDir ? "" : "missing"),
  () => line(threadsRoutes, "threads routes present", threadsRoutes ? "" : "missing"),
  () => line(pinsRoutes, "pins routes present", pinsRoutes ? "" : "missing"),
  () => line(mindRoute, "mind route present", mindRoute ? "" : "missing"),
]);

section("Distribution", [
  () => line(hasSharePackType, "SharePack type present"),
  () => line(hasSharePackRenderer, "SharePack renderer present"),
  () => line(hasShareActionsBar, "Share actions bar present"),
  () => line(hasWalletSharesLib, "wallet_shares canonical library present"),
  () => {
    if (legacyShareRoutes.length) warn("legacy share routes still present", legacyShareRoutes.join(", "));
    else line(true, "no legacy share routes detected");
  },
]);

section("Sources and migrations", [
  () => line(sourcesMigrations.length > 0, "sources related migrations present", sourcesMigrations.length ? sourcesMigrations.join(", ") : "none"),
]);

header("Notes");
console.log("This script reports existence only.");
console.log("It does not claim correctness or completeness.");
console.log("Use it as a daily compass, not a spec.");

