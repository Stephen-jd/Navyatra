#!/usr/bin/env bash
# NavYatra: Ollama + Django (long AI timeouts, model kept warm)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="/Applications/Ollama.app/Contents/Resources:${PATH:-}"
export OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5:3b}"
export OLLAMA_TIMEOUT_SEC="${OLLAMA_TIMEOUT_SEC:-600}"
export OLLAMA_KEEP_ALIVE="${OLLAMA_KEEP_ALIVE:-30m}"
export OLLAMA_KEEP_ALIVE="${OLLAMA_KEEP_ALIVE}"

find_ollama() {
  command -v ollama 2>/dev/null || echo "/Applications/Ollama.app/Contents/Resources/ollama"
}

OLLAMA_BIN="$(find_ollama)"
if [[ ! -x "$OLLAMA_BIN" ]] && [[ ! -f "$OLLAMA_BIN" ]]; then
  echo "Run ./scripts/setup.sh first."
  exit 1
fi

if ! curl -sf http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  echo ">>> Starting Ollama (logs: /tmp/navyatra-ollama.log)..."
  OLLAMA_KEEP_ALIVE=30m "$OLLAMA_BIN" serve >>/tmp/navyatra-ollama.log 2>&1 &
  sleep 2
fi

echo ">>> Warming model $OLLAMA_MODEL ..."
curl -sf http://127.0.0.1:11434/api/generate \
  -d "{\"model\":\"$OLLAMA_MODEL\",\"prompt\":\"ok\",\"stream\":false,\"options\":{\"num_predict\":1}}" \
  >/dev/null || echo "WARN: model warm-up failed — run ./scripts/setup.sh"

if [[ -d ".venv" ]]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

echo ">>> Starting NavYatra Django at http://127.0.0.1:8000/"
export OLLAMA_MODEL OLLAMA_TIMEOUT_SEC OLLAMA_KEEP_ALIVE
exec python manage.py runserver 127.0.0.1:8000
