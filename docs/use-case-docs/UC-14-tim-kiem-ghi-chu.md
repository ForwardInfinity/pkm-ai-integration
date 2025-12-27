# UC-14: Tìm kiếm ghi chú

| Trường | Nội dung |
| --- | --- |
| **Mã Use Case** | UC-14 |
| **Tên Use Case** | Tìm kiếm ghi chú |
| **Tác nhân** | Người dùng, Dịch vụ AI |
| **Mô tả** | Cho phép người dùng tìm kiếm ghi chú trong hệ thống bằng cách kết hợp tìm kiếm từ khóa và tìm kiếm ngữ nghĩa để trả về kết quả phù hợp nhất với nội dung truy vấn. |
| **Tiền điều kiện** | - Người dùng đã đăng nhập vào hệ thống.<br><br>- Người dùng đang ở trang quản lý ghi chú.<br><br>- Hệ thống có ít nhất một ghi chú được lưu trữ. |
| **Hậu điều kiện** | - Kết quả tìm kiếm phù hợp được hiển thị cho người dùng.<br><br>- Các từ khóa trùng khớp được đánh dấu nổi bật trong kết quả.<br><br>- Người dùng có thể truy cập trực tiếp ghi chú từ kết quả tìm kiếm. |
| **Luồng sự kiện chính** | 1. Người dùng chọn chức năng tìm kiếm ghi chú.<br><br>2. Hệ thống hiển thị giao diện tìm kiếm.<br><br>3. Người dùng nhập nội dung cần tìm kiếm.<br><br>4. Hệ thống gửi nội dung tìm kiếm đến Dịch vụ AI để phân tích ngữ nghĩa.<br><br>5. Dịch vụ AI xử lý và trả về kết quả phân tích ngữ nghĩa.<br><br>6. Hệ thống kết hợp kết quả tìm kiếm từ khóa và tìm kiếm ngữ nghĩa.<br><br>7. Hệ thống sắp xếp kết quả theo mức độ phù hợp và hiển thị danh sách ghi chú tìm được.<br><br>8. Người dùng chọn ghi chú cần xem từ danh sách kết quả.<br><br>9. Hệ thống mở ghi chú được chọn. |
| **Luồng thay thế** | **3a. Nội dung tìm kiếm quá ngắn:**<br>   1. Hệ thống yêu cầu người dùng nhập ít nhất 2 ký tự.<br>   2. Quay lại bước 3 của Luồng chính.<br><br>**7a. Không tìm thấy ghi chú phù hợp:**<br>   1. Hệ thống hiển thị thông báo không tìm thấy kết quả.<br>   2. Người dùng có thể nhập nội dung tìm kiếm khác.<br>   3. Quay lại bước 3 của Luồng chính.<br><br>**5a. Dịch vụ AI không khả dụng:**<br>   1. Hệ thống thông báo lỗi kết nối.<br>   2. Use Case kết thúc.<br><br>**1a. Người dùng hủy tìm kiếm:**<br>   1. Người dùng đóng giao diện tìm kiếm.<br>   2. Hệ thống xóa nội dung tìm kiếm đã nhập.<br>   3. Use Case kết thúc.<br><br>**8a. Người dùng điều hướng kết quả bằng bàn phím:**<br>   1. Người dùng sử dụng phím mũi tên lên/xuống để chọn kết quả.<br>   2. Người dùng nhấn Enter để mở ghi chú được chọn.<br>   3. Tiếp tục từ bước 9 của Luồng chính. |
