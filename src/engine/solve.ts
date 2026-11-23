// solve(state) → Plan. Hàm thuần, không phụ thuộc DOM/three.js. Toạ độ: x ngang (0 = tường trái khi nhìn về màn),
// z sâu (0 = tường màn), y cao (0 = sàn gốc). Đơn vị feet. Mọi y trong plan là tuyệt đối từ sàn gốc.
import { RULES, kOf } from './rules';
import { State, Obstacle } from './state';
import {
  Enclosure, Projector, LaunchMonitor, Mat, Car, ENCLOSURES, PROJECTORS, SCREENS, CARS, PCS, SOFT_MATRIX, MATS,
  OBSTACLE_TYPES, lmById, projById, encById, matById, DEFAULT_PROJ_DIM, DEFAULT_LM_DIM, byId,
} from './data';
import { Box, box, clamp, lerp, overlap1, distPointRect } from './geom';

export type Status = 'ok' | 'note' | 'warn' | 'fail';
export const RANK: Record<Status, number> = { ok: 0, note: 1, warn: 2, fail: 3 };
export const worst = (list: Status[]): Status => list.reduce<Status>((a, b) => (RANK[b] > RANK[a] ? b : a), 'ok');

export interface Tee { x: number; hand: 'R' | 'L' | 'B' }
export interface Named extends Box { name: string; kind: string; ceilingHung: boolean }

export interface ScreenPlan {
  kind: 'enc' | 'built' | 'roll';
  enc?: Enclosure; encDepth: number; encX0: number; encX1: number; encH: number; encPipe: number; encY0: number;
  rollId?: string;
  name: string; screenZ: number; sw: number; sh: number; sx: number; sBottom: number; sTop: number;
  outerW: number; outerH: number; ratio: string; diagIn: number;
  stdId?: string;
}
export interface ProjPlan {
  p: Projector; r: number; zoom: number; asp: number; imgW: number; imgH: number; throw: number;
  lensX: number; lensY: number; lensZ: number; drop: number; off: number; offLo: number; offHi: number;
  lensShift: boolean; keystoneDeg: number; dxMax: number; topShort: number; body: Box; floor: boolean;
  fill: string | null; nativeRatio: string; picW: number; picH: number;
  rays: { name: string; gap: number; blocked: boolean }[];
  clubGap: number;
  res: 'HD' | '4K';
}
export interface LmPlan {
  lm: LaunchMonitor; type: LaunchMonitor['type']; x: number; y: number; z: number; body: Box;
  hVal?: number; mountY?: number; dropPole?: number; fwd?: number;
  behindNeed?: number; behindHave?: number; sideNeed?: number; sideHave?: number;
}
export interface TurfPlan { kind: State['turfKind']; cover: State['turf']; x0: number; x1: number; z0: number; z1: number; pieces: { x0: number; x1: number; z0: number; z1: number }[]; seams: number[]; estimate: boolean }
export interface PcPlan { kind: State['pc']; wall: 'L' | 'R'; body: Box; desk: Box; tvs: Box[]; pcId: string; pcMatchId: string; distBall: number; clearance: number; faceSide: boolean }
export interface CarPlan { car: Car; body: Box; door: Box | null; doorW: number; doorH: number; side: 'L' | 'R' }

export interface Plan {
  state: State; metric: boolean;
  W: number; D: number; H: number; Heff: number; floorRaise: number; turfTop: number; standY: number; k: number; G: number;
  walls: State['walls'];
  swingTop: number; swingTopAbs: number; headroom: number;
  env: { zc: number; yc: number; R: number; x0: number; x1: number; peaks: number[] };
  screen: ScreenPlan;
  layout: 'centre' | 'offset' | 'two';
  tees: Tee[]; ballX: number; teeZ: number; teeDist: number; teeOffAuto: number; encOffAuto: number;
  sides: { back: number; face: number }; // khoảng trống tệ nhất
  backWall: number; // tee → tường sau
  mat: { mat: Mat | null; name: string; x0: number; x1: number; z0: number; z1: number; kind: string; sigpro: boolean };
  zone: { wIn: number; dIn: number; x0: number; x1: number; z0: number; z1: number };
  lm: LmPlan;
  proj: ProjPlan;
  turf: TurfPlan | null;
  pc: PcPlan | null;
  pcMatchId: string;
  seat: Box | null;
  obstacles: Named[];
  fixtures: Named[];
  car: CarPlan | null;
  encBestByBrand: { brand: string; enc: Enclosure | null }[];
  encAutoReason: string;
}

const IN = 1 / 12;

// ---------- Mặt sàn ----------
function floors(s: State) {
  const turfOn = s.turf !== 'none' || s.turfKind === 'sigpro';
  const floorRaise = s.recess && turfOn ? RULES.matT - RULES.turfT : 0;
  const standY = s.turfKind === 'sigpro' ? 2.375 * IN : RULES.matT;
  const turfTop = turfOn ? (s.recess ? RULES.matT : RULES.turfT) : 0;
  return { floorRaise, standY, turfTop, Heff: s.H - floorRaise };
}

// ---------- Enclosure ----------
export function encFits(e: Enclosure, s: State, Heff: number): boolean {
  const W = s.walls.left && s.walls.right ? s.W : Infinity;
  if (e.minRoom) {
    const sides = (e.needSides ?? 0) * 2;
    return e.w + sides <= W + 1e-6 && s.D >= e.minRoom[1] - 1e-6 && Heff >= e.minRoom[2] - 1e-6 && s.W >= e.minRoom[0] - 1e-6;
  }
  const depth = e.deep ? s.encD : e.d;
  return e.w + 2 * RULES.encSideSpare <= W + 1e-6 && e.h + RULES.encTopSpare <= Heff + 1e-6 && RULES.encWallGap + depth <= s.D;
}

