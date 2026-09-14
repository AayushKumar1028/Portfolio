/* Page behaviour for the whole site. There is no router and no framework: each
   page is a real HTML file, and this script upgrades whichever parts of it are
   present. Every hook is a data-attribute, so a page that does not use a
   feature simply omits the element. */

import { SITE } from "./site.js";
import { loadGithub } from "./github.js";
import { explanationFor } from "./explanations.js";
import { formatDate, formatSize, languageAccent, plural, timeAgo, waybarClock } from "./format.js";

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

/* ---------------------------------------------------------------- theme */

/* Light/dark switch. The saved choice is applied before first paint by the
   inline script in each page's <head>, which reads this same key — keep the two
   in sync. Dark is the default, so it is expressed as the absence of
   data-theme rather than data-theme="dark", which keeps every CSS rule that
   only cares about light mode a single attribute selector. */
const THEME_KEY = "portfolio:theme";
const THEME_COLOR = { dark: "#060a10", light: "#f4f7fb" };

function currentTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/* Outlives the 0.32s transition in src/styles.css, so the class is still in
   place when the fade finishes. */
const THEME_FADE_MS = 420;
let themeFadeTimer = null;

/* The transition itself lives in the stylesheet, gated behind a class that only
   exists during a switch — otherwise every hover would inherit a 0.32s colour
   fade. The class has to be in place before the colours change, and reading a
   layout property flushes it so the browser has a style to interpolate from. */
function beginThemeFade() {
  const root = document.documentElement;
  root.classList.add("is-theming");
  void root.offsetWidth;

  clearTimeout(themeFadeTimer);
  themeFadeTimer = setTimeout(() => root.classList.remove("is-theming"), THEME_FADE_MS);
}

function applyTheme(next, { persist = true } = {}) {
  const root = document.documentElement;

  /* Only a real change is worth fading. On first load the head script has
     already set the attribute, so there is nothing to animate. */
  if (next !== currentTheme()) beginThemeFade();

  if (next === "light") root.dataset.theme = "light";
  else delete root.dataset.theme;

  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* storage blocked, as in private mode — the choice just will not stick */
    }
  }

  /* Tints the browser chrome on mobile, so it matches the page. */
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLOR[next];

  const label = `Switch to ${next === "light" ? "dark" : "light"} theme`;
  $$("[data-theme-toggle]").forEach((button) => {
    button.setAttribute("aria-pressed", String(next === "light"));
    button.setAttribute("aria-label", label);
    button.title = label;
  });
}

function initTheme() {
  const buttons = $$("[data-theme-toggle]");
  if (!buttons.length) return;

  /* Re-applied without persisting: the head script already set the attribute,
     so this only brings the meta tag and the button labels in line with it. */
  applyTheme(currentTheme(), { persist: false });

  buttons.forEach((button) => {
    button.addEventListener("click", () => applyTheme(currentTheme() === "light" ? "dark" : "light"));
  });
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
    ? `<a href="${esc(repo.homepage)}" target="_blank" rel="noopener noreferrer" class="text-cachy transition hover:text-cachy-light">demo ↗</a>`
    : "";
  /* Grouped against the right edge, so the explain button keeps its place
     whether or not this repository happens to have a live demo. */
  const actions = `
        <span class="ml-auto flex items-center gap-x-3">
          ${demo}
          <button
            type="button"
            class="explain"
            data-explain="${esc(repo.name)}"
            aria-label="Explain this project: ${esc(repo.name)}"
          >explain</button>
        </span>`;

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
        ${actions}
      </div>
    </article>
  `;
}

/* ----------------------------------------------------------- explain modal */

/* The repositories currently on the page, so a click can be resolved back to
   its data. Cards are re-rendered on every keystroke in the projects filter,
   so the click is delegated from the document and each card carries only the
   repository name. */
let loadedRepos = [];

const EXPLAIN_SECTIONS = [
  { key: "what", label: "what it's for" },
  { key: "how", label: "how it was built" },
  { key: "why", label: "why it exists" },
];

function explanationFacts(repo) {
  return [
    ["language", repo.language || "unspecified"],
    ["size", formatSize(repo.size)],
    ["last push", repo.pushedAt ? `${timeAgo(repo.pushedAt)} · ${formatDate(repo.pushedAt)}` : "—"],
    ["created", repo.createdAt ? formatDate(repo.createdAt) : "—"],
    ["stars", String(repo.stars ?? 0)],
    ["forks", String(repo.forks ?? 0)],
  ];
}

function renderExplanation(repo) {
  const modal = $("[data-explain-modal]");
  const text = explanationFor(repo);

  $("[data-explain-title]", modal).textContent = repo.name;

  const sections = EXPLAIN_SECTIONS.filter(({ key }) => text[key])
    .map(
      ({ key, label }) => `
          <section>
            <p class="label">${label}</p>
            <p class="mt-1.5 text-sm leading-relaxed text-muted">${esc(text[key])}</p>
          </section>`
    )
    .join("");

  /* Only shown for a repository with no entry in src/explanations.js, so the
     button never looks broken — it just points at the README instead. */
  const note = text.curated
    ? ""
    : `<p class="mono text-xs text-dim">
            no write-up for this one yet — the README over on GitHub has the details.
          </p>`;

  const topics = repo.topics?.length
    ? `<div class="flex flex-wrap gap-1.5">${repo.topics
        .map((topic) => `<span class="pill">${esc(topic)}</span>`)
        .join("")}</div>`
    : "";

  const facts = explanationFacts(repo)
    .map(
      ([label, value]) => `
            <div>
              <dt class="label">${label}</dt>
              <dd class="mono mt-1 text-ink">${esc(value)}</dd>
            </div>`
    )
    .join("");

  $("[data-explain-body]", modal).innerHTML = `
        ${sections}
        ${note}
        ${topics}
        <dl class="mono grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:grid-cols-3">
          ${facts}
        </dl>`;

  const links = [
    ["github", repo.url],
    ["readme", `${repo.url}#readme`],
    repo.homepage ? ["live demo", repo.homepage] : null,
  ].filter(Boolean);

  $("[data-explain-links]", modal).innerHTML = links
    .map(
      ([label, href]) =>
        `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" class="mono text-xs text-cachy transition hover:text-cachy-light">${label} ↗</a>`
    )
    .join("");
}

function initExplain() {
  const modal = $("[data-explain-modal]");
  if (!modal) return;

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-explain]");
    if (!trigger) return;

    const repo = loadedRepos.find((candidate) => candidate.name === trigger.dataset.explain);
    if (!repo) return;

    renderExplanation(repo);
    modal.showModal();
  });

  $("[data-explain-close]", modal)?.addEventListener("click", () => modal.close());

  /* A click that misses the panel landed on the backdrop, which the browser
     reports as a click on the dialog itself. */
  modal.addEventListener("click", (event) => {
    if (!event.target.closest(".modal-panel")) modal.close();
  });
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
    loadedRepos = data.repos;

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
    loadedRepos = data.repos;
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
  initTheme();
  initReveal();
  initHome();
  initProjects();
  initExplain();
  initContact();
}
