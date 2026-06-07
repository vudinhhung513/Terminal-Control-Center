#!/usr/bin/env bash
# file: install-service-macos.sh
# Chuc nang: Cai dat Terminal Control Center nhu launchd LaunchAgent tren macOS.
# Service chay o muc user (khong can sudo), tu khoi dong khi dang nhap.
# Luu y: ban macOS chua duoc kiem thu thuc te (untested).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_BIN="$(command -v node || true)"
PLIST_NAME="com.tcc.terminal-control-center"
PLIST_DIR="${HOME}/Library/LaunchAgents"
PLIST_PATH="${PLIST_DIR}/${PLIST_NAME}.plist"
LOG_DIR="${HOME}/Library/Logs"
LOG_OUT="${LOG_DIR}/terminal-control-center.log"
LOG_ERR="${LOG_DIR}/terminal-control-center.err.log"
SERVER_PATH="${SCRIPT_DIR}/src/server.js"

echo "=== Cai dat launchd LaunchAgent: ${PLIST_NAME} ==="
echo "Thu muc ung dung: ${SCRIPT_DIR}"
echo ""

# Kiem tra node
if [ -z "${NODE_BIN}" ]; then
  echo "ERROR: node khong duoc tim thay."
  echo "Cai dat Node.js 18+: https://nodejs.org/"
  echo "Hoac dung Homebrew: brew install node"
  exit 1
fi
echo "Node: ${NODE_BIN}"

# Kiem tra tmux (canh bao, khong chan cai dat)
if ! command -v tmux &>/dev/null; then
  echo "CANH BAO: tmux khong duoc tim thay. Ung dung can tmux de hoat dong."
  echo "Cai dat: brew install tmux"
  echo ""
fi

# Cai dependency neu chua co
if [ ! -d "${SCRIPT_DIR}/node_modules" ]; then
  echo "=> Cai dat dependencies (npm install)..."
  (cd "${SCRIPT_DIR}" && npm install)
fi

# Tao config.json tu example neu chua co
if [ ! -f "${SCRIPT_DIR}/config.json" ]; then
  cp "${SCRIPT_DIR}/config.example.json" "${SCRIPT_DIR}/config.json"
  echo "=> Da tao config.json tu config.example.json. Hay chinh sua truoc khi dung trong production."
fi

# Tao thu muc LaunchAgents neu chua ton tai
mkdir -p "${PLIST_DIR}"

# Unload service cu (bo qua loi neu chua load)
launchctl unload -w "${PLIST_PATH}" 2>/dev/null || true

# Tao file plist
echo "=> Tao LaunchAgent plist: ${PLIST_PATH}"
cat > "${PLIST_PATH}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_NAME}</string>

    <key>ProgramArguments</key>
    <array>
        <string>${NODE_BIN}</string>
        <string>${SERVER_PATH}</string>
    </array>

    <key>WorkingDirectory</key>
    <string>${SCRIPT_DIR}</string>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>${LOG_OUT}</string>

    <key>StandardErrorPath</key>
    <string>${LOG_ERR}</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
        <key>NODE_ENV</key>
        <string>production</string>
    </dict>
</dict>
</plist>
EOF

# Load service moi
echo "=> Load LaunchAgent..."
launchctl load -w "${PLIST_PATH}"

echo ""
echo "=== LaunchAgent ${PLIST_NAME} da duoc cai dat va khoi dong! ==="
echo ""
echo "Luu y: ban macOS chua duoc kiem thu thuc te (untested)."
echo ""
echo "Xem log stdout:   tail -f ${LOG_OUT}"
echo "Xem log stderr:   tail -f ${LOG_ERR}"
echo "Dung service:     launchctl unload -w ${PLIST_PATH}"
echo "Khoi dong lai:    launchctl unload -w ${PLIST_PATH} && launchctl load -w ${PLIST_PATH}"
echo "Kiem tra trang thai: launchctl list | grep ${PLIST_NAME}"
