# UC-09: Ghim ghi chú

| Trường | Nội dung |
| --- | --- |
| **Mã Use Case** | UC-09 |
| **Tên Use Case** | Ghim ghi chú |
| **Tác nhân** | Người dùng |
| **Mô tả** | Cho phép người dùng ghim hoặc bỏ ghim ghi chú để ưu tiên hiển thị các ghi chú quan trọng ở đầu danh sách. |
| **Tiền điều kiện** | - Người dùng đã đăng nhập vào hệ thống.<br><br>- Ghi chú cần ghim/bỏ ghim đã tồn tại trong hệ thống.<br><br>- Người dùng đang xem ghi chú cần thao tác. |
| **Hậu điều kiện** | - Trạng thái ghim của ghi chú được cập nhật trong hệ thống.<br><br>- Ghi chú được ghim hiển thị trong phần "Đã ghim" ở đầu danh sách.<br><br>- Ghi chú bỏ ghim được chuyển về phần danh sách ghi chú thông thường.<br><br>- Thông báo xác nhận thành công được hiển thị. |
| **Luồng sự kiện chính** | 1. Người dùng mở menu thao tác của ghi chú.<br><br>2. Hệ thống hiển thị các tùy chọn thao tác với ghi chú.<br><br>3. Người dùng chọn "Ghim ghi chú".<br><br>4. Hệ thống cập nhật trạng thái ghim của ghi chú.<br><br>5. Hệ thống chuyển ghi chú vào phần "Đã ghim" ở đầu danh sách.<br><br>6. Hệ thống hiển thị thông báo "Đã ghim ghi chú". |
| **Luồng thay thế** | **3a. Ghi chú đã được ghim, người dùng chọn bỏ ghim:**<br>   1. Người dùng chọn "Bỏ ghim ghi chú".<br>   2. Hệ thống cập nhật trạng thái bỏ ghim của ghi chú.<br>   3. Hệ thống chuyển ghi chú về phần danh sách ghi chú thông thường.<br>   4. Hệ thống hiển thị thông báo "Đã bỏ ghim ghi chú".<br>   5. Use Case kết thúc.<br><br>**4a. Lỗi cập nhật trạng thái ghim:**<br>   1. Hệ thống hiển thị thông báo lỗi.<br>   2. Trạng thái ghim của ghi chú không thay đổi.<br>   3. Use Case kết thúc. |
