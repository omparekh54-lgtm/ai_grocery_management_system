#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
ROOT_DIR="$PWD"
(cd backend && .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000) &
BACKEND_PID=$!
(cd frontend && npm run start) &
FRONTEND_PID=$!
trap 'kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true' EXIT INT TERM
printf '\nKitchenly is starting at http://localhost:3000. Press Ctrl+C to stop.\n'
wait -n "$BACKEND_PID" "$FRONTEND_PID"
