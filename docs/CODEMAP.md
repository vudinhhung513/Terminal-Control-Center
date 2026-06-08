# Bản đồ mã nguồn (Code Map)

> Bản đồ **mức cao** các module/tầng và tiện ích dùng chung. Mục tiêu: tránh viết
> trùng chức năng. **Trước khi viết code mới, search codebase + đọc file này.**
> Không liệt kê chi tiết từng hàm (để JSDoc/IDE đảm nhận); chỉ ghi vai trò + đường dẫn.

## Cấu trúc thư mục

```
Terminal-Control-Center/
├── config.example.json     # Cấu hình mẫu
├── config.json             # Cấu hình thật (git-ignored)
├── CHANGELOG.md            # Lịch sử thay đổi theo phiên bản
├── README.md               # Tài liệu chính (tiếng Việt)
├── README.en.md            # Tài liệu (tiếng Anh)
├── start.sh                # Chạy thủ công
├── install-service.sh      # Cài systemd service (Linux, Restart=always)
├── uninstall-service.sh    # Gỡ systemd service (Linux)
├── install-service-macos.sh    # Cài launchd service (macOS, untested)
├── uninstall-service-macos.sh  # Gỡ launchd service (macOS, untested)
├── data/                   # (tạo runtime) sessions-meta.json + logs/ — git-ignored
├── docs/                   # Tài liệu dự án
├── public/                 # Frontend
│   ├── index.html          # Dashboard + modal Settings
│   ├── terminal.html       # Trang terminal + control bar + ô nhập (toggle)
│   ├── manifest.json       # PWA manifest (fullscreen, ẩn thanh menu trình duyệt mobile)
│   ├── css/styles.css      # Toàn bộ style (dark/light theme qua data-theme)
│   ├── js/i18n.js          # Đa ngôn ngữ EN/VI (từ điển + apply)
│   ├── js/theme.js         # Module theme dùng chung (dark/light/auto)
│   ├── js/dashboard.js     # Logic dashboard
│   ├── js/terminal.js      # Logic terminal
│   └── vendor/             # xterm.js + addon-fit (bản tĩnh)
├── src/                    # Backend
└── test/                   # Unit tests + integration tests
```

## Backend (src/)

