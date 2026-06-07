# Kiến trúc (Architecture)

> Tài liệu mô tả kiến trúc tổng thể của Terminal Control Center (TCC).
> Cập nhật mỗi khi thay đổi cấu trúc module, luồng dữ liệu hoặc thành phần chính.

## 1. Tổng quan

TCC là web server quản lý các phiên **tmux** qua trình duyệt (hỗ trợ Linux; macOS
có script launchd nhưng chưa kiểm thử; Windows sẽ ở repo riêng). Người dùng
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
- Cookie phiên ký (signed), `httpOnly`, `sameSite=strict`.
- CSRF double-submit token cho mọi request đổi trạng thái.
- Rate-limit đăng nhập theo IP (cấu hình được).
- Validate tên phiên (`validateName`) chống command injection; mọi lệnh tmux
  dùng `execFile` với mảng tham số (không qua shell).
- Shell allowlist (`config.shells`) ngăn thực thi binary tuỳ ý khi tạo phiên.
- Cảnh báo chủ động khi cấu hình kém an toàn (warnings trên dashboard).

Chi tiết quyết định thiết kế: xem [DESIGN.md](./DESIGN.md).
Bản đồ mã nguồn: xem [CODEMAP.md](./CODEMAP.md).
