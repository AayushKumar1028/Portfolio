"""Flask backend for the portfolio site.

Responsibilities
  1. Proxy the public GitHub API so the project grid is always live, with a
     short in-memory TTL cache and a serve-stale-on-error fallback.
  2. Accept contact-form submissions (SMTP optional; falls back to a mailto
     draft the browser opens).
  3. Serve the built React app from frontend/dist, with SPA fallback routing.

Run locally:  python app.py      (or: flask --app app run)
"""

from __future__ import annotations

import json
import os
import smtplib
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from email.message import EmailMessage
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DIST_DIR = (PROJECT_ROOT / "frontend" / "dist").resolve()
INDEX_FILE = DIST_DIR / "index.html"

load_dotenv(BASE_DIR / ".env")


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


# --------------------------------------------------------------- configuration

GITHUB_USERNAME = os.getenv("GITHUB_USERNAME", "Aayush01").strip()
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "").strip()
GITHUB_TIMEOUT = _env_int("GITHUB_TIMEOUT_SECONDS", 12)
CACHE_TTL = _env_int("CACHE_TTL_SECONDS", 300)
MAX_PAGES = _env_int("GITHUB_MAX_PAGES", 5)

CONTACT_TO = os.getenv("CONTACT_TO", "kumarkids.aayush@gmail.com").strip()
SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = _env_int("SMTP_PORT", 587)
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "").strip()
SMTP_TIMEOUT = _env_int("SMTP_TIMEOUT_SECONDS", 15)

app = Flask(__name__, static_folder=None)


class GitHubError(Exception):
    """Raised when the upstream GitHub API cannot satisfy a request."""

    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.message = message
        self.status = status


# -------------------------------------------------------------- github client


def github_get(path: str, params: dict | None = None):
    url = f"https://api.github.com{path}"
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"

    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "aayush-portfolio/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"

    request_obj = urllib.request.Request(url, headers=headers)

    try:
        with urllib.request.urlopen(request_obj, timeout=GITHUB_TIMEOUT) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = json.loads(exc.read().decode("utf-8")).get("message", "")
        except Exception:  # noqa: BLE001 - body may not be JSON
            detail = ""

        if exc.code == 404:
            raise GitHubError(f"GitHub user '{GITHUB_USERNAME}' was not found.", 404) from exc
        if exc.code in (403, 429):
            raise GitHubError(
                f"GitHub API rate limit reached{': ' + detail if detail else ''}. "
                "Set GITHUB_TOKEN to raise the limit.",
                429,
            ) from exc
        raise GitHubError(f"GitHub responded with HTTP {exc.code}{': ' + detail if detail else ''}") from exc
    except urllib.error.URLError as exc:
        raise GitHubError(f"Could not reach the GitHub API: {exc.reason}") from exc
    except json.JSONDecodeError as exc:
        raise GitHubError("GitHub returned a malformed response.") from exc


def normalize_repo(raw: dict) -> dict:
    size = raw.get("size") or 0
    description = (raw.get("description") or "").strip()

    # The API reports an empty repository with a null description, which reads
    # as a bug on the site — say what is actually true instead.
    if not description and size == 0:
        description = "Empty repository — no commits, no README and no language detected yet."

    return {
        "name": raw.get("name"),
        "description": description or None,
        "language": raw.get("language"),
        "stars": raw.get("stargazers_count", 0),
        "forks": raw.get("forks_count", 0),
        "openIssues": raw.get("open_issues_count", 0),
        "topics": raw.get("topics") or [],
        "url": raw.get("html_url"),
        "homepage": (raw.get("homepage") or "").strip() or None,
        "fork": bool(raw.get("fork")),
        "archived": bool(raw.get("archived")),
        "size": size,
        "hasPages": bool(raw.get("has_pages")),
        "createdAt": raw.get("created_at"),
        "updatedAt": raw.get("updated_at"),
        "pushedAt": raw.get("pushed_at"),
        "isEmpty": size == 0,
    }


def build_stats(repos: list[dict]) -> dict:
    languages: dict[str, int] = {}
    stars = 0
    forks = 0
    empty = 0
    last_push = None

    for repo in repos:
        stars += repo["stars"]
        forks += repo["forks"]
        if repo["isEmpty"]:
            empty += 1

        key = repo["language"] or "unspecified"
        languages[key] = languages.get(key, 0) + 1

        pushed = repo.get("pushedAt")
        if pushed and (last_push is None or pushed > last_push):
            last_push = pushed

    ordered = sorted(languages.items(), key=lambda item: (-item[1], item[0]))

    return {
        "repos": len(repos),
        "stars": stars,
        "forks": forks,
        "emptyRepos": empty,
        "lastPush": last_push,
        "languages": [{"name": name, "count": count} for name, count in ordered],
    }


def fetch_all_repos() -> list[dict]:
    repos: list[dict] = []

    for page in range(1, MAX_PAGES + 1):
        batch = github_get(
            f"/users/{GITHUB_USERNAME}/repos",
            {"per_page": 100, "page": page, "sort": "updated", "type": "owner"},
        )
        if not isinstance(batch, list) or not batch:
            break

        repos.extend(batch)
        if len(batch) < 100:
            break

    return [normalize_repo(repo) for repo in repos]