| File | Vai trò | Ghi chú |
|---|---|---|
| `app.js` | Dựng Fastify app qua `buildApp(config, {version})` + export `computeWarnings(config)`. Không listen — phục vụ test inject. | Đăng ký plugin, route, content-type parser (body JSON rỗng→{}). |
| `server.js` | Entry point: đọc config + version từ `package.json`, gọi `buildApp` rồi `listen`. | Giờ chỉ orchestrate, logic app nằm ở `app.js`. |
| `config.js` | Đọc/validate/**ghi atomic** `config.json`; config in-memory dùng chung; `saveConfig` cập nhật runtime. | `loadConfig`, `getConfig`, `saveConfig`, `DEFAULTS`. Validate encoding (iconv) + language + shells + theme + termFontSize(Mobile) + **multiDeviceMode** (takeover\|lock). |
| `auth.js` | Login/logout, `isAuthed`, `requireAuth`, `requireCsrf`, rate-limit, `registerCsrfCookie`. | CSRF double-submit (cookie set top-level) + rate-limit in-memory. **Cookie phiên có hạn** (`sessionMaxAgeHours`): giá trị ký nhúng mốc hết hạn `authed:<expiresAtMs>` (server enforce) + `maxAge`; `0` = session cookie. Stateless, không session ID/store. |
| `password.js` | Hash/verify mật khẩu scrypt. | `hashPassword`, `verifyPassword`, `isHashed`. |
| `tmux.js` | Thao tác tmux qua `execFile`. | `validateName`, `expandHome`, `listSessions`, `createSession(name, config, shell)` (validate shell thuộc allowlist `config.shells`; thêm `-c <defaultPath>` nếu hợp lệ), `killSession`, `renameSession`, `hasSession`, `scrollSession`, **`isAttached`** (kiểm tra phiên có client nào đang attach). |
| `meta-store.js` | **Tiện ích dùng chung**: lưu metadata phiên (JSON). | Interface tách biệt để đổi sang DB sau này. Override path qua env `TCC_DATA_DIR`. |
| `session-logger.js` | **Ghi log terminal ra file** qua `tmux pipe-pane`: pump đọc stream pane, strip ANSI, dựng dòng (xử lý `\r`/backspace), ghi `data/logs/<phiên>.log`; dọn log theo retention. **Quản lý log**: `listLogs`/`readLog`/`deleteLog` (validate tên chống path traversal). **Rename log**: `renameLog(old,new)` di chuyển file `.log` + xoá `.stream` cũ khi đổi tên phiên. | `ensureLogging`, `stopLogging`, `applyLoggingToAll`, `cleanupOldLogs`, `startLoggerLoop`, `listLogs`, `readLog`, `deleteLog`, `renameLog`. Đọc trực tiếp luồng CLI, độc lập client WS. Override path qua `TCC_DATA_DIR`. |
| `ws-session.js` | WebSocket bridge tmux ↔ xterm qua node-pty + transcode encoding (iconv-lite). | UTF-8 → truyền thẳng; khác → decode/encode streaming. Gọi `ensureLogging` khi WS connect. **Đa thiết bị (`multiDeviceMode`)**: `takeover` đóng client web cũ (close code 4001) + attach kèm `-d`; `lock` chặn thiết bị mới (close code 4002) nếu phiên đang attached. Giữ registry `activeClients` (Map ten phien → socket). |
| `routes/sessions.js` | REST: list/create/kill phiên, merge metadata. | POST nhận field `shell` (validate thuộc `config.shells`); bật log khi tạo, dừng log khi kill. |
| `routes/meta.js` | REST: touch/note/rename/order/**scroll**. | Rename gọi thêm `renameLog` để file log khớp tên phiên mới. |
| `routes/settings.js` | REST: GET/PUT cấu hình (gồm encoding, language, theme, shell, shells, defaultPath, termFontSize(Mobile), **multiDeviceMode**, **logging**); xử lý restart. | PUT validate logging (mode off\|input\|full, retentionDays>=1) + áp dụng cho phiên đang chạy khi đổi mode. |
| `routes/logs.js` | REST **xem/quản lý log** (chỉ xem/xoá, không sửa): `GET /api/logs` (list), `GET /api/logs/:name` (đọc read-only), `DELETE /api/logs/:name` (xoá). | Auth cho mọi route; CSRF cho DELETE. Dùng tiện ích `session-logger.js`, validate tên qua `tmux.validateName`. |

## Frontend (public/js/)

| File | Vai trò | Tiện ích dùng chung |
|---|---|---|
| `i18n.js` | **Đa ngôn ngữ EN/VI**: từ điển `DICT`, `window.I18N` (`setLang`/`getLang`/`t`/`apply`). | **Mọi text UI phải qua đây** (xem [I18N.md](./I18N.md)). |
| `theme.js` | **Module theme dùng chung**: `window.Theme` (`applyTheme`/`resolveTheme`/`getMode`/`getResolved`). Resolve `auto` theo `prefers-color-scheme`, phát sự kiện `tcc:theme-change`. | Dùng cho cả dashboard + terminal. **Không set `data-theme` trực tiếp.** |
| `dashboard.js` | Auth, danh sách phiên, tạo/xoá/đổi tên/ghi chú, kéo-thả, Settings, **modal Logs** (xem/xoá log, chỉ hiện khi `loggingMode != off`), i18n, chọn shell, nút theme (dark/light/auto), hiện cảnh báo bảo mật. Danh sách tự refresh mỗi 5s (không còn nút Refresh). | `getCsrfToken()`, `mutHeaders()`, `t()` — dùng cho request đổi trạng thái + dịch. |
| `terminal.js` | xterm + WebSocket, control bar (**nút toggle ô nhập đầu hàng** + copy/paste + phím mũi tên ↑↓←→ + **Ctrl/Shift sticky kết hợp combo** với Tab/ESC/Enter/mũi tên + cuộn lên/xuống), scroll (server-side), auto-reconnect, áp font + ngôn ngữ + theme (qua `window.Theme`). Cỡ chữ riêng desktop/mobile; xử lý bàn phím ảo mobile; **IME giao cho xterm.js xử lý** (gõ tiếng Việt Unikey); **ô nhập** (bật/tắt runtime qua nút toggle, mặc định ẩn) khi trống gửi Enter/Backspace/Delete thẳng vào terminal. Xử lý close code đa thiết bị: 4001 (bị cướp) / 4002 (bị khoá) → không tự reconnect. | `KEY_MAP`, `resolveKeyCombo()`, `scrollSession()`, `applyFontSize()`, `applyKeyboardMode()`, `focusActive()`, `applyModifiers()`, `t()`. |

## Tiện ích dùng chung (tránh viết trùng)

- **Gửi request đổi trạng thái (frontend)**: luôn dùng `mutHeaders()` (dashboard)
  hoặc tự đính `X-CSRF-Token` (terminal) — không tự dựng headers tuỳ tiện.
- **Dịch text (frontend)**: luôn qua `window.I18N` (`t()` cho động, `data-i18n*`
  cho tĩnh). **Không hardcode chuỗi ngôn ngữ.** Xem [I18N.md](./I18N.md).
- **Áp theme (frontend)**: luôn qua `window.Theme` (`theme.js`) — không set
  `data-theme` trực tiếp. Hỗ trợ `dark|light|auto`.
- **Lưu metadata phiên (backend)**: luôn qua `meta-store.js`, không đọc/ghi
  `data/sessions-meta.json` trực tiếp ở nơi khác.
- **Đọc/ghi cấu hình (backend)**: luôn qua `config.js` (`getConfig`/`saveConfig`),
  không tự đọc `config.json`.
- **Hash/verify mật khẩu**: luôn qua `password.js`.
- **Thao tác tmux (gồm cuộn + pipe-pane log)**: luôn qua `tmux.js` (đã validate tên + chống injection).
- **Ghi log terminal (backend)**: luôn qua `session-logger.js` (`ensureLogging`/
  `stopLogging`/`applyLoggingToAll`/`cleanupOldLogs`/`listLogs`/`readLog`/
  `deleteLog`), không tự đọc/ghi `data/logs/`.
- **Transcode encoding**: tập trung ở `ws-session.js` (input/output) + validate ở
  `config.js`/`routes/settings.js` qua `iconv.encodingExists`.
- **Cảnh báo cấu hình**: luôn qua `computeWarnings(config)` trong `app.js`.

## Quy tắc khi thêm/sửa

- Thêm/đổi/xoá **module hoặc tiện ích dùng chung** → cập nhật file này ngay.
- Trước khi viết hàm mới: search xem `tmux.js`/`meta-store.js`/`config.js` đã có chưa.
- Thêm/sửa **text giao diện** → tuân theo [I18N.md](./I18N.md) (đủ cả EN và VI).
- Thêm phụ thuộc hệ điều hành → đặt sau interface trong `tmux.js` (xem [ROADMAP.md](./ROADMAP.md)).
