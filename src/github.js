import { SITE } from "./site.js";

/* Live GitHub data, fetched straight from api.github.com in the browser.
   GitHub sends `access-control-allow-origin: *`, so no backend is needed.

   The trade-off of having no server: the unauthenticated rate limit (60
   requests/hour) applies per visitor rather than to one shared cache. A visit
   costs two requests, and the response is reused for five minutes, so a
   visitor would have to reload ~30 times in an hour to see the fallback. */

const API = "https://api.github.com";
const CACHE_KEY = `portfolio:github:${SITE.githubUser}`;
const CACHE_TTL_MS = 5 * 60 * 1000;
const REPO_LIMIT = 100;

/* Snapshot of github.com/AayushKumar1028, shown when GitHub cannot be reached
   (rate limit, offline, or a blocked request). Keeps the site readable instead
   of showing an empty grid. Regenerate it from the live API after a big change
   to the account, so a rate-limited visitor does not see stale counts. */
export const FALLBACK = {
  source: "fallback",
  fetchedAt: null,
  stale: true,
  profile: {
    login: SITE.githubUser,
    name: "Aayush Kumar",
    publicRepos: 5,
    followers: 1,
    following: 5,
    url: SITE.githubUrl,
  },
  stats: {
    repos: 5,
    stars: 0,
    forks: 1,
    emptyRepos: 0,
    lastPush: "2026-09-15T00:47:14Z",
    languages: [
      { name: "HTML", count: 3 },
      { name: "C#", count: 1 },
      { name: "unspecified", count: 1 },
    ],
    followers: 1,
  },
  repos: [
    {
      name: "Portfolio",
      description: null,
      language: "HTML",
      stars: 0,
      forks: 0,
      openIssues: 0,
      topics: [],
      url: "https://github.com/AayushKumar1028/Portfolio",
      homepage: "https://portfolio-alpha-dun-69.vercel.app",
      fork: false,
      archived: false,
      size: 0,
      createdAt: "2026-09-14T23:14:38Z",
      updatedAt: "2026-09-15T00:47:18Z",
      pushedAt: "2026-09-15T00:47:14Z",
      isEmpty: false,
    },
    {
      name: "Insta-chat",
      description:
        "A windows application (soon for android and ios) for users with an instagram account who have parental restricitons on instagram reels. This app will allow you to access ONLY your instagram chats.",
      language: "C#",
      stars: 0,
      forks: 0,
      openIssues: 0,
      topics: [],
      url: "https://github.com/AayushKumar1028/Insta-chat",
      homepage: null,
      fork: false,
      archived: false,
      size: 152,
      createdAt: "2026-09-07T18:11:35Z",
      updatedAt: "2026-09-14T15:22:40Z",
      pushedAt: "2026-09-14T15:22:28Z",
      isEmpty: false,
    },
    {
      name: "Business-Website",
      description:
        "Modern business course website redesign built with HTML, CSS, and responsive web design principles.",
      language: "HTML",
      stars: 0,
      forks: 0,
      openIssues: 0,
      topics: [],
      url: "https://github.com/AayushKumar1028/Business-Website",
      homepage: null,
      fork: false,
      archived: false,
      size: 35,
      createdAt: "2026-09-10T21:46:10Z",
      updatedAt: "2026-09-10T23:07:48Z",
      pushedAt: "2026-09-10T23:07:45Z",
      isEmpty: false,
    },
    {
      name: "AayushKumar1028",
      description: null,
      language: null,
      stars: 0,
      forks: 0,
      openIssues: 0,
      topics: [],
      url: "https://github.com/AayushKumar1028/AayushKumar1028",
      homepage: null,
      fork: false,
      archived: false,
      size: 23,
      createdAt: "2026-06-03T22:40:51Z",
      updatedAt: "2026-09-08T20:59:12Z",
      pushedAt: "2026-09-08T20:57:22Z",
      isEmpty: false,
    },
    {
      name: "English-Semester-Final-Website",
      description: "All of my programming projects of 2026.",
      language: "HTML",
      stars: 0,
      forks: 1,
      openIssues: 1,
      topics: [],
      url: "https://github.com/AayushKumar1028/English-Semester-Final-Website",
      homepage: "https://2026-projects.vercel.app",
      fork: false,
      archived: false,
      size: 5976,
      createdAt: "2026-06-01T20:17:49Z",
      updatedAt: "2026-06-06T20:49:07Z",
      pushedAt: "2026-06-06T20:49:04Z",
      isEmpty: false,
    },
  ],
};

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.fetchedAt !== "number") return null;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(payload) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode or a full quota — caching is optional */
  }
}

