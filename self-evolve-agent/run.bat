@echo off
cd /d %~dp0

if not exist ".venv" (
  echo Creating virtual environment...
  python -m venv .venv
)

call .venv\Scripts\activate.bat
pip install -q --upgrade pip
pip install -q -r requirements.txt

if not exist ".env" (
  if exist ".env.example" copy .env.example .env
)

echo.
echo Starting Self-Evolve on http://localhost:8000  (Ctrl+C to stop)
echo.
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
