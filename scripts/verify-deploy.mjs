/* Post-deploy check: is the host actually serving the built site?
 *
 * This exists because of one mistake that keeps disguising itself. Uploading the
 * repository instead of dist/ works right up to the first paint: Apache happily
 * serves the source index.html, the browser then asks for __SITE_BASE__/styles.css,
 * and the page renders as bare HTML — no styling, no scripts. No build log shows
 * that, and the Vercel deployment, which only ever sees a build, can look perfect
 * at the same time.
 *
 * So this asks the deployed host the same questions a browser does.
 *
 * Usage:
 *   npm run verify:deploy                # checks https://aayushkumar.ca/portfolio
 *   npm run verify:deploy -- <url>       # checks anything else
 */

const DEFAULT_TARGET = "https://aayushkumar.ca/portfolio";

const target = (process.argv[2] || DEFAULT_TARGET).replace(/\/+$/, "");

let failures = 0;

const tick = (label, detail) => console.log(`  \u001b[32m\u2713\u001b[0m ${label.padEnd(9)} ${detail}`);

function cross(label, detail) {
  failures += 1;
  console.log(`  \u001b[31m\u2717\u001b[0m ${label.padEnd(9)} ${detail}`);
}

/** Fetch a path under the target; null when the host cannot be reached. */
async function fetchPath(path) {
  try {
    return await fetch(`${target}${path}`, { redirect: "manual" });
  } catch {
    return null;
  }
}

/** Assert a path answers 200 with the expected content type. */
async function checkFile(label, path, expectedType) {
  const response = await fetchPath(path);
  if (!response) return cross(label, `${path} → unreachable`);

  const type = (response.headers.get("content-type") ?? "").split(";")[0];
  if (response.status !== 200) return cross(label, `${path} → HTTP ${response.status}`);
  if (expectedType && !type.includes(expectedType)) {
    return cross(label, `${path} → 200, but served as ${type}`);
  }

  tick(label, `${path} → 200 ${type}`);
  return response;
}

console.log(`\n  checking ${target}\n`);

const home = await checkFile("page", "/", "html");
const html = home?.status === 200 ? await home.text() : "";

if (html) {
  /* The fingerprint of a raw upload: build placeholders still in the markup. */
  const tokens = [...new Set(html.match(/__SITE_[A-Z]+__/g) ?? [])];
  if (tokens.length) {
    cross("tokens", `${tokens.join(", ")} left in the markup — serving the repository, not dist/`);
  } else {
    tick("tokens", "no build placeholders left");
  }

  const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1];
  if (canonical === `${target}/`) tick("canonical", canonical);
  else cross("canonical", canonical ? `points at ${canonical}, expected ${target}/` : "missing");

  /* Everything the page loads: stylesheet, script, favicon. */
  const assets = [
    ...new Set([...html.matchAll(/(?:href|src)="([^"]+\.(?:css|js|svg))"/g)].map((m) => m[1])),
  ];

  for (const asset of assets) {
    const url = asset.startsWith("http") ? asset : new URL(asset, `${target}/`).href;

    let response = null;
    try {
      response = await fetch(url, { redirect: "manual" });
    } catch {
      /* reported as unreachable below */
    }

    const type = (response?.headers.get("content-type") ?? "").split(";")[0];
    if (response?.status === 200) tick("asset", `${asset} → 200 ${type}`);
    else cross("asset", `${asset} → ${response ? `HTTP ${response.status}` : "unreachable"}`);
  }
}

/* The extensionless routes the links and canonical tags use. A 404 here while
   the .html URL works means the .htaccess rewrite never reached the host. */
for (const route of ["/projects", "/about"]) {
  const response = await fetchPath(route);
  if (response?.status === 200) {
    tick("route", `${route} → 200`);
    continue;
  }

  const fallback = await fetchPath(`${route}.html`);
  cross(
    "route",
    `${route} → ${response ? `HTTP ${response.status}` : "unreachable"}` +
      (fallback?.status === 200 ? ` (but ${route}.html works — the .htaccess file is missing)` : "")
  );
}

await checkFile("robots", "/robots.txt", "text/plain");

const sitemap = await checkFile("sitemap", "/sitemap.xml", "xml");
if (sitemap?.status === 200) {
  const locs = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const outside = locs.filter((loc) => !loc.startsWith(`${target}/`));

  if (!locs.length) cross("locs", "sitemap lists no URLs");
  else if (outside.length) cross("locs", `outside the site: ${outside.slice(0, 2).join(", ")}`);
  else tick("locs", `${locs.length} URLs, all under ${target}/`);
}

if (failures) {
  console.log(`\n  ${failures} check${failures === 1 ? "" : "s"} failed — the host is not serving the build.\n`);
} else {
  console.log("\n  all checks passed.\n");
}

process.exit(failures ? 1 : 0);
