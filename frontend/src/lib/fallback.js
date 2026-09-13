import { SITE } from "./site.js";

/* Snapshot of github.com/Aayush01, shown when the Flask API cannot be reached
   (GitHub rate limit, offline, or the API simply isn't running). Keeps the
   site readable instead of showing an empty grid. */
export const FALLBACK_GITHUB = {
  source: "fallback",
  fetchedAt: null,
  cached: false,
  stale: true,
  profile: {
    login: SITE.githubUser,
    name: null,
    publicRepos: 1,
    followers: 0,
    following: 0,
    url: SITE.githubUrl,
  },
  stats: {
    repos: 1,
    stars: 0,
    forks: 0,
    emptyRepos: 1,
    lastPush: "2016-08-14T02:10:47Z",
    languages: [{ name: "unspecified", count: 1 }],
  },
  repos: [
    {
      name: "Smokey01",
      description: "Empty repository — no commits, no README and no language detected yet.",
      language: null,
      stars: 0,
      forks: 0,
      openIssues: 0,
      topics: [],
      url: "https://github.com/Aayush01/Smokey01",
      homepage: null,
      fork: false,
      archived: false,
      size: 0,
      createdAt: "2016-08-14T02:10:47Z",
      updatedAt: "2016-08-14T02:10:47Z",
      pushedAt: "2016-08-14T02:10:47Z",
      isEmpty: true,
    },
  ],
};
