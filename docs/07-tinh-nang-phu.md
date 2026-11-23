# 07 — Tính năng phụ

## 1. Header
- **Toàn màn hình**: Fullscreen API trên khung app; điện thoại tự mở toàn màn hình.
- **Nhận báo giá + mã** → modal form tư vấn (xem 02 §5).
- **Chia sẻ** → tạo link `#b=...` + ảnh PNG cấu hình; nút sao chép link, tải ảnh, chia sẻ Zalo/Facebook (Web Share API trên mobile).
- **Làm lại** → xác nhận rồi về mặc định.

## 2. Danh sách thiết bị (Your build → "Thiết bị của bạn")
Mỗi thẻ: tên, 1 dòng lý do ("Phù hợp nhất cho phòng này", "Đã kiểm tra bởi đội ngũ"), giá tham khảo (nếu có trong config), nút [Sao chép mã giảm giá] (nếu có), [Xem] (link đối tác từ `config/partners.json`), [Hiện trong phòng] (focus camera vào vật).
Thẻ thứ hai cho enclosure hãng khác ("Phương án Carl's Place Pro 9×12").
**Sao chép tóm tắt**: văn bản thuần:
```
GolfCons Sim Builder — cấu hình
Phòng: 4,27 × 5,49 m, trần 3,05 m · Golfer 1,75 m, tay phải
Màn: SIG12, hình 3,48 × 2,62 m (4:3, 171")
Launch monitor: Uneekor EYE XO2 — trần, 1,07 m trước tee
Máy chiếu: BenQ AK700ST — cách màn 3,53 m, thấu kính cao 2,79 m
Thảm: SIGPRO Softy 4×10 · Cỏ: 3,71 × 4,57 m · PC: SG3-5702Ti
Kết luận: VỪA (11 vừa, 1 ghi chú)
Link: https://.../#b=...
```

## 3. Form tư vấn
Trường: Họ tên*, Email* hoặc Điện thoại*, Tỉnh/thành, nhu cầu (checkbox: Gói trọn bộ · Mã giảm giá · Kiểm tra bố cục · Giá lắp đặt · Máy tính trong gói), ghi chú.
Gửi: POST tới `config.leadEndpoint` (JSON: liên hệ + state + summary + ảnh base64). MVP: nếu không có endpoint → mở `mailto:` hoặc link Zalo với tóm tắt.
Thông báo xác nhận tiếng Việt. Không gửi gì khi chưa bấm Gửi.

## 4. AR "Xem trong phòng bạn" (giai đoạn sau)
Bản gốc: xuất GLB (GLTFExporter) + model-viewer + mã QR để mở trên điện thoại, đặt mô hình 1:1 lên sàn thật. Bản VN: làm sau MVP, tái dùng cùng cảnh 3D.

## 5. Phòng mẫu (Studio preset)
Bản gốc có preset "phòng của Jay" (15 × 18'8" × 9'10", màn gắn tường 12'8" × 8' 16:10 cách sàn 5 in, rèm 10 ft, AK700ST, thảm Super Softy 4×9 chìm, cỏ kín tường, tủ PC + màn 43" treo tường) — kết quả "Vừa, không cảnh báo".
Bản VN: tạo preset **"Phòng mẫu GolfCons"** với số liệu thật của một phòng GolfCons đã thi công (để trống/placeholder trong `data/presets.json` cho đến khi có số liệu); có thể giữ cấu hình trên làm "Phòng mẫu tham chiếu" để kiểm thử.

## 6. Trang nội dung kèm theo (tuỳ chọn)
Trang gốc có landing page dài giải thích quy tắc (kích thước phòng, trần, gara, LM, enclosure, máy chiếu, cỏ, PC, FAQ). Bản VN nên có trang tương tự **viết mới bằng tiếng Việt** (không dịch nguyên văn), lấy số liệu từ `data/` và quy tắc từ tài liệu 03, kèm FAQ. Tốt cho SEO "phòng golf 3D cần diện tích bao nhiêu".
