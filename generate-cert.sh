#!/usr/bin/env bash
# file: generate-cert.sh
# Chuc nang: Sinh chung chi self-signed (PEM) co IP/hostname trong truong SAN
#            de chay HTTPS. HTTPS giup trinh duyet coi trang la "secure context"
#            nen nut Paste co the tu doc clipboard (ke ca khi truy cap qua IP).
# Cach dung:
#   ./generate-cert.sh 192.168.1.50            # mot IP
#   ./generate-cert.sh 192.168.1.50 my-host    # nhieu IP/hostname
# Sau do bat trong config.json:
#   "tls": { "enabled": true, "keyPath": "data/tls/key.pem", "certPath": "data/tls/cert.pem" }

set -euo pipefail

# Di chuyen ve thu muc chua script (goc du an)
cd "$(dirname "$0")"

# Kiem tra openssl
if ! command -v openssl &>/dev/null; then
  echo "ERROR: openssl khong duoc tim thay. Cai dat: sudo apt install openssl"
  exit 1
fi

# Bat buoc co it nhat mot IP/hostname de dua vao SAN
if [ "$#" -lt 1 ]; then
  echo "Cach dung: $0 <IP-hoac-hostname> [them IP/hostname...]"
  echo "Vi du:    $0 192.168.1.50"
  exit 1
fi

OUT_DIR="data/tls"
KEY_FILE="$OUT_DIR/key.pem"
CERT_FILE="$OUT_DIR/cert.pem"
DAYS=825 # thoi han toi da nhieu trinh duyet chap nhan cho cert tu ky

mkdir -p "$OUT_DIR"

# Dung danh sach SAN tu tham so: phan biet IP (toan so va dau cham) va DNS
SAN_ENTRIES="DNS:localhost,IP:127.0.0.1"
for host in "$@"; do
  if [[ "$host" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    SAN_ENTRIES="$SAN_ENTRIES,IP:$host"
  else
    SAN_ENTRIES="$SAN_ENTRIES,DNS:$host"
  fi
done

echo "=> Sinh cert self-signed voi SAN: $SAN_ENTRIES"

# Sinh key + cert mot lan; -addext dua SAN vao de trinh duyet chap nhan IP
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -days "$DAYS" \
  -subj "/CN=$1" \
  -addext "subjectAltName=$SAN_ENTRIES"

# Khoa quyen private key (chi chu so huu doc)
chmod 600 "$KEY_FILE"

echo "=> Da tao:"
echo "   - $KEY_FILE (private key)"
echo "   - $CERT_FILE (certificate, han $DAYS ngay)"
echo
echo "Bat HTTPS trong config.json:"
echo '   "tls": { "enabled": true, "keyPath": "data/tls/key.pem", "certPath": "data/tls/cert.pem" }'
echo
echo "Lan dau truy cap https://<IP>:<port> trinh duyet se canh bao 'khong tin cay'."
echo "Bam chap nhan/Advanced -> Proceed mot lan la dung duoc; clipboard se hoat dong."
