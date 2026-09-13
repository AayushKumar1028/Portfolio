import { RefreshIcon } from "./Icons.jsx";
import { timeAgo } from "../lib/format.js";

/** Shows where the GitHub data came from and lets you force a re-fetch. */
export default function SyncBadge({ status, data, refreshing, onRefresh, error }) {
  const offline = status === "offline";
  const stale = !offline && Boolean(data?.stale || data?.source === "stale-cache");
  const fetchedAt = data?.fetchedAt;

  const label = status === "loading"
    ? "contacting github…"
    : offline
      ? "offline snapshot"
      : stale
        ? "cached snapshot"
        : "live from github";

  const detail = offline
    ? error || "the api is not reachable"
    : stale
      ? "github unreachable, serving last known data"
      : fetchedAt
        ? `synced ${timeAgo(fetchedAt)}`
        : "—";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="pill">
        <span className={`live-dot ${offline || stale ? "live-dot--offline" : ""}`} />
        {label}
      </span>
      <span className="mono text-xs text-dim">{detail}</span>
      {onRefresh && (
        <button
          type="button"
          className="chip"
          onClick={onRefresh}
          disabled={refreshing}
          title="Re-fetch from the GitHub API"
        >
          <RefreshIcon width={12} height={12} className={refreshing ? "animate-spin" : undefined} />
          {refreshing ? "syncing" : "refresh"}
        </button>
      )}
    </div>
  );
}
