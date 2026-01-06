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

function readFileContent(relPath) {
  const full = path.join(root, relPath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf8");
}

function fileContains(relPath, substr) {
  const content = readFileContent(relPath);
  if (!content) return false;
  return content.toLowerCase().includes(substr.toLowerCase());
}

function checkAllFunctionsExist(filePath, functionNames) {
  const content = readFileContent(filePath);
  if (!content) return { found: [], missing: functionNames };
  const lowerContent = content.toLowerCase();
  const found = [];
  const missing = [];
  for (const fnName of functionNames) {
    if (lowerContent.includes(`function public.${fnName.toLowerCase()}`) ||
        lowerContent.includes(`function ${fnName.toLowerCase()}`)) {
      found.push(fnName);
    } else {
      missing.push(fnName);
    }
  }
  return { found, missing };
}

function checkLensImportsShareActionsBar(lensPath) {
  const content = readFileContent(lensPath);
  if (!content) return false;
  return content.includes("ShareActionsBar") || 
         content.includes("from") && content.includes("ShareActionsBar");
}

function checkExports(filePath, exportNames) {
  const content = readFileContent(filePath);
  if (!content) return { found: [], missing: exportNames };
  const found = [];
  const missing = [];
  for (const expName of exportNames) {
    if (content.includes(`export function ${expName}`) ||
        content.includes(`export const ${expName}`) ||
        content.includes(`export async function ${expName}`)) {
      found.push(expName);
    } else {
      missing.push(expName);
    }
  }
  return { found, missing };
}

function checkRouteActivelyUsed(routePath) {
  // Check if route is actively used (referenced in code, not just comments)
  if (!exists(routePath)) return false;
  
  // Check for actual usage patterns (not comments)
  const searchPatterns = [
    /href=["']\/shared\/open/,  // Link href
    /router\.push\(["']\/shared\/open/,  // Router navigation
    /useRouter.*\/shared\/open/,  // Router usage
    /Link.*to=["']\/shared\/open/,  // Next.js Link
  ];
  
  // Check common files that might reference routes
  const checkFiles = [
    "src/app/layout.tsx",
    "src/app/page.tsx",
    "src/app/shared/page.tsx",
  ];
  
  // Also check all files in shared directory
  const sharedFiles = listFiles("src/app/shared").map(f => `src/app/shared/${f}`);
  
  for (const checkFile of [...checkFiles, ...sharedFiles]) {
    const content = readFileContent(checkFile);
    if (!content) continue;
    
    // Skip if it's the route file itself
    if (checkFile === routePath) continue;
    
    // Check for actual usage patterns (not in comments)
    const lines = content.split("\n");
    for (const line of lines) {
      // Skip comment lines
      if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;
      
      for (const pattern of searchPatterns) {
        if (pattern.test(line)) return true;
      }
    }
  }
  
  return false; // Not actively used
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
  () => {
    const rpcFile = "supabase/migrations/023_entries_rpcs.sql";
    const canonicalRPCs = ["list_entries", "insert_entry", "soft_delete_entry", "restore_entry", "delete_entry"];
    if (exists(rpcFile)) {
      const check = checkAllFunctionsExist(rpcFile, canonicalRPCs);
      if (check.missing.length === 0) {
        line(true, "canonical RPC surface complete", `all 5 functions in 023`);
      } else {
        warn("canonical RPC surface incomplete", `missing: ${check.missing.join(", ")}`);
      }
    } else {
      line(false, "canonical RPC surface", "023_entries_rpcs.sql not found");
    }
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
  () => {
    const coreLenses = ["weekly", "summary", "timeline", "distributions", "yearly", "yoy", "lifetime"];
    const lensesWithShareActionsBar = coreLenses.filter(lens => {
      const lensPath = `src/app/insights/${lens}/page.tsx`;
      return exists(lensPath) && checkLensImportsShareActionsBar(lensPath);
    });
    const missing = coreLenses.filter(lens => {
      const lensPath = `src/app/insights/${lens}/page.tsx`;
      return exists(lensPath) && !checkLensImportsShareActionsBar(lensPath);
    });
    if (missing.length === 0 && lensesWithShareActionsBar.length === coreLenses.length) {
      line(true, "all lenses use ShareActionsBar", `${lensesWithShareActionsBar.length}/${coreLenses.length}`);
    } else if (lensesWithShareActionsBar.length > 0) {
      warn("some lenses missing ShareActionsBar", missing.length > 0 ? `missing: ${missing.join(", ")}` : "");
    } else {
      line(false, "lenses use ShareActionsBar", "none found");
    }
  },
]);

section("Meaning", [
  () => line(meaningBridgesDir, "meaning bridges module", meaningBridgesDir ? "" : "missing"),
  () => line(threadsRoutes, "threads routes present", threadsRoutes ? "" : "missing"),
  () => line(pinsRoutes, "pins routes present", pinsRoutes ? "" : "missing"),
  () => line(mindRoute, "mind route present", mindRoute ? "" : "missing"),
  () => {
    const bridgeFile = "src/app/lib/meaningBridges/buildNarrativeBridge.ts";
    const expectedExports = ["buildNarrativeBridges", "DEFAULT_BRIDGE_WEIGHTS"];
    if (exists(bridgeFile)) {
      const check = checkExports(bridgeFile, expectedExports);
      if (check.missing.length === 0) {
        line(true, "buildNarrativeBridge exports complete", check.found.join(", "));
      } else {
        warn("buildNarrativeBridge exports incomplete", `missing: ${check.missing.join(", ")}`);
      }
    } else {
      line(false, "buildNarrativeBridge exports", "file not found");
    }
  },
]);

section("Distribution", [
  () => line(hasSharePackType, "SharePack type present"),
  () => line(hasSharePackRenderer, "SharePack renderer present"),
  () => line(hasShareActionsBar, "Share actions bar present"),
  () => line(hasWalletSharesLib, "wallet_shares canonical library present"),
  () => {
    if (legacyShareRoutes.length) {
      const activelyUsed = legacyShareRoutes.filter(route => checkRouteActivelyUsed(route));
      const orphaned = legacyShareRoutes.filter(route => !checkRouteActivelyUsed(route));
      if (orphaned.length === legacyShareRoutes.length) {
        warn("legacy routes present but orphaned", legacyShareRoutes.map(r => {
          const parts = r.split("/");
          return parts[parts.length - 2] === "[id]" ? `${parts[parts.length - 3]}/[id]` : parts[parts.length - 2];
        }).join(", "));
      } else if (activelyUsed.length > 0) {
        warn("legacy routes still actively referenced", activelyUsed.map(r => {
          const parts = r.split("/");
          return parts[parts.length - 2] === "[id]" ? `${parts[parts.length - 3]}/[id]` : parts[parts.length - 2];
        }).join(", "));
      }
    } else {
      line(true, "no legacy share routes detected");
    }
  },
]);

section("Sources and migrations", [
  () => line(sourcesMigrations.length > 0, "sources related migrations present", sourcesMigrations.length ? sourcesMigrations.join(", ") : "none"),
]);

header("Notes");
console.log("This script reports existence only.");
console.log("It does not claim correctness or completeness.");
console.log("Use it as a daily compass, not a spec.");

