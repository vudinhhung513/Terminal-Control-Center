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

## v1.2.0 — Encoding & đa ngôn ngữ (đã phát hành)
- Cấu hình bảng mã (encoding) terminal, transcode qua iconv-lite.
- Đa ngôn ngữ Anh/Việt (mặc định tiếng Anh), đổi trong Settings.
- Sửa cuộn terminal qua tmux copy-mode; sửa ghi lastAccess.

## v1.3.0 — Trải nghiệm & độ tin cậy (hiện tại)
- Test tích hợp đầy đủ cho REST routes (Fastify `inject` qua `buildApp`).
- Chọn shell khi tạo phiên (allowlist `config.shells`) + theme sáng/tối.
- Copy/paste thân thiện mobile (navigator.clipboard).
- Cảnh báo cấu hình kém an toàn (sessionSecret mặc định, host công khai).
- Script cài đặt macOS (launchd) — **chưa kiểm thử thực tế (untested)**.

## v1.4.0 — Mở rộng (dự kiến)
- **Thêm tiếng Trung giản thể (zh-CN)** làm ngôn ngữ thứ ba (xem [I18N.md](./I18N.md)).

## Đa nền tảng (xuyên suốt các phiên bản)

Mục tiêu hỗ trợ chạy TCC trên nhiều hệ điều hành. Hiện tại tầng quản lý phiên
gắn với **tmux** (`src/tmux.js`) và `node-pty`.

- **Linux** — đã hỗ trợ đầy đủ (bản hiện tại).
- **macOS** — đã thêm script cài đặt launchd (`install-service-macos.sh` /
  `uninstall-service-macos.sh`). Code lõi (tmux + node-pty) chạy được trên macOS,
  shell mặc định là `zsh`. **CHƯA kiểm thử thực tế (untested)** — cần người dùng
  macOS xác nhận.
- **Windows** — sẽ triển khai ở **repo riêng** ([Windows-Terminal-Control-Center](https://github.com/vudinhhung513/Windows-Terminal-Control-Center)).
  Hướng tiếp cận: nhúng phiên cmd/PowerShell qua **ConPTY** (tương tự cách VS Code
  nhúng terminal — dùng Node.js + node-pty + ConPTY, hoặc C#; quyết định khi mở
  repo). **Rào cản kiến trúc:** Windows native không có cơ chế detach/attach phiên
  sống độc lập như tmux, nên mô hình quản lý phiên sẽ khác biệt cơ bản — tách repo
  riêng là hợp lý.

> Khi thêm nền tảng mới: tách phần phụ thuộc HĐH ra sau interface trong
> `src/tmux.js`, không rải lệnh hệ thống khắp codebase (xem [CODEMAP.md](./CODEMAP.md)).

## v2.0.0 — Đa người dùng (tầm nhìn)
- Phân quyền nhiều tài khoản, vai trò.
- Cân nhắc chuyển lưu trữ metadata sang SQLite (qua interface `meta-store.js`)
  nếu nhu cầu truy vấn/đồng thời tăng.

## v3.0.0 — Hub đa node (tầm nhìn)
- **TCC-Hub**: node trung tâm quản lý **nhiều instance TCC (Linux) và WTCC
  (Windows)** từ một điểm: dashboard tổng (mọi node), SSO (đăng nhập một lần),
  node registry + heartbeat, reverse-proxy HTTP/WebSocket tới từng node.
- Node tự **đăng ký với hub** và giữ kênh điều khiển: reverse tunnel (node dial
  ra hub, vượt NAT) hoặc direct/VPN (Tailscale/WireGuard). Node vẫn chạy độc lập
  được khi không có hub.
- Mỗi node xác thực với hub bằng **token/khoá riêng**; hub uỷ quyền tới node bằng
  token ngắn hạn, giữ nguyên ranh giới bảo mật hiện có ở mỗi node.
- Kiến trúc cơ bản: xem mục **"Hub đa node"** trong [ARCHITECTURE.md](./ARCHITECTURE.md).
