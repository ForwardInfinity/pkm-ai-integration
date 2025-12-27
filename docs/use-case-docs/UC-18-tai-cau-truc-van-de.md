# UC-18: Tái cấu trúc vấn đề

| Trường | Nội dung |
| --- | --- |
| **Mã Use Case** | UC-18 |
| **Tên Use Case** | Tái cấu trúc vấn đề |
| **Tác nhân** | Người dùng, Dịch vụ AI |
| **Mô tả** | Cho phép người dùng yêu cầu AI phân tích nội dung ghi chú để suy luận và tạo ra câu phát biểu vấn đề ngắn gọn, giúp người dùng xác định rõ câu hỏi hoặc thách thức mà ghi chú đang giải quyết. |
| **Tiền điều kiện** | - Người dùng đã đăng nhập vào hệ thống.<br><br>- Ghi chú đang được xem trong trình soạn thảo.<br><br>- Ghi chú có tiêu đề hoặc nội dung để phân tích. |
| **Hậu điều kiện** | - Câu phát biểu vấn đề được lưu vào ghi chú (nếu người dùng chấp nhận).<br><br>- Ghi chú có mô tả vấn đề rõ ràng giúp tổ chức kiến thức tốt hơn. |
| **Luồng sự kiện chính** | 1. Người dùng yêu cầu tái cấu trúc vấn đề cho ghi chú.<br><br>2. Hệ thống gửi tiêu đề và nội dung ghi chú đến Dịch vụ AI.<br><br>3. Dịch vụ AI phân tích nội dung và tạo câu phát biểu vấn đề.<br><br>4. Hệ thống nhận kết quả từ Dịch vụ AI.<br><br>5. Hệ thống hiển thị câu phát biểu vấn đề được đề xuất.<br><br>6. Người dùng xem xét đề xuất.<br><br>7. Người dùng chấp nhận câu phát biểu vấn đề.<br><br>8. Hệ thống lưu câu phát biểu vấn đề vào ghi chú. |
| **Luồng thay thế** | **6a. Người dùng muốn xem các đề xuất khác:**<br>   1. Người dùng yêu cầu thử phương án khác.<br>   2. Hệ thống gửi yêu cầu tạo đề xuất thay thế đến Dịch vụ AI.<br>   3. Dịch vụ AI tạo nhiều câu phát biểu vấn đề với các góc nhìn khác nhau.<br>   4. Hệ thống hiển thị danh sách các đề xuất thay thế.<br>   5. Người dùng chọn một đề xuất phù hợp.<br>   6. Tiếp tục từ bước 8 của Luồng chính.<br><br>**6b. Người dùng chỉnh sửa đề xuất:**<br>   1. Người dùng chỉnh sửa nội dung câu phát biểu vấn đề được đề xuất.<br>   2. Hệ thống ghi nhận phiên bản đã chỉnh sửa.<br>   3. Tiếp tục từ bước 7 của Luồng chính.<br><br>**7a. Người dùng từ chối đề xuất:**<br>   1. Người dùng bỏ qua đề xuất.<br>   2. Hệ thống hủy kết quả tái cấu trúc.<br>   3. Use Case kết thúc.<br><br>**3a. Dịch vụ AI không khả dụng:**<br>   1. Hệ thống thông báo lỗi kết nối dịch vụ AI.<br>   2. Hệ thống đề nghị người dùng thử lại sau.<br>   3. Use Case kết thúc.<br><br>**2a. Ghi chú không có nội dung:**<br>   1. Hệ thống thông báo cần có tiêu đề hoặc nội dung để tái cấu trúc vấn đề.<br>   2. Use Case kết thúc. |
