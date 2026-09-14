/* Page behaviour for the whole site. There is no router and no framework: each
   page is a real HTML file, and this script upgrades whichever parts of it are
   present. Every hook is a data-attribute, so a page that does not use a
   feature simply omits the element. */

import { SITE } from "./site.js";
import { loadGithub } from "./github.js";
import { formatDate, languageAccent, plural, timeAgo, waybarClock } from "./format.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/* Repo data is third-party text, so everything interpolated into markup goes
   through this first. */
const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ESCAPES[char]);

const ICON = {
  star: (size = 16) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z"/></svg>`,
  fork: (size = 16) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="5" r="3"/><circle cx="18" cy="5" r="3"/><circle cx="12" cy="19" r="3"/><path d="M6 8v2a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V8"/><path d="M12 13v3"/></svg>`,
  github: (size = 16) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>`,
};

/* ------------------------------------------------------------- marquee strip */

/* Colours are inline styles rather than dynamic Tailwind classes, because
   dynamically built class names never make it into the compiled stylesheet. */
const MARQUEE_ITEMS = [
  { text: "Aayush Kumar", color: "#e879f9" },
  { text: "Brampton, Canada", color: "#a855f7" },
  { text: `github.com/${SITE.githubUser}`, color: "#1793d1" },
  { text: "CachyOS", color: "#2ad4c4" },
  { text: "Hyprland", color: "#e879f9" },
  { text: "Arch Linux", color: "#4cb8f5" },
  { text: "html + tailwind css", color: "#a855f7" },
  { text: "vanilla js", color: "#22d3ee" },
];

function initMarquee() {
  const track = $("[data-marquee] .marquee-track");
  if (!track) return;

  /* Two identical rows: the animation translates the track by -50%, so the
     second row is what makes the loop seamless. */
  const row = (hidden) => `
    <div class="mono flex items-center gap-8 pr-8 text-[11px] tracking-[0.22em] text-muted uppercase"${
      hidden ? ' aria-hidden="true"' : ""
    }>
      ${MARQUEE_ITEMS.map(
        (item) =>
          `<span class="whitespace-nowrap">${esc(item.text)}</span><span style="color:${item.color}">◆</span>`
      ).join("")}
    </div>
  `;

  track.innerHTML = row(false) + row(true);
}

/* ------------------------------------------------------------------- misc */

function initYear() {
  const year = String(new Date().getFullYear());
  $$("[data-year]").forEach((node) => {
    node.textContent = year;
  });
}

/* ---------------------------------------------------------------- waybar clock */

function initClock() {
  const nodes = $$("[data-clock]");
  if (!nodes.length) return;

  const tick = () => {
    const text = waybarClock();
    nodes.forEach((node) => {
      node.textContent = text;
    });
  };

  tick();
  setInterval(tick, 15000);
}

/* ------------------------------------------------------------- scroll reveal */

let revealObserver = null;

function scanReveals(root = document) {
  if (!revealObserver) return;
  $$(".reveal:not(.is-visible)", root).forEach((node) => revealObserver.observe(node));
}

function initReveal() {
  const nodes = $$(".reveal");

  if (!("IntersectionObserver" in window)) {
    nodes.forEach((node) => node.classList.add("is-visible"));
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
  );

  scanReveals();
}

/* ---------------------------------------------------------------- repo cards */

