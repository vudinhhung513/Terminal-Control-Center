#!/usr/bin/env bash
# file: start.sh
# Chuc nang: Khoi dong Terminal Control Center (kiem tra dependency, cai dat, chay server).

set -euo pipefail

# Di chuyen ve thu muc chua script
cd "$(dirname "$0")"

# Kiem tra tmux
if ! command -v tmux &>/dev/null; then
  echo "ERROR: tmux khong duoc tim thay."
  echo "Cai dat: sudo apt install tmux"
  exit 1
fi

# Kiem tra node
if ! command -v node &>/dev/null; then
  echo "ERROR: node khong duoc tim thay."
  echo "Cai dat Node.js 18+: https://nodejs.org/"
  exit 1
fi

# Cai dependency neu chua co
if [ ! -d "node_modules" ]; then
  echo "=> Cai dat dependencies (npm install)..."
  npm install
fi

# Tao config.json tu example neu chua co
if [ ! -f "config.json" ]; then
  cp config.example.json config.json
  echo "=> Da tao config.json tu config.example.json. Hay chinh sua truoc khi dung trong production."
fi

# Chay server
echo "=> Khoi dong Terminal Control Center..."
exec node src/server.js
