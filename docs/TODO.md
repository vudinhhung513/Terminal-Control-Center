# TODO

> Danh sách việc cần làm, phân theo độ ưu tiên. Cập nhật khi hoàn thành hoặc
> phát sinh việc mới. Việc đã xong chuyển vào CHANGELOG theo phiên bản.

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
- [ ] Test tích hợp cho routes (settings/meta/scroll) bằng `app.inject()` của Fastify.
- [ ] Nút "Copy/Paste" hỗ trợ mobile trong terminal.
- [ ] Hiển thị cảnh báo rõ ràng trên UI khi `sessionSecret` còn là giá trị mặc định.

## Ưu tiên trung bình
- [ ] Chọn shell khi tạo phiên (hiện chỉ dùng shell mặc định trong config).
- [ ] Theme sáng/tối tuỳ chọn (hiện chỉ dark).
- [ ] Xuất/nhập cấu hình (backup config + metadata).
- [ ] Bản cho macOS (kiểm thử node-pty + launchd) và Windows (WSL2/ConPTY).

## Ưu tiên thấp / cân nhắc
- [ ] Hỗ trợ nhiều cửa sổ (tmux windows) trong một phiên trên UI.
- [ ] Phân quyền nhiều người dùng (hiện chỉ một mật khẩu chung).
- [ ] Ghi log audit thao tác (tạo/xoá/đổi tên phiên).
- [ ] Thêm ngôn ngữ giao diện thứ ba (theo quy ước docs/I18N.md).