function encCandidates(s: State, Heff: number): Enclosure[] {
  let list = ENCLOSURES.filter(e => !e.minRoom);
  if (s.turfKind === 'pad') list = list.filter(e => e.landingPad);
  if (s.turfKind === 'sigpro') list = list.filter(e => e.sigproFloor && e.sigproFloor[0] <= s.W + 1e-6 && RULES.encWallGap + e.sigproFloor[1] <= s.D + 1e-6);
  return list.filter(e => encFits(e, s, Heff));
}

function bestEnc(list: Enclosure[]): Enclosure | null {
  let best: Enclosure | null = null;
  for (const e of list) {
    if (!best) { best = e; continue; }
    const a = e.sw * e.sh, b = best.sw * best.sh;
    if (a > b + 1e-6 || (Math.abs(a - b) < 1e-6 && e.brand === 'SIG' && best.brand !== 'SIG')) best = e;
  }
  return best;
}

export function ratioLabel(w: number, h: number): string {
  const r = w / h;
  const std: [string, number][] = [['1:1', 1], ['5:4', 1.25], ['4:3', 4 / 3], ['3:2', 1.5], ['16:10', 1.6], ['16:9', 16 / 9]];
  for (const [l, v] of std) if (Math.abs(r - v) / v < 0.02) return l;
  return r.toFixed(2).replace('.', ',') + ':1';
}

// ---------- Tee ----------
function placeTees(s: State, k: number, W: number): { layout: Plan['layout']; tees: Tee[] } {
  const back = RULES.backOk * k, face = RULES.faceOk;
  const wantCentre = W >= 2 * back - 1e-6;
  let layout: Plan['layout'];
  if (s.matMode === 'double') layout = s.hand === 'B' && !wantCentre ? 'two' : 'centre';
  else if (s.matMode === 'single') layout = s.hand === 'B' ? 'two' : 'offset';
  else layout = wantCentre ? 'centre' : s.hand === 'B' ? 'two' : 'offset';

  if (layout === 'centre') return { layout, tees: [{ x: W / 2, hand: s.hand }] };
  if (layout === 'two') {
    const sOff = Math.max(0, back - W / 2);
    return { layout, tees: [{ x: W / 2 + sOff, hand: 'R' }, { x: W / 2 - sOff, hand: 'L' }] };
  }
  // tee lệch, một tay
  let xr: number;
  if (W >= back + face) xr = back;
  else if (W - face >= RULES.backWarn * k) xr = W - face;
  else xr = (W * back) / (back + face);
  const x = s.hand === 'L' ? W - xr : xr;
  return { layout, tees: [{ x, hand: s.hand === 'L' ? 'L' : 'R' }] };
}

function sideGaps(t: Tee, s: State): { back: number; face: number } {
  const L = s.walls.left ? t.x : Infinity, R = s.walls.right ? s.W - t.x : Infinity;
  if (t.hand === 'R') return { back: L, face: R };
  if (t.hand === 'L') return { back: R, face: L };
  return { back: Math.min(L, R), face: Math.min(L, R) };
}

// ---------- Màn hình ----------
function builtSize(s: State, Heff: number, floorAt: number): { sw: number; sh: number; ow: number; oh: number; name: string; stdId?: string } {
  if (s.scr === 'wall') {
    const sw = Math.min(s.W - 2 * RULES.fillSide, RULES.fillMaxW);
    const sh = Math.min(s.H - floorAt - s.scrUp - 0.5, RULES.fillMaxH);
    return { sw, sh, ow: sw, oh: sh, name: 'Màn lấp đầy tường' };
  }
  if (s.scr === 'custom') return { sw: s.scrW, sh: s.scrH, ow: s.scrW, oh: s.scrH, name: 'Màn tự nhập' };
  const st = byId(SCREENS, s.scr);
  if (st) return { sw: st.vw, sh: st.vh, ow: st.ow, oh: st.oh, name: `${st.brand === 'sig' ? 'SIGPRO Premium' : "Carl's Place"} ${st.ratio}`, stdId: st.id };
  return { sw: 12, sh: 8, ow: 12, oh: 8, name: 'Màn tự nhập' };
}

function rollScreen(s: State, H: number, floorAt: number, garageFront: Obstacle | undefined): ScreenPlan {
  let sw: number, sh: number, sTop: number, screenZ: number, name: string;
  if (s.roll === 'gtrak') {
    const railY = garageFront ? (garageFront.doorH ?? 7) + 3 * IN : 99 * IN;
    sw = clamp(s.gtW, 7, Math.min(14, s.W - 1));
    sTop = railY - 0.4; sh = Math.min(sw * 0.75, sTop - floorAt - 0.3);
    screenZ = 1.0; name = `G-TRAK ${Math.round(sw)} ft`;
  } else if (s.roll === 'stealth') {
    const sizes = [8, 9, 10, 11, 12, 13, 14, 15, 15.5];
    const fit = sizes.filter(w => w <= s.W - 1);
    sw = s.stW ? Math.min(s.stW, s.W - 1) : (fit.length ? fit[fit.length - 1] : 8);
    sTop = H - 0.5; sh = Math.min(107.5 * IN, sTop - floorAt - 0.25);
    screenZ = 1.0; name = `Par2Pro Stealth S${Math.round(Math.min(sw, 16))}`;
  } else {
    sw = Math.min(14, s.W - 2); sTop = H - 0.5; sh = Math.min(sw / (16 / 9), 8.5 - 0.6, sTop - floorAt);
    screenZ = 1.5; name = 'HomeCourse ProScreen 180';
  }
  return {
    kind: 'roll', rollId: s.roll, encDepth: 0, encX0: 0, encX1: 0, encH: 0, encPipe: 0, encY0: 0,
    name, screenZ, sw, sh, sx: s.W / 2, sBottom: sTop - sh, sTop, outerW: sw + 0.3, outerH: sh,
    ratio: ratioLabel(sw, sh), diagIn: Math.hypot(sw, sh) * 12,
  };
}

