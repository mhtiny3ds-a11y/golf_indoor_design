# CLAUDE.md — GolfCons Sim Builder (tiếng Việt)

## Mục tiêu
Ứng dụng web 1 trang: người dùng nhập kích thước phòng → app tự bố trí màn hình/khung (enclosure), vị trí tee,
launch monitor, máy chiếu, thảm, cỏ, PC/màn cảm ứng, (gara + ô tô), hiển thị 3D và báo cái gì VỪA / CHẬT / KHÔNG VỪA,
rồi xuất danh sách thiết bị. Mọi đặc tả ở `docs/`, dữ liệu ở `data/`.

## Quy tắc bắt buộc
- Toàn bộ chữ trên UI bằng **tiếng Việt** (xem `docs/09-thuat-ngu.md`). Tên sản phẩm/hãng giữ nguyên tiếng Anh.
- **Đơn vị nội bộ: feet thập phân** (giống dữ liệu). Hiển thị mặc định **mét** (`m` 2 chữ số, hoặc `x,xx m`), có công tắc chuyển sang ft-in.
  Định dạng số kiểu Việt: dấu phẩy thập phân (`3,05 m`).
- Logic tính toán là **hàm thuần** trong `src/engine/` (không phụ thuộc DOM/three.js), có unit test.
  `solve(state, data) → plan`, `checks(plan) → Check[]`. Render 3D chỉ đọc `plan`.
- Không dùng logo, hình, văn bản, mã nguồn hay link affiliate của golfsimulatorvideos.com. Link mua hàng / mã giảm giá lấy từ `config/partners.json` (để trống được).
- Mọi con số "ước tính" phải được gắn nhãn "Ước tính" trên UI.
- Không chặn người dùng: cấu hình không vừa vẫn hiển thị, chỉ đánh dấu đỏ và giải thích.

## Stack đề xuất
Vite + TypeScript + three.js (r150+) + CSS thuần (hoặc Tailwind). Không cần backend cho MVP;
chia sẻ bằng state nén base64 trong URL hash. Test: Vitest.

## Lệnh
- `npm run dev` / `npm run build` / `npm test`

## Thứ tự làm việc
Theo `docs/08-ke-hoach-trien-khai.md`. Sau mỗi giai đoạn chạy `tests/acceptance-cases.md` (chuyển thành Vitest).
