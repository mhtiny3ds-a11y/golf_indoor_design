# 03 — Quy tắc hình học & công thức tính toán

Tài liệu quan trọng nhất. Mọi hằng số nên đặt trong `src/engine/rules.ts` (hoặc `config/rules.json`) để tinh chỉnh.
Ký hiệu độ tin cậy: **[C]** = công bố/đo trực tiếp từ app gốc, **[S]** = suy luận từ hành vi/hình ảnh (cần thử nghiệm lại).

## 0. Hệ toạ độ & đơn vị
- Đơn vị nội bộ **feet thập phân** (1 ft = 0,3048 m; 1 in = 1/12 ft). Quy đổi chỉ ở lớp hiển thị.
- Gốc toạ độ: góc trước-trái sàn phòng. `x` = ngang phòng (0 → W, trái → phải khi **nhìn về phía màn**),
  `z` = chiều sâu tính từ **tường màn** (0) về **tường sau** (D), `y` = chiều cao (0 = sàn gốc).
- Golfer thuận phải (R) đứng **bên trái** quả bóng, lưng quay về **tường trái**, mặt hướng **tường phải**. Golfer thuận trái ngược lại.
- `k = G / 5.75` — hệ số tỉ lệ theo chiều cao golfer (G tính bằng ft; 5'9" = 5.75 là chuẩn). **[C]** "mọi con số đều co giãn theo chiều cao golfer".

## 1. Mặt sàn hiệu dụng
- `matT` = độ dày thảm (mặc định 2,5 in = 0.2083 ft; SIGPRO flooring 2 3/8 in).
- `turfT` = 0,5 in **[C]**.
- Nếu bật **"Đặt thảm chìm, bằng mặt cỏ"** (recess): sàn được nâng bằng tấm gym/ván sàn để mặt cỏ = mặt thảm.
  `floorRaise = matT − turfT` (thảm 2,5 in → nâng 2 lớp 1 in) **[C]**. Khi đó màn, enclosure và **trần đều đo từ sàn đã nâng**:
  `Heff = H − floorRaise`.
- Mặt đứng của golfer (bề mặt đánh): `standY = matT` (không recess) hoặc `floorRaise + turfT` (recess) — cùng giá trị thực tế ≈ matT.

## 2. Swing của golfer (driver)
### 2.1 Đỉnh swing (trần)
`swingTop = 1.413 × G + standY` **[C khớp 2 mốc]**
- Kiểm chứng: G=5.75 → 8.125 + 0.208 = 8.333 ft (8'4") ✓; G=6.1667 (6'2") → 9.0 − 1in ✓.
- Ngưỡng: `headroom = trầnTạiĐiểmThấpNhấtTrênCungSwing − swingTop`
  - `headroom < 1 in` → **fail** (Không vừa)
  - `1 in ≤ headroom < 7 in` → **warn** (Chật)   (5'9": chật từ 8'5", thoáng từ 8'11" **[C]**)
  - `≥ 7 in` → **ok**
- "Trần tại điểm thấp nhất" = min(Heff, đáy mọi vật treo (dầm/ống/soffit/ray cửa gara/motor/màn cuộn) nằm trong hình chiếu bằng của đường bao swing).

### 2.2 Đường bao swing (để kiểm tra va chạm) **[S]**
Mô hình đơn giản hoá, đủ cho kiểm tra va chạm và vẽ:
- **Nhìn cạnh (mặt phẳng y-z)**: hình tròn tâm `zc = teeZ + 0.35k`, bán kính `R = 5.4k`, `yc = swingTop − R`
  (đo từ ảnh góc nhìn Side của app gốc: cung từ ~5 ft trước bóng tới ~5,8 ft sau bóng).
- **Nhìn bằng (mặt phẳng x-z)**: dải rộng từ quả bóng về **phía lưng** golfer `7k` và về **phía mặt** golfer `3 ft`.
- Vật thể (máy chiếu, LM trần, dầm…) giao với đường bao → kiểm tra khoảng hở ≥ 6 in (máy chiếu **[C]**) / ≥ 0 (vật khác, warn khi < 6 in).

### 2.3 Khoảng trống bắt buộc **[C]** (ngưỡng chật **[S]** suy từ bảng "tight fits")
| Kiểm tra | ok | warn (chật) | fail |
|---|---|---|---|
| Tee → tường sau (`D − teeZ`) | ≥ 7k | 5.5k … 7k | < 5.5k |
| Bóng → tường sau lưng golfer | ≥ 7k | 5.5k … 7k | < 5.5k |
| Bóng → tường phía mặt golfer | ≥ 3 ft | 2 … 3 ft | < 2 ft |
| Tee → màn | 9 … 12 ft (10 lý tưởng) | 8 … 9 ft, hoặc > 12 ft (note "xa hơn mức GSV khuyên") | < 8 ft |
Kiểm chứng bảng công bố (golfer 5'9", LM đặt cạnh bóng):
- Sâu chật 14'6" = 1 (enclosure cách tường) + 8 (tee→màn tối thiểu) + 5.5 (sau tee chật) ✓
- Sâu không cảnh báo 17' = 1 + 9 + 7 ✓; Sâu thoải mái 18' = 1 + 10 + 7 ✓
- Rộng chật 8'6" (tee lệch) = 5.5 + 3 ✓; không cảnh báo 10' = 7 + 3 ✓; thoải mái 14' (tee giữa) = 7 + 7 ✓
- Trần chật 8'5", không cảnh báo 8'11", thoải mái 10' ✓
Tường bị tắt (nút Trái/Sau/Phải) → khoảng tới phía đó coi như vô hạn, nhưng **rèm/enclosure vẫn được kiểm tra**.

## 3. Màn hình
### 3.1 Enclosure (`data/enclosures.json`: w, h, d = kích thước ngoài; sw, sh = mặt chiếu)
- Mặt trước enclosure (khung) cách tường màn **12 in** → mặt phẳng màn `screenZ = 1.0` ft **[C]** (bản gốc dùng `scrGap` ≈ 1.1667 cho màn gắn tường).
- Điều kiện lắp: `enc.w + 2×(2 in) ≤ W` và `enc.h + 2 in ≤ Heff` (chừa 2 in mỗi bên và phía trên để lắp ráp) **[C]**.
  Kiểm chứng: SIG8 8'4" → cần rộng 8'8", trần 8'6" ✓.
- Báo cáo: "rộng 12'2". Dư 11 in bên trái, 11 in bên phải." / "cao 9'4" dưới trần 10'. Dư 8 in."
- **Phù hợp nhất (auto)**: trong các mẫu vừa (trừ SimBooth, chỉ chọn khi người dùng chọn tên), chọn mẫu có **diện tích mặt chiếu `sw×sh` lớn nhất**; hoà → ưu tiên SIG. Đồng thời tính **mẫu tốt nhất của mỗi hãng** (SIG, Carl's) để hiển thị song song.
- Mép dưới mặt chiếu: `screenBottom = standFloor + (enc.h − enc.sh)/2` **[S]** (SIG12: 0.375 ft) → `screenTop = screenBottom + sh`.
- Enclosure dịch ngang (`encOff`, ±6 ft) để quả bóng gần tâm màn khi tee lệch, nhưng giữ 2 in tới tường.
- **Carl's Pro** có độ sâu 5/8/10/15 ft: với 10 và 15 ft, tee nằm trong enclosure, LM trần treo trên thanh ngang, máy chiếu treo ở thanh đầu mở hoặc trên trần phía sau **[C]**.
- **SimBooth (GolfIn)**: buồng kín có sàn riêng + thảm 32×54 in âm sàn. Kiểm tra theo bảng phòng tối thiểu của GolfIn (enclosures.json `minRoom`); cần 12 in phía sau buồng, SimBooth 3/4 cần thêm 12 in mỗi bên **[C]**.
- Lưới mở rộng Carl's (6/8/10 ft) chạy dọc hai bên từ enclosure về phía golfer.

### 3.2 Màn gắn tường (built-in)
- 3 cách chọn cỡ: **Lấp đầy tường** · **Tự nhập** (rộng × cao hình) · **Cỡ chuẩn** (24 SIGPRO Premium + 29 Carl's — `data/screens.json`; `vw×vh` = hình, `ow×oh` = cỡ ngoài có viền).
- Mép dưới màn cách sàn/cỏ `scrUp` = 0 … 24 in. Màn đặt cách tường `scrGap` (mặc định 14 in) **[C dữ liệu state]**.
- **Lấp đầy tường** **[S]**: `scrW = min(W − 2×1 ft, 18)`, `scrH = min(Heff − scrUp − 0.5, 10)`, rồi giảm `scrH` nếu máy chiếu không vươn tới mép trên (xem §5.4). Hình vẽ đúng tỉ lệ thực.
- **Viền hoàn thiện** (`fin`): Đệm mút / Rèm / Tường trơn. Đệm phủ dưới màn và chạy hai bên + phía trên tới tường/trần, **tối đa 18 in** (ước tính) **[C]**; phần tường trống còn lại thì báo "còn X in tường trơn". `finRun` (3–12 ft) = rèm/đệm chạy dọc tường bên về phía sau. ☐ Ốp đệm cả trần.
- Báo cáo màn: rộng × cao, đường chéo (in), tỉ lệ (1:1, 4:3, 16:10, 16:9 … hoặc "1.42:1"), và **hình chiếu**: kích thước ảnh gốc của máy chiếu tại khoảng cách đó + có dùng Screen Fill không.

## 4. Tee & thảm
### 4.1 Khoảng cách tee → màn (auto)
```
behindOk = 7k
teeDist = 10                                   // lý tưởng
nếu screenZ + 10 + behindOk > D: teeDist = D − screenZ − behindOk
teeDist = max(teeDist, 8)                      // nếu vẫn thiếu → để behind giảm xuống 5.5k (warn) rồi fail
teeDist = max(teeDist, lm.minFlightUsed)       // ràng buộc LM (xem §6), radar thêm phần phía sau bóng
teeDist = min(teeDist, 12)
teeZ = screenZ + teeDist
```
Người dùng có thể ghi đè bằng slider 5–15 ft.

### 4.2 Vị trí ngang & bố cục thảm **[C]**
- `W ≥ 14` (≥ 2×7k): **một tee ở giữa phòng**, thảm **rộng gấp đôi** (người tay phải và tay trái dùng chung).
- `W < 14`, một tay thuận: **tee lệch** khỏi tâm để giữ đủ khoảng phía lưng: `ballX = 7k` từ tường lưng (nếu được), đảm bảo phía mặt ≥ 3 ft; thảm **một phía** (một vùng đứng + một dải đánh). Enclosure dịch theo để bóng gần giữa màn; phần mềm mô phỏng có thiết lập offset (ghi chú).
- `W < 14`, **cả hai tay**: thảm rộng gấp đôi với **hai tee**: tee tay phải lệch phải tâm một đoạn `s`, tee tay trái lệch trái cùng `s`; `s = max(0, 7k − W/2)`.
- Vùng đánh (hitting zone) hiển thị là hình chữ nhật vàng (vd "28 × 21 in"), lấy theo `lm.zone`/thảm.
- Danh mục thảm: `data/mats.json`. Mặc định thảm SIGPRO Softy 4×10 (cạnh 10 ft nằm ngang phòng, sâu 4 ft, tee ở giữa chiều sâu).

## 5. Máy chiếu (`data/projectors.json`)
Trường: `r0..r1` throw ratio, `off` offset cố định (1.025 = 102,5%), `vs`/`hs` lens shift dọc/ngang (phần của chiều cao/rộng ảnh), `vlo` đáy dải offset khi có lens shift, `asp` tỉ lệ gốc (null = 16:9; 1.6 = 16:10), `ksd` loại keystone (1D/2D/3D), `fill` các tỉ lệ Screen Fill.

### 5.1 Khoảng cách chiếu
- `r = r0 + zoom × (r1 − r0)` (zoom slider 0–1, mặc định 0.5).
- Ảnh gốc phải **phủ kín màn**: `imgW = max(sw, sh × asp)`, `imgH = imgW / asp`.
- `throw = r × imgW`; thấu kính đặt tại `lensZ = screenZ + throw`.
- Kiểm chứng **[C]**: SIG12 (11.42×8.58, 4:3), AK700ST zoom 0.5 → r=0.76, imgW=15.25 → throw 11.59 ≈ "11'7" từ màn" ✓.
  Studio: màn 12'8"×8', AK700ST → ảnh 16:9 14'3"×8' (196 in), throw 9'10" ✓ (zoom≈0).
- Nếu `lensZ > D − thânMáy/2` → không vừa (máy chiếu ra ngoài phòng). Nếu máy chiếu nằm trên golfer → được phép (**[C]** "GSV lắp kiểu này nhiều"), chỉ cần qua kiểm tra gậy §5.5.
- Screen Fill: nếu tỉ lệ màn ∈ `fill` → "lấp đầy màn với Screen Fill đặt {tỉ lệ}"; nếu `fill` null → "đặt tỉ lệ trong cài đặt hiển thị của máy tính và phần mềm mô phỏng".

### 5.2 Chiều cao thấu kính (offset cố định)
- Treo trần lộn ngược: thấu kính cao hơn **mép trên ảnh** một đoạn `(off − 1) × imgH`.
  Ảnh gốc đặt sao cho mép trên ảnh = mép trên màn (khi ảnh bị giới hạn theo chiều cao) → `lensY = screenTop + (off − 1) × imgH`.
- Kiểm chứng: SIG12 screenTop 8.955 + 0.025×8.58 = 9.17 ft = "9'2" cách sàn" ✓; trần 10' → **thả (drop) = H − lensY = 10 in** ✓.
- Hiển thị: "thấu kính cao X, trên ống thả Y dưới trần".
- **Offset cao (≥ 1.12)**: cần thấu kính cao hơn mép trên ảnh 12–16% chiều cao ảnh. Nếu `lensY + nửaThânMáy > Heff` hoặc bị thanh trên enclosure che → **warn**: "ảnh sẽ rơi thấp, hoặc phải ngửa máy + keystone (giảm nét và sáng)".

### 5.3 Lens shift (AK900ST, LK936ST, LU935ST, ZK521ST-B, LG BU53RG, Epson L795SE)
- Dải offset dọc: `[ vlo ? 1+vlo : 0.5 − vs ,  0.5 + vs ]` (AK900: tối đa 110% **[C]**; ZK521: 106%–125% **[C]**).
- Ngang: dịch tới `hs × imgW` không mất chất lượng (23% với BenQ) **[C]**.
- App **không thả máy thấp hơn mức cần**, và **chừa lại một ít shift** (slider `lift` 0–1 trong dải) **[C]**. Mặc định: chọn vị trí cao nhất trần cho phép, trừ 10% dải.

### 5.4 Lệch tâm & keystone
- Slider `projX` (± `throw × tan 15°`) **[C khớp dải ±3.08 ft]**.
- Có `hs`: |dx| ≤ hs×imgW → ok.
- Không có `hs`: góc `θ = atan(|dx| / throw)`; `θ ≤ 3°` ok (khó thấy), `3° < θ ≤ 15°` note "mất một chút nét và độ sáng", `> 15°` không cho phép **[C]**.
- Optoma ZK431ST-B / ZK521ST-B: note "keystone và Four Corners bị tắt khi bật Low Latency" **[C]**.
- Màn cao mà máy chiếu không vươn tới mép trên → **mép trên tối**: vẽ dải tối và báo cách khắc phục (đổi máy có offset/lens shift phù hợp, giảm chiều cao màn, hạ máy).

### 5.5 Kiểm tra tia sáng & gậy **[C quy tắc, S hình học]**
- **Tia sáng**: các tia từ thấu kính tới mép trên màn không được bị chặn bởi: thanh trên phía trước của enclosure (cao `enc.h` tại `z = screenZ + enc.d`... tức mép mở của khung), LM treo trần, mọi vật treo, màn cuộn đang cuộn. Tại toạ độ z của vật: `rayY(z) = lensY + (screenTop − lensY) × (lensZ − z)/(lensZ − screenZ)`; nếu `đáyVật < rayY(z)` trong khoảng x của chùm sáng → "che bóng lên hình".
- **Gậy**: khoảng cách từ thân máy chiếu tới đường bao swing (§2.2) ≥ **6 in** → ok; 0–6 in warn; giao nhau → fail.
- **Phù hợp nhất (auto)**: duyệt mọi máy chiếu, giữ máy đạt (ok) nhiều nhất; ưu tiên không cần keystone, offset gần 100%, throw nằm giữa phòng; hoà → thứ tự trong data. Danh sách "Mọi máy chiếu vừa màn này": đếm vừa/chật/không.

## 6. Launch monitor (`data/launch-monitors.json`)
### 6.1 Loại `overhead` (treo trần)
- Vị trí: `fwd` ft **trước tee** (âm = sau tee, vd EYE XR −3.5). `mountY` = trần hiệu dụng tại điểm đó (có thể dùng ống thả nếu trần cao hơn `hMax`).
- Chiều cao: `hMin ≤ mountY ≤ hMax` → ok; trần cao hơn `hMax` → note "dùng ống thả xuống tới {hMax}"; `lowTo ≤ mountY < hMin` → warn (ProTee: chạy được tới 8'8") ; thấp hơn → fail.
  `ref = "floor"` đo từ sàn, còn lại đo từ mặt đánh.
- Bay bóng: `teeDist ≥ minFlight` → ok; `flightLeast ≤ teeDist < minFlight` → warn kèm ghi chú (EYE XO2: GSV thấy 8 ft vẫn ổn); thấp hơn → fail. `idealFlight`, `maxFlight` → note.
- Thân LM (`dim` = [rộng, cao, sâu] ft) phải không giao đường bao swing và không chặn tia máy chiếu (§5.5).
- IDRA II: vị trí bóng phụ thuộc chiều cao theo bảng GolfIn (52–63 in từ mép sau tấm gắn, chiều cao 99–120 in) → nội suy tuyến tính.
- Trackman iO: 3 phiên bản Low/Mid/High theo trần 8'10"–10'6".

### 6.2 Loại `side` (cạnh bóng, camera)
- Đặt ở **phía mặt** golfer, cách bóng `dist` ft (GCQuad 22 in, GC3 2 ft, Square 16,5 in…). Không thêm chiều sâu phòng.
- Cần ≥ 3 ft từ bóng tới tường phía đó; 2–3 ft = chật **[C]**.

### 6.3 Loại `radar` (sau bóng)
- Đặt **sau bóng** `bRec` ft (min `bMin`, max `bMax`), trên trục mục tiêu.
- Tee→màn tối thiểu = max(8, `minFlight`) (Trackman 4: 10, tối ưu `maxFlight`/12).
- **Phòng ngắn nhất** = `screenZ + minFlightUsed + bMin + 0.5` **[C khớp]**: R10 15'6", MLM2PRO 16', Mevo 16'6", KIT 17'6", TM4 17'6".
- Khoảng từ LM tới tường sau ≥ 0.5 ft.

### 6.4 Danh sách "Mọi launch monitor vừa phòng này"
Chạy lại toàn bộ solve cho từng LM (giữ các lựa chọn khác), gán huy hiệu Vừa/Chật/Không vừa; đếm.

## 7. Cỏ & sàn (`data/flooring-turf.json`)
- **Cỏ đối tác**: cuộn rộng tối đa 15 ft, cắt theo chiều dài. Phạm vi:
  - "3 ft quá thảm" (mặc định): từ màn (screenZ) tới mép sau thảm + 3 ft; rộng = bề rộng enclosure (hoặc màn).
    Kiểm chứng: SIG12, tee 11, thảm sâu 4 → 12'2" × 15'0" ✓.
  - "Dài bằng enclosure", "Kín tường" (W × (D − 0)), "Không cỏ".
  - Phòng rộng > 15 ft → nhiều tấm, **đường nối chạy ngang phòng tại mép trước hoặc mép sau thảm** (giấu tốt nhất).
- **Landing pad SIG**: chỉ cho SIG10/SIG12, một cỡ mỗi loại; chọn nó → tự chọn mẫu lớn hơn vừa phòng.
- **Sàn SIGPRO**: cao 2 3/8 in, mép vát, dải đánh SIG 12×28 in + 4 lỗ cốc, thay thảm. Chọn nó → chọn SIG lớn nhất có sàn vừa phòng (SIG8 9'8"×15'6", SIG10 11'7"×15'6", SIG12 13'6"×15'6").

## 8. PC, màn cảm ứng, ghế
- 3 kiểu máy tính: Tủ PC (~20 in sâu) + màn 27" · PC tower + kệ tường + màn 27" (tower nằm dọc tường) · Chân đứng có khay laptop + màn 32/43".
- Màn treo tường 32/43": 1 màn trên màn bàn; 2 màn thay thế (cạnh nhau hoặc chồng nhau); với chân đứng: trên hoặc cạnh. Màn nhỏ hiện hình máy chiếu, màn lớn hiện số liệu cú đánh.
- **Vị trí** **[C]**: tường golfer **nhìn vào** (RH → tường phải), đối diện tee lùi về góc sau, **không bao giờ ở trước bóng**; cả hai tay → góc sau xa. Giữ **3 ft** từ bóng ở phía mặt; phía lưng giữ ngoài đường bao swing. Slider di chuyển dọc tường, nút đổi tường.
- Trần thấp không đủ cho 2 màn chồng / tường sau bóng quá ngắn → note.
- Ghế: dọc tường sau, ngoài đường bao swing.
- **Khớp PC theo máy chiếu** (`data/pcs.json`): chọn cấu hình thấp nhất đạt yêu cầu khuyến nghị của phần mềm tại độ phân giải máy chiếu (HD/4K); chưa chọn phần mềm → HD: SG3-5602, 4K: SG3-5702Ti. PC dưới mức → note nêu máy đạt.

## 9. Vật treo trần & cửa gara (`data/obstacles.json`)
- Tối đa **6** vật (cửa gara tính vào). Loại: dầm gỗ, dầm thép I, ống gió chữ nhật, ống gió tròn, soffit. Hướng: ngang phòng hoặc dọc phòng. Mỗi vật khởi tạo theo kích thước thật điển hình, cho sửa.
- **Cửa gara**: đặt ở tường bất kỳ, rộng × cao riêng, 2 ray (cao theo cửa) + motor: ray trên trần có cụm motor, hoặc gắn hông (chỉ còn ray). Trạng thái đóng / mở (cánh cửa nằm ngang dưới ray khi mở).
- Kiểm tra: swing dưới từng vật (§2.1), tia máy chiếu (§5.5), màn cuộn đi xuống không vướng (ống gió, ray motor).

## 10. Gara & ô tô (`data/cars.json`)
Hai chế độ: **Cạnh simulator** (ô bên kia, xe đậu luôn khi chơi) · **Ở chỗ simulator** (cất màn: thảm nhấc lên, LM đặt sàn cất đi; góc "Đang đỗ" vẽ màn cuộn lên).
5 kiểm tra **[C]**:
1. **Qua cửa**: rộng kể gương + 3 in mỗi bên ≤ rộng cửa; cao xe ≤ cao cửa.
2. **Trước-sau**: đỗ cách cửa 6 in vào trong (để đóng cửa) + chừa 6 in phía trước tới màn/enclosure/góc PC/tường.
3. **Xuống xe**: 2'6" cạnh cửa tài xế.
4. **Nóc xe**: cách 2 in dưới vật thấp nhất phía trên (motor, ray, máy chiếu, LM trần, màn cuộn).
5. **Swing** (chế độ cạnh): xe như một bức tường; giữ 2'6" giữa xe và simulator.

### Màn cuộn
- **G-TRAK**: gắn quanh ray cửa gara, treo trước cửa đóng (ở tường màn), rộng 7–14 ft theo cửa, ray cách sàn 96–103 in, cửa một trục cuộn; không có ray → bộ gắn tường. Vẽ từ cuộn tới sàn với dải đen trên/dưới (ước tính).
- **Par2Pro Stealth**: cuộn lên trần, cỡ S8–S16 (rộng hình 8 – ~15 ft), màn cao 111 in, 107,5 in chiếu được; treo cách tường 12 in (ước tính).
- **HomeCourse ProScreen 180**: treo dưới trần ≥ 6 in, cách tường 18 in, cao 8'6", lắp ~8,5 ft, hình tới 14 ft rộng, vẽ 16:9 (ước tính).

## 11. Tổng hợp kết luận
`overall = trạng thái xấu nhất` trong các check (fail > warn > note > ok).
Tiêu đề: ok/note → "VỪA" (nền xanh); warn → "VỪA NHƯNG CHẬT" (vàng); fail → "KHÔNG VỪA" (đỏ).
Dòng đếm: "11 vừa · 1 ghi chú · 0 cảnh báo · 0 không vừa".
