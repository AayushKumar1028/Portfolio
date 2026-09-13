import { Link } from "react-router-dom";
import Backdrop from "../components/Backdrop.jsx";
import Marquee from "../components/Marquee.jsx";
import Palette from "../components/Palette.jsx";
import ProjectCard from "../components/ProjectCard.jsx";
import Reveal from "../components/Reveal.jsx";
import SyncBadge from "../components/SyncBadge.jsx";
import { ArrowRightIcon, MailIcon, PinIcon } from "../components/Icons.jsx";
import { useGithub } from "../hooks/useGithub.js";
import { SITE } from "../lib/site.js";
import { formatDate, languageAccent, plural, timeAgo } from "../lib/format.js";

function StatSkeleton({ className = "" }) {
  return <div className={`skel h-24 ${className}`} />;
}

function LanguageBreakdown({ languages, total }) {
  if (!languages?.length) {
    return <p className="mono text-sm text-dim">no languages reported yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {languages.map((entry) => (
        <li key={entry.name} className="flex flex-col gap-1.5">
          <div className="mono flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-muted">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: languageAccent(entry.name === "unspecified" ? null : entry.name) }}
              />
              {entry.name}
            </span>
            <span className="text-dim">{entry.count}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/60">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(6, Math.round((entry.count / Math.max(1, total)) * 100))}%`,
                background: languageAccent(entry.name === "unspecified" ? null : entry.name),
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Home({ initialData = null }) {
  const { status, data, error, refreshing, refresh } = useGithub(initialData);
  const stats = data?.stats;
  const repos = data?.repos || [];
  const loading = status === "loading";

  const featured = [...repos]
    .sort((a, b) => b.stars - a.stars || new Date(b.pushedAt) - new Date(a.pushedAt))
    .slice(0, 3);

  return (
    <>
      <Backdrop />

      <main>
        {/* ------------------------------------------------------- hero tiles */}
        <section className="pt-28 sm:pt-32">
          <div className="mx-auto max-w-shell px-3 sm:px-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <article className="win p-6 sm:p-9 lg:col-span-2 lg:row-span-3">
                <p className="mono prompt text-xs text-muted">whoami</p>

                <h1 className="mt-4 text-4xl leading-[1.05] font-bold tracking-tight sm:text-6xl">
                  <span className="grad-text">
                    {SITE.first}
                    <br className="hidden sm:block" /> {SITE.last}
                  </span>
                </h1>

                <p className="mono mt-5 text-sm text-muted sm:text-base">
                  developer<span className="mx-2 text-dim">·</span>
                  {SITE.location}
                </p>

                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
                  A personal space for the things I build. The projects grid is pulled straight
                  from the GitHub API through a small Flask service, so it stays current without a
                  rebuild.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link to="/projects" className="btn btn-primary">
                    view projects <ArrowRightIcon />
                  </Link>
                  <Link to="/about" className="btn btn-ghost">
                    about &amp; contact
                  </Link>
                </div>

                <div className="mono mt-8 flex flex-wrap gap-2">
                  <span className="pill">
                    <PinIcon width={12} height={12} /> {SITE.location}
                  </span>
                  <span className="pill">
                    <MailIcon width={12} height={12} /> {SITE.email}
                  </span>
                  <span className="pill">{SITE.githubUser}</span>
                </div>
              </article>

              <Reveal className="win flex flex-col justify-between p-5">
                <p className="label">public repos</p>
                <p className="mono grad-text mt-3 text-4xl font-bold">
                  {loading ? "—" : stats?.repos ?? 0}
                </p>
                <p className="mono mt-2 text-xs text-dim">{SITE.githubUser}</p>
              </Reveal>

              <Reveal className="win flex flex-col justify-between p-5">
                <p className="label">based in</p>
                <p className="mono mt-3 text-2xl font-bold text-ink">{SITE.city}</p>
                <p className="mono mt-2 text-xs text-dim">{SITE.region}</p>
              </Reveal>

              <Reveal className="win flex flex-col justify-between p-5">
                <p className="label">latest push</p>
                <p className="mono mt-3 text-lg font-bold text-ink">
                  {loading ? "—" : stats?.lastPush ? timeAgo(stats.lastPush) : "no commits"}
                </p>
                <Link
                  to="/about"
                  className="mono mt-2 text-xs text-dim transition hover:text-cachy"
                >
                  contact me →
                </Link>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- marquee */}
        <section className="mt-4 border-y border-line/70 bg-abyss/40 py-3">
          <Marquee />
        </section>

        {/* --------------------------------------------------- live dashboard */}
        <section className="pt-16 sm:pt-20">
          <div className="mx-auto max-w-shell px-3 sm:px-5">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="label">// live dashboard</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  Straight from GitHub
                </h2>
              </div>
              <SyncBadge
                status={status}
                data={data}
                refreshing={refreshing}
                onRefresh={refresh}
                error={error}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {loading ? (
                <>
                  <StatSkeleton />
                  <StatSkeleton />
                  <StatSkeleton />
                </>
              ) : (
                <>
                  <Reveal className="win p-5">
                    <p className="label">public repos</p>
                    <p className="mono mt-2 text-3xl font-bold text-ink">{stats?.repos ?? 0}</p>
                    <p className="mono mt-1 text-xs text-dim">
                      {plural(stats?.emptyRepos ?? 0, "empty repo")}
                    </p>
                  </Reveal>
                  <Reveal className="win p-5">
                    <p className="label">total stars</p>
                    <p className="mono mt-2 text-3xl font-bold text-ink">{stats?.stars ?? 0}</p>
                    <p className="mono mt-1 text-xs text-dim">
                      {plural(stats?.forks ?? 0, "fork")}
                    </p>
                  </Reveal>
                  <Reveal className="win p-5">
                    <p className="label">last commit</p>
                    <p className="mono mt-2 text-xl font-bold text-ink">
                      {stats?.lastPush ? formatDate(stats.lastPush) : "no public commits"}
                    </p>
                    <p className="mono mt-1 text-xs text-dim">
                      {stats?.lastPush ? timeAgo(stats.lastPush) : "—"}
                    </p>
                  </Reveal>
                </>
              )}
            </div>

            <Reveal className="win mt-4 p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="label">language breakdown</p>
                <a
                  href={SITE.githubReposUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono text-xs text-cachy transition hover:text-cachy-light"
                >
                  all languages ↗
                </a>
              </div>
              {loading ? (
                <div className="skel h-16" />
              ) : (
                <LanguageBreakdown languages={stats?.languages} total={stats?.repos} />
              )}
            </Reveal>
          </div>
        </section>

        {/* --------------------------------------------------- featured repos */}
        <section className="pt-16 sm:pt-20">
          <div className="mx-auto max-w-shell px-3 sm:px-5">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="label">// featured repos</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  On GitHub right now
                </h2>
              </div>
              <Link
                to="/projects"
                className="mono shrink-0 text-xs text-cachy transition hover:text-cachy-light"
              >
                all projects →
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                <>
                  <div className="skel h-56" />
                  <div className="skel h-56" />
                  <div className="skel h-56" />
                </>
              ) : (
                <>
                  {featured.map((repo) => (
                    <ProjectCard key={repo.name} repo={repo} />
                  ))}
                  <Reveal className="win flex flex-col p-5">
                    <p className="label">source of truth</p>
                    <p className="mono mt-3 text-sm leading-relaxed text-muted">
                      everything on this site is read from the public GitHub API for{" "}
                      <span className="text-ink">{SITE.githubUser}</span>.
                    </p>
                    <a
                      href={SITE.githubReposUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mono mt-auto pt-5 text-xs text-cachy transition hover:text-cachy-light"
                    >
                      open github →
                    </a>
                  </Reveal>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ rice */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-shell px-3 sm:px-5">
            <div className="mb-6">
              <p className="label">// the rice</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Palette</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                The colours come from a CachyOS desktop running Hyprland on Arch — deep blue-black
                surfaces, CachyOS teal for highlights, Arch blue as the bridge, and the Hyprland
                pink → violet → cyan gradient on borders, focus rings and glow.
              </p>
            </div>
            <Palette />
          </div>
        </section>
      </main>
    </>
  );
}
