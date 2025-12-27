# UC-19: Làm sạch ghi chú

| Trường | Nội dung |
| --- | --- |
| **Mã Use Case** | UC-19 |
| **Tên Use Case** | Làm sạch ghi chú |
| **Tác nhân** | Người dùng, Dịch vụ AI |
| **Mô tả** | Cho phép người dùng yêu cầu AI làm sạch và cải thiện định dạng ghi chú mà không thay đổi ý nghĩa hay nội dung cốt lõi của ghi chú. |
| **Tiền điều kiện** | - Người dùng đã đăng nhập vào hệ thống.<br><br>- Ghi chú cần làm sạch đã tồn tại và có nội dung.<br><br>- Người dùng đang xem ghi chú trong trình soạn thảo. |
| **Hậu điều kiện** | - Ghi chú được cập nhật với nội dung đã làm sạch (nếu người dùng chấp nhận).<br><br>- Ý nghĩa và nội dung cốt lõi của ghi chú được giữ nguyên.<br><br>- Hệ thống gửi yêu cầu tạo lại vector nhúng cho ghi chú. |
| **Luồng sự kiện chính** | 1. Người dùng yêu cầu làm sạch ghi chú.<br><br>2. Hệ thống gửi nội dung ghi chú đến Dịch vụ AI.<br><br>3. Dịch vụ AI phân tích và làm sạch nội dung ghi chú.<br><br>4. Hệ thống nhận kết quả làm sạch từ Dịch vụ AI.<br><br>5. Hệ thống hiển thị so sánh giữa bản gốc và bản đã làm sạch.<br><br>6. Người dùng xem xét các thay đổi được đề xuất.<br><br>7. Người dùng chấp nhận kết quả làm sạch.<br><br>8. Hệ thống cập nhật ghi chú với nội dung đã làm sạch.<br><br>9. Hệ thống lưu ghi chú và gửi yêu cầu tạo lại vector nhúng. |
| **Luồng thay thế** | **6a. Người dùng muốn xem so sánh chi tiết:**<br>   1. Người dùng chọn xem trước toàn bộ.<br>   2. Hệ thống hiển thị giao diện so sánh song song giữa bản gốc và bản làm sạch.<br>   3. Người dùng xem xét chi tiết các thay đổi.<br>   4. Tiếp tục từ bước 7 của Luồng chính.<br><br>**7a. Người dùng từ chối kết quả làm sạch:**<br>   1. Người dùng từ chối các thay đổi được đề xuất.<br>   2. Hệ thống hủy bỏ kết quả làm sạch.<br>   3. Hệ thống giữ nguyên nội dung gốc của ghi chú.<br>   4. Use Case kết thúc.<br><br>**3a. Dịch vụ AI không khả dụng:**<br>   1. Hệ thống thông báo lỗi kết nối dịch vụ AI.<br>   2. Hệ thống đề nghị người dùng thử lại sau.<br>   3. Use Case kết thúc.<br><br>**2a. Ghi chú quá dài:**<br>   1. Hệ thống thông báo ghi chú vượt quá giới hạn cho phép.<br>   2. Use Case kết thúc.<br><br>**3b. Dịch vụ AI quá tải:**<br>   1. Hệ thống thông báo dịch vụ đang bận.<br>   2. Hệ thống đề nghị người dùng thử lại sau giây lát.<br>   3. Use Case kết thúc. |
