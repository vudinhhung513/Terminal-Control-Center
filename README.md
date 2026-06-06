# Terminal Control Center

Ứng dụng web quản lý phiên **tmux** từ xa qua trình duyệt. Cho phép tạo, theo dõi, điều khiển và đóng các terminal session thông qua giao diện web trực quan.

## Tính năng

- **Dashboard** hiển thị tất cả phiên tmux đang hoạt động
- **Tạo / đóng (kill) phiên** trực tiếp từ trình duyệt
- **Web terminal** tương tác realtime qua WebSocket
- **Phiên sống độc lập** với trình duyệt nhờ tmux — đóng tab không mất session
- **Xác thực (auth)** bật/tắt linh hoạt qua cấu hình
- **Responsive** — hoạt động trên desktop và mobile
- Cổng mặc định: **7070**

## Yêu cầu

| Thành phần | Phiên bản tối thiểu |
|---|---|
| Hệ điều hành | Ubuntu 20.04+ (hoặc Debian-based) |
| Node.js | 18+ |
| tmux | 3.0+ |

## Cài đặt

```bash
git clone <repo-url> Terminal-Control-Center
cd Terminal-Control-Center
npm install
cp config.example.json config.json
```

## Cấu hình

Chỉnh sửa file `config.json` (được tạo từ `config.example.json`):

| Field | Mô tả | Mặc định |
|---|---|---|
| `host` | Địa chỉ bind. `0.0.0.0` = tất cả interface, `127.0.0.1` = chỉ localhost | `0.0.0.0` |
| `port` | Cổng lắng nghe | `7070` |
| `authEnabled` | Bật/tắt xác thực đăng nhập | `false` |
| `password` | Mật khẩu đăng nhập (chỉ có tác dụng khi `authEnabled: true`) | `""` |
| `sessionSecret` | Chuỗi bí mật dùng ký session cookie. **Phải đổi** trong production | `"change-me-..."` |
| `shell` | Shell mặc định cho phiên mới | `"bash"` |
| `tmuxPrefix` | Tiền tố tên phiên tmux do TCC quản lý | `"tcc"` |

## Chạy thủ công

```bash
chmod +x start.sh
./start.sh
```

Script sẽ tự kiểm tra dependency (tmux, node), cài `node_modules` nếu thiếu, tạo `config.json` nếu chưa có, rồi khởi động server.

## Cài đặt như systemd service (tự khởi động cùng OS)

```bash
chmod +x install-service.sh
./install-service.sh
```

Script cần quyền **sudo** để tạo unit file tại `/etc/systemd/system/terminal-control-center.service` và kích hoạt service.

Sau khi cài, service tự chạy mỗi khi máy khởi động.

### Gỡ bỏ service

```bash
chmod +x uninstall-service.sh
./uninstall-service.sh
```

### Lệnh quản lý service

```bash
# Xem trạng thái
sudo systemctl status terminal-control-center

# Dừng
sudo systemctl stop terminal-control-center

# Khởi động lại
sudo systemctl restart terminal-control-center

# Xem log realtime
journalctl -u terminal-control-center -f
```

## REST API

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/sessions` | Lấy danh sách phiên tmux |
| `POST` | `/api/sessions` | Tạo phiên mới |
| `DELETE` | `/api/sessions/:name` | Đóng (kill) phiên theo tên |
| `POST` | `/api/login` | Đăng nhập (khi auth bật) |
| `POST` | `/api/logout` | Đăng xuất |
| `GET` | `/api/config` | Lấy cấu hình public (không chứa secret) |

### WebSocket

| Endpoint | Mô tả |
|---|---|
| `WS /ws/session/:name` | Kết nối terminal realtime tới phiên tmux |

## Cấu trúc thư mục

```
Terminal-Control-Center/
├── config.example.json    # Cấu hình mẫu
├── config.json            # Cấu hình thật (git-ignored)
├── start.sh               # Script chạy thủ công
├── install-service.sh     # Cài systemd service
├── uninstall-service.sh   # Gỡ systemd service
├── package.json
├── public/                # Frontend (HTML/CSS/JS)
├── src/                   # Backend Node.js
│   └── server.js          # Entry point
└── test/                  # Unit tests
```

## ⚠️ CẢNH BÁO BẢO MẬT

> **Web terminal = thực thi lệnh từ xa trên máy chủ.** Hãy cân nhắc kỹ trước khi expose ra mạng.

- **Luôn bật `authEnabled: true`** và đặt mật khẩu mạnh khi chạy ngoài localhost.
- **Đổi `sessionSecret`** thành chuỗi ngẫu nhiên dài (≥ 32 ký tự).
- **Bind `host: "127.0.0.1"`** nếu chỉ dùng trên máy local.
- **Không expose ra internet** khi chưa có HTTPS + reverse proxy (nginx/caddy).
- Nếu cần truy cập từ xa, dùng **VPN** hoặc **SSH tunnel** thay vì mở port công khai.
- Giới hạn truy cập bằng firewall (`ufw allow from <LAN_IP> to any port 7070`).