// ---------- Máy chiếu ----------
function solveProj(p: Projector, s: State, sc: ScreenPlan, H: number, floorRaise: number): ProjPlan {
  const zoom = clamp(s.zoom, 0, 1);
  const r = p.r0 + zoom * (p.r1 - p.r0);
  const asp = p.asp ?? 16 / 9;
  const imgW = Math.max(sc.sw, sc.sh * asp);
  const imgH = imgW / asp;
  const thr = r * imgW;
  const lensZ = sc.screenZ + thr;
  const dim = p.dim ?? DEFAULT_PROJ_DIM;
  const bodyH = dim[1];
  const lensShift = p.off == null;
  const offLo = lensShift ? (p.vlo ? 1 + p.vlo : 0.5 - (p.vs ?? 0)) : p.off!;
  const offHi = lensShift ? 0.5 + (p.vs ?? 0) : p.off!;
  let lensY: number, topShort = 0;
  const floor = s.projFloor;
  if (!floor) {
    const lensMax = H - RULES.projCeilGap - bodyH / 2;
    const yLo = sc.sTop + (offLo - 1) * imgH, yHi = sc.sTop + (offHi - 1) * imgH;
    if (yLo > lensMax) { topShort = yLo - lensMax; lensY = lensMax; }
    else {
      const top = Math.min(yHi, lensMax);
      if (s.lift != null && lensShift) lensY = lerp(yLo, top, clamp(s.lift, 0, 1));
      else lensY = lensShift ? Math.max(yLo, top - 0.1 * (yHi - yLo)) : yLo;
    }
  } else {
    // đặt sàn, thấu kính dưới mép dưới ảnh (đối xứng)
    const want = sc.sBottom - (offLo - 1) * imgH;
    lensY = Math.max(floorRaise + 0.5 + bodyH / 2, want);
    topShort = 0;
  }
  const off = lensShift ? 1 + (lensY - sc.sTop) / imgH : p.off!;
  const dxMax = thr * Math.tan((RULES.keystoneMaxDeg * Math.PI) / 180);
  const dx = clamp(s.projX, -dxMax, dxMax);
  const lensX = sc.sx + dx;
  const hShiftOk = (p.hs ?? 0) * imgW;
  const keystoneDeg = Math.abs(dx) <= hShiftOk + 1e-6 ? 0 : (Math.atan(Math.abs(dx) / thr) * 180) / Math.PI;
  const body = box(lensX - dim[0] / 2, lensX + dim[0] / 2, lensY - bodyH / 2, lensY + bodyH / 2, lensZ, lensZ + dim[2]);
  const scrRatio = ratioLabel(sc.sw, sc.sh);
  const nativeRatio = asp === 1.6 ? '16:10' : '16:9';
  let fill: string | null = null;
  if (scrRatio !== nativeRatio && p.fill && p.fill.includes(scrRatio)) fill = scrRatio;
  return {
    p, r, zoom, asp, imgW, imgH, throw: thr, lensX, lensY, lensZ, drop: H - lensY, off, offLo, offHi, lensShift,
    keystoneDeg, dxMax, topShort, body, floor, fill, nativeRatio, picW: sc.sw, picH: sc.sh - topShort,
    rays: [], clubGap: Infinity, res: (p.res ?? '').includes('4K') ? '4K' : 'HD',
  };
}

/** Độ cao tia (tới mép trên ảnh) tại toạ độ z */
function rayY(pp: ProjPlan, sc: ScreenPlan, z: number): number {
  const top = sc.sTop - pp.topShort;
  return pp.lensY + (top - pp.lensY) * (pp.lensZ - z) / (pp.lensZ - sc.screenZ);
}

function rayChecks(pp: ProjPlan, sc: ScreenPlan, hung: Named[]): ProjPlan['rays'] {
  if (pp.floor) return [];
  const out: ProjPlan['rays'] = [];
  for (const o of hung) {
    if (o.z1 <= sc.screenZ || o.z0 >= pp.lensZ) continue;
    const zNear = Math.min(o.z1, pp.lensZ);           // phía máy chiếu, tia cao nhất (nếu thấu kính trên mép ảnh)
    const zFar = Math.max(o.z0, sc.screenZ);
    const yr = Math.max(rayY(pp, sc, zNear), rayY(pp, sc, zFar));
    // bề ngang chùm sáng tại z
    const t = (pp.lensZ - zFar) / (pp.lensZ - sc.screenZ);
    const bx0 = pp.lensX + (sc.sx - sc.sw / 2 - pp.lensX) * t, bx1 = pp.lensX + (sc.sx + sc.sw / 2 - pp.lensX) * t;
    if (overlap1(o.x0, o.x1, bx0, bx1) <= 0) continue;
    out.push({ name: o.name, gap: o.y0 - yr, blocked: o.y0 < yr - 1e-6 });
  }
  return out;
}

