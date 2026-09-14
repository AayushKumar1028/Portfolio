# Portfolio — Aayush Kumar

A personal portfolio built as **static HTML + Tailwind CSS + vanilla JavaScript**.
The projects grid is not hardcoded: a single ES module reads the public GitHub API
straight from the browser, so new repositories appear without a rebuild and
without any server.

Three pages — **Home**, **Projects**, **About me & contact** — plus a styled 404.

---

## Stack

| Layer     | Choice                                                     |
| --------- | ---------------------------------------------------------- |
| Markup    | Plain HTML, one file per page (no framework, no router)     |
| Styling   | Tailwind CSS 4, compiled by the Tailwind CLI to one file     |
| Behaviour | One vanilla ES module, plus three small shared helpers       |
| Data      | GitHub REST API v3, called directly from the browser         |

No backend, no database, no third-party services, no trackers.

There is no server to run and nothing to keep alive. The only build step exists
because Tailwind has to compile a stylesheet.

---

## Layout

```
Portfolio/
├── index.html            # home
├── projects.html         # live projects grid
├── about.html            # bio, neofetch block, contact
├── 404.html              # served by Vercel for unknown paths
├── build.js              # build: copies pages, emits robots.txt + sitemap.xml
├── vercel.json           # static build, clean URLs
├── package.json          # Tailwind CLI only
├── src/
│   ├── styles.css        # design tokens (@theme) + component classes
│   ├── app.js            # clock, reveals, GitHub rendering, filters, mailto
│   ├── github.js         # API client, session cache, bundled fallback
│   ├── format.js         # date / number / colour helpers
│   └── site.js           # name, email, GitHub handle
├── static/
│   └── favicon.svg
└── dist/                 # build output (gitignored)
```

---

## Requirements

- Node.js 20+ — **build time only**, for the Tailwind CLI. Nothing runs in
  production except static files.

## Setup

```bash
npm install
npm run build      # writes dist/
npm run serve      # preview dist/ on http://localhost:3000
npm test           # content smoke test
```

While editing styles, run the CSS watcher in a second terminal:

```bash
npm run watch:css
```

`npm run build:dev` is the same as `build` but skips CSS minification.

`npm test` runs the content smoke test in `test/` on Node's built-in runner. It
fails when a page hardcodes the GitHub account or the site domain instead of
reading them from `src/site.js` and the `__SITE_URL__` token.

> Links are written extensionless (`/projects`), which is what `cleanUrls` in
> `vercel.json` serves and what the canonical tags point at. `npm run serve`
> resolves those; a bare `python3 -m http.server` inside `dist/` will not, so
> use `/projects.html` if you preview that way.

---

## Configuration

The one setting worth knowing about is the public URL, which fills in the
canonical tags, `robots.txt` and `sitemap.xml`. **Nothing is hardcoded** — it is
resolved once per build, in this order:

1. `VITE_SITE_URL` or `SITE_URL`, if set — use either to pin a domain.
2. `VERCEL_PROJECT_PRODUCTION_URL` — Vercel's production domain for the project:
   the primary custom domain once you add one, otherwise the `*.vercel.app` one.
   Set on every deployment, previews included.
3. `VERCEL_URL` — the per-deployment URL.
4. `http://127.0.0.1:5173` — local builds.

The result is printed at the top of every build as `site url → …`, so a wrong
domain shows up immediately instead of being baked into the sitemap. Add a
domain to a local build by copying `.env.example` to `.env`; on Vercel, set
`VITE_SITE_URL` under Project → Settings → Environment Variables when you want
to override the detected domain.

---

## Deploying to Vercel

This is now a plain static site, so the deploy is the ordinary path — **no
Services, no beta features, no framework preset to get right**:

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new), leaving the root
   directory as the repository root.
3. Leave the framework preset as **Other/None**. `vercel.json` already sets
   `buildCommand`, `outputDirectory: dist` and `cleanUrls`, and pins
   `framework: null` so nothing can be auto-detected as something else.
4. Add environment variables if you want to override anything — only
   `VITE_SITE_URL` is read.
5. Deploy. Every push to the default branch redeploys, and pull requests get a
   preview URL.

> **If you are coming from the old Flask + React version and hit a 404:** that
> build needed the project's framework set to *Services*, and 404'd every path
> when it wasn't. That requirement is gone — this version must **not** be set to
> Services. `framework: null` in `vercel.json` is correct.

---

## Getting found on Google

