# Kiến trúc (Architecture)

> Tài liệu mô tả kiến trúc tổng thể của Terminal Control Center (TCC).
> Cập nhật mỗi khi thay đổi cấu trúc module, luồng dữ liệu hoặc thành phần chính.

## 1. Tổng quan

TCC là web server quản lý các phiên **tmux** qua trình duyệt (hỗ trợ Linux; macOS
có script launchd nhưng chưa kiểm thử; Windows ở [repo riêng](https://github.com/vudinhhung513/Windows-Terminal-Control-Center)). Người dùng
tạo/đóng/đổi tên phiên, mở web terminal realtime, và cấu hình ứng dụng qua giao
diện. Truy cập local hoặc từ xa (kết hợp VPN/Tailscale/SSH tunnel).

Stack:
- **Backend**: Node.js (ESM) + Fastify 5. Không dùng DB ngoài.
- **App factory**: `src/app.js` export `buildApp(config, {version})` — dựng Fastify
  app hoàn chỉnh (plugin, route, parser) mà không listen. `src/server.js` chỉ đọc
  config/version rồi gọi `buildApp` và `listen`. Tách này cho phép test inject.
- **Terminal bridge**: `node-pty` spawn `tmux attach-session`, cầu nối qua WebSocket.
- **Encoding**: `iconv-lite` transcode bytes ↔ UTF-8 (xterm.js chỉ hiểu UTF-8).
- **Frontend**: HTML/CSS/JS thuần (vanilla), xterm.js cho terminal. Không framework.
- **Theme**: `config.theme` (`dark`|`light`), áp qua `data-theme` trên `<html>`;
  CSS dùng biến màu cho từng theme.
- **i18n**: `public/js/i18n.js` (từ điển EN/VI, mặc định EN).
- **Lưu trữ**: `config.json` (cấu hình) + `data/sessions-meta.json` (metadata phiên).
- **Cảnh báo bảo mật**: `computeWarnings(config)` (trong `app.js`) trả mảng
  `warnings` qua `/api/config` — client hiện banner khi phát hiện cấu hình kém an toàn.

## 2. Sơ đồ thành phần

```
Trình duyệt (public/)
  ├── i18n.js (từ điển EN/VI, áp data-i18n)  [nạp trên cả 2 trang]
  ├── index.html + dashboard.js  ── REST ──►  Fastify
  │     ├── chọn shell (dropdown, validate allowlist)
  │     ├── chọn theme (select, áp data-theme)
  │     └── hiện banner #security-warning (từ warnings)
  └── terminal.html + terminal.js ─ WebSocket ─►  ws-session.js ──► node-pty ──► tmux
                                  ├─ REST (scroll) ─►  routes/meta.js ──► tmux copy-mode
                                  └─ copy/paste (navigator.clipboard)

src/app.js — buildApp(config, {version}) + computeWarnings(config)
  ├── content-type parser: body JSON rỗng → {}
  ├── auth.js            (login/logout, CSRF, rate-limit)
  ├── routes/sessions.js (GET/POST/DELETE phiên + merge metadata; POST nhận shell)
  ├── routes/meta.js     (touch/note/rename/order/scroll)
  ├── routes/settings.js (GET/PUT cấu hình, restart khi đổi port/host)
  └── ws-session.js      (WebSocket attach tmux + transcode encoding)

src/server.js — đọc config + version → buildApp → listen

Tầng dữ liệu / tiện ích
  ├── config.js     (đọc/ghi/validate config.json, runtime update; validate shells/theme)
  ├── meta-store.js (JSON store metadata phiên — interface tách biệt)
  ├── tmux.js       (list/create/kill/rename/has-session/scroll qua execFile;
  │                  createSession nhận tham số shell, validate thuộc config.shells)
  └── password.js   (hash/verify scrypt)
```

## 3. Luồng dữ liệu chính

### 3.1. Liệt kê phiên
1. `dashboard.js` gọi `GET /api/sessions`.
2. `routes/sessions.js` → `tmux.listSessions()` (chạy `tmux list-sessions`).
3. Merge metadata từ `meta-store.js` (note, order, lastAccess).
4. Sắp xếp theo `order`, trả JSON về client để render.

### 3.2. Tạo phiên (chọn shell)
1. `dashboard.js` gửi `POST /api/sessions` với body `{name, shell?}`.
2. `routes/sessions.js` validate `shell` thuộc allowlist `config.shells` (nếu không
   gửi shell → dùng `config.shell` mặc định; nếu gửi giá trị không hợp lệ → 400).
3. `tmux.createSession(name, config, shell)` chạy `tmux new-session -d -s ...`
   với shell đã chọn.

### 3.3. Web terminal realtime + encoding
1. `terminal.js` mở WebSocket `/ws/session/:name`.
2. `ws-session.js` kiểm tra auth, spawn `node-pty` chạy `tmux attach-session -t name`.
3. Nếu `termEncoding` khác UTF-8: pty trả Buffer thô → `iconv` decode streaming
   sang UTF-8 cho client; input client (UTF-8) → `iconv.encode` về bảng mã nguồn.
   Nếu UTF-8: truyền chuỗi trực tiếp (không transcode).
4. Resize đồng bộ qua message JSON.
5. Đóng tab → kill pty (KHÔNG kill phiên tmux → phiên sống độc lập).

### 3.4. Copy/Paste mobile
1. Nút Copy trên control bar → `term.getSelection()` → `navigator.clipboard.writeText`.
2. Nút Paste → `navigator.clipboard.readText()` → gửi text vào terminal qua WebSocket.

### 3.5. Cuộn terminal (tmux copy-mode)
1. Nút cuộn trên control bar → `POST /api/sessions/:name/scroll` (kèm CSRF).
2. `routes/meta.js` → `tmux.scrollSession(name, action)`.
3. `tmux.js` chạy `copy-mode` + `send-keys -X scroll-up/scroll-down/history-top`
   hoặc `cancel`. Tác động lên pane → client đang attach thấy thay đổi ngay.
   (Cuộn xterm client-side vô tác dụng vì tmux chiếm alternate-screen.)

### 3.6. Đổi cấu hình
1. `dashboard.js` (modal Settings) gọi `PUT /api/settings` kèm CSRF token.
2. `routes/settings.js` validate, hash mật khẩu (nếu đổi), `config.saveConfig()` ghi atomic.
3. Field không cần restart (auth, font, encoding, language, theme, rate-limit) hiệu lực ngay.
   - Encoding áp khi **mở WebSocket mới** (mở lại terminal).
   - Language áp ngay phía client (`I18N.setLang` + `apply`).
   - Theme áp ngay (`document.documentElement.dataset.theme`).
4. Đổi Port/Host → cần restart. Nếu chạy dưới systemd (`INVOCATION_ID`) → tự
   `process.exit(0)` để được khởi động lại; nếu chạy thủ công → báo người dùng.

### 3.7. Đa ngôn ngữ (i18n)
1. Khi tải trang, JS gọi `GET /api/config` lấy `language`.
2. `I18N.setLang(language)` + `I18N.apply()` dịch toàn bộ phần tử `data-i18n*`.
3. Render động dùng `t(key)`. Chi tiết quy ước: [I18N.md](./I18N.md).

### 3.8. Cảnh báo cấu hình kém an toàn
1. `computeWarnings(config)` (trong `app.js`) kiểm tra:
   - `defaultSecret`: `sessionSecret` còn giá trị mặc định.
   - `exposedNoAuth`: `host` khác `127.0.0.1`/`localhost` và `authEnabled=false`.
2. `GET /api/config` trả mảng `warnings`.
3. `dashboard.js` nhận warnings → hiện banner `#security-warning` với nội dung
   dịch từ key i18n (`warn.defaultSecret`, `warn.exposedNoAuth`).

### 3.9. Theme sáng/tối
1. `GET /api/config` trả `theme`.
2. Client áp `document.documentElement.dataset.theme = theme`.
3. CSS dùng `[data-theme="light"]` và `[data-theme="dark"]` với biến màu riêng.
4. Đổi trong Settings → `PUT /api/settings` lưu, áp ngay không reload.

## 4. Bảo mật (tóm tắt)

- Mật khẩu hash bằng scrypt (`password.js`), không lưu plaintext.
- Cookie phiên ký (signed), `httpOnly`, `sameSite=strict`. **Có thời hạn**
  (`sessionMaxAgeHours`, mặc định 720 giờ = 30 ngày): giá trị cookie nhúng mốc
  hết hạn dạng `authed:<expiresAtMs>` để server tự enforce (kể cả khi cookie bị
  sao chép), đồng thời đặt `maxAge` cho trình duyệt tự xoá. Giá trị `0` = session
  cookie (mất khi đóng trình duyệt). Mô hình **stateless, một người dùng**: không
  dùng session ID hay store phía server (không mất trạng thái khi restart).
- CSRF double-submit token cho mọi request đổi trạng thái.
- Rate-limit đăng nhập theo IP (cấu hình được).
- Validate tên phiên (`validateName`) chống command injection; mọi lệnh tmux
  dùng `execFile` với mảng tham số (không qua shell).
- Shell allowlist (`config.shells`) ngăn thực thi binary tuỳ ý khi tạo phiên.
- Cảnh báo chủ động khi cấu hình kém an toàn (warnings trên dashboard).

Chi tiết quyết định thiết kế: xem [DESIGN.md](./DESIGN.md).
Bản đồ mã nguồn: xem [CODEMAP.md](./CODEMAP.md).

## 5. Hub đa node (định hướng — chưa triển khai)

> Mô hình mở rộng để quản lý **nhiều instance TCC/WTCC** từ một điểm tập trung.
> Đây là kiến trúc dự kiến (xem mốc tương ứng trong [ROADMAP.md](./ROADMAP.md)),
> ghi lại để định hướng thiết kế; chưa có mã nguồn.

### 5.1. Vấn đề

Mỗi máy chủ hiện chạy một instance TCC (Linux) hoặc WTCC (Windows) độc lập, mỗi
cái một địa chỉ/cổng riêng. Khi số máy tăng, người dùng phải nhớ và mở từng URL,
đăng nhập riêng từng nơi, không có cái nhìn tổng thể.

### 5.2. Thành phần

```
                    ┌─────────────────────────────┐
   Trình duyệt ───► │   TCC-Hub (node trung tâm)   │
                    │  - Dashboard tổng (mọi node) │
                    │  - SSO (đăng nhập 1 lần)      │
                    │  - Node registry + heartbeat │
                    │  - Reverse proxy HTTP/WS      │
                    └──────────────┬──────────────┘
                       tunnel/VPN  │  (mỗi node tự dial ra hub)
            ┌──────────────────────┼──────────────────────┐
            ▼                      ▼                      ▼
     ┌────────────┐        ┌────────────┐        ┌────────────┐
     │ TCC (Linux)│        │ TCC (Linux)│        │ WTCC (Win) │
     │  + tmux    │        │  + tmux    │        │  + ConPTY  │
     └────────────┘        └────────────┘        └────────────┘
```

- **TCC-Hub**: dịch vụ trung tâm. Giữ **registry** các node (id, tên, nền tảng
  Linux/Windows, địa chỉ, trạng thái online/offline qua **heartbeat**). Phục vụ
  **dashboard tổng** liệt kê phiên của mọi node, và **reverse-proxy** lưu lượng
  HTTP/WebSocket tới node mà người dùng chọn. Quản lý **SSO** (đăng nhập một lần ở
  hub, không cần đăng nhập lại từng node).
- **Node TCC/WTCC**: instance hiện tại, bổ sung khả năng **đăng ký với hub** và
  gửi heartbeat. Vẫn chạy độc lập được khi không có hub (không phụ thuộc cứng).

### 5.3. Kết nối hub ↔ node

Hai hướng, chọn theo môi trường:

- **Reverse tunnel (khuyến nghị khi node sau NAT/firewall)**: node **chủ động
  dial ra** hub (outbound), mở một kênh điều khiển bền (WebSocket/gRPC). Hub đẩy
  yêu cầu qua kênh này → không cần mở cổng vào ở phía node, vượt NAT tự nhiên.
- **Direct / VPN (khi mạng phẳng, vd Tailscale/WireGuard)**: hub gọi thẳng tới
  địa chỉ node trong mạng riêng. Đơn giản hơn nhưng cần node có địa chỉ hub tới được.

### 5.4. Bảo mật & ranh giới

- Mỗi node xác thực với hub bằng **token/khoá riêng** (per-node secret), không
  dùng chung mật khẩu người dùng.
- Hub là điểm vào **single sign-on**; uỷ quyền tới node bằng token ngắn hạn do hub
  cấp, không lộ secret của node ra client.
- Giữ nguyên ranh giới bảo mật hiện có ở mỗi node (validate tên phiên, shell
  allowlist, lệnh qua `execFile`). Hub **không** bỏ qua các lớp này.
- Tách phần phụ thuộc HĐH (tmux vs ConPTY) sau interface ở mỗi node; hub chỉ làm
  việc với **giao thức chung** (danh sách phiên, attach, resize...), không phụ
  thuộc chi tiết nền tảng từng node.
