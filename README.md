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
├── 404.html              # served for unknown paths (Vercel config / .htaccess)
├── build.js              # build: copies pages, emits robots.txt, sitemap.xml, .htaccess
├── vercel.json           # static build, clean URLs (root deploys)
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
reading them from `src/site.js` and the `__SITE_URL__` token, or when an
internal `href`/`src` points at the domain root instead of `__SITE_BASE__` —
the three regressions that break the site the same way every time.

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

### The deployment path (`SITE_BASE`)

Where the site *lives* under its domain is a second setting, resolved in the
same spirit as the domain:

1. `VITE_SITE_BASE` or `SITE_BASE`, if set — the path segment(s) the build is
   hosted under, e.g. `portfolio` for `aayushkumar.ca/portfolio/`.
2. Empty — the site is served from the domain root, which is how Vercel deploys
   it.

The base is substituted into `__SITE_BASE__` in every internal `href`/`src`,
appended to the resolved site URL so canonical tags and the sitemap point at
the subpath, and written into the generated `dist/.htaccess`. Leave it unset
for Vercel; set it to `portfolio` for the Apache/cPanel deploy described below.

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

## Deploying to Apache/cPanel under a subpath

If the site lives at `aayushkumar.ca/portfolio/` instead of its own domain, the
build needs to know that — every internal link is otherwise written for the
domain root. **Build the domain variant, and upload the *built* folder rather
than the repo:**

```bash
npm run build:domain     # == node build.js --url=https://aayushkumar.ca --base=portfolio
```

For any other domain or path, pass the flags yourself —
`node build.js --url=https://example.com --base=blog` — or set `SITE_BASE` and
`VITE_SITE_URL` as described under Configuration. The build prints
`site url → https://aayushkumar.ca/portfolio`; if it does not, the settings did
not reach it.

Then, in cPanel's File Manager (or over FTP/SFTP):

1. In `public_html`, create (or open) the `portfolio` folder and **empty it**.
2. Upload the **contents of `dist/`** into it — `index.html`, `projects.html`,
   `about.html`, `404.html`, `styles.css`, the `.js` files, `favicon.svg`,
   `robots.txt`, `sitemap.xml` and the generated `.htaccess` (enable
   "show hidden files" — dotfiles are hidden by default). The `.htaccess` is
   what makes `/portfolio/projects` work and shows the styled 404.
3. Nothing from the repo root goes up: no `node_modules/`, no `src/`, no
   `build.js`, no `package.json`.

### Check what the host is actually serving

```bash
npm run verify:deploy              # or: npm run verify:deploy -- https://example.com
```

This fetches the live site and fails loudly on the two ways this deploy goes
wrong — both of which look like "the page loads but has no styling":

- **`__SITE_BASE__` still in the markup** — the repository was uploaded instead
  of `dist/`. The browser then requests `__SITE_BASE__/styles.css`, which is not
  a file, so the stylesheet and the script never load.
- **extensionless routes 404 while `/projects.html` works** — the generated
  `.htaccess` never reached the host, so `/portfolio/projects` cannot be
  rewritten. cPanel hides dotfiles by default: turn on *Settings → Show Hidden
  Files* before selecting what to upload or move.

Never upload the repository itself: the raw source references uncompiled
Tailwind (`src/styles.css`), the canonical tags contain the unreplaced
`__SITE_URL__` token, and server-side files like `build.js` and `.env` become
world-readable. If the live site ever shows plain unstyled HTML, a raw upload
is the most likely cause — check that `https://aayushkumar.ca/portfolio/styles.css`
returns actual CSS, and that a page's canonical tag shows your domain rather
than a `__SITE_URL__` token.

**Prerequisite:** the host needs Apache with `mod_rewrite` (standard on
cPanel/Apache shared hosting). Without it, `/portfolio/projects` 404s and only
`/portfolio/projects.html` works.

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

### The explain popup

Every repo card carries an `explain` button that opens a `<dialog>` with three
sections — what it is for, how it was built, why it exists — alongside live
facts (language, size, dates, stars) taken from the GitHub data already on the
page, and links to the repo, its README and its live demo.

The prose is hand-written, one entry per repository, in `src/explanations.js`.
Nothing is generated at request time and no AI service is involved. A repository
with no entry still opens — it falls back to its GitHub description and says
plainly that there is no write-up yet — so adding an entry keyed by repository
name is all it takes to fill one in.

The dialog is a native `<dialog>`, which means focus trapping, Esc-to-close and
focus restoration come from the browser rather than from script.

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
| The write-up behind an `explain` button | `src/explanations.js`                  |
| API calls, caching, fallback data   | `src/github.js`                            |
| Light/dark palette, surfaces, toggle | `src/styles.css` (`html[data-theme="light"]`) and `src/app.js` |
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

Light mode re-points those same tokens rather than shipping a second
stylesheet: `html[data-theme="light"]` overrides the palette and the
surface/border/shadow tokens in one block, and every Tailwind utility follows
because they all read those variables. The accents are darkened there on
purpose — the neon teal and pink read beautifully on near-black but fail
contrast as text on white — and the "on accent" text flips to white, since it
now sits on those darker stops. Dark stays the default, and a small script in
each page's `<head>` applies the saved choice before first paint, so a
light-mode visitor never sees a flash of the dark palette.

Switching fades rather than snaps: `src/app.js` adds an `is-theming` class for
the length of the change and the stylesheet hangs the colour transitions off
that class, so hover states and page load are never animated by it. Only the
flat colour channels transition — background *images* cannot be interpolated, so
the tile sheen, the gradient buttons and the wallpaper glow still step. The
whole fade is skipped for `prefers-reduced-motion: reduce`.

---

## History

This replaced an earlier Flask + React implementation, which is preserved in
commit `5d54ec4` if you ever want it back:

```bash
git show 5d54ec4 --stat
```
