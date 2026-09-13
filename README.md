# Portfolio — Aayush Kumar

A personal portfolio built with **Flask + React + Tailwind CSS**. The projects
grid is not hardcoded: the Flask backend proxies the GitHub API, caches the
response briefly, and the React app renders it — so new repositories appear
without a rebuild.

Three pages: **Home**, **Projects**, **About me & contact**.

---

## Stack

| Layer    | Choice                                                        |
| -------- | ------------------------------------------------------------- |
| Frontend | React 19, React Router 7, Vite 8, Tailwind CSS 4              |
| Backend  | Flask 3.1 (stdlib `urllib` for GitHub, `smtplib` for contact)   |
| Data     | GitHub REST API v3 (public, optionally token-authenticated)     |

No database, no third-party services, no trackers.

---

## Layout

```
Portfolio/
├── backend/
│   ├── app.py              # API + serves the built React app
│   ├── requirements.txt
│   ├── .env.example        # every setting is optional
│   └── .venv/              # local virtualenv (gitignored)
├── frontend/
│   ├── index.html
│   ├── vite.config.js      # dev proxy: /api -> Flask
│   ├── package.json
│   ├── scripts/
│   │   └── render-check.jsx  # renders every page with real API data
│   └── src/
│       ├── index.css       # design tokens (@theme) + component styles
│       ├── App.jsx         # routes
│       ├── components/     # TopBar, ProjectCard, Palette, Marquee, …
│       ├── hooks/useGithub.js
│       ├── lib/            # site config, api client, formatters, fallback
│       └── pages/          # Home, Projects, About, NotFound
├── dev.sh                  # runs both servers
├── vercel.json             # Vercel Services: frontend + backend, one domain
└── README.md
```

---

## Requirements

- Node.js 20+ (developed against 26)
- Python 3.10+ (developed against 3.14)

## Setup

```bash
# 1. backend
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt

# 2. frontend
cd frontend && npm install && cd ..

# 3. optional config
cp backend/.env.example backend/.env
```

## Running

**Development** — two processes, hot reload, one command:

```bash
./dev.sh
# API  http://127.0.0.1:5000
# site http://127.0.0.1:5173   (proxies /api to Flask)
```

**Production-style** — Flask serves the compiled frontend:

```bash
cd frontend && npm run build && cd ..
backend/.venv/bin/python backend/app.py
# site http://127.0.0.1:5000
```

Flask serves `frontend/dist` and falls back to `index.html` for client-side
routes, so `/projects` and `/about` work on a hard refresh.

---

## Configuration

Everything is optional — the app runs with sensible defaults. Copy
`backend/.env.example` to `backend/.env`:

| Variable            | Default                     | Purpose                                        |
| ------------------- | --------------------------- | ---------------------------------------------- |
| `GITHUB_USERNAME`   | `Aayush01`                  | account whose public repos are shown           |
| `GITHUB_TOKEN`      | *(empty)*                   | raises the API limit from 60/h to 5000/h       |
| `CACHE_TTL_SECONDS` | `300`                       | how long a GitHub response is reused           |
| `CONTACT_TO`        | `kumarkids.aayush@gmail.com`| where contact messages go                      |
| `SMTP_HOST`…        | *(empty)*                   | leave blank to use the mailto fallback         |
| `HOST` / `PORT`     | `127.0.0.1` / `5000`        | bind address                                   |

**Contact form:** with no `SMTP_HOST` set, the backend validates the message and
returns a pre-filled `mailto:` draft which the browser opens in the visitor's
mail client — so the form works with zero credentials. Fill in the `SMTP_*`
variables to have the server send it directly.

---

## Deploying to Vercel

