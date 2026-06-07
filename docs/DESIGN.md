# Tư tưởng & Quyết định thiết kế (Design Decisions)

> Ghi lại các quyết định kỹ thuật quan trọng và lý do (đánh đổi). Cập nhật khi
> có quyết định mới hoặc thay đổi quyết định cũ.

## Triết lý chung

- **KISS / YAGNI**: ưu tiên giải pháp đơn giản, đủ dùng. Không thêm framework
  hay dependency khi chưa thực sự cần.
- **Zero heavy dependency phía frontend**: HTML/CSS/JS thuần + xterm.js. Dễ đọc,
  dễ bảo trì, không cần build step.
- **An toàn mặc định**: hash mật khẩu, CSRF, rate-limit, validate đầu vào ở biên.

## Các quyết định (ADR rút gọn)

### 1. Lưu metadata phiên bằng JSON file, không dùng SQLite
- **Bối cảnh**: cần lưu ghi chú, thứ tự kéo-thả, lần truy cập cuối cho từng phiên.
- **Quyết định**: dùng `data/sessions-meta.json` ghi atomic, đóng gói sau module
  `meta-store.js` với interface hàm rõ ràng (`getMeta`, `setNote`, `touch`,
  `setOrder`, `rename`, `remove`).
- **Lý do**:
  - Dự án yêu cầu **Node 18+**; `node:sqlite` chỉ có từ Node 22 và còn experimental.
  - `better-sqlite3` là native module → phức tạp hoá cài đặt (build toolchain).
  - Dữ liệu metadata nhỏ, ghi không thường xuyên → JSON quá đủ.
- **Khả năng mở rộng**: vì mọi truy cập đi qua interface của `meta-store.js`,
  sau này có thể thay phần đọc/ghi sang SQLite/DB mà **không đụng** phần còn lại.
- **Đánh đổi**: không có truy vấn phức tạp/giao dịch; chấp nhận được ở quy mô hiện tại.

### 2. Hash mật khẩu bằng scrypt của `node:crypto`
- **Quyết định**: định dạng lưu `scrypt$<saltHex>$<hashHex>`; `verifyPassword`
  hỗ trợ cả plaintext cũ để **migrate dần** (đổi mật khẩu lần đầu sẽ hash lại).
- **Lý do**: scrypt là KDF mạnh, có sẵn trong Node → **không thêm dependency**
  (tránh bcrypt/argon2 native). So sánh hash dùng `timingSafeEqual`.

### 3. Đổi Port/Host yêu cầu restart; tự restart khi chạy dưới systemd
- **Quyết định**: phát hiện systemd qua biến `INVOCATION_ID`. Nếu có và đổi
  port/host → `process.exit(0)` để systemd (`Restart=always`) khởi động lại.
  Nếu chạy thủ công → trả thông báo yêu cầu người dùng tự restart.
- **Lý do**: Node không thể đổi port khi đang listen. Tự restart chỉ an toàn khi
  có trình giám sát (systemd); chạy thủ công mà tự thoát sẽ làm sập server.

### 4. CSRF double-submit token
- **Quyết định**: server set cookie `tcc_csrf` (không httpOnly) cho mọi request;
  client đọc và gửi lại qua header `X-CSRF-Token`; server so khớp.
- **Lý do**: auth dựa trên cookie → dễ bị CSRF. Double-submit đơn giản, không cần
  lưu state server-side. Cookie `sameSite=strict` là lớp phòng vệ thứ hai.

### 5. Rate-limit đăng nhập in-memory, cấu hình được
- **Quyết định**: `Map<ip, {count, resetAt}>` trong tiến trình; tham số
  (`enabled`, `maxAttempts`, `windowMs`) chỉnh được qua Settings.
- **Đánh đổi**: state mất khi restart và không chia sẻ giữa nhiều tiến trình.
  Chấp nhận được vì TCC là tiến trình đơn; nếu scale ngang sau này cần store chung.

### 6. Kéo-thả lưu thứ tự server-side
- **Quyết định**: HTML5 Drag and Drop API (không thư viện); thứ tự lưu qua
  `PUT /api/sessions/order` vào `meta-store`.
- **Lý do**: dùng chung mọi thiết bị (yêu cầu của người dùng), không phụ thuộc
  localStorage từng trình duyệt.

### 7. Nút điều khiển terminal: cuộn server-side (tmux copy-mode), phím gửi server
- **Quyết định**: nút cuộn gọi `POST /api/sessions/:name/scroll` → `tmux.scrollSession`
  dùng tmux copy-mode (`copy-mode`, `send-keys -X scroll-up/scroll-down/history-top`,
  `cancel`). Các phím (Enter/ESC/Ctrl+C/Tab/mũi tên) gửi chuỗi escape qua WebSocket.