export function repoCard(repo) {
  const language = repo.language || "unspecified";
  const accent = languageAccent(repo.language);
  const changed = repo.pushedAt || repo.updatedAt;
  /* Defaulted rather than read straight through: the only data source today is
     normalizeRepo(), but a hand-edited snapshot should not render as blanks. */
  const stars = repo.stars ?? 0;
  const forks = repo.forks ?? 0;
  const openIssues = repo.openIssues ?? 0;

  const topics = (repo.topics || [])
    .slice(0, 5)
    .map((topic) => `<span class="pill">${esc(topic)}</span>`)
    .join("");

  const flags = [
    repo.isEmpty ? `<span class="pill">no commits</span>` : "",
    repo.archived ? `<span class="pill">archived</span>` : "",
    repo.fork ? `<span class="pill">fork</span>` : "",
  ].join("");

  const issues = openIssues > 0 ? `<span>${esc(openIssues)} open</span>` : "";
  const demo = repo.homepage
    ? `<a href="${esc(repo.homepage)}" target="_blank" rel="noopener noreferrer" class="ml-auto text-cachy transition hover:text-cachy-light">demo ↗</a>`
    : "";

  return `
    <article class="win flex flex-col p-5">
      <header class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <a href="${esc(repo.url)}" target="_blank" rel="noopener noreferrer" class="mono text-base font-bold break-words text-ink transition hover:text-cachy">${esc(repo.name)}</a>
          <p class="mono mt-1 text-[11px] text-dim">updated ${esc(timeAgo(changed))} <span class="text-line">·</span> ${esc(formatDate(changed))}</p>
        </div>
        <a href="${esc(repo.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${esc(repo.name)} on GitHub" class="shrink-0 text-dim transition hover:text-hypr-pink">${ICON.github(18)}</a>
      </header>

      <p class="mt-3 text-sm leading-relaxed text-muted">${esc(repo.description || "No description provided for this repository.")}</p>

      ${topics ? `<div class="mt-4 flex flex-wrap gap-1.5">${topics}</div>` : ""}

      <div class="mono tile-divider mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 text-xs text-dim">
        <span class="inline-flex items-center gap-1.5">
          <span class="h-2 w-2 rounded-full" style="background:${accent}"></span>${esc(language)}
        </span>
        <span class="inline-flex items-center gap-1">${ICON.star(12)}${esc(stars)}</span>
        <span class="inline-flex items-center gap-1">${ICON.fork(12)}${esc(forks)}</span>
        ${issues}
        ${flags}
        ${demo}
      </div>
    </article>
  `;
}

/* ------------------------------------------------------------------ stats */

/* Every [data-stat] in the page is filled from here, so the same tiles can be
   reused on any page without extra wiring. */
const STAT_FIELDS = {
  repos: (data) => data.stats.repos,
  reposSub: (data) => plural(data.stats.emptyRepos, "empty repo"),
  reposPublic: (data) => `${data.stats.repos} public`,
  stars: (data) => data.stats.stars,
  starsSub: (data) => plural(data.stats.forks, "fork"),
  followers: (data) => data.stats.followers,
  lastPush: (data) => (data.stats.lastPush ? formatDate(data.stats.lastPush) : "no public commits"),
  lastPushSub: (data) => (data.stats.lastPush ? timeAgo(data.stats.lastPush) : "—"),
  lastPushFull: (data) =>
    data.stats.lastPush
      ? `${formatDate(data.stats.lastPush)} (${timeAgo(data.stats.lastPush)})`
      : "no public commits",
  topLang: (data) => data.stats.languages?.[0]?.name || "—",
  topLangSub: (data) => plural(data.stats.languages?.length || 0, "language"),
};

function applyStats(data, root = document) {
  $$("[data-stat]", root).forEach((node) => {
    const field = STAT_FIELDS[node.dataset.stat];
    if (!field) return;
    const value = field(data);
    node.textContent = value === "" || value === undefined ? "—" : String(value);
    node.removeAttribute("data-placeholder");
  });
}

function renderStatus(data, root = document) {
  $$("[data-status-dot]", root).forEach((dot) => {
    dot.classList.toggle("live-dot--offline", Boolean(data.error));
  });

  $$("[data-status-text]", root).forEach((node) => {
    if (data.error) node.textContent = "snapshot";
    else node.textContent = data.fromCache ? "cached" : "live";
  });

  $$("[data-snapshot-note]", root).forEach((node) => {
    if (!data.error) return;
    node.hidden = false;
    node.textContent = `Showing a bundled snapshot — ${data.error}`;
  });
}

/* ------------------------------------------------------------- home page */

function initHome() {
  const featured = $("[data-featured]");
  if (!featured) return;

  loadGithub().then((data) => {
    applyStats(data);
    renderStatus(data);

    const top = [...data.repos]
      .sort((a, b) => b.stars - a.stars || new Date(b.pushedAt || 0) - new Date(a.pushedAt || 0))
      .slice(0, 3);

    featured.innerHTML = top.length
      ? top.map(repoCard).join("")
      : `<p class="mono text-sm text-dim">No public repositories yet.</p>`;

    scanReveals(featured);
  });
}

/* --------------------------------------------------------- projects page */

const SORTS = [
  { id: "updated", label: "recently updated" },
  { id: "stars", label: "most stars" },
  { id: "name", label: "a → z" },
];

