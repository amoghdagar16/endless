#!/usr/bin/env bash
# One-shot local launch: backend (8001) + Next.js (3000). Idempotent.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
mkdir -p .dev

port_in_use() {
  local p="$1"
  ss -tln 2>/dev/null | grep -qE ":${p}\s" || return 1
  return 0
}

wait_ports_free() {
  local i
  for i in $(seq 1 40); do
    port_in_use 8001 || port_in_use 3000 || return 0
    "$ROOT/scripts/stop-dev.sh" >/dev/null 2>&1 || true
    sleep 0.5
  done
  echo "ERROR: ports 8001 or 3000 are still in use after cleanup."
  echo "Stop whatever is bound there (other terminals / Docker), then retry."
  ss -tlnp 2>/dev/null | grep -E ':8001|:3000' || true
  exit 1
}

"$ROOT/scripts/stop-dev.sh" >/dev/null 2>&1 || true
wait_ports_free

if [[ ! -f .venv/bin/uvicorn ]]; then
  echo "ERROR: Python venv missing or incomplete."
  echo "  python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

if [[ ! -f frontend/node_modules/.bin/next ]]; then
  echo "ERROR: frontend/node_modules missing."
  echo "  cd frontend && npm install"
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "WARN: .env missing — backend may fail (copy .env.example)."
fi
if [[ ! -f frontend/.env.local ]]; then
  echo "WARN: frontend/.env.local missing — copy frontend/.env.local.example"
fi

: > .dev/backend.log
: > .dev/frontend.log

echo "Starting API (uvicorn on :8001)…"
nohup bash -c "cd \"$ROOT\" && source .venv/bin/activate && exec uvicorn main:app --reload --host 127.0.0.1 --port 8001" \
  >> .dev/backend.log 2>&1 &
echo $! > .dev/backend.pid

echo "Starting web (next dev on :3000)…"
nohup bash -c "cd \"$ROOT/frontend\" && exec npm run dev" \
  >> .dev/frontend.log 2>&1 &
echo $! > .dev/frontend.pid

echo "Waiting for fresh processes (log-based)…"
backend_ok=0
frontend_ok=0
for _ in $(seq 1 120); do
  if grep -q "Address already in use" .dev/backend.log 2>/dev/null; then
    echo "ERROR: backend could not bind to :8001"
    tail -n 30 .dev/backend.log
    exit 1
  fi
  if grep -qE "Application startup complete|Uvicorn running" .dev/backend.log 2>/dev/null; then
    backend_ok=1
  fi
  if grep -q "Port 3000 is in use" .dev/frontend.log 2>/dev/null; then
    echo "ERROR: Next.js could not use :3000"
    tail -n 30 .dev/frontend.log
    exit 1
  fi
  if grep -q "Ready in" .dev/frontend.log 2>/dev/null; then
    frontend_ok=1
  fi
  if [[ "$backend_ok" -eq 1 && "$frontend_ok" -eq 1 ]]; then
    break
  fi
  sleep 0.5
done

if [[ "$backend_ok" -ne 1 || "$frontend_ok" -ne 1 ]]; then
  echo "ERROR: servers did not become ready in time."
  echo "--- backend (tail) ---"
  tail -n 40 .dev/backend.log
  echo "--- frontend (tail) ---"
  tail -n 40 .dev/frontend.log
  exit 1
fi

if ! curl -sf --connect-timeout 2 http://127.0.0.1:8001/ >/dev/null; then
  echo "ERROR: API not responding on :8001"
  exit 1
fi
# Next may return 404 on / depending on routes; any HTTP status means the server is up.
code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://127.0.0.1:3000/ || echo 000)
if [[ "$code" == "000" ]]; then
  echo "ERROR: web not responding on :3000"
  exit 1
fi

echo ""
echo "  Backend:  http://127.0.0.1:8001  (OpenAPI: /docs)"
echo "  App:      http://localhost:3000"
echo ""
echo "  Logs:    tail -f \"$ROOT/.dev/backend.log\" \"$ROOT/.dev/frontend.log\""
echo "  Stop:    $ROOT/scripts/stop-dev.sh"
echo ""
