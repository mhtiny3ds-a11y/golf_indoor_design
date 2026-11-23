// Đơn vị nội bộ: feet thập phân. Chỉ quy đổi ở lớp hiển thị.
export const FT_TO_M = 0.3048;
export const IN = 1 / 12;

export const ftToM = (ft: number) => ft * FT_TO_M;
export const mToFt = (m: number) => m / FT_TO_M;
export const inToFt = (inch: number) => inch / 12;
export const ftToIn = (ft: number) => ft * 12;

/** "2,13 m" */
export function fmtM(ft: number, digits = 2): string {
  return ftToM(ft).toFixed(digits).replace('.', ',') + ' m';
}

/** "7 ft 0 in" (làm tròn tới inch) */
export function fmtFtIn(ft: number): string {
  const neg = ft < 0;
  let totalIn = Math.round(Math.abs(ft) * 12);
  const f = Math.floor(totalIn / 12);
  const i = totalIn - f * 12;
  return (neg ? '−' : '') + `${f} ft ${i} in`;
}

/** Số inch làm tròn, kiểu "10 in" / "25 cm" */
export function fmtSmall(ft: number, metric: boolean): string {
  if (metric) return Math.round(ftToM(ft) * 100) + ' cm';
  return Math.round(ft * 12) + ' in';
}

export function fmtLen(ft: number, metric: boolean): string {
  return metric ? fmtM(ft) : fmtFtIn(ft);
}

/** Khoảng nhỏ (dưới ~3 ft) đọc dễ hơn bằng cm / in */
export function fmtGap(ft: number, metric: boolean): string {
  return Math.abs(ft) < 3 ? fmtSmall(ft, metric) : fmtLen(ft, metric);
}

export function fmtDims(a: number, b: number, metric: boolean): string {
  if (metric) return `${ftToM(a).toFixed(2).replace('.', ',')} × ${fmtM(b)}`;
  return `${fmtFtIn(a)} × ${fmtFtIn(b)}`;
}

/** Kích thước ft-in rút gọn kiểu 13'10" */
export function shortFtIn(ft: number): string {
  let totalIn = Math.round(ft * 12);
  const f = Math.floor(totalIn / 12);
  const i = totalIn - f * 12;
  return i ? `${f}'${i}"` : `${f}'`;
}

export const roundIn = (ft: number) => Math.round(ft * 12);

export function fmtNum(n: number, digits = 0): string {
  return n.toFixed(digits).replace('.', ',');
}
