# UC-19: Khôi phục ghi chú

| Trường | Nội dung |
| --- | --- |
| **Mã Use Case** | UC-19 |
| **Tên Use Case** | Khôi phục ghi chú |
| **Tác nhân** | Người dùng |
| **Mô tả** | Cho phép người dùng khôi phục ghi chú đã xóa từ Thùng rác để đưa trở lại danh sách ghi chú hoạt động. |
| **Tiền điều kiện** | - Người dùng đã đăng nhập vào hệ thống.<br><br>- Ghi chú cần khôi phục đang nằm trong Thùng rác.<br><br>- Ghi chú chưa bị xóa vĩnh viễn (còn trong thời hạn 30 ngày lưu giữ). |
| **Hậu điều kiện** | - Ghi chú được khôi phục và xuất hiện lại trong danh sách ghi chú.<br><br>- Ghi chú không còn hiển thị trong Thùng rác.<br><br>- Người dùng có thể tiếp tục chỉnh sửa ghi chú bình thường. |
| **Luồng sự kiện chính** | 1. Người dùng truy cập trang Thùng rác.<br><br>2. Hệ thống hiển thị danh sách ghi chú đã xóa kèm thời gian còn lại trước khi bị xóa vĩnh viễn.<br><br>3. Người dùng chọn chức năng khôi phục ghi chú.<br><br>4. Hệ thống khôi phục ghi chú về danh sách ghi chú hoạt động.<br><br>5. Hệ thống cập nhật danh sách Thùng rác.<br><br>6. Hệ thống hiển thị thông báo khôi phục thành công. |
| **Luồng thay thế** | **1a. Người dùng khôi phục nhiều ghi chú cùng lúc:**<br>   1. Người dùng bật chế độ chọn nhiều ghi chú.<br>   2. Người dùng chọn các ghi chú cần khôi phục.<br>   3. Người dùng yêu cầu khôi phục các ghi chú đã chọn.<br>   4. Hệ thống khôi phục tất cả ghi chú đã chọn.<br>   5. Tiếp tục từ bước 5 của Luồng chính.<br><br>**2a. Thùng rác trống:**<br>   1. Hệ thống hiển thị thông báo Thùng rác không có ghi chú nào.<br>   2. Use Case kết thúc.<br><br>**4a. Lỗi kết nối mạng:**<br>   1. Hệ thống thông báo lỗi không thể khôi phục ghi chú.<br>   2. Hệ thống hoàn tác các thay đổi trên giao diện.<br>   3. Use Case kết thúc.<br><br>**3a. Người dùng xem thông tin ghi chú trước khi khôi phục:**<br>   1. Người dùng xem tiêu đề và mô tả ngắn của ghi chú.<br>   2. Người dùng xem thời gian đã xóa và số ngày còn lại.<br>   3. Tiếp tục từ bước 3 của Luồng chính. |
