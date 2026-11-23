# 05 — Mô hình trạng thái (state)

Danh sách khoá dưới đây khớp với state runtime của app gốc (đọc trực tiếp), kèm giá trị mặc định thực tế và giải nghĩa.
Đơn vị độ dài: feet thập phân.

```ts
interface State {
  // Phòng
  W: number;            // 14   rộng
  D: number;            // 18   sâu
  H: number;            // 10   trần
  walls?: { left: boolean; back: boolean; right: boolean }; // mặc định true cả 3 (app gốc lưu trong UI)
  obs: Obstacle[];      // []   vật treo trần + cửa gara (≤ 6)
  metric: boolean;      // true ở bản VN

  // Golfer
  G: number;            // 5.75  chiều cao (ft)
  hand: 'R' | 'L' | 'B';// 'R'

  // Màn hình
  screen: 'enc' | 'built';      // 'enc'
  enc: 'auto' | EncId;          // 'auto'
  encD: 5 | 8 | 10 | 15;        // 5    độ sâu Carl's Pro
  netW: 0 | 6 | 8 | 10;         // 0    lưới mở rộng Carl's
  netOut: number;               // 0
  giHalf: boolean;              // false  vách lửng GolfIn
  giBeam: boolean | null;       // null   máy chiếu trên dầm GolfIn
  scr: 'wall' | 'custom' | ScreenId; // 'wall' = Lấp đầy tường
  scrW: number; scrH: number;   // 12, 8   (khi custom)
  scrUp: number;                // 0       mép dưới màn (0–2 ft)
  scrGap: number;               // 1.1667  màn cách tường
  frame: boolean; frW: number; frOff: number; // false, 12, 0  màn trong khung
  fin: 'pad' | 'curt' | 'bare'; // 'pad'
  finRun: number;               // 6
  finCeil: boolean;             // true
  padSize: '3x3' | '2x2';       // '3x3'

  // Launch monitor
  lm: LmId;                     // 'eyexo2'

  // Máy chiếu
  proj: 'auto' | ProjId;        // 'auto'
  projFloor: boolean;           // false
  zoom: number;                 // 0.5
  projX: number;                // 0
  lift: number | null;          // null = tự động

  // Thảm & tee
  matBrand: 'sigpro' | 'carls' | 'fiberbuilt'; // 'sigpro'
  mat: 'auto' | MatId;          // 'auto'
  matIns: string;               // 'gel'  lớp đệm
  matMode: 'auto' | 'double' | 'single'; // 'auto'
  lastMode: 'centre' | 'offset';
  auto: boolean;                // true  = bố cục tự động; false khi người dùng đã kéo
  teeDist: number;              // 10
  teeOff: number;               // 0
  teeOff2: number | null;       // null  tee thứ 2 (cả hai tay)
  encOff: number;               // 0
  encPin: number | null;        // null

  // Cỏ
  turf: 'mat' | 'enc' | 'room' | 'none'; // 'mat' = 3 ft quá thảm
  turfKind: 'partner' | 'pad' | 'sigpro'; // 'partner'
  recess: boolean;              // false

  // Tiện ích
  seatOn: boolean;              // false
  pc: 'none' | 'cab' | 'shelf' | 'stand'; // 'none'
  pcMake: 'match' | PcId | 'other';      // 'match'
  soft: 'none' | 'gspro' | 'tvg' | 'fsx' | 'premier' | 'pureplay'; // 'none'
  tvs: 0 | 1 | 2 | 3;           // 0  (2 cạnh nhau / 3 = 2 chồng)
  tvIn: 32 | 43;                // 32
  keepDesk: boolean;            // false
  standBeside: boolean;         // false
  stSide: 'auto' | 'L' | 'R';   // 'auto'
  stZ: number | null;           // null

  // Gara
  roll: 'none' | 'gtrak' | 'stealth' | 'proscreen';
  gtW: number;                  // 12
  stW: number;                  // 0
  park: 'none' | 'beside' | 'inplace'; // 'none'
  car: CarId | 'custom';        // 'f150'
  carL: number; carW: number; carH: number; // khi custom
  carSide: 'auto' | 'L' | 'R';
  parkView: 'play' | 'parked';

  // Hiển thị
  view: '3d' | 'top' | 'side' | 'front'; // '3d'
  open: string;                 // mục gập đang mở
}

interface Obstacle {
  kind: 'beam' | 'ibeam' | 'duct' | 'round' | 'soffit' | 'garage';
  dir: 'across' | 'along';      // ngang phòng / dọc phòng
  pos: number;                  // toạ độ z (across) hoặc x (along) của tâm
  w: number;                    // rộng (ft)
  drop: number;                 // sâu thả từ trần (ft); round: đường kính
  // garage:
  wall?: 'front' | 'back' | 'left' | 'right';
  doorW?: number; doorH?: number;
  opener?: 'rail' | 'side';
  isOpen?: boolean;
}
```

## Plan (kết quả solve)
Các khoá runtime của app gốc gợi ý cấu trúc plan: `s, L, e, lm, pr, mode, mat, scrZ, cx, ex0, ex1, net, scrFloor, encLift,
tee, tee2, sep, mid, lmX, zoneOff, behindWall, behind, swings, matX, matSpan, turf, floorAt, lmPos, asp, natW, throw,
roomLeft, fill, liftSet, floor, box, proj, zone, pcKey, car, station, checks`. Không bắt buộc giống tên, nhưng plan phải chứa
mọi toạ độ cần để render và mọi số liệu cho bảng readout.

## Lưu & chia sẻ
- Lưu `localStorage['gcsb.build']` mỗi khi state đổi (debounce 300 ms) → tải lại trang giữ cấu hình.
- Chia sẻ: chỉ lưu các khoá **khác mặc định**, JSON → nén (lz-string) → base64url → `#b=...`. Mở link → giải mã → merge vào mặc định.
- "Làm lại" = về mặc định + xoá localStorage (hỏi xác nhận).
