#!/usr/bin/env bash
# file: uninstall-service.sh
# Chuc nang: Go bo systemd service Terminal Control Center.

set -euo pipefail

SERVICE="terminal-control-center"

echo "=== Go bo systemd service: ${SERVICE} ==="

# Dung va vo hieu hoa service
sudo systemctl disable --now ${SERVICE} || true

# Xoa file unit
sudo rm -f /etc/systemd/system/${SERVICE}.service

# Reload systemd
sudo systemctl daemon-reload

echo "=> Da go bo service ${SERVICE} thanh cong."
