# UC-17: Phê bình ghi chú

| Trường | Nội dung |
| --- | --- |
| **Mã Use Case** | UC-17 |
| **Tên Use Case** | Phê bình ghi chú |
| **Tác nhân** | Người dùng, Dịch vụ AI |
| **Mô tả** | Cho phép người dùng yêu cầu AI phân tích ghi chú theo phương pháp nhận thức luận phê phán (Popper/Deutsch) để đưa ra các nhận xét giúp củng cố và cải thiện chất lượng lập luận trong ghi chú. |
| **Tiền điều kiện** | - Người dùng đã đăng nhập vào hệ thống.<br><br>- Ghi chú cần phê bình đã được lưu và có nội dung đủ dài.<br><br>- Người dùng đang xem ghi chú trong trình soạn thảo. |
| **Hậu điều kiện** | - Kết quả phê bình được hiển thị theo các danh mục có tổ chức.<br><br>- Người dùng có thể xem xét các góp ý để cải thiện lập luận. |
| **Luồng sự kiện chính** | 1. Người dùng yêu cầu phê bình ghi chú.<br><br>2. Hệ thống gửi tiêu đề, vấn đề và nội dung ghi chú đến Dịch vụ AI.<br><br>3. Dịch vụ AI phân tích ghi chú và tạo nhận xét phê bình theo bốn danh mục: phản biện, điểm yếu trong lập luận, giả định ẩn và điểm mù.<br><br>4. Hệ thống nhận kết quả phê bình từ Dịch vụ AI.<br><br>5. Hệ thống hiển thị các nhận xét phê bình theo từng danh mục có thể thu gọn.<br><br>6. Người dùng xem xét các nhận xét trong từng danh mục.<br><br>7. Người dùng đóng kết quả phê bình khi đã xem xong. |
| **Luồng thay thế** | **5a. Không tìm thấy điểm cần phê bình:**<br>   1. Hệ thống thông báo ghi chú có lập luận tốt và không có điểm cần phê bình đáng kể.<br>   2. Người dùng đóng thông báo.<br>   3. Use Case kết thúc.<br><br>**2a. Ghi chú quá ngắn:**<br>   1. Hệ thống thông báo ghi chú cần có nội dung đủ dài để phê bình có ý nghĩa.<br>   2. Use Case kết thúc.<br><br>**2b. Ghi chú quá dài:**<br>   1. Hệ thống thông báo ghi chú vượt quá giới hạn cho phép.<br>   2. Use Case kết thúc.<br><br>**3a. Dịch vụ AI không khả dụng:**<br>   1. Hệ thống thông báo lỗi kết nối dịch vụ AI.<br>   2. Hệ thống đề nghị người dùng thử lại sau.<br>   3. Use Case kết thúc.<br><br>**3b. Vượt quá giới hạn tần suất:**<br>   1. Hệ thống thông báo đã vượt quá giới hạn số lần yêu cầu.<br>   2. Hệ thống đề nghị người dùng đợi và thử lại sau giây lát.<br>   3. Use Case kết thúc.<br><br>**3c. Hết hạn mức sử dụng dịch vụ:**<br>   1. Hệ thống thông báo đã hết hạn mức sử dụng dịch vụ AI.<br>   2. Hệ thống đề nghị người dùng thử lại sau.<br>   3. Use Case kết thúc. |
