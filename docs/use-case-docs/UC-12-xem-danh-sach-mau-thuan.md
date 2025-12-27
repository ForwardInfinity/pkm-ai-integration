# UC-12: Xem danh sách mâu thuẫn

| Trường | Nội dung |
| --- | --- |
| **Mã Use Case** | UC-12 |
| **Tên Use Case** | Xem danh sách mâu thuẫn |
| **Tác nhân** | Người dùng |
| **Mô tả** | Cho phép người dùng xem danh sách các mâu thuẫn đã được hệ thống phát hiện giữa các ghi chú để nhận diện và giải quyết sự không nhất quán trong cơ sở kiến thức. |
| **Tiền điều kiện** | - Người dùng đã đăng nhập vào hệ thống.<br><br>- Hệ thống đã phát hiện và lưu trữ các mâu thuẫn (xem UC-11). |
| **Hậu điều kiện** | - Người dùng đã xem được danh sách các mâu thuẫn đang hoạt động.<br><br>- Người dùng có thể truy cập vào các ghi chú liên quan để xem chi tiết. |
| **Luồng sự kiện chính** | 1. Người dùng chọn mục "Mâu thuẫn" từ thanh điều hướng.<br><br>2. Hệ thống tải danh sách các mâu thuẫn đang hoạt động của người dùng.<br><br>3. Hệ thống hiển thị danh sách mâu thuẫn với các thông tin: tiêu đề hai ghi chú mâu thuẫn, mô tả giải thích, loại mâu thuẫn và thời gian phát hiện.<br><br>4. Người dùng xem thông tin chi tiết của từng mâu thuẫn trong danh sách.<br><br>5. Người dùng chọn một trong hai ghi chú liên quan để xem nội dung.<br><br>6. Hệ thống chuyển hướng đến trang chi tiết ghi chú được chọn. |
| **Luồng thay thế** | **3a. Không có mâu thuẫn nào được phát hiện:**<br>   1. Hệ thống hiển thị thông báo "Không có mâu thuẫn nào được phát hiện".<br>   2. Use Case kết thúc.<br><br>**2a. Lỗi kết nối hoặc tải dữ liệu:**<br>   1. Hệ thống hiển thị thông báo lỗi không thể tải danh sách mâu thuẫn.<br>   2. Hệ thống đề nghị người dùng thử lại.<br>   3. Use Case kết thúc.<br><br>**4a. Người dùng bỏ qua mâu thuẫn:**<br>   1. Người dùng chọn bỏ qua mâu thuẫn đã xem xét.<br>   2. Hệ thống đánh dấu mâu thuẫn là đã bỏ qua.<br>   3. Hệ thống cập nhật danh sách, loại bỏ mâu thuẫn vừa bỏ qua.<br>   4. Tiếp tục từ bước 4 của Luồng chính với mâu thuẫn tiếp theo.<br><br>**5a. Ghi chú đã bị xóa:**<br>   1. Hệ thống không hiển thị mâu thuẫn liên quan đến ghi chú đã xóa.<br>   2. Tiếp tục từ bước 4 của Luồng chính.<br><br>**1a. Người dùng xem mâu thuẫn từ bảng thông tin ghi chú:**<br>   1. Người dùng mở bảng thông tin chi tiết của một ghi chú cụ thể.<br>   2. Hệ thống hiển thị danh sách mâu thuẫn liên quan đến ghi chú đang xem.<br>   3. Người dùng chọn một mâu thuẫn để xem ghi chú đối lập.<br>   4. Hệ thống chuyển hướng đến ghi chú đối lập được chọn. |
