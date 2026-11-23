# 04 — Bộ kiểm tra (Fit checks)

## Cấu trúc
```ts
type CheckStatus = 'ok' | 'note' | 'warn' | 'fail';
type CheckGroup  = 'room' | 'enc' | 'lm' | 'proj' | 'turf' | 'pc' | 'car' | 'obs';
interface Check {
  g: CheckGroup;          // nhóm
  title: string;          // tiêu đề ngắn
  st: CheckStatus;
  text: string;           // câu giải thích đầy đủ, có số đo đã format theo đơn vị
  estimate?: boolean;     // hiện nhãn "ƯỚC TÍNH"
  fix?: string;           // gợi ý khắc phục khi warn/fail
}
```
(Cấu trúc `{g, title, st, text}` khớp với dữ liệu runtime của app gốc.)

Hiển thị: thẻ cho mọi check `note|warn|fail` (xếp fail → warn → note), rồi gập "N mục vừa. Xem chi tiết" chứa các check `ok`.
Huy hiệu: ok = "Vừa" (xanh) · note = "Ghi chú" (xám, icon i) · warn = "Chật" (vàng) · fail = "Không vừa" (đỏ).

## Danh sách check & mẫu câu (tiếng Việt)
Ví dụ dùng cấu hình mặc định (phòng 14×18×10 ft, SIG12, EYE XO2, AK700ST). `{}` = biến đã format.

| # | Nhóm | Tiêu đề | Mẫu câu |
|---|---|---|---|
| 1 | room | Trần phía trên cú swing | "Cú swing driver của golfer cao {G} lên tới khoảng {swingTop}. Còn {headroom} khoảng trống ở điểm thấp nhất." (warn thêm: "Hãy thử swing chậm trước.") |
| 2 | room | Khoảng swing hai bên | "{back} từ bóng tới tường sau lưng golfer, và {face} từ bóng tới tường phía golfer nhìn. Khuyến nghị cho cú driver đầy đủ là {7k} phía lưng." |
| 3 | room | Khoảng sau tee | "{d} từ tee tới tường sau. Khuyến nghị {7k} để không chạm driver." |
| 4 | room | Tee tới màn | "{d} từ tee tới màn. 8 ft (2,44 m) là tối thiểu, 10 ft (3,05 m) là lý tưởng và 12 ft (3,66 m) là xa nhất nên đánh, vì bóng nảy ngược và kích thước hình." |
| 5 | proj | Máy tính cho máy chiếu | "{PC}: {mô tả}. Khớp với máy chiếu {res} {proj}. Chỉ mang tính tham khảo: đội tư vấn sẽ xác nhận máy tính cho toàn bộ hệ thống." |
| 6 | turf | Cỏ (note, ước tính) | "Cỏ từ màn tới {3 ft} quá thảm: {w × l}. Cuộn rộng tối đa 15 ft (4,57 m), cắt theo chiều dài. Một tấm, trải từ màn về, không có đường nối. Cỏ tính dày 1/2 in." |
| 7 | enc | {Enclosure}: chiều rộng | "Rộng {w}. Dư {l} bên trái, {r} bên phải." |
| 8 | enc | {Enclosure}: chiều cao | "Cao {h} dưới trần {H}. Dư {spare}." |
| 9 | lm | {LM}: độ cao lắp | "{Hãng}: cảm biến cách sàn {hMin}–{hMax}, {fwd} trước tee, {flight} từ tee tới màn. Trần tại đó là {y}." |
| 10 | lm | {LM}: đường bay bóng | "{d} từ tee tới màn. Hãng yêu cầu {minFlight}. {flightNote}" |
| 11 | proj | {Máy chiếu}: vị trí | "Cách màn {throw} (zoom {z}%), thấu kính cao {lensY}, ống thả {drop}." |
| 12 | proj | {Máy chiếu}: tia sáng | "Ánh sáng đi qua dưới thanh trên enclosure ({gap}), dưới {LM} ({gap2})." / fail: "{vật} che một phần hình." |
| 13 | proj | {Máy chiếu}: gậy | "Gậy cách máy chiếu {c} ở điểm gần nhất (cần ≥ 6 in)." |
| 14 | proj | {Máy chiếu}: hình ảnh | "Ảnh gốc 16:9 {w×h} ({diag} in), Screen Fill đặt {ratio} để vừa màn." / "Lệch {θ}° — dùng keystone, mất một chút nét và độ sáng." |
| 15 | obs | {Vật}: swing / tia sáng | "Đáy {vật} cao {y}; đỉnh swing {top} → {còn/thiếu} {gap}." |
| 16 | pc | Vị trí máy tính | "Đặt ở {tường}, cách bóng {d} phía golfer nhìn, ngoài vùng swing." |
| 17 | car | Qua cửa / Trước-sau / Xuống xe / Nóc xe / Swing | theo §10 tài liệu 03 |
| 18 | enc | Phòng tối thiểu của SimBooth | "GolfIn yêu cầu phòng tối thiểu {w×d×h}." |

## Diễn giải ngắn (dưới bảng thông số)
Sinh 1–3 câu: vị trí tee ("Tee ở giữa phòng: {7 ft} mỗi bên bóng. Thảm rộng gấp đôi nên người tay trái dùng chung tee."), lý do chọn enclosure ("SIG12 là enclosure SIG lớn nhất vừa chiều rộng và trần.").

## Văn phong
- Câu ngắn, chủ động, có số đo cụ thể, không dùng "có thể có vấn đề" chung chung.
- Mỗi warn/fail nói **đo cái gì bị thiếu** và **cách sửa** (đổi thiết bị, dời tee, bỏ thảm chìm, hạ máy chiếu…).
- Số đo theo đơn vị đang chọn: mét → "2,13 m"; imperial → "7 ft 0 in".