- **Lý do**: ban đầu thử cuộn client-side bằng API xterm (`scrollLines`...) nhưng
  **không có tác dụng** — khi attach tmux, tmux chiếm alternate-screen nên scrollback
  của xterm rỗng; scrollback thật nằm trong copy-mode của tmux. Đã xác minh bằng
  thực nghiệm (`scroll_position`, `pane_in_mode`) trước khi chọn hướng server-side.
- **Cập nhật (v1.7.0)**: UI **bỏ 2 nút "lên đầu"/"xuống cuối"** (chỉ giữ cuộn
  lên/xuống) cho gọn. Endpoint `/scroll` vẫn nhận `top`/`bottom` (không phá vỡ API),
  chỉ là giao diện không còn nút gọi.

### 11. Bàn phím mobile: mặc định ô nhập liệu, chỉ chèn text (không Enter)
- **Bối cảnh**: gõ thẳng vào terminal trên iPhone không gõ được **tiếng Việt** —
  IME tiếng Việt của iOS không tương thích với `<textarea>` ẩn của xterm.js (mất
  dấu, không ghép được ký tự tổ hợp).
- **Quyết định**: đổi `mobileKeyboardMode` mặc định `resize` → **`input`**. Ở chế
  độ này hiện một ô `<input>` HTML thật phía trên bàn phím; IME hoạt động đúng nên
  soạn được tiếng Việt. Nút gửi (icon máy bay giấy) **chỉ chèn (`sendInput(val)`)**
  cả đoạn vào terminal **một lần, KHÔNG kèm `\r`** — người dùng tự bấm nút ⏎ để chạy.
  Chạm vào terminal sẽ focus ô nhập (terminal đang `readOnly` ở chế độ này).
- **Lý do**: tách "soạn thảo" (trình duyệt/IME xử lý) khỏi "thực thi" (terminal),
  giúp văn bản đa ngôn ngữ chính xác trước khi đẩy vào shell; không tự Enter để
  tránh chạy nhầm khi đoạn văn bản nhiều dòng.
- **Đánh đổi**: thêm một bước (soạn rồi chèn) thay vì gõ realtime; bù lại gõ được
  tiếng Việt và kiểm soát thời điểm chạy. Vẫn giữ `resize` cho ai muốn gõ trực tiếp.

### 8. Encoding: transcode bytes ↔ UTF-8 bằng iconv-lite
- **Bối cảnh**: một số máy/chương trình xuất bảng mã cũ (GBK, Big5, EUC-KR, TIS-620,
  Shift_JIS...) khiến hiển thị sai. xterm.js **chỉ render UTF-8**; `node-pty`/Node
  StringDecoder không hỗ trợ các bảng mã này.
- **Quyết định**: thêm `iconv-lite` (thuần JS, không native). Khi `termEncoding`
  khác UTF-8: spawn pty ở chế độ raw Buffer, dùng **streaming decoder** decode
  output → UTF-8, và `iconv.encode` input → bảng mã nguồn. UTF-8 thì truyền thẳng
  (không overhead).
- **Lý do dùng streaming decoder**: ký tự đa byte có thể bị cắt ngang giữa hai chunk
  dữ liệu pty; decoder giữ trạng thái để ghép đúng (đã test với chunk cắt giữa ký tự).
- **Đánh đổi**: thêm 1 dependency; chấp nhận được vì đáp ứng đúng nhu cầu đa bảng mã.

### 9. Đa ngôn ngữ (i18n) client-side, mặc định tiếng Anh
- **Quyết định**: từ điển EN/VI tập trung ở `public/js/i18n.js`; text tĩnh dùng
  `data-i18n*`, text động dùng `t()`. Ngôn ngữ lưu server-side (`config.language`,
  mặc định `en`). Quy ước bắt buộc trong [I18N.md](./I18N.md).
- **Lý do**: vanilla JS, không thêm thư viện i18n nặng; nguồn dịch duy nhất tránh
  trùng lặp; lưu server-side để áp cho mọi thiết bị (giống các thiết lập khác).

### 10. Content-type parser: body JSON rỗng → {}
- **Quyết định**: override parser `application/json` của Fastify để coi body rỗng
  là `{}` thay vì trả 400 `FST_ERR_CTP_EMPTY_JSON_BODY`.
- **Lý do**: các request POST/PUT không body (vd `/touch`, `/logout`) vẫn gửi header
  JSON từ helper chung; mặc định Fastify từ chối, gây bug (lastAccess không ghi).
  Sửa tập trung một chỗ thay vì bỏ header ở từng lời gọi.
