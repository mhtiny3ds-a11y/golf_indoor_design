# 08 — Kế hoạch triển khai

## Kiến trúc thư mục
```
src/
  engine/            ← thuần TS, không DOM
    units.ts         ← ft↔m, format "2,13 m" / "7 ft 0 in"
    rules.ts         ← hằng số (doc 03), có thể override từ config/rules.json
    data.ts          ← nạp data/*.json, kiểu dữ liệu
    solve/
      room.ts  swing.ts  screen.ts  tee.ts  lm.ts  projector.ts  turf.ts  pc.ts  garage.ts
      index.ts       ← solve(state) → Plan
    checks.ts        ← checks(plan) → Check[]
    summary.ts       ← readout rows, text tóm tắt, build list
    share.ts         ← encode/decode URL
  scene/             ← three.js: buildScene(plan), views, labels, drag
  ui/                ← panel trái, readout phải, modal, i18n vi.ts
  main.ts
data/  config/partners.json  config/rules.json
tests/
```

## Giai đoạn
| # | Nội dung | Xong khi |
|---|---|---|
| 1 | Khung dự án, units, nạp data, state + localStorage, panel trái mục 1–2 | Đổi kích thước phòng/golfer lưu được |
| 2 | Engine: swing, khoảng trống, tee, enclosure (auto + per-brand), checks room/enc | Ca kiểm thử A1–A8 qua |
| 3 | Engine: LM 3 loại, danh sách "mọi LM vừa" | Ca B1–B6 qua |
| 4 | Engine: máy chiếu (throw, offset, lens shift, keystone, tia sáng, gậy), auto pick | Ca C1–C5 qua |
| 5 | Scene 3D + 4 góc nhìn + nhãn đo; readout phải; build list | So sánh trực quan với ảnh tham khảo |
| 6 | Màn gắn tường (lấp đầy/tự nhập/53 cỡ), viền, thảm/cỏ/sàn, recess | Ca D1–D4 |
| 7 | Vật treo, cửa gara, màn cuộn, ô tô | Ca E1–E4 |
| 8 | PC/màn cảm ứng/ghế, khớp PC | Ca F1–F2 |
| 9 | Tự di chuyển (kéo thả, slider, hoàn tác), chia sẻ, xuất ảnh, form tư vấn | Link chia sẻ mở lại đúng cấu hình |
| 10 | Mobile, hiệu năng, trang nội dung SEO tiếng Việt, (AR) | Lighthouse ≥ 85 mobile |

## Nguyên tắc
- Engine có test trước UI. Mọi hằng số đánh dấu [S] trong doc 03 phải đặt ở `rules.ts` để chỉnh sau khi thử nghiệm thực tế.
- Không chặn cấu hình "không vừa": luôn vẽ và giải thích.
- i18n: toàn bộ chuỗi trong `ui/i18n/vi.ts` (sẵn sàng thêm `en.ts`).
- Truy cập: nút có aria-label, tương phản ≥ 4.5:1, điều khiển bàn phím cho slider.
