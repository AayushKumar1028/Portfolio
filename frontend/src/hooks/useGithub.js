import { useCallback, useEffect, useRef, useState } from "react";
import { fetchGithub } from "../lib/api.js";
import { FALLBACK_GITHUB } from "../lib/fallback.js";

/* Module-level cache: Home, Projects and About mount at different times but
   only ever trigger a single network request between them. */
let cache = null;
let inflight = null;

function loadOnce() {
  if (inflight) return inflight;
  inflight = fetchGithub()
    .then((data) => {
      cache = data;
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * Live GitHub data.
 * status: "loading" | "ready" | "offline"
 *
 * `initialData` lets a caller (a server render, a preloaded snapshot) skip the
 * request entirely; the shared module cache always wins when it is populated.
 */
export function useGithub(initialData = null) {
  const seed = cache || initialData;
  const [status, setStatus] = useState(seed ? "ready" : "loading");
  const [data, setData] = useState(seed);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    if (seed) {
      setData(seed);
      setStatus("ready");
      return () => {
        alive.current = false;
      };
    }

    loadOnce()
      .then((next) => {
        if (!alive.current) return;
        setData(next);
        setStatus("ready");
      })
      .catch((err) => {
        if (!alive.current) return;
        // Never leave the page empty — degrade to the bundled snapshot.
        setError(err.message);
        setData(FALLBACK_GITHUB);
        setStatus("offline");
      });

    return () => {
      alive.current = false;
    };
  }, [seed]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const next = await fetchGithub({ refresh: true });
      cache = next;
      setData(next);
      setStatus("ready");
    } catch (err) {
      setError(err.message);
      setStatus(data ? "ready" : "offline");
    } finally {
      setRefreshing(false);
    }
  }, [data]);

  return { status, data, error, refreshing, refresh };
}
