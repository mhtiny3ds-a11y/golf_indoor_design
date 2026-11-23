# 06 — Hiển thị 3D (three.js)

App gốc dùng three.js r128 trên 1 canvas. Bản VN dùng three.js mới (r150+), OrbitControls.

## Cảnh
- **Phòng**: hộp mở (sàn + 3–4 tường + trần) vật liệu xám đen mờ (#1e2622), viền cạnh mảnh. Tường bị tắt → không vẽ. Camera 3D mặc định nhìn từ sau-trên golfer về màn, tường gần camera ẩn (clip) để nhìn xuyên.
- **Enclosure**: khung ống (pipe) + vách lưới đen hai bên + trần lưới; mặt chiếu trắng/hình sân golf (ảnh tự tạo hoặc gradient, KHÔNG dùng ảnh của GSV). Carl's Pro sâu 10/15 có thanh ngang.
- **Màn gắn tường**: mặt phẳng + viền đệm (lưới ô vuông 3×3 / 2×2 ft) hoặc rèm (vân sóng).
- **Hình chiếu**: texture sân golf vẽ trong khung tỉ lệ màn, có HUD giả (ô số liệu), **đường ngắm thẳng từ tee**; vùng tối nếu máy chiếu không vươn tới mép.
- **Máy chiếu**: hộp bo góc theo `dim`, ống thả từ trần, **chóp tia sáng** (frustum mờ xanh nhạt) từ thấu kính tới 4 góc ảnh.
- **Launch monitor**: hộp theo `dim` ở đúng vị trí (trần / cạnh / sau bóng), tia xanh lá chỉ vùng quét.
- **Thảm**: hộp mỏng xanh đậm, dải đánh sáng hơn; **vùng đánh** = khung vàng; **tee** = chấm trắng.
- **Cỏ**: mặt phẳng xanh cỏ theo kích thước cắt; đường nối nét đứt.
- **Golfer**: mô hình người low-poly tự làm (hoặc capsule ghép), cao theo G, đứng đúng phía theo tay thuận; nút phát animation swing chậm. Đường bao swing: vòng tròn nét đứt mờ (side view) / cung (top view).
- **Vật treo**: dầm/ống/soffit theo kích thước; cửa gara + ray + motor; màn cuộn.
- **PC/màn cảm ứng/ghế, ô tô** (hộp bo góc + bánh xe đơn giản theo L×W×H).
- **Nhãn đo** (CSS2DRenderer hoặc HTML overlay): chữ monospace trên nền đen, kích thước theo đơn vị đang chọn; kèm đường kích thước mảnh (xanh chanh) cho: tee→màn, tee→tường sau, rộng/sâu/cao phòng, vùng đánh, độ thả máy chiếu.

## 4 góc nhìn
| Tab | Camera |
|---|---|
| 3D | PerspectiveCamera, OrbitControls (giới hạn không chui dưới sàn) |
| Trên | OrthographicCamera nhìn thẳng xuống, che trần |
| Cạnh | Ortho nhìn từ tường bên, che tường gần; hiện vòng swing, tia máy chiếu |
| Trước | Ortho nhìn từ phía sau về màn |
Nút: + / − zoom, ↺ đặt lại camera, 📷 xuất PNG (renderer.preserveDrawingBuffer hoặc render-to-target) có chú thích thương hiệu riêng.

## Tương tác "Tự di chuyển"
- Bật chế độ: kéo thảm/tee (raycast mặt sàn, snap 1 in), kéo enclosure ngang, kéo máy chiếu (theo trục x, z). Khi thả → cập nhật state (`auto=false`) → solve lại.
- Hoàn tác: stack state (≥ 20 bước).

## Hiệu năng
- Chỉ dựng lại các nhóm mesh thay đổi (so sánh hash plan theo nhóm). Mục tiêu 60 fps desktop, 30 fps điện thoại.
- Danh sách "mọi enclosure/LM/máy chiếu vừa không" chạy solve thuần (không render) — dùng `requestIdleCallback`/web worker nếu > 16 ms.
