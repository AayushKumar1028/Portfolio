import Reveal from "./Reveal.jsx";
import { ForkIcon, GitHubIcon, StarIcon } from "./Icons.jsx";
import { formatDate, languageAccent, timeAgo } from "../lib/format.js";

export default function ProjectCard({ repo }) {
  const language = repo.language || "unspecified";
  const accent = languageAccent(repo.language);
  const changed = repo.pushedAt || repo.updatedAt;

  return (
    <Reveal className="win flex flex-col p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mono text-base font-bold break-words text-ink transition hover:text-cachy"
          >
            {repo.name}
          </a>
          <p className="mono mt-1 text-[11px] text-dim">
            updated {timeAgo(changed)} <span className="text-line">·</span> {formatDate(changed)}
          </p>
        </div>
        <a
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${repo.name} on GitHub`}
          className="shrink-0 text-dim transition hover:text-hypr-pink"
        >
          <GitHubIcon width={18} height={18} />
        </a>
      </header>

      <p className="mt-3 text-sm leading-relaxed text-muted">
        {repo.description || "No description provided for this repository."}
      </p>

      {repo.topics?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {repo.topics.slice(0, 5).map((topic) => (
            <span key={topic} className="pill">
              {topic}
            </span>
          ))}
        </div>
      )}

      <div className="mono tile-divider mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 text-xs text-dim">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
          {language}
        </span>
        <span className="inline-flex items-center gap-1">
          <StarIcon width={12} height={12} />
          {repo.stars}
        </span>
        <span className="inline-flex items-center gap-1">
          <ForkIcon width={12} height={12} />
          {repo.forks}
        </span>
        {repo.openIssues > 0 && <span>{repo.openIssues} open</span>}
        {repo.isEmpty && <span className="pill">no commits</span>}
        {repo.archived && <span className="pill">archived</span>}
        {repo.fork && <span className="pill">fork</span>}
        {repo.homepage && (
          <a
            href={repo.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-cachy transition hover:text-cachy-light"
          >
            demo ↗
          </a>
        )}
      </div>
    </Reveal>
  );
}
