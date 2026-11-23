// Hằng số quy tắc (docs/03). [C] = công bố, [S] = suy luận — chỉnh ở đây sau khi thử nghiệm thực tế.
export const RULES = {
  baseGolfer: 5.75,            // [C] 5'9"
  swingTopPerFt: 1.413,        // [C] swingTop = 1.413·G + standY
  headroomFailIn: 1,           // [C]
  headroomOkIn: 7,             // [C]
  backOk: 7,                   // [C] ×k
  backWarn: 5.5,               // [S] ×k
  faceOk: 3,                   // [C] ft
  faceWarn: 2,                 // [S] ft
  teeIdeal: 10,                // [C]
  teeMin: 8,                   // [C]
  teeOkMin: 9,                 // [S]
  teeMax: 12,                  // [C]
  centreWidth: 14,             // [C] ≥ 2×7k → tee giữa
  matT: 2.5 / 12,              // [C]
  turfT: 0.5 / 12,             // [C]
  encWallGap: 1.0,             // [C] mặt trước enclosure cách tường màn 12 in
  encSideSpare: 2 / 12,        // [C] 2 in mỗi bên
  encTopSpare: 2 / 12,         // [C] 2 in phía trên
  encPipe: 0.15,               // [S] ống khung SIG khi dữ liệu không có
  builtGap: 1.1667,            // [C]
  fillSide: 1,                 // [S] lấp đầy tường: chừa 1 ft mỗi bên
  fillMaxW: 18, fillMaxH: 10,  // [S]
  swingCentreFwd: 0.35,        // [S] ×k, tâm đường bao sau tee
  swingR: 5.4,                 // [S] ×k
  swingFace: 3,                // [S] dải đường bao phía mặt golfer
  swingPeakBack: 2.2,          // [S] ×k, đỉnh swing nằm trên vai golfer, lệch về phía lưng so với bóng
  swingLatDrop: 0.25,          // [S] mỗi ft lệch ngang khỏi đỉnh swing, bán kính hiệu dụng giảm 0,25 ft
  projClubOkIn: 6,             // [C]
  projCeilGap: 0.08,           // [S] khoảng hở thân máy chiếu tới trần
  keystoneOkDeg: 3,            // [C]
  keystoneMaxDeg: 15,          // [C]
  radarWallGap: 0.5,           // [C]
  turfPast: 3,                 // [C] cỏ 3 ft quá thảm
  turfRoll: 15,                // [C]
  pcFaceGap: 3,                // [C]
  carToSim: 2.5,               // [C]
  maxObstacles: 6,             // [C]
};

export const kOf = (G: number) => G / RULES.baseGolfer;
