#!/usr/bin/env bash
# Stop local Fintra dev servers (ports used by this repo).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .dev/backend.pid ]]; then
  kill "$(cat .dev/backend.pid)" 2>/dev/null || true
fi
if [[ -f .dev/frontend.pid ]]; then
  kill "$(cat .dev/frontend.pid)" 2>/dev/null || true
fi

fuser -k -9 8001/tcp 2>/dev/null || true
fuser -k -9 3000/tcp 2>/dev/null || true
sleep 0.25
fuser -k -9 8001/tcp 2>/dev/null || true
fuser -k -9 3000/tcp 2>/dev/null || true
rm -f .dev/backend.pid .dev/frontend.pid 2>/dev/null || true
echo "Ports 8001 and 3000 cleared (and recorded PIDs stopped if present)."
