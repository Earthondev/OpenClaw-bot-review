#!/bin/sh
set -eu

LAYOUT_DIR="${HOME}/.openclaw/pixel-office"
LAYOUT_FILE="${LAYOUT_DIR}/layout.json"
BACKUP_DIR="${LAYOUT_DIR}/backups"
PROJECT_DIR="/Users/earthondev/Desktop/OpenClaw-bot-review"

mkdir -p "${BACKUP_DIR}"

if [ -f "${LAYOUT_FILE}" ]; then
  cp "${LAYOUT_FILE}" "${BACKUP_DIR}/layout-pre-batcave-$(date +%Y%m%d-%H%M%S).json"
  rm "${LAYOUT_FILE}"
fi

sh "${PROJECT_DIR}/scripts/stop_dashboard.sh" || true
sh "${PROJECT_DIR}/scripts/run_dashboard.sh"

echo "Batcave default layout is now active after the next hard refresh."