Being crawlable is the whole job here — there is nothing to submit beyond the
sitemap. What is in place:

| Piece                    | Where                       | What it does                                   |
| ------------------------ | --------------------------- | ---------------------------------------------- |
| `robots.txt`             | generated by `build.js`     | allows all crawlers, points at the sitemap      |
| `sitemap.xml`            | generated by `build.js`     | lists `/`, `/projects`, `/about` with `lastmod` |
| Canonical URL            | each page's `<head>`        | one URL per page, so variants are not duplicates |
| Open Graph / Twitter     | each page's `<head>`        | how the link renders in Slack, Discord, X       |
| JSON-LD                  | `index.html`                | `Person` + `WebSite` data, so a name search resolves to you |
| `noindex` on 404         | `404.html`                  | junk URLs never enter the index                 |

Because every page is a real HTML file, all of this **is the served markup** —
there is no empty `<div id="root">` for a crawler to trip over, and no
client-side head rewriting.

### Making it show up in search

1. Deploy, then confirm `https://<your-domain>/robots.txt` and `/sitemap.xml`
   load and show *your* domain.
2. Add a **URL prefix** property for the domain at
   [search.google.com/search-console](https://search.google.com/search-console).
3. Verify ownership. Either method works:
   - **HTML tag** — paste it into `index.html`, replacing the commented-out
     `google-site-verification` placeholder.
   - **DNS TXT record** — needs a custom domain; nothing to change in this repo.
4. **URL inspection → Request indexing** for the root URL, then submit
   `sitemap.xml` under **Sitemaps**.
5. Wait. Indexing usually takes a few days. Searching your exact domain or name
   returns the site once it is in the index; no code can promise a ranking for
   competitive terms.

One thing is deliberately missing: `og:image`. Social previews want a 1200×630
PNG or JPG and none exists here. Drop one into `static/` and add `og:image` /
`twitter:image` tags to the pages to get rich link previews — it affects
sharing, not search indexing.

---

## How the live data works

`src/github.js` calls `api.github.com` directly from the visitor's browser.
GitHub sends `access-control-allow-origin: *`, so no proxy is needed.

- Two requests per visit: the profile and the repository list.
- The response is cached in `sessionStorage` for five minutes.
- **Rate limit:** 60 requests/hour, applied per visitor. A visitor would have to
  reload roughly 30 times in an hour to reach it.
- If the request fails for any reason — rate limit, offline, blocked — the page
  falls back to a snapshot bundled in `src/github.js` and shows a
  "Showing a bundled snapshot" note instead of an empty grid.

`loadGithub()` never throws. Repo text is escaped before it reaches the DOM, so
a repository description containing markup cannot inject anything.

### The contact form

There is no server, so the form builds a `mailto:` draft and hands it to the
visitor's mail client. If you would rather have real server-side delivery, that
needs a form service or a function — neither exists here today.

---

## Where to edit things

| What you want to change             | File                                       |
| ----------------------------------- | ------------------------------------------ |
| Name, email, location, GitHub user  | `src/site.js` **and** the markup of each page |
| Page copy                           | `index.html`, `projects.html`, `about.html` |
| Colours, fonts, spacing             | `src/styles.css` (`@theme` block)          |
| Component styles (cards, nav, pills) | `src/styles.css` (`@layer components`)     |
| Page titles / descriptions / canonicals | each page's `<head>`                    |
| Projects rendering, filters, search | `src/app.js`                               |
| API calls, caching, fallback data   | `src/github.js`                            |
| Sitemap routes, SEO file generation | `build.js`                                 |

Personal details live in two places on purpose: `src/site.js` for the values
JavaScript needs, and the page markup, which is static HTML and cannot import
them. Change both.

---

## Design

The palette is lifted from a **CachyOS** desktop running **Hyprland** on
**Arch**: deep blue-black surfaces (`#060a10`), CachyOS teal (`#2ad4c4`), Arch
blue (`#1793d1`), and the Hyprland pink → violet → cyan gradient used for
borders, focus rings and glows. Navigation is styled as a waybar with numbered
workspaces, content sits in Hyprland-decor tile cards, and the About page opens
with a neofetch-style block and the Arch ASCII logo.

The scroll-reveal animation is applied only under an `html.js` class that is set
before first paint, so without JavaScript nothing is hidden and the page still
reads normally.

---

## History

This replaced an earlier Flask + React implementation, which is preserved in
commit `5d54ec4` if you ever want it back:

```bash
git show 5d54ec4 --stat
```