async function getJson(path) {
  const response = await fetch(`${API}${path}`, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!response.ok) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (response.status === 403 && remaining === "0") {
      throw new Error("GitHub's 60 requests/hour limit for this network is used up.");
    }
    if (response.status === 404) {
      throw new Error(`GitHub account "${SITE.githubUser}" was not found.`);
    }
    throw new Error(`GitHub responded with HTTP ${response.status}.`);
  }

  return response.json();
}

function normalizeRepo(repo) {
  const size = repo.size ?? 0;
  /* Size is reported in kilobytes and rounds down, so a repository that does
     have commits can still report 0 — github.com/AayushKumar1028/Portfolio is
     one. An empty repository is only one whose size is 0 *and* whose push
     stamp never moved past creation. */
  const isEmpty = size === 0 && (!repo.pushed_at || repo.pushed_at === repo.created_at);
  return {
    name: repo.name,
    description: repo.description,
    language: repo.language,
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    openIssues: repo.open_issues_count ?? 0,
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    url: repo.html_url,
    homepage: repo.homepage || null,
    fork: Boolean(repo.fork),
    archived: Boolean(repo.archived),
    size,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    isEmpty,
  };
}

export function computeStats(repos, profile) {
  const languageCounts = new Map();
  let stars = 0;
  let forks = 0;
  let lastPush = null;

  for (const repo of repos) {
    stars += repo.stars;
    forks += repo.forks;

    const key = repo.language || "unspecified";
    languageCounts.set(key, (languageCounts.get(key) || 0) + 1);

    const stamp = repo.pushedAt || repo.updatedAt;
    if (stamp && (!lastPush || new Date(stamp) > new Date(lastPush))) lastPush = stamp;
  }

  const languages = [...languageCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    repos: repos.length,
    stars,
    forks,
    emptyRepos: repos.filter((repo) => repo.isEmpty).length,
    lastPush,
    languages,
    followers: profile?.followers ?? 0,
  };
}

/**
 * Profile, repos and derived stats.
 *
 * Never throws: on any failure it resolves to the bundled snapshot with an
 * explanatory `error`, so a caller can always render something.
 */
export async function loadGithub() {
  const cached = readCache();
  if (cached) return { ...cached, fromCache: true, error: null };

  try {
    const [profile, rawRepos] = await Promise.all([
      getJson(`/users/${SITE.githubUser}`),
      getJson(`/users/${SITE.githubUser}/repos?per_page=${REPO_LIMIT}&sort=pushed&direction=desc`),
    ]);

    const repos = rawRepos
      .map(normalizeRepo)
      .sort((a, b) => new Date(b.pushedAt || 0) - new Date(a.pushedAt || 0));

    const payload = {
      source: "github",
      fetchedAt: Date.now(),
      stale: false,
      profile: {
        login: profile.login,
        name: profile.name,
        publicRepos: profile.public_repos,
        followers: profile.followers,
        following: profile.following,
        url: profile.html_url,
      },
      stats: computeStats(repos, profile),
      repos,
    };

    writeCache(payload);
    return { ...payload, fromCache: false, error: null };
  } catch (error) {
    return { ...FALLBACK, fromCache: false, error: error.message };
  }
}
