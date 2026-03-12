#!/usr/bin/env bash
# start.sh — Launch the Diagnostic backend on your laptop.
#
# Usage:
#   cd back-end
#   chmod +x start.sh
#   ./start.sh
#
# Prerequisites:
#   1. Python 3.11+ with a virtualenv activated
#   2. pip install -r requirements.txt
#   3. cp .env.example .env  (fill in your keys)

set -euo pipefail
cd "$(dirname "$0")"

# Default port (override with PORT=xxxx ./start.sh)
PORT="${PORT:-8000}"

echo "🩺 Starting Diagnostic API on http://localhost:${PORT}"
echo "   Health check: http://localhost:${PORT}/health"
echo ""
echo "💡 To expose to the internet for Vercel, run in another terminal:"
echo "   ngrok http ${PORT}"
echo ""

exec uvicorn app.main:app --host 127.0.0.1 --port "${PORT}" --reload