/** Khoảng hở từ hộp tới đường bao swing (âm = cắt nhau). Infinity nếu không chung dải x. */
export function envClearance(env: Plan['env'], b: Box): number {
  if (overlap1(b.x0, b.x1, env.x0, env.x1) <= 0) return Infinity;
  const d = distPointRect(env.zc, env.yc, b.z0, b.z1, b.y0, b.y1);
  const lat = Math.min(...env.peaks.map(px => (px < b.x0 ? b.x0 - px : px > b.x1 ? px - b.x1 : 0)));
  return d - (env.R - RULES.swingLatDrop * lat);
}

// ---------- LM ----------
function solveLm(lm: LaunchMonitor, s: State, ctx: { ballX: number; teeZ: number; H: number; floorRaise: number; turfTop: number; faceDir: number; D: number; obstacles: Named[] }): LmPlan {
  const dim = lm.dim ?? DEFAULT_LM_DIM[lm.type];
  if (lm.type === 'overhead') {
    let fwd = lm.fwd ?? 3.5;
    let z = ctx.teeZ - fwd;
    // trần tại điểm đó (tính vật treo)
    let ceil = ctx.H;
    for (const o of ctx.obstacles) if (o.ceilingHung && ctx.ballX >= o.x0 && ctx.ballX <= o.x1 && z >= o.z0 - 0.5 && z <= o.z1 + 0.5) ceil = Math.min(ceil, o.y0);
    const ref = lm.ref === 'floor' ? ctx.floorRaise : ctx.turfTop;
    let hVal = ceil - ref;
    if (lm.id === 'idra2') { // nội suy bảng GolfIn: 99–120 in → 52–63 in
      const t = clamp((hVal * 12 - 99) / 21, 0, 1);
      fwd = lerp(52, 63, t) / 12 - 0.4; z = ctx.teeZ - fwd;
    }
    let mountY = ceil, dropPole = 0;
    if (lm.hMax != null && hVal > lm.hMax) { dropPole = hVal - lm.hMax; mountY = ceil - dropPole; }
    const body = box(ctx.ballX - dim[0] / 2, ctx.ballX + dim[0] / 2, mountY - dim[1], mountY, z - dim[2] / 2, z + dim[2] / 2);
    return { lm, type: 'overhead', x: ctx.ballX, y: mountY, z, body, hVal, mountY, dropPole, fwd };
  }
  if (lm.type === 'side') {
    const dist = lm.dist ?? 1.83;
    const x = ctx.ballX + ctx.faceDir * dist;
    const body = box(x - dim[0] / 2, x + dim[0] / 2, ctx.turfTop, ctx.turfTop + dim[1] * 0.35, ctx.teeZ - dim[2] / 2, ctx.teeZ + dim[2] / 2);
    return { lm, type: 'side', x, y: ctx.turfTop, z: ctx.teeZ, body, sideNeed: dist + dim[0] / 2 };
  }
  const bMin = lm.bMin ?? 6, bRec = lm.bRec ?? bMin, bMax = lm.bMax ?? bRec;
  const limit = ctx.D - RULES.radarWallGap;
  let z = Math.min(ctx.teeZ + bRec, limit);
  z = Math.min(Math.max(z, ctx.teeZ + bMin), ctx.teeZ + bMax);
  const body = box(ctx.ballX - dim[0] / 2, ctx.ballX + dim[0] / 2, ctx.turfTop + 0.9, ctx.turfTop + 0.9 + dim[1], z - dim[2] / 2, z + dim[2] / 2);
  return { lm, type: 'radar', x: ctx.ballX, y: ctx.turfTop + 0.9, z, body, behindNeed: bMin + RULES.radarWallGap, behindHave: ctx.D - ctx.teeZ };
}

// ---------- Vật treo ----------
function resolveObstacles(s: State, H: number): Named[] {
  const out: Named[] = [];
  const nameOf = (k: string) => OBSTACLE_TYPES.find(t => t.id === k)?.nameVi ?? k;
  s.obs.slice(0, RULES.maxObstacles).forEach((o, i) => {
    if (o.kind === 'garage') {
      const dW = o.doorW ?? 9, dH = o.doorH ?? 7, wall = o.wall ?? 'back';
      const trackY = dH + 3 * IN, depth = dH + 1.5;
      // toạ độ theo tường: u = dọc tường, v = vào phòng
      const mk = (u0: number, u1: number, v0: number, v1: number, y0: number, y1: number, name: string, hung = true) => {
        let b: Box;
        if (wall === 'back') b = box(u0, u1, y0, y1, s.D - v1, s.D - v0);
        else if (wall === 'front') b = box(u0, u1, y0, y1, v0, v1);
        else if (wall === 'left') b = box(v0, v1, y0, y1, u0, u1);
        else b = box(s.W - v1, s.W - v0, y0, y1, u0, u1);
        out.push({ ...b, name, kind: 'garage', ceilingHung: hung });
      };
      const c = o.pos, a = c - dW / 2, b2 = c + dW / 2;
      mk(a - 0.25, a - 0.05, 0, depth, trackY, trackY + 0.15, 'Ray cửa gara (trái)');
      mk(b2 + 0.05, b2 + 0.25, 0, depth, trackY, trackY + 0.15, 'Ray cửa gara (phải)');
      if (o.opener !== 'side') {
        const railBottom = H - 1.0;
        mk(c - 0.15, c + 0.15, 0, depth + 2, Math.max(railBottom, trackY), H, 'Ray motor cửa gara');
        mk(c - 0.7, c + 0.7, depth + 1.2, depth + 2.4, railBottom, H, 'Motor cửa gara');
      }
      if (o.isOpen) mk(a, b2, 0.1, dH + 0.1, trackY - 0.17, trackY - 0.02, 'Cánh cửa gara (mở)');
      return;
    }
    const w = o.w, drop = o.drop;
    const y0 = H - drop;
    const nm = `${nameOf(o.kind)} ${i + 1}`;
    if (o.dir === 'across') out.push({ ...box(0, s.W, y0, H, o.pos - w / 2, o.pos + w / 2), name: nm, kind: o.kind, ceilingHung: true });
    else out.push({ ...box(o.pos - w / 2, o.pos + w / 2, y0, H, 0, s.D), name: nm, kind: o.kind, ceilingHung: true });
  });
  return out;
}

