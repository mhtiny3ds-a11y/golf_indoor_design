# 02 — Giao diện (UI)

Tham khảo bố cục: `reference/screenshots/01..04` (chỉ tham khảo, KHÔNG sao chép logo/hình).

## 1. Bố cục tổng
```
┌──────────────────────────────────────────────────────────────────────────┐
│ Header: Logo + "SIM BUILDER · Lập kế hoạch phòng golf" | [Toàn màn hình]  │
│                             [Nhận báo giá + mã] [Chia sẻ] [Làm lại]        │
├──────────────┬───────────────────────────────────────┬────────────────────┤
│ CỘT TRÁI     │ KHUNG 3D (viewport)                   │ CỘT PHẢI (Readout) │
│ ~240px,cuộn  │ Tabs: [3D][Trên][Cạnh][Trước]         │ ~290px, cuộn       │
│ 8 mục cấu    │ [Tự di chuyển] [Xem trong phòng bạn]  │ Thẻ kết luận lớn   │
│ hình         │ Hộp tóm tắt góc phải: "Vừa"           │ Bảng thông số      │
│              │  "11 vừa · 1 ghi chú · 0 chật · 0 ko" │ Hộp tư vấn         │
│              │ Nút zoom +/−, xoay lại, chụp ảnh      │ Fit checks         │
│              │                                       │ Danh sách thiết bị │
└──────────────┴───────────────────────────────────────┴────────────────────┘
```
Màu: nền tối (#0f1a17 kiểu xanh rêu đen), điểm nhấn xanh chanh (#d8ef3a) cho nút chính/nhãn đo, chữ nhãn đo dạng
monospace nền đen viền nhẹ. Font tiêu đề condensed in hoa (ví dụ "Barlow Condensed"), thân chữ sans. Phải hỗ trợ dấu tiếng Việt.

Mobile (<900px): viewport lên trên, 2 cột chuyển thành tab/accordion bên dưới; "Toàn màn hình" mặc định trên điện thoại.

## 2. Cột trái — 8 mục cấu hình

### 1. Phòng của bạn
- **Preset** (lưới nút 2 cột, mỗi nút có tên + kích thước rộng×sâu×cao): Tầng hầm 13×18×9 ft, Gara 1 ô 12×20×9, Phòng thêm 14×18×10 (mặc định),
  Phòng lớn 16×22×10.5, Phòng mẫu (studio), Tuỳ chỉnh. Hiển thị bằng mét khi bật mét. Xem `data/presets.json`.
- **Rộng / Sâu / Trần**: ô số ft + ô số in (hoặc 1 ô mét khi bật mét).
- **Tường** (gập/mở, tóm tắt "đủ 4 phía"): nút bật/tắt [Trái] [Sau] [Phải] — "Bấm vào phía không có tường. Rèm và khung vẫn được kiểm tra."
- ☐ **Đơn vị mét (m, cm)**
- Select **"Thêm dầm, ống gió hoặc trần giật cấp"**: Dầm gỗ/ốp hộp · Dầm thép chữ I · Ống gió chữ nhật · Ống gió tròn · Trần giật cấp (soffit). Tối đa 6 vật (tính cả cửa gara). Mỗi vật: hướng (ngang phòng / dọc phòng), vị trí, rộng, cao/sâu thả xuống, nút xoá. Kích thước khởi tạo theo `data/obstacles.json`.
- **Tiện ích phòng** (gập, tóm tắt "Không"):
  - Ghế ngồi: [Thêm ghế] (dọc tường sau)
  - Máy tính: ( ) Không · ( ) Tủ PC + màn cảm ứng 27" · ( ) PC tower + kệ tường + màn 27" · ( ) Chân đứng có khay laptop + màn 32/43"
  - Phần mềm mô phỏng: Chưa chọn / GSPro / Trackman Virtual Golf / Foresight FSX Play / Foresight Premier / PurePlay
  - Máy tính nào: Tự khớp theo máy chiếu / SG3-5602 / SG3-5702 / SG3-5702Ti / SG3-5802 / Máy khác
  - Màn cảm ứng treo tường: Không / Một màn / Hai màn cạnh nhau / Hai màn chồng nhau; ☐ Giữ màn 27" trên bàn; ☐ Màn cạnh chân đứng, không ở trên; cỡ [32"] [43"]
  - Tường đặt: [Tường trái] [Tường phải]; slider "Vị trí giữa, tính từ tường màn" (1–30 ft)
- **Tủ và cửa** (gập): [Thêm tủ] [Thêm cửa ra vào] — vật chiếm chỗ trên tường, được kiểm tra va chạm swing.
- **Gara** (gập, tóm tắt "Tắt" cho đến khi dùng): [Thêm cửa gara] (tường, rộng, cao, ray, motor: ray trên trần / gắn bên hông, trạng thái đóng/mở),
  Màn cuộn: Không / G-TRAK (trên ray cửa gara) / Par2Pro Stealth (từ trần) / HomeCourse ProScreen 180 (từ trần) + chọn bề rộng;
  Đỗ xe: ( ) Không · ( ) Cạnh simulator, ô bên kia · ( ) Ở chỗ simulator, cất màn; Xe: [Kích thước tự nhập / danh sách];
  [Ô trái] [Ô phải]; [Sẵn sàng chơi] [Đang đỗ xe].

### 2. Golfer
- Chiều cao người cao nhất (ft + in / cm), mặc định 5'9" (175 cm).
- Tay thuận: [Phải] [Trái] [Cả hai].

### 3. Màn hình
- [Khung (enclosure)] [Màn gắn tường]
- Enclosure: select "Phù hợp nhất cho phòng này" + 15 mẫu (`data/enclosures.json`); với Carl's Pro: độ sâu [5][8][10][15 ft]; lưới mở rộng (Carl's) [6][8][10 ft];
  GolfIn: ☐ Vách lửng, ☐ Máy chiếu trên dầm GolfIn.