The site deploys as a **single Vercel project** using
[Services](https://vercel.com/docs/services) (in Beta, available on all plans).
Vercel builds the Vite frontend and the Flask backend as two units that share
one domain, so the app keeps calling `/api/*` same-origin — no CORS setup and no
API base URL to configure. All of it is declared in `vercel.json`:

| Service    | Root        | Detected as          | Serves   |
| ---------- | ----------- | -------------------- | -------- |
| `frontend` | `frontend/` | Vite → `dist/`       | `/*`     |
| `backend`  | `backend/`  | Flask → `app:app`    | `/api/*` |

The `/api/*` rule is matched first, so API traffic reaches Flask and everything
else reaches the static build. A service receives the **original path**
(`/api/github` stays `/api/github`), which is why the existing Flask routes and
the frontend's relative `fetch("/api/…")` calls work unchanged. The frontend
service also carries the SPA fallback rewrite, so a hard refresh on `/projects`
or `/about` resolves to `index.html` rather than 404ing.

### Steps

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new), leaving the root
   directory as the repository root. Do not set a framework preset, build
   command or output directory — `vercel.json` and the presets cover both
   services.
3. Add whichever environment variables you want in Project → Settings →
   Environment Variables. Only these are read:

   | Variable      | Why                                                        |
   | ------------- | ---------------------------------------------------------- |
   | `GITHUB_USERNAME` | account shown on Projects (defaults to `Aayush01`)     |
   | `GITHUB_TOKEN`    | raises the API limit from 60/h to 5000/h — recommended |
   | `CACHE_TTL_SECONDS` | how long a GitHub response is reused                 |
   | `CONTACT_TO`      | where contact-form messages go                         |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | server-side mail delivery; omit to use the mailto fallback |

   Do **not** set `HOST` or `PORT` — Vercel manages the server. Nothing else in
   `backend/.env.example` applies in production.
4. Deploy. Every push to the default branch ships both services together, and
   pull requests get a preview URL.

To run it the way production does, install the Vercel CLI and use `vercel dev`
in the repo root instead of `./dev.sh`; it builds both services locally.

### Serverless differences

Three things change once Flask runs as a Vercel Function:

- The GitHub cache lives in the function instance's memory, so it is not shared
  across instances. It still absorbs repeated requests, but it is no longer a
  single global cache like the local server's.
- `frontend/dist` is not part of the backend bundle, so `/api/health` reports
  `frontendBuilt: false`, and the static-serving routes in `app.py` (`/` and
  `/<path>`) go unused — the `frontend` service serves the site from Vercel's
  CDN.
- The first request after an idle period includes a cold start.

---

## Where to edit things

| What you want to change            | File                                       |
| ---------------------------------- | ------------------------------------------ |
| Name, email, location, GitHub user | `frontend/src/lib/site.js`                 |
| Page copy                          | `frontend/src/pages/*.jsx`                  |
| Colours, fonts, spacing            | `frontend/src/index.css` (`@theme` block)  |
| Components (cards, nav, footer)    | `frontend/src/components/`                 |
| Projects data / caching            | `backend/app.py`                           |

Only your name, email, city/location and public GitHub handle are stored — no
other personal information is bundled. The GitHub avatar is deliberately not
fetched or displayed; the About page uses an ASCII logo instead.

## API

| Endpoint               | Description                                              |
| ---------------------- | -------------------------------------------------------- |
| `GET /api/health`      | service status, configured user, whether the build exists |
| `GET /api/github`      | profile + repos + computed stats (`?refresh=1` bypasses cache) |
| `POST /api/contact`    | `{name, email, message}` → `{delivered, mailto, reason}` |

The `/api/github` payload is `{ source, fetchedAt, cached, stale, profile, stats, repos }`.
If GitHub is unreachable and a cached copy exists, the cache is served with
`stale: true` rather than failing; the UI then shows a "cached snapshot" badge.

## Verification

```bash
cd frontend
npm run build          # production build
npm run check:render   # renders all pages with live API data (needs the API running;
                       # falls back to a bundled snapshot if it isn't)
```

The render check asserts the data-driven UI actually contains the expected
content, and that the pages survive empty repositories and repos with missing
fields.

## Design

The palette is lifted from a **CachyOS** desktop running **Hyprland** on **Arch**:
deep blue-black surfaces (`#060a10`), CachyOS teal (`#2ad4c4`), Arch blue
(`#1793d1`), and the Hyprland pink → violet → cyan gradient used for borders,
focus rings and glows. Navigation is styled as a waybar with numbered
workspaces, content sits in Hyprland-decor tile cards, and the About page opens
with a neofetch-style block and the Arch ASCII logo.
