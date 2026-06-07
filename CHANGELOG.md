# Changelog

Tất cả thay đổi đáng chú ý của dự án được ghi tại đây.

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/),
và dự án tuân theo [Semantic Versioning](https://semver.org/lang/vi/).

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
