#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp .env.example .env
fi

echo ""
echo "Starting Self-Evolve on http://localhost:8000  (Ctrl+C to stop)"
echo ""
uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --reload
