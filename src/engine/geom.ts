export interface Box { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number }

export const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Box =>
  ({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) });

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const overlap1 = (a0: number, a1: number, b0: number, b1: number) => Math.min(a1, b1) - Math.max(a0, b0);

/** Khoảng cách từ điểm (z,y) tới hình chữ nhật [z0,z1]×[y0,y1] (0 nếu nằm trong) */
export function distPointRect(z: number, y: number, z0: number, z1: number, y0: number, y1: number): number {
  const dz = z < z0 ? z0 - z : z > z1 ? z - z1 : 0;
  const dy = y < y0 ? y0 - y : y > y1 ? y - y1 : 0;
  return Math.hypot(dz, dy);
}
