#!/usr/bin/env bash
# NavYatra one-time setup: Python deps, DB, Ollama model
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="/Applications/Ollama.app/Contents/Resources:${PATH:-}"

find_ollama() {
  if command -v ollama >/dev/null 2>&1; then
    command -v ollama
    return 0
  fi
  if [[ -x "/Applications/Ollama.app/Contents/Resources/ollama" ]]; then
    echo "/Applications/Ollama.app/Contents/Resources/ollama"
    return 0
  fi
  return 1
}

OLLAMA_BIN="$(find_ollama || true)"
if [[ -z "${OLLAMA_BIN}" ]]; then
  echo ">>> Ollama not found. Installing (macOS)..."
  curl -fsSL https://ollama.com/install.sh | sh || true
  OLLAMA_BIN="$(find_ollama || true)"
fi

if [[ -z "${OLLAMA_BIN}" ]]; then
  echo "ERROR: Install Ollama from https://ollama.com/download then re-run ./scripts/setup.sh"
  exit 1
fi

echo ">>> Using Ollama: $OLLAMA_BIN"

if ! curl -sf http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  echo ">>> Starting Ollama server..."
  "$OLLAMA_BIN" serve >/tmp/navyatra-ollama.log 2>&1 &
  sleep 3
fi

echo ">>> Pulling Qwen 2.5 (latest stable model)..."
"$OLLAMA_BIN" pull qwen2.5:latest

echo ">>> Ensuring qwen2.5:3b alias exists for compatibility..."
"$OLLAMA_BIN" cp qwen2.5:latest qwen2.5:3b 2>/dev/null || true

echo ">>> Python virtual environment..."
if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r navyatra/requirements.txt

echo ">>> Django migrations..."
python manage.py migrate --noinput

echo ""
echo "Setup complete. Start the app: ./scripts/start.sh"
