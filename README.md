# Terminal Control Center

**Tiếng Việt** | [English](./README.en.md)

Ứng dụng web quản lý phiên **tmux** từ xa qua trình duyệt. Cho phép tạo, theo dõi, điều khiển và đóng các terminal session thông qua giao diện web trực quan.

## Giới thiệu

Terminal Control Center (TCC) phục vụ nhu cầu **mở và quản lý nhiều phiên làm việc
terminal** cùng lúc qua một giao diện web duy nhất. Bạn có thể dùng:

- **Tại chỗ (local)**: truy cập ngay trên máy tính/máy chủ đang chạy TCC.
- **Từ xa (remote)**: kết hợp với giải pháp mạng riêng như **VPN / Tailscale /
  SSH tunnel** để điều khiển máy chủ an toàn từ bất kỳ đâu, kể cả trên điện thoại.

Nhờ tmux, các phiên **sống độc lập với trình duyệt** — đóng tab hay mất kết nối
mạng không làm gián đoạn tiến trình đang chạy. Đối tượng phù hợp:

- **Kỹ sư hệ thống / DevOps**: theo dõi và thao tác nhiều máy chủ, tiến trình dài.
- **Lập trình viên, người "vibe coding"**: chạy build/test/agent và quản lý nhiều
  phiên làm việc gọn gàng trên cả desktop lẫn mobile.

> **Đa nền tảng:** hiện đã có **bản cho Linux**. Các phiên bản cho **macOS** và
> **Windows** sẽ được triển khai dần (xem [Roadmap](./docs/ROADMAP.md)).

## Tính năng

- **Dashboard** hiển thị tất cả phiên tmux đang hoạt động
- **Tạo / đóng (kill) phiên** trực tiếp từ trình duyệt
- **Web terminal** tương tác realtime qua WebSocket
- **Phiên sống độc lập** với trình duyệt nhờ tmux — đóng tab không mất session
- **Đổi tên, ghi chú, lần truy cập cuối** cho từng phiên để dễ quản lý
- **Kéo-thả sắp xếp** thứ tự phiên (lưu server-side)
- **Thanh nút điều khiển** terminal: cuộn, Enter, ESC, Ctrl+C, Tab, mũi tên
- **Cấu hình bảng mã (encoding)**: UTF-8, GBK, Big5, EUC-KR, Shift_JIS, TIS-620...
- **Đa ngôn ngữ** Anh/Việt (mặc định tiếng Anh, đổi trong Settings)
- **Xác thực (auth)** bật/tắt linh hoạt; mật khẩu hash scrypt; chống brute-force
- **Responsive** — hoạt động trên desktop và mobile
- Cổng mặc định: **7171** (có thể đổi trong `config.json`)

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
| `port` | Cổng lắng nghe | `7171` |
| `authEnabled` | Bật/tắt xác thực đăng nhập | `false` |
| `password` | Mật khẩu đăng nhập. Lưu dạng **hash scrypt** sau khi đổi qua giao diện (chỉ có tác dụng khi `authEnabled: true`) | `""` |
| `sessionSecret` | Chuỗi bí mật dùng ký session cookie. **Phải đổi** trong production | `"REPLACE_WITH_RANDOM_SECRET"` |
| `shell` | Shell mặc định cho phiên mới | `"bash"` |
| `tmuxPrefix` | Tiền tố tên phiên tmux do TCC quản lý | `"tcc"` |
| `termFontFamily` | Font chữ terminal (xterm.js) | `"monospace"` |
| `termFontSize` | Cỡ chữ terminal (8–40) | `14` |
| `termEncoding` | Bảng mã ký tự terminal (server transcode sang UTF-8). Vd: `utf-8`, `gbk`, `big5`, `euc-kr`, `tis-620` | `"utf-8"` |
| `language` | Ngôn ngữ giao diện: `en` hoặc `vi` | `"en"` |
| `loginRateLimit.enabled` | Bật giới hạn số lần đăng nhập (chống brute-force) | `true` |
| `loginRateLimit.maxAttempts` | Số lần thử tối đa trong cửa sổ thời gian | `5` |
| `loginRateLimit.windowMs` | Độ dài cửa sổ thời gian (ms) | `60000` |

