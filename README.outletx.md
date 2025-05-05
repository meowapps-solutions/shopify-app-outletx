# Mức độ bao phủ toàn diện của OutletX

Điểm mạnh của OutletX là **mức độ bao phủ toàn diện**, đáp ứng trên 90% các nhu cầu quản lý outlet cho merchant Shopify. Điều này đảm bảo merchant có thể tự tin triển khai mọi chiến lược giảm giá và quản lý hàng tồn kho, không bỏ sót bất kỳ tình huống nào.

OutletX mang lại sự khác biệt nhờ:

- **Xử lý mọi loại chiến dịch**: Từ đơn giản đến phức tạp, kết hợp nhiều điều kiện, giúp merchant linh hoạt triển khai các chương trình giảm giá khác nhau để tối ưu doanh số.
- **Kiểm soát giảm giá chính xác**:  Áp dụng giảm giá không chỉ cho sản phẩm mà còn đến từng biến thể cụ thể, đảm bảo giảm giá đúng mục tiêu, tối ưu hiệu quả từng dòng sản phẩm.
- **Theo dõi hiệu quả chiến dịch chi tiết**: Cung cấp đầy đủ thông tin về doanh thu, số lượng bán, so sánh hiệu quả giữa các chiến dịch, giúp merchant đưa ra quyết định dựa trên dữ liệu.
- **Hoạt động ổn định và đáng tin cậy**:  Xử lý tốt các trường hợp ngoại lệ như lỗi API, thay đổi cài đặt, đảm bảo ứng dụng luôn hoạt động trơn tru, không làm gián đoạn hoạt động kinh doanh của merchant.

Để đạt được mức độ bao phủ ấn tượng này, OutletX được trang bị một hệ thống **quy tắc giảm giá** linh hoạt (xem phần 'Rule'), khả năng **phân tích hiệu quả** chi tiết (xem phần 'Analytics'), và các biện pháp **xử lý lỗi** toàn diện (xem phần 'Negative case').


## Rule

- Merchant muốn sản phẩm được chuyển đến trang outlet nếu thỏa mãn ĐỒNG THỜI các điều kiện: (1) Tồn kho dưới 30%, (2) Ra mắt hơn 60 ngày, VÀ (3) Doanh số trong 30 ngày gần nhất dưới 5 sản phẩm.
- Merchant chỉ muốn giảm giá biến thể "Size L, Màu Đỏ" của một sản phẩm áo thun, vì biến thể này bán chậm.
- Merchant có một bộ sưu tập "Hàng Sắp Hết Hạn" và muốn tự động thêm sản phẩm vào outlet khi chúng được gắn thẻ "Clearance" VÀ thuộc bộ sưu tập này.
- Merchant muốn giảm giá sản phẩm nếu doanh số trung bình hàng ngày trong 7 ngày gần nhất thấp hơn doanh số trung bình hàng ngày của 30 ngày trước đó.
- Merchant muốn giảm giá tất cả sản phẩm trong bộ sưu tập "Mùa Hè", NGOẠI TRỪ những sản phẩm mới ra mắt trong vòng 14 ngày.
- Merchant có một collection "Best Seller", app phải có khả năng loại trừ không chạy bất kỳ rule nào đối với các sản phẩm nằm trong collection này.
- Merchant muốn tự động tạo các chương trình giảm giá riêng cho các dịp lễ Tết, Black Friday, Cyber Monday,... với các mức giảm giá khác nhau.
- Merchant chỉ muốn áp dụng quy tắc giảm giá cho các sản phẩm từ một nhà cung cấp cụ thể hoặc thuộc một loại sản phẩm nhất định (ví dụ: chỉ giảm giá giày dép, không giảm giá phụ kiện).
- Xử lý trường hợp sản phẩm hết hàng, và sau đó có hàng trở lại.

- Merchant muốn giảm 10% khi tồn kho còn 50%, giảm 20% khi còn 20%, và giảm 50% khi chỉ còn 5 sản phẩm.
- Merchant không muốn giảm giá sản phẩm xuống dưới 100.000 VNĐ, dù bất kỳ điều kiện nào xảy ra.
- (Ít liên quan trực tiếp đến outlet, nhưng có thể là một tính năng mở rộng) Merchant muốn giảm 10% cho đơn hàng trên 500.000 VNĐ, giảm 15% cho đơn hàng trên 1.000.000 VNĐ.
- Merchant muốn giảm giá sản phẩm thêm 5% vào mỗi thứ Sáu hàng tuần, trong suốt tháng khuyến mãi.
- Merchant có nhiều quy tắc giảm giá cùng áp dụng cho một sản phẩm. Cần có cơ chế ưu tiên (ví dụ: ưu tiên quy tắc giảm giá theo thẻ "Clearance" hơn quy tắc giảm giá theo tồn kho).
- Conflict rule. Nhiều rule được chạy cùng lúc, rule nào được ưu tiên.


## Analytics

- Merchant muốn biết sản phẩm nào trong outlet đóng góp nhiều nhất vào doanh thu, sản phẩm nào bán chậm để điều chỉnh chiến lược.
- Merchant muốn so sánh doanh thu từ chiến dịch "Giải Phóng Hàng Tồn" tháng 5 với chiến dịch "Xả Kho Cuối Năm" tháng 12.
- Merchant muốn xuất báo cáo doanh thu outlet hàng tuần, hàng tháng, hoặc theo một khoảng thời gian tùy chọn.
- (Nâng cao) Merchant muốn biết không chỉ doanh thu mà còn lợi nhuận thu được từ các sản phẩm outlet, sau khi trừ đi giá vốn.
- Tỉ lệ chuyển đổi của các sản phẩm được đưa vào outlet.


## Negative case

- Nếu Shopify API bị chậm hoặc không phản hồi, ứng dụng cần có cơ chế xử lý lỗi và thông báo cho merchant.
- Nếu merchant vô tình xóa bộ sưu tập "Outlet" mà ứng dụng đang sử dụng, ứng dụng cần xử lý như thế nào?
- Khi merchant gỡ cài đặt, ứng dụng cần xóa toàn bộ dữ liệu liên quan đến merchant đó để đảm bảo quyền riêng tư.
- Merchant set rule nhưng quên không tạo một collection tương ứng.