function resolveFixtures(s: State): Named[] {
  return s.fixtures.map((f, i) => {
    const d = f.d, nm = f.kind === 'cabinet' ? `Tủ ${i + 1}` : `Cửa ra vào ${i + 1}`;
    let b: Box;
    if (f.wall === 'left') b = box(0, d, 0, f.h, f.pos - f.w / 2, f.pos + f.w / 2);
    else if (f.wall === 'right') b = box(s.W - d, s.W, 0, f.h, f.pos - f.w / 2, f.pos + f.w / 2);
    else b = box(f.pos - f.w / 2, f.pos + f.w / 2, 0, f.h, s.D - d, s.D);
    return { ...b, name: nm, kind: f.kind, ceilingHung: false };
  });
}

// ---------- PC ----------
export function pcMatch(res: 'HD' | '4K', soft: string, lmId: string): string {
  if (soft === 'none') return res === '4K' ? 'sg3-5702ti' : 'sg3-5602';
  const key = soft === 'tvg' ? (lmId === 'tmio' ? 'tvg_io' : 'tvg_tm4') : soft;
  const row = SOFT_MATRIX[key];
  return row ? row[res] : 'sg3-5602';
}

// ---------- SOLVE ----------
export function solve(s: State): Plan {
  const { floorRaise, standY, turfTop, Heff } = floors(s);
  const H = s.H, W = s.W, D = s.D;
  const k = kOf(s.G);
  const swingTop = RULES.swingTopPerFt * s.G + standY;
  const swingTopAbs = floorRaise + swingTop;
  const obstacles = resolveObstacles(s, H);
  const fixtures = resolveFixtures(s);
  const garageFront = s.obs.find(o => o.kind === 'garage' && o.wall === 'front');

  // Enclosure / màn
  const cands = encCandidates(s, Heff);
  const autoEnc = bestEnc(cands);
  const encBestByBrand = ['SIG', "Carl's Place"].map(brand => ({ brand, enc: bestEnc(cands.filter(e => e.brand === brand)) }));
  let enc: Enclosure | undefined;
  let encAutoReason = '';
  if (s.screen === 'enc' && s.roll === 'none') {
    if (s.enc === 'auto') {
      enc = autoEnc ?? ENCLOSURES[0];
      encAutoReason = autoEnc
        ? `${enc.name} là enclosure có mặt chiếu lớn nhất vừa chiều rộng và trần phòng này.`
        : 'Không enclosure nào vừa phòng này; đang hiển thị mẫu nhỏ nhất.';
    } else enc = encById(s.enc);
  }

  // Tee (ngang)
  const { layout, tees: teesAuto } = placeTees(s, k, W);
  let tees = teesAuto;
  const teeMid = (ts: Tee[]) => ts.reduce((a, t) => a + t.x, 0) / ts.length;
  const teeOffAuto = teeMid(teesAuto) - W / 2;
  if (!s.auto) {
    const shift = W / 2 + s.teeOff - teeMid(teesAuto);
    tees = teesAuto.map(t => ({ ...t, x: clamp(t.x + shift, 0.5, W - 0.5) }));
  }
  const ballX = teeMid(tees);

  // Màn
  let screen: ScreenPlan;
  let encOffAuto = 0;
  const floorAt = turfTop;
  if (s.roll !== 'none') screen = rollScreen(s, H, floorAt, garageFront);
  else if (enc) {
    const depth = enc.minRoom ? (enc.depthWithFloor ?? enc.d) : enc.deep ? s.encD : enc.d;
    const lo = enc.w / 2 + RULES.encSideSpare, hi = W - enc.w / 2 - RULES.encSideSpare;
    const autoX = lo <= hi ? clamp(ballX, lo, hi) : W / 2;
    encOffAuto = autoX - W / 2;
    const cx = s.auto ? autoX : (lo <= hi ? clamp(W / 2 + s.encOff, lo, hi) : W / 2);
    const encY0 = floorRaise;
    const sBottom = encY0 + (enc.h - enc.sh) / 2;
    screen = {
      kind: 'enc', enc, encDepth: depth, encX0: cx - enc.w / 2, encX1: cx + enc.w / 2, encH: enc.h, encPipe: enc.pipe ?? RULES.encPipe, encY0,
      name: enc.name, screenZ: RULES.encWallGap, sw: enc.sw, sh: enc.sh, sx: cx, sBottom, sTop: sBottom + enc.sh,
      outerW: enc.w, outerH: enc.h, ratio: ratioLabel(enc.sw, enc.sh), diagIn: Math.hypot(enc.sw, enc.sh) * 12,
    };
  } else {
    const b = builtSize(s, Heff, floorAt - floorRaise);
    const sx = s.frame ? W / 2 + s.frOff : W / 2;
    const sBottom = floorAt + s.scrUp;
    screen = {
      kind: 'built', encDepth: 0, encX0: 0, encX1: 0, encH: 0, encPipe: 0, encY0: 0,
      name: b.name, screenZ: s.scrGap, sw: b.sw, sh: b.sh, sx, sBottom, sTop: sBottom + b.sh,
      outerW: b.ow, outerH: b.oh, ratio: ratioLabel(b.sw, b.sh), diagIn: Math.hypot(b.sw, b.sh) * 12, stdId: b.stdId,
    };
  }

  // Tee → màn
  const lm0 = lmById(s.lm);
  const behindOk = Math.max(RULES.backOk * k, lm0.type === 'radar' ? (lm0.bMin ?? 6) + RULES.radarWallGap : 0);
  let teeDist: number;
  if (s.auto) {
    teeDist = RULES.teeIdeal;
    if (screen.screenZ + teeDist + behindOk > D) teeDist = D - screen.screenZ - behindOk;
    teeDist = Math.max(teeDist, RULES.teeMin);
    const minFlightUsed = lm0.flightLeast ?? lm0.minFlight ?? RULES.teeMin;
    teeDist = Math.max(teeDist, minFlightUsed);
    teeDist = Math.min(teeDist, RULES.teeMax);
    // SimBooth: tee nằm trong buồng
    if (enc?.minRoom) teeDist = Math.min(teeDist, Math.max(RULES.teeMin, (enc.depthWithFloor ?? 12) - 2.5));
  } else teeDist = s.teeDist;
  const teeZ = screen.screenZ + teeDist;
  const backWall = s.walls.back ? D - teeZ : Infinity;

  // Khoảng swing hai bên
  const gaps = tees.map(t => sideGaps(t, s));
  const sides = { back: Math.min(...gaps.map(g => g.back)), face: Math.min(...gaps.map(g => g.face)) };

  // Đường bao swing
  const envX = tees.map(t => t.hand === 'R' ? [t.x - 7 * k, t.x + RULES.swingFace] : t.hand === 'L' ? [t.x - RULES.swingFace, t.x + 7 * k] : [t.x - 7 * k, t.x + 7 * k]);
  const R = RULES.swingR * k;
  const peaks = tees.flatMap(t => t.hand === 'R' ? [t.x - RULES.swingPeakBack * k] : t.hand === 'L' ? [t.x + RULES.swingPeakBack * k] : [t.x - RULES.swingPeakBack * k, t.x + RULES.swingPeakBack * k]);
  const env = { zc: teeZ + RULES.swingCentreFwd * k, yc: swingTopAbs - R, R, x0: Math.min(...envX.map(e => e[0])), x1: Math.max(...envX.map(e => e[1])), peaks };

  // Thảm
  const sigpro = s.turfKind === 'sigpro';
  let mat: Mat | null = null;
  let mx0: number, mx1: number, mz0: number, mz1: number, matName: string, matKind: string;
  if (sigpro && enc?.sigproFloor) {
    const [fw, fd] = enc.sigproFloor;
    mx0 = screen.sx - fw / 2; mx1 = screen.sx + fw / 2; mz0 = screen.screenZ; mz1 = screen.screenZ + fd;
    matName = `Sàn SIGPRO cho ${enc.name}`; matKind = 'sigpro';
  } else {
    const auto = s.mat === 'auto';
    mat = auto ? (layout === 'offset' ? matById('softy47') : matById('softy410')) : matById(s.mat);
    const [dep, wid] = mat.size_ft;
    matKind = layout === 'offset' ? 'single' : 'double';
    if (layout === 'offset') {
      const t = tees[0];
      if (t.hand === 'L') { mx0 = t.x - 1.5; mx1 = t.x - 1.5 + wid; } else { mx1 = t.x + 1.5; mx0 = mx1 - wid; }
    } else { mx0 = ballX - wid / 2; mx1 = ballX + wid / 2; }
    if (mx0 < 0) { mx1 -= mx0; mx0 = 0; }
    if (mx1 > W) { mx0 -= mx1 - W; mx1 = W; }
    mz0 = teeZ - dep / 2; mz1 = teeZ + dep / 2;
    matName = `SIGPRO ${mat.nameVi.replace(' (gợi ý)', '')}`;
  }

  const zoneD = lm0.zone ? lm0.zone : 28 / 12;
  const zoneW = 21 / 12;
  const zone = { wIn: zoneW * 12, dIn: zoneD * 12, x0: ballX - zoneW / 2, x1: ballX + zoneW / 2, z0: teeZ - zoneD / 2, z1: teeZ + zoneD / 2 };

  // LM
  const faceDir = tees[0].hand === 'L' ? -1 : 1;
  const lmPlan = solveLm(lm0, s, { ballX, teeZ, H, floorRaise, turfTop, faceDir, D, obstacles });
  if (lmPlan.type === 'side') lmPlan.sideHave = s.walls[faceDir > 0 ? 'right' : 'left'] ? (faceDir > 0 ? W - ballX : ballX) : Infinity;

  // Vật treo cho kiểm tra tia sáng
  const hung: Named[] = [...obstacles];
  if (screen.kind === 'enc' && screen.enc) {
    const zb = screen.screenZ + screen.encDepth;
    hung.push({ ...box(screen.encX0, screen.encX1, screen.encY0 + screen.encH - screen.encPipe, screen.encY0 + screen.encH, zb - screen.encPipe, zb), name: 'thanh trên enclosure', kind: 'enc', ceilingHung: true });
  }
  if (lmPlan.type === 'overhead') hung.push({ ...lmPlan.body, name: lmPlan.lm.name, kind: 'lm', ceilingHung: true });

  // Máy chiếu (auto: thử từng máy)
  const evalProj = (p: Projector, sc: ScreenPlan): ProjPlan => {
    const pp = solveProj(p, s, sc, H, floorRaise);
    pp.rays = rayChecks(pp, sc, hung);
    pp.clubGap = envClearance(env, pp.body);
    return pp;
  };
  const fillAdjust = (p: Projector): ScreenPlan => {
    if (screen.kind !== 'built' || s.scr !== 'wall') return screen;
    let sc = { ...screen };
    for (let i = 0; i < 60; i++) {
      const pp = solveProj(p, s, sc, H, floorRaise);
      if (pp.topShort <= 1e-6 || sc.sh <= 6) break;
      const sh = sc.sh - IN;
      sc = { ...sc, sh, sTop: sc.sBottom + sh, outerH: sh, ratio: ratioLabel(sc.sw, sh), diagIn: Math.hypot(sc.sw, sh) * 12 };
    }
    return sc;
  };
  let proj: ProjPlan;
  if (s.proj === 'auto') {
    let best: { pp: ProjPlan; sc: ScreenPlan; score: number } | null = null;
    for (const p of PROJECTORS) {
      const sc = fillAdjust(p);
      const pp = evalProj(p, sc);
      const sts = projStatuses(pp, D);
      const score = -1000 * sts.filter(x => x === 'fail').length - 50 * sts.filter(x => x === 'warn').length - 5 * sts.filter(x => x === 'note').length
        - (pp.keystoneDeg > 0 ? 3 : 0) - (pp.off > 1.05 ? (pp.off - 1) * 4 : 0) + (pp.res === '4K' ? 1 : 0) + sc.sh * sc.sw * 0.01;
      if (!best || score > best.score + 1e-9) best = { pp, sc, score };
    }
    proj = best!.pp; screen = best!.sc;
  } else {
    const p = projById(s.proj);
    screen = fillAdjust(p);
    proj = evalProj(p, screen);
  }

  // Cỏ
  let turf: TurfPlan | null = null;
  if (s.turf !== 'none' && !sigpro) {
    const wx0 = screen.kind === 'enc' ? screen.encX0 : Math.max(0, Math.min(screen.sx - screen.outerW / 2, mx0));
    const wx1 = screen.kind === 'enc' ? screen.encX1 : Math.min(W, Math.max(screen.sx + screen.outerW / 2, mx1));
    let x0 = wx0, x1 = wx1, z0 = screen.screenZ, z1: number;
    if (s.turf === 'mat') z1 = Math.min(D, mz1 + RULES.turfPast);
    else if (s.turf === 'enc') z1 = screen.kind === 'enc' ? screen.screenZ + screen.encDepth : Math.min(D, mz1 + RULES.turfPast);
    else { x0 = 0; x1 = W; z0 = 0; z1 = D; }
    const width = x1 - x0, len = z1 - z0;
    const pieces: TurfPlan['pieces'] = []; const seams: number[] = [];
    if (width <= RULES.turfRoll + 1e-6) pieces.push({ x0, x1, z0, z1 });
    else {
      // trải ngang phòng, đường nối ở mép trước/sau thảm
      let cur = z0;
      while (z1 - cur > RULES.turfRoll + 1e-6) {
        const cand = [mz1, mz0].filter(z => z > cur + 0.5 && z - cur <= RULES.turfRoll + 1e-6);
        const seam = cand.length ? cand[0] : cur + RULES.turfRoll;
        pieces.push({ x0, x1, z0: cur, z1: seam }); seams.push(seam); cur = seam;
      }
      if (len > 0) pieces.push({ x0, x1, z0: cur, z1 });
      if (seams.length === 0 && pieces.length === 1 && len <= RULES.turfRoll) { /* một tấm ngang */ }
    }
    turf = { kind: s.turfKind, cover: s.turf, x0, x1, z0, z1, pieces, seams, estimate: true };
  } else if (sigpro) {
    turf = { kind: 'sigpro', cover: s.turf, x0: mx0, x1: mx1, z0: mz0, z1: mz1, pieces: [{ x0: mx0, x1: mx1, z0: mz0, z1: mz1 }], seams: [], estimate: true };
  }

  // PC
  const pcMatchId = pcMatch(proj.res, s.soft, s.lm);
  let pc: PcPlan | null = null;
  if (s.pc !== 'none') {
    const hand = tees[0].hand;
    const wall: 'L' | 'R' = s.stSide !== 'auto' ? s.stSide : hand === 'L' ? 'L' : 'R';
    const dep = s.pc === 'cab' ? 20 * IN : s.pc === 'shelf' ? 1.25 : 2;
    const len = s.pc === 'cab' ? 2.5 : s.pc === 'shelf' ? 3 : 2;
    const zMax = D - len / 2 - 0.1;
    const zz = s.stZ != null ? clamp(s.stZ, len / 2 + 0.1, zMax) : clamp(Math.max(teeZ + 1, D - len / 2 - 0.4), len / 2 + 0.1, zMax);
    const x0 = wall === 'R' ? W - dep : 0, x1 = wall === 'R' ? W : dep;
    const deskH = s.pc === 'stand' ? 3.6 : 3.0;
    const desk = box(x0, x1, floorRaise, floorRaise + deskH, zz - len / 2, zz + len / 2);
    const tvs: Box[] = [];
    const tvW = (s.tvIn === 43 ? 37.5 : 28) * IN, tvH = (s.tvIn === 43 ? 21.1 : 15.7) * IN;
    const wx0 = wall === 'R' ? W - 0.15 : 0, wx1 = wall === 'R' ? W : 0.15;
    const baseY = floorRaise + deskH + 0.9;
    if (s.tvs === 1) tvs.push(box(wx0, wx1, baseY, baseY + tvH, zz - tvW / 2, zz + tvW / 2));
    if (s.tvs === 2) { tvs.push(box(wx0, wx1, baseY - 0.5, baseY - 0.5 + tvH, zz - tvW - 0.05, zz - 0.05)); tvs.push(box(wx0, wx1, baseY - 0.5, baseY - 0.5 + tvH, zz + 0.05, zz + tvW + 0.05)); }
    if (s.tvs === 3) { tvs.push(box(wx0, wx1, baseY - 0.4, baseY - 0.4 + tvH, zz - tvW / 2, zz + tvW / 2)); tvs.push(box(wx0, wx1, baseY - 0.3 + tvH, baseY - 0.3 + 2 * tvH, zz - tvW / 2, zz + tvW / 2)); }
    const innerX = wall === 'R' ? x0 : x1;
    const faceSide = (wall === 'R') === (hand !== 'L');
    const distBall = Math.hypot(Math.max(0, Math.abs(innerX - ballX)), Math.max(0, desk.z0 - teeZ));
    const clearance = envClearance(env, desk);
    pc = { kind: s.pc, wall, body: desk, desk, tvs, pcId: s.pcMake === 'match' ? pcMatchId : s.pcMake, pcMatchId, distBall, clearance, faceSide };
  }

  // Ghế
  let seat: Box | null = null;
  if (s.seatOn) {
    const sw = 6, sd = 2.6;
    const faceRight = tees[0].hand !== 'L';
    let x0 = faceRight ? Math.max(env.x1 + 0.2, W - sw - 0.3) : Math.min(env.x0 - 0.2 - sw, 0.3);
    x0 = clamp(x0, 0.1, W - sw - 0.1);
    seat = box(x0, x0 + sw, floorRaise, floorRaise + 2.8, D - sd - 0.1, D - 0.1);
  }

  // Ô tô
  let car: CarPlan | null = null;
  if (s.park !== 'none') {
    const c: Car = s.car === 'custom' ? { id: 'custom', name: 'Xe tự nhập', L: s.carL, W: s.carW, H: s.carH, mirrors: true } : (byId(CARS, s.car) ?? CARS[0]);
    const g = s.obs.find(o => o.kind === 'garage');
    const doorW = g?.doorW ?? 0, doorH = g?.doorH ?? 0;
    const sideAuto: 'L' | 'R' = tees[0].hand === 'L' ? 'L' : 'R';
    const side = s.carSide === 'auto' ? sideAuto : s.carSide;
    let cx: number;
    if (s.park === 'inplace') cx = g && (g.wall === 'back' || g.wall === 'front') ? g.pos : W / 2;
    else if (g && (g.wall === 'back' || g.wall === 'front') && Math.abs(g.pos - W / 2) > 1) cx = g.pos;
    else cx = side === 'R' ? W - 1 - c.W / 2 : 1 + c.W / 2;
    const zEnd = g?.wall === 'front' ? 0.5 : D - 0.5;
    const z0 = g?.wall === 'front' ? zEnd : zEnd - c.L, z1 = g?.wall === 'front' ? zEnd + c.L : zEnd;
    const bodyC = box(cx - c.W / 2, cx + c.W / 2, floorRaise, floorRaise + c.H, z0, z1);
    let door: Box | null = null;
    if (g) door = box(g.pos - doorW / 2, g.pos + doorW / 2, 0, doorH, g.wall === 'front' ? 0 : D, g.wall === 'front' ? 0 : D);
    car = { car: c, body: bodyC, door, doorW, doorH, side: cx > W / 2 ? 'R' : 'L' };
  }

  return {
    state: s, metric: s.metric, W, D, H, Heff, floorRaise, turfTop, standY, k, G: s.G, walls: s.walls,
    swingTop, swingTopAbs, headroom: H - swingTopAbs,
    env, screen, layout, tees, ballX, teeZ, teeDist, teeOffAuto, encOffAuto, sides, backWall,
    mat: { mat, name: matName!, x0: mx0!, x1: mx1!, z0: mz0!, z1: mz1!, kind: matKind!, sigpro: sigpro && !!enc?.sigproFloor },
    zone, lm: lmPlan, proj, turf, pc, pcMatchId, seat, obstacles, fixtures, car, encBestByBrand, encAutoReason,
  };
}

/** Trạng thái các check nhóm máy chiếu — dùng cho auto pick và danh sách */
export function projStatuses(pp: ProjPlan, D: number): Status[] {
  const out: Status[] = [];
  out.push(pp.lensZ + (pp.body.z1 - pp.body.z0) / 2 > D + 1e-6 ? 'fail' : pp.topShort > 1e-6 ? 'warn' : 'ok');
  out.push(pp.rays.some(r => r.blocked) ? 'fail' : 'ok');
  out.push(pp.clubGap < 0 ? 'fail' : pp.clubGap * 12 < RULES.projClubOkIn ? 'warn' : 'ok');
  if (pp.keystoneDeg > RULES.keystoneOkDeg) out.push('note');
  return out;
}
