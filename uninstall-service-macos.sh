#!/usr/bin/env bash
# file: uninstall-service-macos.sh
# Chuc nang: Go bo launchd LaunchAgent cua Terminal Control Center tren macOS.

set -euo pipefail

PLIST_NAME="com.tcc.terminal-control-center"
PLIST_PATH="${HOME}/Library/LaunchAgents/${PLIST_NAME}.plist"

echo "=== Go bo launchd LaunchAgent: ${PLIST_NAME} ==="

# Unload service (bo qua loi neu chua load)
launchctl unload -w "${PLIST_PATH}" 2>/dev/null || true

# Xoa file plist neu ton tai
if [ -f "${PLIST_PATH}" ]; then
  rm -f "${PLIST_PATH}"
  echo "=> Da xoa: ${PLIST_PATH}"
else
  echo "=> File plist khong ton tai, bo qua."
fi

echo "=> Da go bo LaunchAgent ${PLIST_NAME} thanh cong."
