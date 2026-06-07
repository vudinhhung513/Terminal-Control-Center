# Changelog

Tất cả thay đổi đáng chú ý của dự án được ghi tại đây.

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/),
và dự án tuân theo [Semantic Versioning](https://semver.org/lang/vi/).

## [1.7.0] - 2026-06-07

### Changed (Thay đổi)
- **Bàn phím mobile mặc định = ô nhập liệu (`mobileKeyboardMode: 'input'`)**: đổi
  mặc định từ `resize` → `input`. Lý do: gõ thẳng vào terminal trên iPhone **không
  gõ được tiếng Việt** (IME iOS không tương thích `<textarea>` ẩn của xterm). Ở chế
  độ `input`, chạm vào terminal sẽ hiện một ô `<input>` HTML thật ngay trên bàn
  phím → soạn cả đoạn (gõ được tiếng Việt) rồi **chèn** vào terminal.
- **Nút gửi chỉ CHÈN text, KHÔNG kèm Enter**: trước đây bấm gửi sẽ thêm `\r` (chạy
  lệnh ngay). Giờ chỉ `sendInput(val)` chèn nguyên đoạn văn bản vào terminal một
  lần; người dùng tự bấm nút **⏎** trên control bar khi muốn chạy. Tránh chạy nhầm
  với văn bản nhiều dòng. Nút gửi đổi thành **icon máy bay giấy**.
- `config.example.json` + `DEFAULTS.mobileKeyboardMode` đổi sang `input`.

### Removed (Gỡ bỏ)
- **Bỏ 2 nút "lên đầu" (⤒) / "xuống cuối" (⤓)** trên control bar terminal (chỉ giữ
  cuộn lên ▲ / xuống ▼). Endpoint `/scroll` vẫn nhận `top`/`bottom` (không phá vỡ
  API), chỉ là UI không còn nút gọi. Gỡ key i18n `ctrl.scrollTop`, `ctrl.scrollBottom`.

### Fixed (Sửa lỗi)
- **Dynamic Island / tai thỏ iPhone che phần đầu trang (PWA)**: khi "Add to Home
  Screen" và chạy fullscreen, phần trên cùng bị Dynamic Island che. Thêm khoảng
  trống an toàn qua `env(safe-area-inset-top/left/right)` cho header và
  `safe-area-inset-bottom` cho control bar (tránh thanh Home indicator) — chỉ dùng
  phần màn hình an toàn để làm việc. Trên trình duyệt thường các biến `env()` = 0
  nên không ảnh hưởng.

### Notes (Ghi chú)
- **Giới hạn (đã ghi rõ trong README)**: TCC **chỉ quản lý các phiên tmux**, không
  lưu trữ/đóng băng terminal. Tắt máy hoặc crash/restart service liên quan (TCC,
  tmux, terminal) sẽ làm **mất toàn bộ phiên tmux hiện tại**.

## [1.6.0] - 2026-06-07

### Added (Thêm mới)
- **Ẩn thanh menu trình duyệt trên mobile (PWA)**: thêm `public/manifest.json`
  (`display: fullscreen`, `display_override`) + các meta tag `mobile-web-app-capable`,
  `apple-mobile-web-app-*`, `theme-color` vào `index.html` và `terminal.html`. Khi
  "Add to Home Screen" và mở từ màn hình chính, app chạy không có thanh địa chỉ/menu
  trình duyệt → tận dụng tối đa màn hình. Trong tab trình duyệt thường, layout dùng
  `100dvh` (dynamic viewport height, fallback `100vh`) để khít đúng vùng hiển thị.
- **Cỡ chữ riêng cho mobile và desktop**: thêm `config.termFontSizeMobile` (mặc định
  `12`). Client tự chọn cỡ chữ theo bề rộng màn hình (≤640px = mobile), áp lại khi
  xoay/đổi kích thước. Thêm field "Mobile font size" trong Settings; field cũ đổi
  nhãn thành "Desktop font size".
- **Nút mũi tên Lên/Xuống thật trong control bar**: thêm 2 nút `↑`/`↓` gửi đúng
  escape sequence `\x1b[A` / `\x1b[B` (giống Trái/Phải), dùng được cho history
  shell, vim, menu… (trước đây chỉ có nút cuộn tmux `▲▼`, không phải phím mũi tên).
- **Xử lý bàn phím ảo che terminal trên mobile (`mobileKeyboardMode`)**: thêm config
  với 2 chế độ — `resize` (mặc định): dùng `visualViewport` API thu nhỏ chiều cao
  trang theo vùng hiển thị còn lại để header + terminal + thanh nút luôn nằm trên
  bàn phím; `input`: hiện ô nhập liệu riêng phía trên bàn phím, tắt bàn phím ảo của
  terminal (chạm terminal không bung bàn phím), gõ Enter/Send để gửi chuỗi + xuống
  dòng. Thêm select "Mobile keyboard" trong Settings.
- Các key i18n mới (EN+VI): `ctrl.up`, `ctrl.down`, `settings.fontSizeMobile`,
  `settings.mobileKeyboard`, `settings.mobileKeyboardHint`,
  `settings.mobileKeyboardResize`, `settings.mobileKeyboardInput`,
  `input.placeholder`, `input.send`.
- Test: validate `termFontSizeMobile`/`mobileKeyboardMode` (sai → 400), GET trả
  field mới, `DEFAULTS.termFontSizeMobile` + `DEFAULTS.mobileKeyboardMode`.

## [1.5.0] - 2026-06-07

### Added (Thêm mới)
- **HTTPS/TLS qua IP (tự sinh cert)**: thêm `config.tls` (`enabled`, `keyPath`,
  `certPath`). **Mặc định bật** (`tls.enabled: true`) — khi khởi động, nếu chưa có
  cert, server **tự sinh chứng chỉ self-signed** (module `src/tls.js`): tự dò các
  IPv4 của máy đưa vào trường SAN, lưu `data/tls/` (git-ignored) và **tự ghi
  `keyPath`/`certPath` vào `config.json`** (không phải sửa tay, không phải chạy
  lệnh). Nhờ HTTPS, trang thành *secure context* nên nút Paste tự đọc clipboard kể
  cả qua `https://<IP>`. Đặt `tls.enabled: false` để chạy HTTP. `keyPath`/`certPath`
  hỗ trợ tuyệt đối hoặc tương đối thư mục gốc; lỗi sinh/đọc cert (vd thiếu `openssl`)
  thì server báo lỗi và thoát (không tự chạy lùi về HTTP).
- **Script `generate-cert.sh`** (tuỳ chọn): sinh cert thủ công với IP/hostname tuỳ ý
  khi cần (mặc định server đã tự sinh nên không bắt buộc dùng).
- Test: `DEFAULTS.tls`; `src/tls.js` (`buildSanString`, `ensureCert` khi đã có file).

### Changed (Thay đổi)
- **Sửa Ctrl+Shift+V**: không còn tự gọi `pasteFromClipboard()` (gây thông báo
  thừa trên HTTP và paste 2 lần trên HTTPS). Giờ để sự kiện `paste` gốc của trình
  duyệt xử lý — đọc clipboard client, chạy được cả trên HTTP, không hiện hộp thoại.
- **Lời nhắc nút Paste (HTTP)**: đổi thông báo nêu rõ "dán tự động cần HTTPS, đang
  chạy HTTP nên trình duyệt chặn clipboard" thay vì thông báo lỗi mơ hồ.

## [1.4.0] - 2026-06-07

### Added (Thêm mới)
- **Thư mục mặc định cho phiên mới (`defaultPath`)**: thêm `config.defaultPath`
  (rỗng = mặc định tmux). Khi tạo phiên, server truyền `tmux new-session -c <path>`
  để vào thẳng thư mục đó (không cần `cd`). Hỗ trợ `~` (home). `PUT /api/settings`
  validate nghiêm ngặt khi lưu: phải là đường dẫn tuyệt đối, tồn tại và là thư mục
  (sai → 400). Lúc tạo phiên nếu thư mục không còn tồn tại thì bỏ qua `-c` an toàn.
  Thêm field "Default path" trong Settings.
- **Nút đổi giao diện trên home + chế độ Auto**: nút icon gọn (`#btn-theme`) cạnh
  nút Settings, bấm xoay vòng `dark → light → auto`. Thêm `theme: 'auto'` (theo
  `prefers-color-scheme` của hệ điều hành, tự đổi khi hệ thống đổi chế độ). Logic
  theme tách ra module dùng chung `public/js/theme.js` (`window.Theme`:
  `applyTheme`/`resolveTheme`), dùng cho cả dashboard và terminal; phát sự kiện
  `tcc:theme-change` để terminal cập nhật màu xterm.
- Các key i18n mới (EN+VI): `btn.theme`, `theme.auto`, `settings.sessionLegend`,
  `settings.defaultPath`, `settings.defaultPathHint`.
- Test: `expandHome` (tmux), validate `defaultPath` + `theme` (app), `DEFAULTS.defaultPath`.

### Changed (Thay đổi)
- **Gọn layout Settings**: `.settings-field` đổi sang một hàng (label trái cố định
  ~42%, input chiếm phần còn lại) để tiết kiệm diện tích; màn rất hẹp (≤420px) tự
  xuống cột.
- `PUT /api/settings` chấp nhận `theme` = `dark|light|auto` (trước chỉ `dark|light`).
- `GET/PUT /api/settings` trả/nhận thêm `defaultPath`.
- `tmux.js` export thêm `expandHome()`; `createSession` thêm `-c <defaultPath>` khi hợp lệ.

## [1.3.0] - 2026-06-07

### Added (Thêm mới)
- **Chọn shell khi tạo phiên**: thêm allowlist `config.shells` (mặc định
  `["bash","zsh","sh","fish"]`); dropdown chọn shell cạnh nút tạo phiên trên
  dashboard; `POST /api/sessions` nhận field `shell` (validate thuộc allowlist,
  không hợp lệ → 400).
- **Theme sáng/tối**: thêm `config.theme` (`dark` mặc định | `light`); select
  trong Settings; áp qua thuộc tính `data-theme` trên `<html>`; `PUT /api/settings`
  validate `dark`|`light`; `styles.css` chứa biến màu cho `[data-theme="light"]`.
- **Copy/Paste trên mobile**: 2 nút copy/paste trên control bar terminal, dùng
  `navigator.clipboard` (copy lấy `term.getSelection()`, paste đọc clipboard rồi
  gửi vào terminal).
- **Cảnh báo cấu hình kém an toàn**: `GET /api/config` trả mảng `warnings` (mã
  `defaultSecret` khi `sessionSecret` còn giá trị mặc định; `exposedNoAuth` khi
  host khác localhost và `authEnabled=false`); dashboard hiện banner
  `#security-warning`.
- **Test tích hợp**: tách `src/app.js` export `buildApp(config, {version})` (không
  listen) + `computeWarnings(config)`; thêm `test/app.test.js` (dùng
  `app.inject()`) và `test/config.test.js`.
- **Script macOS (launchd)**: thêm `install-service-macos.sh` +
  `uninstall-service-macos.sh` dùng LaunchAgent
  (`~/Library/LaunchAgents/com.tcc.terminal-control-center.plist`, KeepAlive,
  RunAtLoad). **Chưa kiểm thử thực tế (untested).**
- Các key i18n mới (EN+VI): `toolbar.shell`, `settings.themeLegend`,
  `settings.theme`, `theme.dark`, `theme.light`, `ctrl.copy`, `ctrl.paste`,
  `warn.defaultSecret`, `warn.exposedNoAuth`.

### Changed (Thay đổi)
- Tách `src/app.js` khỏi `server.js`: `app.js` export `buildApp` (dựng Fastify app
  hoàn chỉnh) + `computeWarnings`; `server.js` giờ chỉ đọc config/version, gọi
  `buildApp` rồi `listen` — cho phép test inject mà không bind port.
- `GET /api/config` trả thêm: `theme`, `shells`, `warnings`.
- `GET /api/settings` trả thêm: `shell`, `shells`, `theme`.
- `tmux.js` → `createSession(name, config, shell)` nhận tham số shell, validate
  thuộc allowlist `config.shells`.

### Notes (Ghi chú)
- **macOS**: script launchd đã thêm nhưng chưa kiểm thử thực tế trên phần cứng
  macOS — cần cộng đồng xác nhận.
- **Windows**: sẽ triển khai ở repo riêng (kiến trúc khác biệt, không có tmux).

## [1.2.0] - 2026-06-06

### Added (Thêm mới)
- **Đa ngôn ngữ (i18n) Anh/Việt**: giao diện mặc định **tiếng Anh**, đổi sang
  tiếng Việt trong Settings. Module `public/js/i18n.js` chứa từ điển EN/VI và
  dịch các phần tử theo thuộc tính `data-i18n` / `data-i18n-placeholder` /
  `data-i18n-title`. Ngôn ngữ lưu server-side (`config.language`).
- **Cấu hình bảng mã (encoding)**: chọn bảng mã terminal (UTF-8, GBK, GB2312,
  Big5, EUC-KR, Shift_JIS, EUC-JP, TIS-620, Windows-1251/1252, ISO-8859-1...).
  Server transcode bytes ↔ UTF-8 bằng `iconv-lite` (xterm.js chỉ hiểu UTF-8),
  dùng streaming decoder để xử lý ký tự đa byte bị cắt ngang chunk.

### Fixed (Sửa lỗi)
- **Nút cuộn terminal không hoạt động**: cuộn xterm client-side vô tác dụng vì
  tmux chiếm alternate-screen. Đã chuyển sang cuộn server-side qua **tmux
  copy-mode** (`copy-mode`, `send-keys -X scroll-up/scroll-down/history-top`,
  `cancel`) qua endpoint `POST /api/sessions/:name/scroll`.
- **Lần truy cập cuối (lastAccess) không hiển thị**: request `POST /touch` (và
  `/logout`) gửi header `application/json` nhưng không có body → Fastify trả 400
  `FST_ERR_CTP_EMPTY_JSON_BODY` nên không ghi được. Đã thêm content-type parser
  coi body JSON rỗng là `{}`. Nút "Mở" thêm `keepalive:true` để request touch
  không bị huỷ khi điều hướng trang.

### Changed (Thay đổi)
- Thêm dependency `iconv-lite@0.7.2` (thuần JS, không native).
- Script `lint` bao gồm cả `public/js`.
- systemd unit: `Restart=always` (đã có từ 1.1.0) hỗ trợ tự restart đổi port/host.

### Security (Bảo mật)
- Nâng `@fastify/static` 8.3.0 → **9.1.3**, vá lỗ hổng moderate: path traversal
  trong directory listing và bypass route guard qua ký tự phân tách đường dẫn được
  mã hoá. `npm audit` còn **0 vulnerabilities**. Đã kiểm thử lại phục vụ file tĩnh
  (tất cả trả 200 đúng content-type, path traversal bị chặn 404).

### Notes (Ghi chú)
- Đổi **bảng mã** chỉ cần **mở lại terminal** (áp khi mở WebSocket mới), không
  cần restart server. Đổi **ngôn ngữ** áp ngay không cần reload.

## [1.1.0] - 2026-06-06

### Added (Thêm mới)
- **Giao diện Cài đặt (Settings)**: nút Settings trên dashboard mở modal cho phép
  đổi mật khẩu, bật/tắt yêu cầu mật khẩu, cấu hình Host/Port, font terminal
  (font family + size) và tham số chống brute-force.
- **Kéo-thả sắp xếp phiên**: thứ tự được lưu server-side, áp dụng trên mọi thiết bị.
- **Thanh nút điều khiển terminal**: cuộn lên/xuống/đầu/cuối, gửi Enter, ESC,
  Ctrl+C, Tab, mũi tên trái/phải — hữu ích cho thiết bị không có phím cứng.
- **Đổi tên & ghi chú phiên**: đổi tên phiên tmux thật, thêm ghi chú mô tả mục đích.
- **Lần truy cập cuối**: hiển thị thời điểm mở phiên gần nhất.
- **Version number** hiển thị trên header, lấy từ `package.json` qua `/api/config`.
- **Hash mật khẩu** bằng scrypt (`node:crypto`) thay cho lưu plaintext.
- **Chống brute-force đăng nhập** (rate-limit theo IP, cấu hình được trong Settings).
- **CSRF protection** (double-submit token) cho mọi request đổi trạng thái.
- **Auto-reconnect** WebSocket với backoff luỹ tiến khi mất kết nối.
- **Bộ tài liệu `docs/`**: ARCHITECTURE, DESIGN, CODEMAP, TODO, ROADMAP.

### Changed (Thay đổi)
- **Cổng mặc định 7070 → 7171** (7070 đã bị chiếm trên máy phát triển);
  cổng có thể cấu hình trong `config.json` hoặc qua giao diện Settings.
- systemd unit dùng `Restart=always` để hỗ trợ tự khởi động lại khi đổi Port/Host.
- `config.js` hỗ trợ ghi atomic và cập nhật runtime; thêm field font + rate-limit.

### Security (Bảo mật)
- Mật khẩu không còn lưu plaintext (migrate tự động khi đổi mật khẩu lần đầu).
- Thêm CSRF token và rate-limit đăng nhập.

## [1.0.0] - 2026-06-06

### Added
- Phiên bản đầu tiên: web server quản lý phiên tmux qua trình duyệt.
- Dashboard liệt kê phiên, tạo/đóng phiên, web terminal realtime qua WebSocket.
- Xác thực bật/tắt qua cấu hình, giao diện responsive.
- Script chạy thủ công (`start.sh`) và cài đặt systemd service.

[1.3.0]: #130---2026-06-07
[1.2.0]: #120---2026-06-06
[1.1.0]: #110---2026-06-06
[1.0.0]: #100---2026-06-06
