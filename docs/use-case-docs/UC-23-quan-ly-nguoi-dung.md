# UC-23: Quản lý người dùng

| Trường | Nội dung |
| --- | --- |
| **Mã Use Case** | UC-23 |
| **Tên Use Case** | Quản lý người dùng |
| **Tác nhân** | Quản trị viên |
| **Mô tả** | Cho phép quản trị viên xem danh sách người dùng và thay đổi vai trò của họ trong hệ thống. |
| **Tiền điều kiện** | - Quản trị viên đã đăng nhập vào hệ thống với vai trò admin.<br><br>- Quản trị viên đang ở trang quản lý người dùng.<br><br>- Hệ thống đang hoạt động bình thường. |
| **Hậu điều kiện** | - Danh sách người dùng được hiển thị đầy đủ.<br><br>- Các thay đổi vai trò (nếu có) được lưu vào hệ thống.<br><br>- Người dùng bị ảnh hưởng có quyền hạn mới tương ứng với vai trò mới. |
| **Luồng sự kiện chính** | 1. Quản trị viên truy cập trang quản lý người dùng.<br><br>2. Hệ thống xác thực quyền quản trị viên.<br><br>3. Hệ thống hiển thị danh sách tất cả người dùng trong hệ thống, bao gồm email, vai trò hiện tại và thời gian tham gia.<br><br>4. Quản trị viên chọn một người dùng cần thay đổi vai trò.<br><br>5. Hệ thống hiển thị các tùy chọn thay đổi vai trò.<br><br>6. Quản trị viên chọn vai trò mới cho người dùng (nâng cấp lên quản trị viên hoặc hạ xuống người dùng thường).<br><br>7. Hệ thống cập nhật vai trò của người dùng.<br><br>8. Hệ thống hiển thị thông báo thành công và cập nhật danh sách người dùng. |
| **Luồng thay thế** | **2a. Người dùng không có quyền quản trị:**<br>   1. Hệ thống chuyển hướng đến trang đăng nhập quản trị.<br>   2. Use Case kết thúc.<br><br>**3a. Không có người dùng nào trong hệ thống:**<br>   1. Hệ thống hiển thị thông báo danh sách trống.<br>   2. Use Case kết thúc.<br><br>**4a. Quản trị viên chỉ xem danh sách mà không thay đổi vai trò:**<br>   1. Quản trị viên rời khỏi trang.<br>   2. Use Case kết thúc.<br><br>**7a. Lỗi kết nối hoặc cập nhật thất bại:**<br>   1. Hệ thống hiển thị thông báo lỗi.<br>   2. Hệ thống hoàn tác thay đổi vai trò về trạng thái trước.<br>   3. Quay lại bước 4 của Luồng chính. |
