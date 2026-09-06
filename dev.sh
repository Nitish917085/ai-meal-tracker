#!/usr/bin/env bash
#
# dev.sh — start all three CaloriePal services in WATCH mode (hot reload).
# This is a test/dev-only project: every service runs its watch-mode `dev`
# script, so changes reload automatically. No production build is involved.
#
#   calorie-service  → http://localhost:4000  (tsx watch)
#   ai-services      → http://localhost:4001  (tsx watch)
#   frontend         → http://localhost:5173  (Vite HMR)
#
# Usage:
#   ./dev.sh                 # install deps (if needed) then start everything
#
# Each service runs `npm install` first, then its watch-mode dev script.
# Press Ctrl+C to stop all services.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure the top-level uploads directory exists (the AI service saves files here).
UPLOADS_DIR="$ROOT_DIR/uploads"
if [ ! -d "$UPLOADS_DIR" ]; then
  echo "Creating uploads directory: $UPLOADS_DIR"
  mkdir -p "$UPLOADS_DIR"
fi

# Track child PIDs so we can shut them down cleanly.
PIDS=()
cleanup() {
  echo ""
  echo "Stopping services..."
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  # Give children a moment to terminate their own process groups.
  sleep 1
  echo "All services stopped."
}
trap cleanup EXIT INT TERM

run_service() {
  local dir="$1"
  local name="$2"
  local port="$3"

  if [ ! -d "$dir" ]; then
    echo "[$name] directory not found: $dir"
    exit 1
  fi

  # Always install dependencies first so every service has node_modules before it starts.
  echo "[$name] installing dependencies..."
  (cd "$dir" && npm install) || { echo "[$name] npm install failed"; exit 1; }

  echo "[$name] starting in watch mode on http://localhost:$port"
  (cd "$dir" && npm run dev) &
  PIDS+=("$!")
}

echo "=== CaloriePal — starting all services (watch mode) ==="

run_service "$ROOT_DIR/calorie-service" "calorie-service" 4000
run_service "$ROOT_DIR/ai-services" "ai-services" 4001
run_service "$ROOT_DIR/frontend" "frontend" 5173

echo ""
echo "All services launched. Press Ctrl+C to stop."
echo "  calorie-service: http://localhost:4000"
echo "  ai-services:     http://localhost:4001"
echo "  frontend:        http://localhost:5173"
echo ""

# Wait for any child to exit (or for Ctrl+C).
wait
