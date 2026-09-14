/* Content smoke test.
 *
 * Both regressions this site has already shipped were the same mistake: a value
 * that belongs in one place, typed out by hand in the pages instead.
 *
 *   - the GitHub account, which lives in SITE.githubUser (src/site.js) but was
 *     also written into the nav pill, the meta descriptions and the JSON-LD,
 *     so the site kept linking to a retired handle after the account changed
 *   - the site domain, which is resolved per build from the __SITE_URL__ token
 *     (build.js) but was baked into canonical/Open Graph tags as a literal
 *
 * The scans below are deliberately about *any* account or domain, not a list of
 * known-bad ones, so they keep working the next time either value changes.
 *
 * Runs on Node's built-in test runner: `npm test`.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { SITE } from "../src/site.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PAGES = ["index.html", "projects.html", "about.html", "404.html"];
const SCRIPTS = [
  "src/app.js",
  "src/explanations.js",
  "src/format.js",
  "src/github.js",
  "src/site.js",
];

/* 404.html is served with `noindex` and is not in the sitemap, so it has no
   canonical tag on purpose. */
const INDEXABLE_PAGES = PAGES.filter((page) => page !== "404.html");

/* Files that users read as well as the ones the browser loads. */
const CONTENT_FILES = [...PAGES, ...SCRIPTS, "README.md"];

const account = SITE.githubUser.toLowerCase();

const read = (file) => readFile(path.join(ROOT, file), "utf8");

/** Every distinct owner in a `github.com/<owner>` URL. */
function githubOwners(text) {
  /* An account name starts and ends alphanumeric, so a trailing full stop from
     prose ("… lived at github.com/octocat.") is not swallowed as part of it. */
  const owners = [...text.matchAll(/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?)/g)].map(
    (match) => match[1]
  );
  return [...new Set(owners)];
}

test("no file links to a GitHub account other than SITE.githubUser", async () => {
  for (const file of CONTENT_FILES) {
    for (const owner of githubOwners(await read(file))) {
      assert.equal(
        owner.toLowerCase(),
        account,
        `${file} links to github.com/${owner}, but the site account is ${SITE.githubUser}`
      );
    }
  }
});

test("no file mentions a handle other than SITE.githubUser", async () => {
  /* Account-shaped tokens — the nav pill, a meta description, a comment — while
     leaving the display name ("Aayush Kumar") and the shell handle ("aayush")
     alone, since neither carries the digits an account name has. */
  const handles = /\baayush[a-z0-9]*\d[a-z0-9]*\b/gi;

  for (const file of CONTENT_FILES) {
    for (const [token] of (await read(file)).matchAll(handles)) {
      assert.equal(
        token.toLowerCase(),
        account,
        `${file} mentions the handle "${token}", but the site account is ${SITE.githubUser}`
      );
    }
  }
});

test("pages leave the site domain to the __SITE_URL__ token", async () => {
  for (const page of PAGES) {
    const hardcoded = (await read(page)).match(
      /https?:\/\/[^\s"'<>]*(?:vercel\.app|netlify\.app|pages\.dev)/gi
    );
    assert.equal(
      hardcoded,
      null,
      `${page} hardcodes ${hardcoded?.join(", ")} — the domain is filled in at build time`
    );
  }
});

test("the theme storage key is the same in every page and in src/app.js", async () => {
  /* Each page's <head> reads the key before paint; src/app.js writes it. They
     cannot import from each other, so this is the guard against the two halves
     of the toggle drifting apart. */
  const key = /const THEME_KEY = "([^"]+)"/.exec(await read("src/app.js"))?.[1];
  assert.ok(key, "src/app.js declares no THEME_KEY");

  for (const page of PAGES) {
    assert.ok(
      (await read(page)).includes(`localStorage.getItem("${key}")`),
      `${page} does not read the "${key}" key that src/app.js writes`
    );
  }
});

test("every indexable page declares a canonical URL through __SITE_URL__", async () => {
  for (const page of INDEXABLE_PAGES) {
    const canonical = /<link[^>]*rel="canonical"[^>]*>/i.exec(await read(page))?.[0];
    assert.ok(canonical, `${page} has no canonical tag`);
    assert.match(
      canonical,
      /href="__SITE_URL__[^"]*"/,
      `${page} has a canonical tag that does not use the __SITE_URL__ token`
    );
  }
});