def fetch_payload() -> dict:
    profile_raw = github_get(f"/users/{GITHUB_USERNAME}")
    repos = fetch_all_repos()

    return {
        "source": "github",
        "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "cached": False,
        "stale": False,
        "profile": {
            "login": profile_raw.get("login", GITHUB_USERNAME),
            "name": profile_raw.get("name"),
            "publicRepos": profile_raw.get("public_repos", len(repos)),
            "followers": profile_raw.get("followers", 0),
            "following": profile_raw.get("following", 0),
            "url": profile_raw.get("html_url") or f"https://github.com/{GITHUB_USERNAME}",
        },
        "stats": build_stats(repos),
        "repos": repos,
    }


# ------------------------------------------------------------------- caching

_cache: dict = {"payload": None, "at": 0.0}
_cache_lock = threading.Lock()


def get_payload(force: bool = False) -> dict:
    with _cache_lock:
        cached = _cache["payload"]
        fresh = cached is not None and (time.time() - _cache["at"]) < CACHE_TTL

    if fresh and not force:
        payload = dict(cached)
        payload.update(source="cache", cached=True, stale=False)
        return payload

    try:
        payload = fetch_payload()
    except GitHubError:
        # Better to serve a slightly old list than an error page.
        if cached is not None:
            stale = dict(cached)
            stale.update(source="stale-cache", cached=True, stale=True)
            return stale
        raise

    with _cache_lock:
        _cache["payload"] = payload
        _cache["at"] = time.time()

    return payload


# -------------------------------------------------------------- api endpoints


@app.get("/api/health")
def health():
    return jsonify(
        status="ok",
        githubUser=GITHUB_USERNAME,
        authenticated=bool(GITHUB_TOKEN),
        cacheTtlSeconds=CACHE_TTL,
        frontendBuilt=INDEX_FILE.is_file(),
    )


@app.get("/api/github")
def github():
    force = request.args.get("refresh", "").lower() in {"1", "true", "yes", "on"}
    try:
        return jsonify(get_payload(force=force))
    except GitHubError as exc:
        return jsonify(error=exc.message), exc.status


def build_mailto(name: str, email: str, message: str) -> str:
    query = urllib.parse.urlencode(
        {
            "subject": f"Portfolio message from {name}",
            "body": f"{message}\n\n— {name} <{email}>",
        }
    )
    return f"mailto:{urllib.parse.quote(CONTACT_TO)}?{query}"


@app.post("/api/contact")
def contact():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip()
    message = str(data.get("message", "")).strip()

    fields = {}
    if not name:
        fields["name"] = "Please add your name."
    elif len(name) > 120:
        fields["name"] = "That name is too long."
    if not email or "@" not in email or len(email) > 200:
        fields["email"] = "Please add a valid email address."
    if not message:
        fields["message"] = "Please write a message."
    elif len(message) > 5000:
        fields["message"] = "That message is too long."

    if fields:
        return jsonify(error="Please check the form and try again.", fields=fields), 400

    mailto = build_mailto(name, email, message)

    # Without SMTP credentials there is nowhere to deliver to, so hand the
    # browser a pre-filled draft instead of silently dropping the message.
    if not SMTP_HOST:
        return jsonify(
            delivered=False,
            reason="smtp_not_configured",
            mailto=mailto,
        )

    email_message = EmailMessage()
    email_message["Subject"] = f"Portfolio message from {name}"
    email_message["From"] = SMTP_FROM or SMTP_USER
    email_message["To"] = CONTACT_TO
    email_message["Reply-To"] = email
    email_message.set_content(f"{message}\n\n— {name} <{email}>")

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT) as server:
            server.starttls()
            if SMTP_USER:
                server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(email_message)
    except Exception as exc:  # noqa: BLE001 - report any provider failure to the client
        app.logger.exception("contact delivery failed")
        return jsonify(delivered=False, reason=f"delivery failed: {exc}", mailto=mailto)

    return jsonify(delivered=True)


# --------------------------------------------------- static build hosting (SPA)


def build_hint_response():
    message = (
        "The React build is missing. Run:\n"
        "  cd frontend && npm install && npm run build\n"
        "then reload this page."
    )
    return app.response_class(message, mimetype="text/plain", status=503)


@app.get("/")
def index():
    if not INDEX_FILE.is_file():
        return build_hint_response()
    return send_from_directory(DIST_DIR, "index.html")


@app.get("/<path:path>")
def static_or_spa(path: str):
    if path.startswith("api/"):
        return jsonify(error="Unknown API endpoint."), 404

    candidate = (DIST_DIR / path).resolve()
    try:
        candidate.relative_to(DIST_DIR)
    except ValueError:
        return jsonify(error="Not found."), 404

    if candidate.is_file():
        return send_from_directory(DIST_DIR, path)

    # Unknown deep link -> let the client-side router handle it.
    if not INDEX_FILE.is_file():
        return build_hint_response()
    return send_from_directory(DIST_DIR, "index.html")


@app.after_request
def add_headers(response):
    # index.html must never be cached, or a new build will not be picked up.
    if response.mimetype == "text/html":
        response.headers["Cache-Control"] = "no-cache, must-revalidate"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=_env_int("PORT", 5000),
        debug=os.getenv("FLASK_DEBUG", "") == "1",
    )
