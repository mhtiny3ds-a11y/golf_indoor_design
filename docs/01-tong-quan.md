# 01 — Tổng quan sản phẩm

## 1. Sản phẩm là gì
Một **trình lập kế hoạch phòng golf 3D miễn phí, chạy trên trình duyệt, không cần tài khoản**. Người dùng nhập:
- Kích thước phòng: rộng, sâu, cao trần (+ tường nào có/không có, vật treo trần, cửa gara…)
- Golfer: chiều cao người cao nhất, tay thuận (phải / trái / cả hai)
- Lựa chọn thiết bị (hoặc để app tự chọn "phù hợp nhất")

App sẽ:
1. Chọn **màn hình lớn nhất vừa phòng** (enclosure hoặc màn gắn tường), đặt khoảng cách tee→màn, **dời tee lệch tâm** khi phòng hẹp.
2. Đặt **launch monitor** theo thông số hãng (trên trần / sau bóng / cạnh bóng).
3. Tính **vị trí treo máy chiếu** (throw ratio, offset, lens shift, keystone), kiểm tra tia sáng không bị che, gậy không chạm máy chiếu.
4. Bố trí **thảm, cỏ, PC, màn cảm ứng, ghế ngồi**, ô tô trong gara.
5. Chạy **bộ kiểm tra (fit checks)**: mỗi mục có trạng thái Vừa / Ghi chú / Chật (cảnh báo) / Không vừa, kèm giải thích bằng câu tự nhiên.
6. Hiển thị **3D tương tác** (3D / Trên xuống / Cạnh / Trước) với nhãn kích thước, người golfer mô phỏng swing.
7. Xuất **danh sách thiết bị (build list)**, chia sẻ link, gửi yêu cầu tư vấn.

## 2. Người dùng mục tiêu (bản VN)
- Chủ nhà, chủ quán/CLB muốn làm phòng golf 3D trong nhà, tầng hầm, gara, phòng VIP.
- Đội ngũ tư vấn/thi công (GolfCons) dùng để chốt phương án nhanh với khách.

## 3. Khác biệt cần có ở bản tiếng Việt
| Hạng mục | Bản gốc | Bản VN |
|---|---|---|
| Ngôn ngữ | Tiếng Anh | Tiếng Việt toàn bộ |
| Đơn vị mặc định | ft-in (có tuỳ chọn mét) | **mét** (có tuỳ chọn ft-in) |
| Preset phòng | Basement, Garage bay, Bonus room, Big room, GSV Studio | Đổi tên VN + thêm preset phổ biến ở VN (xem `data/presets.json`) |
| Gara + ô tô | Xe Mỹ (F-150, Tahoe…) | Giữ danh sách + thêm xe phổ biến VN (cần bổ sung số liệu, mục `cars.json > vn_todo`) |
| Mua hàng | Link affiliate + mã giảm giá GSV | `config/partners.json` – link/nhà phân phối của GolfCons, có thể để trống |
| Tư vấn | Gửi cho "Jay" | Form gửi về GolfCons (email/Zalo/điện thoại) |
| Thương hiệu | GSV | **GolfCons Sim Builder** (cấu hình được) |
| Tiền tệ | USD | VNĐ (tuỳ chọn), giá có thể để trống |

## 4. Ngoài phạm vi MVP
- AR thực tế (bản gốc có "See it in your room" dùng model-viewer/USDZ) → giai đoạn sau.
- Backend lưu share link ngắn → MVP dùng URL hash.
- Mô hình golfer có xương (rig) phức tạp → MVP dùng hình người đơn giản + cung swing.

## 5. Tuyên bố an toàn (hiển thị ở chân trang)
"Kết quả chỉ là ước tính, không phải cam kết. Luôn thử khoảng trống bằng các cú swing chậm với gậy dài nhất trước khi đánh hết lực:
kiểm tra trần, tường, đèn, launch monitor, máy chiếu và người đứng gần."
