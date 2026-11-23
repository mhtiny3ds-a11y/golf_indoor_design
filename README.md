# golf_indoor_design — GolfCons Sim Builder

Thiết kế Golf mô phỏng: trình lập kế hoạch phòng golf 3D tiếng Việt, xây theo bộ đặc tả trong `docs/` và dữ liệu trong `data/`.

## Lệnh

```bash
npm install
npm run dev      # chạy thử tại http://localhost:5173
npm test         # 30 ca kiểm thử nghiệm thu (spec-tests/acceptance-cases.md → tests/acceptance.test.ts)
npm run build    # bản production vào dist/
SINGLEFILE=1 npx vite build   # một file index.html tự chứa (dễ nhúng/chia sẻ)
```

## Đưa lên web

`npm run build` tạo thư mục `dist/` gồm trang tĩnh (đường dẫn tương đối, `base: './'`), đưa lên bất kỳ hosting tĩnh nào:
GitHub Pages, Netlify, Vercel, Cloudflare Pages hoặc thư mục con trên website hiện có.
Muốn một file duy nhất để nhúng: `SINGLEFILE=1 npx vite build` → `dist/index.html`.

### GitHub Pages

Repo có sẵn workflow `.github/workflows/deploy-pages.yml`: mỗi lần đẩy lên `main`, GitHub tự chạy test, build và đăng `dist/`.
Bật một lần: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
Đừng chọn "Deploy from a branch": khi đó GitHub đăng `index.html` gốc (trỏ tới `src/main.ts`), trang hiện chữ trơn, không có giao diện và 3D.

## Mô hình 3D thực tế (.glb)

Đặt file gốc vào `models-src/` theo đúng tên trong `docs/danh-sach-mo-hinh-3d.xlsx` (ví dụ `models-src/people/golfer.glb`).
`npm run dev` / `npm run build` tự chạy `npm run models` để chuẩn hoá (đổi vật liệu specular-glossiness sang metal-roughness, gộp node)
và ghi ra `public/models/` (không commit). Vật nào chưa có file thì app dùng khối hình thay thế.

Đã có: golfer (tư thế lên gậy, tĩnh — chưa có animation swing).

## Cấu trúc

```
src/engine/   hàm thuần, không DOM: units, rules (hằng số [C]/[S]), data, state,
              solve.ts (solve(state) → Plan), checks.ts (checks(plan) → Check[]),
              summary.ts (bảng thông số, danh sách thiết bị, tóm tắt), share.ts (#b=… nén lz-string)
src/scene/    three.js: cảnh, 4 góc nhìn, nhãn đo HTML, kéo-thả tee, animation swing, xuất ảnh
src/ui/       cột trái (8 mục), cột phải (kết luận, kiểm tra, thiết bị), helper form
data/ config/ dữ liệu thiết bị và cấu hình thương hiệu/đối tác (partners.json)
```

## Ghi chú triển khai

- Đơn vị nội bộ feet; hiển thị mặc định mét, có công tắc ft-in.
- Hằng số suy luận [S] nằm trong `src/engine/rules.ts`. Hai hằng số thêm so với spec:
  `swingPeakBack` và `swingLatDrop` (đỉnh swing nằm trên vai golfer, không trên đường bóng) để khớp ca C2.
- `data/presets.json`: thêm `"zoom": 0` cho "Phòng mẫu tham chiếu" (spec ghi "zoom≈0").
- Chọn máy chiếu tự động ưu tiên: không fail/warn → không keystone → offset thấp → 4K → thứ tự dữ liệu.
- Danh sách thảm Carl's / Fiberbuilt và xe phổ biến VN chưa có số liệu (spec để TODO).
- Form tư vấn POST tới `config/partners.json > leadEndpoint`; để trống thì hiện nội dung để sao chép.
- Chưa làm: AR "Xem trong phòng bạn", trang nội dung SEO (giai đoạn 10).
