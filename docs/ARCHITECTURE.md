# Kiến trúc (Architecture)

> Tài liệu mô tả kiến trúc tổng thể của Terminal Control Center (TCC).
> Cập nhật mỗi khi thay đổi cấu trúc module, luồng dữ liệu hoặc thành phần chính.

## 1. Tổng quan

TCC là web server quản lý các phiên **tmux** qua trình duyệt (hiện hỗ trợ Linux;
macOS/Windows trong roadmap). Người dùng tạo/đóng/đổi tên phiên, mở web terminal
realtime, và cấu hình ứng dụng qua giao diện. Truy cập local hoặc từ xa (kết hợp
VPN/Tailscale/SSH tunnel).

Stack:
- **Backend**: Node.js (ESM) + Fastify 5. Không dùng DB ngoài.
- **Terminal bridge**: `node-pty` spawn `tmux attach-session`, cầu nối qua WebSocket.
- **Encoding**: `iconv-lite` transcode bytes ↔ UTF-8 (xterm.js chỉ hiểu UTF-8).
- **Frontend**: HTML/CSS/JS thuần (vanilla), xterm.js cho terminal. Không framework.
- **i18n**: `public/js/i18n.js` (từ điển EN/VI, mặc định EN).
- **Lưu trữ**: `config.json` (cấu hình) + `data/sessions-meta.json` (metadata phiên).

## 2. Sơ đồ thành phần

```
Trình duyệt (public/)
  ├── i18n.js (từ điển EN/VI, áp data-i18n)  [nạp trên cả 2 trang]
  ├── index.html + dashboard.js  ── REST ──►  Fastify
  └── terminal.html + terminal.js ─ WebSocket ─►  ws-session.js ──► node-pty ──► tmux
                                  └─ REST (scroll) ─►  routes/meta.js ──► tmux copy-mode

Fastify (src/server.js)  [content-type parser: body JSON rỗng → {}]
  ├── auth.js            (login/logout, CSRF, rate-limit)
  ├── routes/sessions.js (GET/POST/DELETE phiên + merge metadata)
  ├── routes/meta.js     (touch/note/rename/order/scroll)
  ├── routes/settings.js (GET/PUT cấu hình, restart khi đổi port/host)
  └── ws-session.js      (WebSocket attach tmux + transcode encoding)

Tầng dữ liệu / tiện ích
  ├── config.js     (đọc/ghi/validate config.json, runtime update)
  ├── meta-store.js (JSON store metadata phiên — interface tách biệt)
  ├── tmux.js       (list/create/kill/rename/has-session/scroll qua execFile)
  └── password.js   (hash/verify scrypt)
```

## 3. Luồng dữ liệu chính

### 3.1. Liệt kê phiên
1. `dashboard.js` gọi `GET /api/sessions`.
2. `routes/sessions.js` → `tmux.listSessions()` (chạy `tmux list-sessions`).
3. Merge metadata từ `meta-store.js` (note, order, lastAccess).
4. Sắp xếp theo `order`, trả JSON về client để render.

### 3.2. Web terminal realtime + encoding
1. `terminal.js` mở WebSocket `/ws/session/:name`.
2. `ws-session.js` kiểm tra auth, spawn `node-pty` chạy `tmux attach-session -t name`.
3. Nếu `termEncoding` khác UTF-8: pty trả Buffer thô → `iconv` decode streaming
   sang UTF-8 cho client; input client (UTF-8) → `iconv.encode` về bảng mã nguồn.
   Nếu UTF-8: truyền chuỗi trực tiếp (không transcode).
4. Resize đồng bộ qua message JSON.
5. Đóng tab → kill pty (KHÔNG kill phiên tmux → phiên sống độc lập).

### 3.3. Cuộn terminal (tmux copy-mode)
1. Nút cuộn trên control bar → `POST /api/sessions/:name/scroll` (kèm CSRF).
2. `routes/meta.js` → `tmux.scrollSession(name, action)`.
3. `tmux.js` chạy `copy-mode` + `send-keys -X scroll-up/scroll-down/history-top`
   hoặc `cancel`. Tác động lên pane → client đang attach thấy thay đổi ngay.
   (Cuộn xterm client-side vô tác dụng vì tmux chiếm alternate-screen.)

### 3.4. Đổi cấu hình
1. `dashboard.js` (modal Settings) gọi `PUT /api/settings` kèm CSRF token.
2. `routes/settings.js` validate, hash mật khẩu (nếu đổi), `config.saveConfig()` ghi atomic.
3. Field không cần restart (auth, font, encoding, language, rate-limit) hiệu lực ngay.
   - Encoding áp khi **mở WebSocket mới** (mở lại terminal).
   - Language áp ngay phía client (`I18N.setLang` + `apply`).
4. Đổi Port/Host → cần restart. Nếu chạy dưới systemd (`INVOCATION_ID`) → tự
   `process.exit(0)` để được khởi động lại; nếu chạy thủ công → báo người dùng.

### 3.5. Đa ngôn ngữ (i18n)
1. Khi tải trang, JS gọi `GET /api/config` lấy `language`.
2. `I18N.setLang(language)` + `I18N.apply()` dịch toàn bộ phần tử `data-i18n*`.
3. Render động dùng `t(key)`. Chi tiết quy ước: [I18N.md](./I18N.md).

## 4. Bảo mật (tóm tắt)

- Mật khẩu hash bằng scrypt (`password.js`), không lưu plaintext.
- Cookie phiên ký (signed), `httpOnly`, `sameSite=strict`.
- CSRF double-submit token cho mọi request đổi trạng thái.
- Rate-limit đăng nhập theo IP (cấu hình được).
- Validate tên phiên (`validateName`) chống command injection; mọi lệnh tmux
  dùng `execFile` với mảng tham số (không qua shell).

Chi tiết quyết định thiết kế: xem [DESIGN.md](./DESIGN.md).
Bản đồ mã nguồn: xem [CODEMAP.md](./CODEMAP.md).
