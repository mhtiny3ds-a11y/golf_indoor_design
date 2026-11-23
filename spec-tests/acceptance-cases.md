# Ca kiểm thử nghiệm thu (chuyển thành Vitest cho `solve()` + `checks()`)

Đơn vị ft. "Quan sát" = đã đối chiếu trực tiếp với app gốc ngày 21/11/2026. "Suy luận" = mong đợi theo quy tắc doc 03.
Dung sai số đo: ±0,5 in (±0.04 ft) trừ khi ghi khác.

## A. Phòng & swing
| ID | Đầu vào (khác mặc định) | Mong đợi | Nguồn |
|---|---|---|---|
| A1 | Mặc định: 14×18×10, G=5.75, R, eyexo2, enc auto, proj auto | Tổng: VỪA; enclosure = **SIG12**; tee→màn 10; tee→tường sau 7; tee giữa phòng; bóng→2 tường bên 7 & 7; headroom trần **20 in**; SIG12 dư 11 in mỗi bên, dư 8 in trên; thảm SIGPRO Softy 4×10; cỏ 12'2"×15'0"; 11 ok + 1 note (cỏ) | Quan sát |
| A2 | W=10, D=15, H=8.5, lm=mevogen2 | Trần: **warn**, 2 in headroom; sau tee 6 → **warn**; tee→màn 8 → **warn**; enclosure **SIG8**, rộng dư 18 in trái / 2 in phải, cao dư 2 in; LM radar: **fail** (cần ≥ 7 ft sau bóng, phòng ngắn nhất 16'6") | Quan sát (LM: suy luận) |
| A3 | G=5.75; H = 8.333 / 8.417 / 8.917 | fail / warn / ok cho check trần | Công bố |
| A4 | G=6.1667; H = 9.0 / 9.5 | warn / ok | Công bố |
| A5 | W=10, D=17, H=8.917, lm=gcquad, hand R | Không cảnh báo; tee lệch; bóng cách tường trái 7, tường phải 3; thảm một phía; enclosure dịch theo | Công bố |
| A6 | W=8.5, D=14.5, H=8.417, lm=gcquad | Không có fail; ít nhất một warn (rộng, sâu, trần đều chật) | Công bố |
| A7 | W=14, hand B | Một tee ở giữa, thảm rộng gấp đôi, 7/7 | Công bố |
| A8 | W=12, hand B | Hai tee trên thảm rộng gấp đôi: tee phải lệch +1, tee trái lệch −1 so với tâm | Suy luận (s = 7k − W/2) |
| A9 | Tắt tường trái, W=9, hand R | Check phía lưng = ok (không tường) | Suy luận |

## B. Launch monitor
| ID | Đầu vào | Mong đợi |
|---|---|---|
| B1 | lm=r10, D=15.5, W=14, H=10 | Không fail (phòng ngắn nhất 15'6"); tee→màn 8 → warn |
| B2 | lm=r10, D=15.3 | fail |
| B3 | lm=mevogen2 D=16.5 → không fail; mlm2pro D=16 → không fail; kit D=17.5 & tm4 D=17.5 → không fail | |
| B4 | lm=proteevx, H=8.75 → warn (dưới 9, trên 8'8"); H=8.5 → fail; H=12 → note "ống thả" | |
| B5 | lm=eyexr: cảm biến 3,5 ft SAU tee; tee→màn 10 → ok, 9 → fail/warn theo flightLeast (không có → fail) | |
| B6 | Danh sách "mọi LM vừa" ở mặc định: 29 vừa · 1 không vừa | Quan sát (LM không vừa cần xác định khi chạy) |

## C. Máy chiếu
| ID | Đầu vào | Mong đợi |
|---|---|---|
| C1 | Mặc định (SIG12 4:3, AK700ST, zoom 0.5) | r=0.76; ảnh gốc 15.25×8.58; throw **11'7"**; thấu kính **9'2"** cách sàn; thả **10 in**; Screen Fill 4:3; hình 11'5"×8'7" (171") | Quan sát |
| C2 | Preset studio_ref | throw ≈ 9'10"; ảnh gốc 16:9 14'3"×8' (196"); Screen Fill 16:10; tổng VỪA không cảnh báo | Công bố |
| C3 | AK700ST, projX sao cho góc 10° | note "keystone, mất chút nét/sáng"; 2° → ok; 16° → không cho phép (slider kẹp) |
| C4 | AK900ST, dx = 0.2 × imgW | ok, không keystone |
| C5 | AH500ST (offset 112%) dưới trần 8'6" với SIG8 | warn "ảnh rơi thấp / phải ngửa máy + keystone" |
| C6 | Danh sách máy chiếu ở mặc định: 14 vừa · 6 chật | Quan sát |

## D. Màn, thảm, cỏ
| D1 | Mặc định | Cỏ 12'2" × 15'0", một tấm, không đường nối |
| D2 | turf=room, W=16 | > 15 ft → 2 tấm, đường nối tại mép trước/sau thảm |
| D3 | recess=true, H=8.917, G=5.75 | Trần hiệu dụng giảm 2 in → check trần từ ok chuyển warn |
| D4 | turfKind=sigpro, W=12 | Chọn SIG lớn nhất có sàn vừa: SIG10 (11'7") — SIG12 cần 13'6" |

## E. Gara & ô tô
| E1 | park=beside, car=f150, cửa gara rộng 8.4 | fail "qua cửa" (cần 8.0 + 2×3 in = 8.5) |
| E2 | car=f150, cửa cao 7, xe cao 6.58 | ok chiều cao |
| E3 | park=inplace, D=20, car=tahoe (17.58) | trước-sau: 0.5 + 17.58 + 0.5 = 18.58 ≤ D trừ màn cuộn → ok |
| E4 | Màn cuộn proscreen + ống gió ngang ở z = 1.5 | fail "vật cản đường màn đi xuống" |

## F. PC
| F1 | pc=cab, pcMake=match, soft=none, proj=AK700ST (4K) | SurfThing SG3-5702Ti | Quan sát |
| F2 | soft=gspro, proj=AH700ST (1080p) | SG3-5602 |
| F3 | hand R | PC trên tường phải, phía sau bóng, cách bóng ≥ 3 ft |