- Gập **"Mọi enclosure vừa phòng này thế nào"**: tóm tắt "10 vừa · 5 không vừa", danh sách nút mỗi mẫu có huy hiệu (Phù hợp nhất / GSV đã test → đổi thành "Đã thử nghiệm" nếu có / Vừa / Chật / Không vừa). Bấm để chọn.
  Ngay dưới: hiển thị song song **lựa chọn tốt nhất của mỗi hãng** (SIG và Carl's).
- Màn gắn tường: select kích thước: Lấp đầy tường / Tự nhập / 53 cỡ chuẩn (`data/screens.json`, nhãn dạng "8' x 13'10": hình 13'5" x 7'7"").
  ☐ Trong khung (không phủ tường-tới-tường) + bề rộng khung, lệch; [Căn giữa phòng];
  Hoàn thiện xung quanh: [Đệm mút] [Rèm] [Tường trơn], độ phủ [3][5][6][9][10][12 ft], cỡ đệm [3×3][2×2 ft], ☐ Ốp đệm cả trần;
  Cao mép dưới màn 0–24 in.

### 4. Launch monitor
- Select 30 mẫu (`data/launch-monitors.json`), gập "Mọi launch monitor vừa phòng này" với huy hiệu như trên.

### 5. Máy chiếu
- Select "Phù hợp nhất" + 20 mẫu (`data/projectors.json`), ☐ Máy chiếu đặt sàn, danh sách huy hiệu "14 vừa · 6 chật".

### 6. Thảm đánh
- Hãng: [SIGPRO] [Carl's] [Fiberbuilt]; mẫu (`data/mats.json`); lớp đệm; Bố cục: Tốt nhất cho phòng / Rộng gấp đôi, tee giữa / Một phía, tee lệch.

### 7. Cỏ (turf)
- Loại: [Cỏ đối tác] [Landing pad SIG] [Sàn SIGPRO]; Phạm vi: [3 ft quá thảm] [Dài bằng enclosure] [Kín tường] [Không cỏ];
  ☐ Đặt thảm chìm, bằng mặt cỏ.

### 8. Tự di chuyển (gập) — "Tee, enclosure và máy chiếu"
- Slider: Tee→màn (5–15 ft) · Tee lệch trái/phải so với tâm màn (−7…7) · Enclosure lệch so với tâm phòng (−6…6) · [Để app tự đặt]
- Slider: Khoảng cách máy chiếu (theo zoom 0–1) · Máy chiếu lệch trái/phải (± tuỳ lens shift/keystone) · Độ cao máy chiếu (theo lens shift 0–1)
- Khi người dùng đã kéo/thay đổi: banner "Bạn đã di chuyển. [Khôi phục bố cục tự động]" + [Hoàn tác].

## 3. Khung 3D
- Tabs góc nhìn [3D] [Trên] [Cạnh] [Trước]. Nút [Tự di chuyển] bật chế độ kéo thả tee/thảm; [Di chuyển tee].
- Hộp trạng thái góc trên phải: tiêu đề "Vừa" / "Vừa, có lưu ý" / "Chật" / "Không vừa" + dòng đếm.
- Nút nổi bên phải: phóng to, thu nhỏ, đặt lại camera, chụp ảnh/chia sẻ.
- Nhãn đo nổi (HTML overlay chiếu từ 3D): "10 ft 0 in tee tới màn", "7 ft 0 in tee tới tường sau", "Vùng 28 × 21 in", "BenQ AK700ST · thấu kính cách sàn 9 ft 2 in", "thả 10 in", tên enclosure, tên LM, kích thước phòng ở cạnh.

## 4. Cột phải — Readout
1. **Thẻ kết luận** (nền xanh nhạt nếu vừa, vàng nếu chật, đỏ nếu không vừa):
   "VỪA — Phòng 4,27 × 5,49 m, trần 3,05 m chứa được cấu hình này và đủ chỗ swing driver."
2. **Bảng thông số** (2 cột nhãn/giá trị, monospace): Màn hình · Hình chiếu · Tee tới màn · Vị trí tee · Thảm · Cỏ · Máy tính · Vùng đánh · Tee tới tường sau · [LM]: vị trí · [Máy chiếu]: cách màn · Thấu kính máy chiếu: cao + thả.
3. Đoạn diễn giải ngắn ("Tee ở giữa phòng: mỗi bên bóng 2,13 m… Enclosure SIG12 là mẫu lớn nhất vừa…").
4. **Hộp tư vấn miễn phí** + nút [Gửi cấu hình cho GolfCons] + link "Tự mua? Xem link cho cấu hình này".
5. **Fit checks**: thẻ cho mục có ghi chú/cảnh báo, sau đó gập "11 mục vừa. Xem chi tiết". Mỗi thẻ: tiêu đề, huy hiệu trạng thái, nội dung, nhãn nhỏ "ƯỚC TÍNH" nếu là ước tính.
6. **Thiết bị của bạn**: thẻ từng thiết bị (enclosure, phương án hãng khác, LM, máy chiếu, thảm, cỏ, PC) với [Sao chép mã] [Xem trong phòng]; nút "Chia sẻ ảnh cấu hình", "Sao chép tóm tắt".
7. **Hoàn tất**: Gửi cho GolfCons (báo giá trọn gói) · Tự mua (link) · Chia sẻ.

## 5. Modal "Nhận báo giá + mã"
Trường: Họ tên*, Email*, Điện thoại (tuỳ chọn), Tỉnh/thành (thay cho ZIP). Checkbox: Báo giá trọn gói · Mã giảm giá thiết bị · Kiểm tra bố cục · Giá lắp đặt · Máy tính trong gói. Ghi chú tự do. Gửi kèm state + ảnh chụp.
