# UC-15: Xem backlinks

| Trường | Nội dung |
| --- | --- |
| **Mã Use Case** | UC-15 |
| **Tên Use Case** | Xem backlinks |
| **Tác nhân** | Người dùng |
| **Mô tả** | Cho phép người dùng xem danh sách các ghi chú có liên kết đến ghi chú hiện tại để khám phá mối quan hệ và ngữ cảnh giữa các kiến thức đã ghi nhận. |
| **Tiền điều kiện** | - Người dùng đã đăng nhập vào hệ thống.<br><br>- Người dùng đang xem một ghi chú đã được lưu trong hệ thống. |
| **Hậu điều kiện** | - Danh sách backlinks được hiển thị cho người dùng.<br><br>- Người dùng có thể điều hướng đến các ghi chú liên kết. |
| **Luồng sự kiện chính** | 1. Người dùng mở một ghi chú từ danh sách.<br><br>2. Hệ thống hiển thị nội dung ghi chú trong trình soạn thảo.<br><br>3. Hệ thống tự động tải danh sách các ghi chú có liên kết đến ghi chú hiện tại.<br><br>4. Hệ thống hiển thị danh sách backlinks trong bảng thông tin bên phải.<br><br>5. Người dùng xem danh sách backlinks với tiêu đề và mô tả vấn đề của từng ghi chú. |
| **Luồng thay thế** | **3a. Ghi chú chưa được lưu:**<br>   1. Hệ thống hiển thị thông báo yêu cầu lưu ghi chú trước khi xem backlinks.<br>   2. Use Case kết thúc.<br><br>**4a. Không có ghi chú nào liên kết đến ghi chú hiện tại:**<br>   1. Hệ thống hiển thị thông báo không có ghi chú nào liên kết đến ghi chú này.<br>   2. Use Case kết thúc.<br><br>**5a. Người dùng chọn một backlink để xem chi tiết:**<br>   1. Người dùng nhấn vào một backlink trong danh sách.<br>   2. Hệ thống mở ghi chú nguồn trong trình soạn thảo.<br>   3. Hệ thống cập nhật danh sách backlinks cho ghi chú mới.<br>   4. Quay lại bước 5 của Luồng chính. |
