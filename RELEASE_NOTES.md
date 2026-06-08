# Terminal Control Center v1.7.0 — First Release 🎉

Bản phát hành công khai đầu tiên của **Terminal Control Center (TCC)** — ứng dụng
web quản lý các phiên **tmux** từ xa qua trình duyệt. Tạo, theo dõi, điều khiển và
đóng các terminal session ngay trên giao diện web, dùng được cả trên desktop lẫn
điện thoại.

> ⚠️ **Lưu ý quan trọng:** TCC **chỉ quản lý các phiên tmux**, không lưu trữ hay
> "đóng băng" terminal của máy bạn. Khi **tắt máy** hoặc **crash/restart** một
> service liên quan (TCC, tmux, terminal), **toàn bộ phiên tmux hiện tại sẽ bị
> mất**. Nếu cần dữ liệu sống sót qua khởi động lại, hãy tự lưu ra file/log trong
> chính phiên làm việc.

---

## ✨ Tính năng chính

- **Dashboard** hiển thị tất cả phiên tmux đang hoạt động.
- **Tạo / đóng (kill) phiên** trực tiếp từ trình duyệt.
- **Web terminal** tương tác realtime qua WebSocket (xterm.js).
- **Phiên sống độc lập với trình duyệt** nhờ tmux — đóng tab/mất mạng không gián
  đoạn tiến trình đang chạy.
- **Đổi tên, ghi chú, lần truy cập cuối** cho từng phiên để dễ quản lý.
- **Kéo-thả sắp xếp** thứ tự phiên (lưu server-side, áp cho mọi thiết bị).
- **Thanh nút điều khiển**: cuộn lên/xuống, Enter, ESC, Ctrl+C, Tab, mũi tên,
  copy/paste.
- **Chọn shell khi tạo phiên** (allowlist cấu hình được, mặc định `bash/zsh/sh/fish`).
- **Thư mục mặc định cho phiên mới** (`defaultPath`): tạo phiên là vào thẳng thư mục đó.
- **Cấu hình bảng mã (encoding)**: UTF-8, GBK, Big5, EUC-KR, Shift_JIS, TIS-620...
- **Đa ngôn ngữ** Anh/Việt (mặc định tiếng Anh, đổi trong Settings).
- **Theme sáng/tối/auto** — nút icon gọn trên dashboard, Auto theo hệ điều hành.
- **Responsive + PWA**: "Add to Home Screen" để chạy fullscreen như app gốc.

## 📱 Tối ưu cho điện thoại (mới ở bản này)

- **Ô nhập liệu mobile làm mặc định**: chạm vào terminal hiện một ô textbox ngay
  trên bàn phím để soạn cả đoạn — **gõ được tiếng Việt trên iPhone** (IME hoạt
  động đúng), rồi **chèn** nguyên đoạn vào terminal một lần (không kèm Enter).
  Người dùng tự bấm nút ⏎ khi muốn chạy lệnh.
- **Cỡ chữ riêng** cho mobile và desktop (tự chọn theo bề rộng màn hình).
- **Tránh Dynamic Island / tai thỏ iPhone**: chèn khoảng trống an toàn
  (`safe-area-inset`) để phần đầu trang không bị che khi chạy PWA fullscreen.

## 🔒 Bảo mật

- **Xác thực (auth)** bật/tắt linh hoạt; mật khẩu **hash scrypt** (không lưu plaintext).
- **Chống brute-force** đăng nhập (rate-limit theo IP, cấu hình được).
- **CSRF protection** (double-submit token) cho mọi request đổi trạng thái.
- **HTTPS/TLS tự sinh cert**: bật mặc định — server tự sinh chứng chỉ self-signed
  (tự dò IP máy vào SAN) để trang thành *secure context*, nhờ đó nút Paste tự đọc
  clipboard kể cả khi truy cập qua `https://<IP>`.
- **Cảnh báo cấu hình kém an toàn** khi `sessionSecret` còn mặc định hoặc host
  công khai mà không bật auth.

---

## 📦 Yêu cầu

| Thành phần | Phiên bản tối thiểu |
|---|---|
| Hệ điều hành | Ubuntu 20.04+ (hoặc Debian-based) / macOS 12+ (chưa kiểm thử) |
| Node.js | 18+ |
| tmux | 3.0+ |

> **Windows** sẽ triển khai ở [repo riêng](https://github.com/vudinhhung513/Windows-Terminal-Control-Center) (kiến trúc khác biệt, không có tmux).

## 🚀 Cài đặt nhanh

```bash
git clone https://github.com/vudinhhung513/Terminal-Control-Center.git
cd Terminal-Control-Center
npm install
cp config.example.json config.json
./start.sh
```

Mặc định chạy tại `https://<IP>:7171`. Lần đầu trình duyệt cảnh báo cert tự ký —
bấm **Advanced → Proceed** một lần là dùng được.

Cài như systemd service (tự khởi động cùng OS):

```bash
chmod +x install-service.sh && ./install-service.sh
```

## ⚠️ Cảnh báo bảo mật

Web terminal = **thực thi lệnh từ xa trên máy chủ**. Khi chạy ngoài localhost:

- **Luôn bật `authEnabled: true`** + đặt mật khẩu mạnh.
- **Đổi `sessionSecret`** thành chuỗi ngẫu nhiên dài (≥ 32 ký tự).
- Truy cập từ xa nên dùng **VPN / Tailscale / SSH tunnel** thay vì mở port công khai.
- Giới hạn bằng firewall (`ufw allow from <LAN_IP> to any port 7171`).

---

## 📚 Tài liệu

- [README (Tiếng Việt)](./README.md) · [README (English)](./README.en.md)
- [CHANGELOG đầy đủ](./CHANGELOG.md)
- Tài liệu kỹ thuật: [`docs/`](./docs) (ARCHITECTURE, DESIGN, CODEMAP, I18N, ROADMAP)

**Full Changelog:** https://github.com/vudinhhung513/Terminal-Control-Center/blob/main/CHANGELOG.md
