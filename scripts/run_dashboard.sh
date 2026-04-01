#!/bin/zsh
set -euo pipefail

ROOT="/Users/earthondev/Desktop/OpenClaw-bot-review"
RUN_DIR="$ROOT/.run"
PID_FILE="$RUN_DIR/dashboard.pid"
LOG_FILE="$RUN_DIR/dashboard.log"
PORT="${PORT:-3000}"
SERVER_JS="$ROOT/.next/standalone/server.js"
STANDALONE_NEXT_DIR="$ROOT/.next/standalone/.next"
SOURCE_STATIC_DIR="$ROOT/.next/static"
TARGET_STATIC_DIR="$STANDALONE_NEXT_DIR/static"

mkdir -p "$RUN_DIR"

if [[ -f "$PID_FILE" ]]; then
  old_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "$old_pid" ]] && kill -0 "$old_pid" 2>/dev/null; then
    echo "Dashboard already running on PID $old_pid"
    exit 0
  fi
fi

cd "$ROOT"
if [[ ! -f "$SERVER_JS" ]]; then
  echo "Build output missing. Run: cd $ROOT && npm run build" >&2
  exit 1
fi

mkdir -p "$STANDALONE_NEXT_DIR"
if [[ -d "$SOURCE_STATIC_DIR" ]]; then
  rm -rf "$TARGET_STATIC_DIR"
  cp -R "$SOURCE_STATIC_DIR" "$TARGET_STATIC_DIR"
fi

python3 - <<PY
import os
import subprocess

root = "/Users/earthondev/Desktop/OpenClaw-bot-review"
log_file = os.path.join(root, ".run", "dashboard.log")
pid_file = os.path.join(root, ".run", "dashboard.pid")
server_js = os.path.join(root, ".next", "standalone", "server.js")
env = dict(os.environ)
env["PORT"] = "${PORT}"
env["HOSTNAME"] = "127.0.0.1"

with open(log_file, "ab") as log:
    proc = subprocess.Popen(
        ["node", server_js],
        cwd=root,
        env=env,
        stdin=subprocess.DEVNULL,
        stdout=log,
        stderr=log,
        start_new_session=True,
    )

with open(pid_file, "w", encoding="utf-8") as f:
    f.write(str(proc.pid))
PY

echo "$(cat "$PID_FILE")" > "$PID_FILE"
echo "Started OpenClaw Dashboard on http://127.0.0.1:$PORT"
