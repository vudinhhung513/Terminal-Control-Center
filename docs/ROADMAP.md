# Roadmap

> Định hướng phát triển theo các mốc phiên bản. Đây là kế hoạch dự kiến, có thể
> điều chỉnh. Chi tiết việc đã làm xem [CHANGELOG.md](../CHANGELOG.md); việc cần
> làm xem [TODO.md](./TODO.md).

## v1.0.0 — Nền tảng (đã phát hành)
Quản lý phiên tmux cơ bản qua web: dashboard, tạo/đóng phiên, web terminal
realtime, auth bật/tắt, systemd service.

## v1.1.0 — Quản lý & tiện ích (đã phát hành)
- Giao diện Settings cấu hình toàn diện.
- Kéo-thả sắp xếp, đổi tên, ghi chú, lần truy cập cuối.
- Thanh nút điều khiển terminal.
- Bảo mật: hash mật khẩu, CSRF, rate-limit; auto-reconnect.
- Versioning + CHANGELOG + bộ tài liệu docs/.

## v1.2.0 — Encoding & đa ngôn ngữ (hiện tại)
- Cấu hình bảng mã (encoding) terminal, transcode qua iconv-lite.
- Đa ngôn ngữ Anh/Việt (mặc định tiếng Anh), đổi trong Settings.
- Sửa cuộn terminal qua tmux copy-mode; sửa ghi lastAccess.

## v1.3.0 — Trải nghiệm & độ tin cậy (dự kiến)
- Test tích hợp đầy đủ cho REST routes (Fastify `inject`).
- Chọn shell khi tạo phiên; theme sáng/tối.
- Copy/paste thân thiện mobile.
- Cảnh báo cấu hình kém an toàn (sessionSecret mặc định, host công khai).

## v1.4.0 — Mở rộng (dự kiến)
- Xuất/nhập cấu hình + metadata (backup/restore).
- Hỗ trợ nhiều cửa sổ tmux trong một phiên trên UI.
- Thêm ngôn ngữ giao diện thứ ba (xem [I18N.md](./I18N.md)).

## Đa nền tảng (xuyên suốt các phiên bản)

Mục tiêu hỗ trợ chạy TCC trên nhiều hệ điều hành. Hiện tại tầng quản lý phiên
gắn với **tmux** (`src/tmux.js`) và `node-pty`.

- **Linux** — đã hỗ trợ (bản hiện tại).
- **macOS** — dự kiến: tmux chạy tốt trên macOS; cần kiểm thử `node-pty`, script
  cài đặt (thay systemd bằng `launchd`) và đường dẫn shell mặc định.
- **Windows** — dự kiến (tầm nhìn xa hơn): tmux không chạy native trên Windows.
  Hướng tiếp cận: hỗ trợ qua **WSL2**, hoặc trừu tượng hoá tầng phiên để dùng
  backend khác (vd ConPTY + trình quản lý phiên tương đương) sau interface của
  `tmux.js`.

> Khi thêm nền tảng mới: tách phần phụ thuộc HĐH ra sau interface trong
> `src/tmux.js`, không rải lệnh hệ thống khắp codebase (xem [CODEMAP.md](./CODEMAP.md)).

## v2.0.0 — Đa người dùng (tầm nhìn)
- Phân quyền nhiều tài khoản, vai trò.
- Audit log thao tác.
- Cân nhắc chuyển lưu trữ metadata sang SQLite (qua interface `meta-store.js`)
  nếu nhu cầu truy vấn/đồng thời tăng.
