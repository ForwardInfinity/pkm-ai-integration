# UC-16: Tự động hiển thị các ghi chú liên quan

| Trường | Nội dung |
| --- | --- |
| **Mã Use Case** | UC-16 |
| **Tên Use Case** | Tự động hiển thị các ghi chú liên quan |
| **Tác nhân** | Người dùng, Hệ thống |
| **Mô tả** | Hệ thống tự động tìm kiếm và hiển thị các ghi chú có nội dung liên quan về mặt ngữ nghĩa khi người dùng xem một ghi chú, giúp khám phá các kết nối kiến thức tiềm ẩn. |
| **Tiền điều kiện** | - Người dùng đã đăng nhập vào hệ thống.<br><br>- Ghi chú đang xem đã được lưu vào hệ thống.<br><br>- Ghi chú đã được hệ thống xử lý và sẵn sàng cho tìm kiếm ngữ nghĩa. |
| **Hậu điều kiện** | - Danh sách các ghi chú liên quan được hiển thị trong bảng thông tin.<br><br>- Người dùng có thể truy cập nhanh đến các ghi chú liên quan. |
| **Luồng sự kiện chính** | 1. Người dùng chọn xem một ghi chú.<br><br>2. Hệ thống hiển thị nội dung ghi chú trong trình soạn thảo.<br><br>3. Hệ thống tự động tìm kiếm các ghi chú có nội dung tương đồng về ngữ nghĩa.<br><br>4. Hệ thống hiển thị danh sách các ghi chú liên quan trong bảng thông tin bên phải, bao gồm tiêu đề và mô tả ngắn của từng ghi chú.<br><br>5. Người dùng chọn một ghi chú liên quan để xem chi tiết.<br><br>6. Hệ thống mở ghi chú được chọn trong tab mới. |
| **Luồng thay thế** | **3a. Ghi chú chưa được xử lý ngữ nghĩa:**<br>   1. Hệ thống hiển thị thông báo yêu cầu lưu ghi chú để tìm nội dung liên quan.<br>   2. Use Case kết thúc.<br><br>**4a. Không tìm thấy ghi chú liên quan:**<br>   1. Hệ thống hiển thị thông báo không có ghi chú liên quan.<br>   2. Use Case kết thúc.<br><br>**3b. Lỗi kết nối hoặc xử lý:**<br>   1. Hệ thống hiển thị thông báo lỗi tải ghi chú liên quan.<br>   2. Use Case kết thúc. |
