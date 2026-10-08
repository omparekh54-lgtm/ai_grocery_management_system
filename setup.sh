#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
npm --prefix frontend ci
npm --prefix frontend run build
printf '\nSetup complete. Run ./start.sh and open http://localhost:3000\n'
