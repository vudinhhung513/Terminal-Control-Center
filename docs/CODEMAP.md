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
├── install-service.sh      # Cài systemd service (Restart=always)
├── uninstall-service.sh    # Gỡ service
├── data/                   # (tạo runtime) sessions-meta.json — git-ignored
├── docs/                   # Tài liệu dự án
├── public/                 # Frontend
│   ├── index.html          # Dashboard + modal Settings
│   ├── terminal.html       # Trang terminal + control bar
│   ├── css/styles.css      # Toàn bộ style (dark theme)
│   ├── js/i18n.js          # Đa ngôn ngữ EN/VI (từ điển + apply)
│   ├── js/dashboard.js     # Logic dashboard
│   ├── js/terminal.js      # Logic terminal
│   └── vendor/             # xterm.js + addon-fit (bản tĩnh)
├── src/                    # Backend
└── test/                   # Unit tests
```

## Backend (src/)

| File | Vai trò | Ghi chú |
|---|---|---|
| `server.js` | Entry point: khởi tạo Fastify, content-type parser (body JSON rỗng→{}), đăng ký plugin/route, listen. | Đọc version từ `package.json`; expose font + language qua `/api/config`. |
| `config.js` | Đọc/validate/**ghi atomic** `config.json`; config in-memory dùng chung; `saveConfig` cập nhật runtime. | `loadConfig`, `getConfig`, `saveConfig`, `DEFAULTS`. Validate encoding (iconv) + language. |
| `auth.js` | Login/logout, `isAuthed`, `requireAuth`, `requireCsrf`, rate-limit, `registerCsrfCookie`. | CSRF double-submit (cookie set top-level) + rate-limit in-memory. |
| `password.js` | Hash/verify mật khẩu scrypt. | `hashPassword`, `verifyPassword`, `isHashed`. |
| `tmux.js` | Thao tác tmux qua `execFile`. | `validateName`, `listSessions`, `createSession`, `killSession`, `renameSession`, `hasSession`, `scrollSession`. |
| `meta-store.js` | **Tiện ích dùng chung**: lưu metadata phiên (JSON). | Interface tách biệt để đổi sang DB sau này. Override path qua env `TCC_DATA_DIR`. |
| `ws-session.js` | WebSocket bridge tmux ↔ xterm qua node-pty + transcode encoding (iconv-lite). | UTF-8 → truyền thẳng; khác → decode/encode streaming. |
| `routes/sessions.js` | REST: list/create/kill phiên, merge metadata. | |
| `routes/meta.js` | REST: touch/note/rename/order/**scroll**. | |
| `routes/settings.js` | REST: GET/PUT cấu hình (gồm encoding, language); xử lý restart. | |

## Frontend (public/js/)

| File | Vai trò | Tiện ích dùng chung |
|---|---|---|
| `i18n.js` | **Đa ngôn ngữ EN/VI**: từ điển `DICT`, `window.I18N` (`setLang`/`getLang`/`t`/`apply`). | **Mọi text UI phải qua đây** (xem [I18N.md](./I18N.md)). |
| `dashboard.js` | Auth, danh sách phiên, tạo/xoá/đổi tên/ghi chú, kéo-thả, Settings, i18n. | `getCsrfToken()`, `mutHeaders()`, `t()` — dùng cho request đổi trạng thái + dịch. |
| `terminal.js` | xterm + WebSocket, control bar, scroll (server-side), auto-reconnect, áp font + ngôn ngữ. | `KEY_MAP` (phím → escape), `scrollSession()`, `t()`. |

## Tiện ích dùng chung (tránh viết trùng)

- **Gửi request đổi trạng thái (frontend)**: luôn dùng `mutHeaders()` (dashboard)
  hoặc tự đính `X-CSRF-Token` (terminal) — không tự dựng headers tuỳ tiện.
- **Dịch text (frontend)**: luôn qua `window.I18N` (`t()` cho động, `data-i18n*`
  cho tĩnh). **Không hardcode chuỗi ngôn ngữ.** Xem [I18N.md](./I18N.md).
- **Lưu metadata phiên (backend)**: luôn qua `meta-store.js`, không đọc/ghi
  `data/sessions-meta.json` trực tiếp ở nơi khác.
- **Đọc/ghi cấu hình (backend)**: luôn qua `config.js` (`getConfig`/`saveConfig`),
  không tự đọc `config.json`.
- **Hash/verify mật khẩu**: luôn qua `password.js`.
- **Thao tác tmux (gồm cuộn)**: luôn qua `tmux.js` (đã validate tên + chống injection).
- **Transcode encoding**: tập trung ở `ws-session.js` (input/output) + validate ở
  `config.js`/`routes/settings.js` qua `iconv.encodingExists`.

## Quy tắc khi thêm/sửa

- Thêm/đổi/xoá **module hoặc tiện ích dùng chung** → cập nhật file này ngay.
- Trước khi viết hàm mới: search xem `tmux.js`/`meta-store.js`/`config.js` đã có chưa.
- Thêm/sửa **text giao diện** → tuân theo [I18N.md](./I18N.md) (đủ cả EN và VI).
- Thêm phụ thuộc hệ điều hành → đặt sau interface trong `tmux.js` (xem [ROADMAP.md](./ROADMAP.md)).
