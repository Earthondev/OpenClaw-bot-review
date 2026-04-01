#!/bin/sh
set -eu

if [ $# -ne 1 ]; then
  echo "Usage: $0 /absolute/path/to/backup.json" >&2
  exit 1
fi

BACKUP_FILE="$1"
LAYOUT_DIR="${HOME}/.openclaw/pixel-office"
LAYOUT_FILE="${LAYOUT_DIR}/layout.json"
PROJECT_DIR="/Users/earthondev/Desktop/OpenClaw-bot-review"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

mkdir -p "${LAYOUT_DIR}"
cp "${BACKUP_FILE}" "${LAYOUT_FILE}"

sh "${PROJECT_DIR}/scripts/stop_dashboard.sh" || true
sh "${PROJECT_DIR}/scripts/run_dashboard.sh"

echo "Restored layout from ${BACKUP_FILE}"
