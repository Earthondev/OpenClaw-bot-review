#!/bin/zsh
set -euo pipefail

ROOT="/Users/earthondev/Desktop/OpenClaw-bot-review"
PID_FILE="$ROOT/.run/dashboard.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "No PID file found"
  exit 0
fi

pid="$(cat "$PID_FILE" 2>/dev/null || true)"
if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
  kill "$pid"
  echo "Stopped dashboard PID $pid"
else
  echo "Dashboard process already stopped"
fi

rm -f "$PID_FILE"
