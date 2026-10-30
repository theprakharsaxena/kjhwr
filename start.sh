#!/usr/bin/env bash
set -e

# Change to script directory (workspace root)
cd "$(dirname "$0")"

echo "=== Starting WindScope (Day-Ahead Intelligence) ==="

# 1. Start Python FastAPI backend in the background
echo "[1/2] Launching Backend on http://localhost:8000..."
./backend/venv/bin/python3 -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Ensure backend process is cleaned up when this script exits
cleanup() {
    echo ""
    echo "Stopping WindScope..."
    kill "$BACKEND_PID" 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Give backend a moment to initialize
sleep 1.5

# 2. Start Vite React frontend
echo "[2/2] Launching Frontend on http://localhost:5173..."
npm --prefix frontend run dev
