/* Package dist/ for a cPanel upload — and prove the archive is complete.
 *
 * This exists because packaging a half-built dist/ fails silently and
 * expensively. The build empties dist/ before the Tailwind step refills it with
 * CSS, so anything that reads dist/ in between gets the pages and the scripts
 * but no styles.css. The archive looks fine, the upload succeeds, and the
 * deployed page then renders as bare HTML — which is exactly how
 * aayushkumar.ca/portfolio spent an evening without a stylesheet.
 *
 * So: assert every file a browser needs is present, archive them, then read the
 * archive back and assert it again.
 *
 * Usage:
 *   npm run deploy:zip      # builds for the subpath, then packages dist/
 */

import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");

/* Everything the deployed site loads, plus what a crawler reads and the server
   config that makes the extensionless routes work. The paths mirror the
   repository, because the pages reference their assets relatively. */
const REQUIRED = [
  "index.html",
  "projects.html",
  "about.html",
  "404.html",
  "styles.css",
  "src/app.js",
  "src/site.js",
  "src/github.js",
  "src/format.js",
  "src/explanations.js",
  "static/favicon.svg",
  "static/avatar.png",
  "robots.txt",
  "sitemap.xml",
  ".htaccess",
];

const run = (command, args) => spawnSync(command, args, { cwd: ROOT, encoding: "utf8" });

/* --- 1. is dist/ complete? ----------------------------------------------- */

const missing = REQUIRED.filter((name) => !existsSync(path.join(DIST, name)));
if (missing.length) {
  console.error(`\n  dist/ is incomplete — missing ${missing.join(", ")}`);
  console.error("  Run `npm run build:domain` first: the Tailwind step is what writes styles.css.\n");
  process.exit(1);
}

const empty = REQUIRED.filter((name) => statSync(path.join(DIST, name)).size === 0);
if (empty.length) {
  console.error(`\n  dist/ contains empty files: ${empty.join(", ")}\n`);
  process.exit(1);
}

/* --- 2. archive ----------------------------------------------------------- */

let archive = "portfolio-upload.zip";
let created = run("tar", ["-a", "-cf", archive, "-C", "dist", "."]);

if (created.status !== 0) {
  /* GNU tar cannot write zip — fall back to the .tar.gz cPanel also extracts. */
  archive = "portfolio-upload.tar.gz";
  created = run("tar", ["-czf", archive, "-C", "dist", "."]);
}

if (created.status !== 0) {
  const reason = created.stderr?.trim() || created.error?.message || "unknown error";
  console.error(`\n  could not create ${archive}: ${reason}\n`);
  process.exit(1);
}

/* --- 3. read the archive back -------------------------------------------- */

const listed = run("tar", ["-tf", archive]);
const entries = (listed.stdout ?? "").split("\n").map((line) => line.replace(/^\.\//, "").trim());
const absent = REQUIRED.filter((name) => !entries.includes(name));

if (absent.length) {
  console.error(`\n  ${archive} is missing ${absent.join(", ")} — do not upload it\n`);
  process.exit(1);
}

console.log(`\n  ${archive} · ${(statSync(path.join(ROOT, archive)).size / 1024).toFixed(0)} kB`);
entries.filter(Boolean).forEach((name) => console.log(`    ${name}`));
console.log("");
console.log("  Upload it into public_html/portfolio/ and extract it there — it");
console.log("  includes the hidden .htaccess — then run `npm run verify:deploy`.");
