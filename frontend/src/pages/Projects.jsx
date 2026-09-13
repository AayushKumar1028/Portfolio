import { useMemo, useState } from "react";
import Backdrop from "../components/Backdrop.jsx";
import ProjectCard from "../components/ProjectCard.jsx";
import Reveal from "../components/Reveal.jsx";
import SyncBadge from "../components/SyncBadge.jsx";
import { SearchIcon } from "../components/Icons.jsx";
import { useGithub } from "../hooks/useGithub.js";
import { SITE } from "../lib/site.js";
import { plural } from "../lib/format.js";

const SORTS = [
  { id: "updated", label: "recently updated" },
  { id: "stars", label: "most stars" },
  { id: "name", label: "a → z" },
];

export default function Projects({ initialData = null }) {
  const { status, data, error, refreshing, refresh } = useGithub(initialData);
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("all");
  const [sort, setSort] = useState("updated");

  const repos = data?.repos || [];
  const loading = status === "loading";

  const languages = useMemo(() => {
    const found = new Set();
    repos.forEach((repo) => found.add(repo.language || "unspecified"));
    return ["all", ...Array.from(found).sort((a, b) => a.localeCompare(b))];
  }, [repos]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = repos.filter((repo) => {
      const repoLanguage = repo.language || "unspecified";
      if (language !== "all" && repoLanguage !== language) return false;
      if (!needle) return true;
      return [repo.name, repo.description, repoLanguage, (repo.topics || []).join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });

    const sorted = [...filtered];
    if (sort === "stars") sorted.sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name));
    else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => new Date(b.pushedAt || 0) - new Date(a.pushedAt || 0));

    return sorted;
  }, [repos, query, language, sort]);

  return (
    <>
      <Backdrop />

      <main className="pt-28 sm:pt-32">
        <div className="mx-auto max-w-shell px-3 sm:px-5">
          {/* ------------------------------------------------------- header */}
          <header className="mb-8">
            <p className="mono prompt text-xs text-muted">ls ~/projects</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
              <span className="grad-text">Projects</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
              Every public repository on{" "}
              <a
                href={SITE.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cachy transition hover:text-cachy-light"
              >
                github.com/{SITE.githubUser}
              </a>
              , fetched live through the Flask API and cached for five minutes.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              <SyncBadge
                status={status}
                data={data}
                refreshing={refreshing}
                onRefresh={refresh}
                error={error}
              />
              {!loading && (
                <span className="mono text-xs text-dim">
                  {plural(repos.length, "repo")} <span className="text-line">·</span>{" "}
                  {plural(data?.stats?.stars ?? 0, "star")}
                </span>
              )}
            </div>
          </header>

          {/* ------------------------------------------------------- controls */}
          <div className="win mb-6 flex flex-col gap-4 p-4 sm:p-5">
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-dim">
                <SearchIcon width={15} height={15} />
              </span>
              <input
                type="search"
                className="field pl-9"
                placeholder="search repos, descriptions, topics…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search projects"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="label">lang</span>
                {languages.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    className={`chip ${language === lang ? "is-active" : ""}`}
                    onClick={() => setLanguage(lang)}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="label">sort</span>
                {SORTS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`chip ${sort === option.id ? "is-active" : ""}`}
                    onClick={() => setSort(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {!loading && (
              <p className="mono text-xs text-dim">
                {visible.length} of {repos.length} shown
                {language !== "all" && ` · filtered by ${language}`}
                {query.trim() && ` · matching "${query.trim()}"`}
              </p>
            )}
          </div>

          {/* ----------------------------------------------------------- grid */}
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="skel h-52" />
              <div className="skel h-52" />
              <div className="skel h-52" />
            </div>
          ) : visible.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((repo) => (
                <ProjectCard key={repo.name} repo={repo} />
              ))}
            </div>
          ) : (
            <Reveal className="win flex flex-col items-center gap-3 p-10 text-center">
              <p className="mono text-sm text-ink">no projects match that filter.</p>
              <p className="mono text-xs text-dim">
                {repos.length === 0
                  ? "the GitHub API returned no public repositories for this account."
                  : "try clearing the search box or switching language back to all."}
              </p>
              {(query || language !== "all") && (
                <button
                  type="button"
                  className="btn btn-ghost mt-2"
                  onClick={() => {
                    setQuery("");
                    setLanguage("all");
                  }}
                >
                  reset filters
                </button>
              )}
            </Reveal>
          )}

          {status === "offline" && (
            <p className="mono mt-6 text-xs text-dim">
              showing a bundled snapshot — start the Flask API to load live data.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
