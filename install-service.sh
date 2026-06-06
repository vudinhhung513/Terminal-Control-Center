#!/usr/bin/env bash
# file: install-service.sh
# Chuc nang: Cai dat Terminal Control Center nhu systemd service (tu khoi dong cung OS).
# Luu y: Script nay can quyen sudo.

set -euo pipefail

APP_DIR=$(cd "$(dirname "$0")" && pwd)
RUN_USER=$(whoami)
NODE_BIN=$(command -v node || true)
SERVICE="terminal-control-center"

echo "=== Cai dat systemd service: ${SERVICE} ==="
echo "Thu muc ung dung: ${APP_DIR}"
echo "User: ${RUN_USER}"

# Kiem tra tmux
if ! command -v tmux &>/dev/null; then
  echo "ERROR: tmux khong duoc tim thay."
  echo "Cai dat: sudo apt install tmux"
  exit 1
fi

# Kiem tra node
if [ -z "${NODE_BIN}" ]; then
  echo "ERROR: node khong duoc tim thay."
  echo "Cai dat Node.js 18+: https://nodejs.org/"
  exit 1
fi

echo "Node: ${NODE_BIN}"

# Cai dependency neu chua co
if [ ! -d "${APP_DIR}/node_modules" ]; then
  echo "=> Cai dat dependencies (npm install)..."
  (cd "${APP_DIR}" && npm install)
fi

# Tao config.json tu example neu chua co
if [ ! -f "${APP_DIR}/config.json" ]; then
  cp "${APP_DIR}/config.example.json" "${APP_DIR}/config.json"
  echo "=> Da tao config.json tu config.example.json. Hay chinh sua truoc khi dung trong production."
fi

# Tao file unit systemd
echo "=> Tao systemd unit file (can sudo)..."
sudo tee /etc/systemd/system/${SERVICE}.service > /dev/null <<EOF
[Unit]
Description=Terminal Control Center
After=network.target

[Service]
Type=simple
User=${RUN_USER}
WorkingDirectory=${APP_DIR}
ExecStart=${NODE_BIN} ${APP_DIR}/src/server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Reload va kich hoat service
sudo systemctl daemon-reload
sudo systemctl enable --now ${SERVICE}

echo ""
echo "=== Service ${SERVICE} da duoc cai dat va khoi dong! ==="
echo ""

# Hien thi trang thai
sudo systemctl status ${SERVICE} --no-pager || true

echo ""
echo "Xem log realtime: journalctl -u ${SERVICE} -f"
echo "Dung service:     sudo systemctl stop ${SERVICE}"
echo "Khoi dong lai:    sudo systemctl restart ${SERVICE}"
