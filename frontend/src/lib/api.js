const JSON_HEADERS = { Accept: "application/json" };

async function readError(response) {
  try {
    const body = await response.json();
    if (body && typeof body.error === "string" && body.error) return body.error;
  } catch {
    /* body was not JSON */
  }
  return `Request failed with HTTP ${response.status}`;
}

/** GET /api/github — live profile + repos + stats, proxied and cached by Flask. */
export async function fetchGithub({ refresh = false, signal } = {}) {
  const response = await fetch(`/api/github${refresh ? "?refresh=1" : ""}`, {
    headers: JSON_HEADERS,
    signal,
  });

  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

/** POST /api/contact — returns { delivered, mailto, reason }. */
export async function sendContact({ name, email, message }, { signal } = {}) {
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: { ...JSON_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, message }),
    signal,
  });

  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}
