# TODO

> Danh sách việc cần làm, phân theo độ ưu tiên. Cập nhật khi hoàn thành hoặc
> phát sinh việc mới. Việc đã xong chuyển vào CHANGELOG theo phiên bản.

## Đã hoàn thành (v1.3.0)
- [x] Test tích hợp cho routes (settings/meta/scroll) bằng `app.inject()` qua `buildApp`.
- [x] Chọn shell khi tạo phiên (allowlist `config.shells`, dropdown UI).
- [x] Theme sáng/tối tuỳ chọn (config.theme, data-theme trên HTML, select trong Settings).
- [x] Nút "Copy/Paste" hỗ trợ mobile trong terminal (navigator.clipboard).
- [x] Hiển thị cảnh báo trên UI khi cấu hình kém an toàn (sessionSecret mặc định, host công khai).
- [x] Script cài đặt macOS launchd (install-service-macos.sh / uninstall-service-macos.sh) — untested.

## Đã hoàn thành (v1.2.0)
- [x] Cấu hình bảng mã (encoding) terminal, transcode iconv-lite (xử lý đa byte).
- [x] Đa ngôn ngữ Anh/Việt (mặc định EN), đổi trong Settings — xem docs/I18N.md.
- [x] Sửa cuộn terminal qua tmux copy-mode (endpoint /scroll).
- [x] Sửa ghi lastAccess (content-type parser body rỗng + keepalive).
- [x] README song ngữ (VI + EN) + phần giới thiệu dự án + roadmap đa nền tảng.

## Đã hoàn thành (v1.1.0)
- [x] Đổi cổng mặc định 7070 → 7171, cho phép cấu hình cổng.
- [x] Giao diện Settings (mật khẩu, auth, port/host, font, rate-limit).
- [x] Kéo-thả sắp xếp phiên (lưu server-side).
- [x] Thanh nút điều khiển terminal (cuộn, Enter, ESC, Ctrl+C, Tab, mũi tên).
- [x] Đổi tên + ghi chú + lần truy cập cuối cho phiên.
- [x] Version number + CHANGELOG.md.
- [x] Hash mật khẩu (scrypt), rate-limit, CSRF, auto-reconnect.
- [x] Bộ tài liệu docs/.

## Ưu tiên cao
- [ ] Bản macOS cần kiểm thử thực tế (hiện untested).

## Ưu tiên trung bình
- [ ] **Thêm tiếng Trung giản thể (zh-CN)** làm ngôn ngữ giao diện thứ ba (xem [I18N.md](./I18N.md)).

## Ưu tiên thấp / cân nhắc
- [ ] Phân quyền nhiều người dùng (hiện chỉ một mật khẩu chung).