> Phần lớn các thiết lập trên có thể chỉnh trực tiếp qua nút **⚙ Settings** trên
> dashboard (xem mục [Giao diện Cài đặt](#giao-diện-cài-đặt-settings)). Metadata
> phiên (ghi chú, thứ tự, lần truy cập cuối) được lưu tại `data/sessions-meta.json`.

### Giao diện Cài đặt (Settings)

Nhấn nút **⚙ Settings** trên dashboard để mở bảng cài đặt. Tại đây có thể:

- Bật/tắt **yêu cầu mật khẩu** khi truy cập và **đổi mật khẩu** (lưu dạng hash scrypt).
- Cấu hình **Host** và **Port** (cần khởi động lại để áp dụng — xem bên dưới).
- Đổi **font chữ** và **cỡ chữ** của terminal.
- Chọn **bảng mã (encoding)** — đổi xong cần mở lại terminal.
- Đổi **ngôn ngữ giao diện** (Anh/Việt) — áp dụng ngay.
- Chỉnh tham số **chống brute-force** đăng nhập (số lần thử, cửa sổ thời gian).

Khi auth đang bật, đổi các mục nhạy cảm (mật khẩu, auth, host, port) yêu cầu nhập
**mật khẩu hiện tại** để xác nhận.

### Bảng mã (encoding)

xterm.js chỉ hiển thị **UTF-8**. Nếu chương trình/hệ thống của bạn dùng bảng mã
khác (vd tiếng Trung GBK/Big5, Hàn EUC-KR, Thái TIS-620, Nhật Shift_JIS), server
sẽ **chuyển đổi (transcode)** bytes ↔ UTF-8 bằng `iconv-lite`. Chọn bảng mã phù
hợp trong Settings; sau khi đổi cần **mở lại terminal** (không cần restart server).

### Ngôn ngữ (language)

Giao diện mặc định **tiếng Anh**, có thể đổi sang **tiếng Việt** trong Settings.
Lựa chọn lưu server-side nên áp dụng cho mọi thiết bị. Chi tiết quy ước i18n cho
nhà phát triển: xem [`docs/I18N.md`](./docs/I18N.md).

### Đổi cổng (port)

Cổng mặc định là **7171**. Nếu cổng này đã bị tiến trình khác chiếm trên máy bạn, hãy đổi sang cổng trống khác bằng cách sửa field `port` trong `config.json`:

```json
{
  "port": 8080
}
```

Kiểm tra một cổng đã bị chiếm hay chưa trước khi dùng:

```bash
# Thay 7171 bằng cổng bạn muốn kiểm tra
ss -tln | grep ':7171' && echo "ĐANG BỊ CHIẾM" || echo "TRỐNG"
```

Sau khi đổi cổng, khởi động lại server (hoặc `sudo systemctl restart terminal-control-center` nếu chạy bằng systemd) để áp dụng. Nhớ mở cổng mới trên firewall nếu cần truy cập từ máy khác.

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

Các request đổi trạng thái (POST/PUT/DELETE) yêu cầu header `X-CSRF-Token`
(token lấy từ cookie `tcc_csrf` mà server tự cấp).

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/sessions` | Lấy danh sách phiên tmux (kèm note, order, lastAccess) |
| `POST` | `/api/sessions` | Tạo phiên mới |
| `DELETE` | `/api/sessions/:name` | Đóng (kill) phiên theo tên |
| `POST` | `/api/sessions/:name/touch` | Cập nhật lần truy cập cuối |
| `PUT` | `/api/sessions/:name/note` | Lưu ghi chú cho phiên |
| `PUT` | `/api/sessions/:name/rename` | Đổi tên phiên |
| `PUT` | `/api/sessions/order` | Lưu thứ tự sắp xếp (kéo-thả) |
| `POST` | `/api/sessions/:name/scroll` | Cuộn nội dung phiên (tmux copy-mode): `up`/`down`/`top`/`bottom` |
| `GET` | `/api/settings` | Lấy cấu hình hiện tại (không chứa secret) |
| `PUT` | `/api/settings` | Cập nhật cấu hình |
| `POST` | `/api/login` | Đăng nhập (khi auth bật) |
| `POST` | `/api/logout` | Đăng xuất |
| `GET` | `/api/config` | Lấy cấu hình public + version + font + ngôn ngữ |

### WebSocket

| Endpoint | Mô tả |
|---|---|
| `WS /ws/session/:name` | Kết nối terminal realtime tới phiên tmux |

## Cấu trúc thư mục

```
Terminal-Control-Center/
├── config.example.json    # Cấu hình mẫu
├── config.json            # Cấu hình thật (git-ignored)
├── CHANGELOG.md           # Lịch sử thay đổi theo phiên bản
├── data/                  # Metadata phiên (git-ignored, tạo runtime)
├── docs/                  # Tài liệu dự án (xem bên dưới)
├── start.sh               # Script chạy thủ công
├── install-service.sh     # Cài systemd service
├── uninstall-service.sh   # Gỡ systemd service
├── package.json
├── public/                # Frontend (HTML/CSS/JS)
├── src/                   # Backend Node.js
│   └── server.js          # Entry point
└── test/                  # Unit tests
```

## Tài liệu

Tài liệu chi tiết nằm trong thư mục [`docs/`](./docs):

- [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — kiến trúc tổng thể, luồng dữ liệu.
- [`DESIGN.md`](./docs/DESIGN.md) — tư tưởng & quyết định kỹ thuật (đánh đổi).
- [`CODEMAP.md`](./docs/CODEMAP.md) — bản đồ mã nguồn, tiện ích dùng chung.
- [`I18N.md`](./docs/I18N.md) — quy ước đa ngôn ngữ (BẮT BUỘC tuân theo khi sửa UI).
- [`TODO.md`](./docs/TODO.md) — việc cần làm.
- [`ROADMAP.md`](./docs/ROADMAP.md) — định hướng theo phiên bản.

Lịch sử thay đổi: [`CHANGELOG.md`](./CHANGELOG.md).

## ⚠️ CẢNH BÁO BẢO MẬT

> **Web terminal = thực thi lệnh từ xa trên máy chủ.** Hãy cân nhắc kỹ trước khi expose ra mạng.

- **Luôn bật `authEnabled: true`** và đặt mật khẩu mạnh khi chạy ngoài localhost.
- **Đổi `sessionSecret`** thành chuỗi ngẫu nhiên dài (≥ 32 ký tự).
- **Bind `host: "127.0.0.1"`** nếu chỉ dùng trên máy local.
- **Không expose ra internet** khi chưa có HTTPS + reverse proxy (nginx/caddy).
- Nếu cần truy cập từ xa, dùng **VPN** hoặc **SSH tunnel** thay vì mở port công khai.
- Giới hạn truy cập bằng firewall (`ufw allow from <LAN_IP> to any port 7171`).
