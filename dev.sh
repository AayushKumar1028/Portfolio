#!/usr/bin/env bash
# Run the Flask API and the Vite dev server together.
# The dev server proxies /api to Flask, so the React app gets live GitHub data
# with hot reload. Ctrl+C stops both.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -x "$ROOT/backend/.venv/bin/python" ]; then
  echo "backend virtualenv missing. Run:" >&2
  echo "  python3 -m venv backend/.venv" >&2
  echo "  backend/.venv/bin/pip install -r backend/requirements.txt" >&2
  exit 1
fi

if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "frontend dependencies missing. Run: cd frontend && npm install" >&2
  exit 1
fi

# Kill the whole process group on exit so neither server is left behind.
trap 'kill 0' EXIT INT TERM

echo "  API  http://127.0.0.1:5000"
echo "  site http://127.0.0.1:5173"

( cd "$ROOT/backend" && exec .venv/bin/python app.py ) &
( cd "$ROOT/frontend" && exec npm run dev ) &

wait