function initProjects() {
  const grid = $("[data-repo-grid]");
  if (!grid) return;

  const search = $("[data-search]");
  const languageChips = $("[data-lang-chips]");
  const sortChips = $("[data-sort-chips]");
  const matchCount = $("[data-match-count]");
  const emptyState = $("[data-empty]");
  const resetButton = $("[data-reset-filters]");

  const state = { repos: [], query: "", language: "all", sort: "updated" };

  function renderLanguageChips() {
    if (!languageChips) return;
    const found = new Set(state.repos.map((repo) => repo.language || "unspecified"));
    const options = ["all", ...Array.from(found).sort((a, b) => a.localeCompare(b))];

    languageChips.innerHTML = options
      .map(
        (option) =>
          `<button type="button" class="chip ${state.language === option ? "is-active" : ""}" data-language="${esc(option)}">${esc(option)}</button>`
      )
      .join("");
  }

  function renderSortChips() {
    if (!sortChips) return;
    sortChips.innerHTML = SORTS.map(
      (option) =>
        `<button type="button" class="chip ${state.sort === option.id ? "is-active" : ""}" data-sort="${esc(option.id)}">${esc(option.label)}</button>`
    ).join("");
  }

  function visibleRepos() {
    const needle = state.query.trim().toLowerCase();

    const filtered = state.repos.filter((repo) => {
      const repoLanguage = repo.language || "unspecified";
      if (state.language !== "all" && repoLanguage !== state.language) return false;
      if (!needle) return true;
      return [repo.name, repo.description, repoLanguage, (repo.topics || []).join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });

    const sorted = [...filtered];
    if (state.sort === "stars") sorted.sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name));
    else if (state.sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => new Date(b.pushedAt || 0) - new Date(a.pushedAt || 0));

    return sorted;
  }

  function render() {
    const visible = visibleRepos();

    grid.innerHTML = visible.map(repoCard).join("");
    if (emptyState) emptyState.hidden = visible.length > 0;

    if (matchCount) {
      const filters = [];
      if (state.language !== "all") filters.push(`filtered by ${state.language}`);
      if (state.query.trim()) filters.push(`matching "${state.query.trim()}"`);
      matchCount.textContent = `${visible.length} of ${state.repos.length} shown${
        filters.length ? ` · ${filters.join(" · ")}` : ""
      }`;
    }
  }

  search?.addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
  });

  languageChips?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-language]");
    if (!button) return;
    state.language = button.dataset.language;
    renderLanguageChips();
    render();
  });

  sortChips?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-sort]");
    if (!button) return;
    state.sort = button.dataset.sort;
    renderSortChips();
    render();
  });

  resetButton?.addEventListener("click", () => {
    state.query = "";
    state.language = "all";
    if (search) search.value = "";
    renderLanguageChips();
    render();
  });

  renderSortChips();

  loadGithub().then((data) => {
    state.repos = data.repos;
    applyStats(data);
    renderStatus(data);
    renderLanguageChips();
    render();
  });
}

/* ------------------------------------------------------------ about page */

function initContact() {
  const form = $("[data-contact-form]");

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const fields = new FormData(form);
      const name = String(fields.get("name") || "").trim();
      const email = String(fields.get("email") || "").trim();
      const message = String(fields.get("message") || "").trim();
      const status = $("[data-contact-status]");

      if (!message) {
        if (status) status.textContent = "add a message first.";
        return;
      }

      const subject = encodeURIComponent(`Portfolio message from ${name || "someone"}`);
      const body = encodeURIComponent(`${message}\n\n— ${name}${email ? ` (${email})` : ""}`);

      // No backend: hand the draft to the visitor's mail client.
      window.location.href = `mailto:${SITE.email}?subject=${subject}&body=${body}`;
      if (status) status.textContent = "opened your mail client with the message pre-filled.";
    });
  }

  const copyButton = $("[data-copy-email]");
  const copyLabel = $("[data-copy-label]");

  if (copyButton && copyLabel) {
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(SITE.email);
        copyLabel.textContent = "copied";
        setTimeout(() => {
          copyLabel.textContent = "copy address";
        }, 2000);
      } catch {
        copyLabel.textContent = SITE.email;
      }
    });
  }
}

/* ------------------------------------------------------------------- boot */

/* Guarded so the module can be imported outside a browser — by a test or a
   build tool — without touching the DOM. */
if (typeof document !== "undefined") {
  initClock();
  initMarquee();
  initYear();
  initReveal();
  initHome();
  initProjects();
  initContact();
}
