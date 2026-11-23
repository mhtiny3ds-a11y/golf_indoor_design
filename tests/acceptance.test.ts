// Chuyển từ spec-tests/acceptance-cases.md. Đơn vị ft, dung sai ±0,5 in.
import { run, withDefaults, State, lmFits, projFits, countFits } from '../src/engine';
import { PRESETS } from '../src/engine/data';

const TOL = 0.5 / 12;
const near = (a: number, b: number, tol = TOL) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
const R = (p: Partial<State>) => run(withDefaults(p));
const chk = (r: ReturnType<typeof R>, title: string) => {
  const c = r.checks.find(c => c.title.includes(title));
  if (!c) throw new Error('missing check ' + title + ' in ' + r.checks.map(c => c.title).join(' | '));
  return c;
};

describe('A. Phòng & swing', () => {
  it('A1 mặc định', () => {
    const r = R({});
    const p = r.plan;
    expect(r.overall.st).toBe('note');
    expect(p.screen.enc?.id).toBe('sig12');
    near(p.teeDist, 10); near(p.backWall, 7);
    near(p.ballX, 7); near(p.sides.back, 7); near(p.sides.face, 7);
    expect(Math.round(p.headroom * 12)).toBe(20);
    near(p.screen.encX0, 11 / 12); near(p.W - p.screen.encX1, 11 / 12);
    near(p.H - p.screen.encH, 8 / 12);
    expect(p.mat.mat?.id).toBe('softy410');
    near(p.turf!.x1 - p.turf!.x0, 12 + 2 / 12); near(p.turf!.z1 - p.turf!.z0, 15);
    expect(r.overall.ok).toBe(11); expect(r.overall.note).toBe(1);
    expect(r.overall.warn).toBe(0); expect(r.overall.fail).toBe(0);
  });
  it('A2 phòng nhỏ + Mevo Gen2', () => {
    const r = R({ W: 10, D: 15, H: 8.5, lm: 'mevogen2' });
    const p = r.plan;
    expect(chk(r, 'Trần').st).toBe('warn'); expect(Math.round(p.headroom * 12)).toBe(2);
    expect(chk(r, 'Khoảng sau tee').st).toBe('warn'); near(p.backWall, 6);
    expect(chk(r, 'Tee tới màn').st).toBe('warn'); near(p.teeDist, 8);
    expect(p.screen.enc?.id).toBe('sig8');
    near(p.screen.encX0, 18 / 12); near(p.W - p.screen.encX1, 2 / 12); near(p.H - p.screen.encH, 2 / 12);
    expect(chk(r, 'vị trí sau bóng').st).toBe('fail');
  });
  it('A3 trần với golfer 5\'9"', () => {
    expect(chk(R({ H: 8.333 }), 'Trần').st).toBe('fail');
    expect(chk(R({ H: 8.417 }), 'Trần').st).toBe('warn');
    expect(chk(R({ H: 8.917 }), 'Trần').st).toBe('ok');
  });
  it('A4 golfer 6\'2"', () => {
    expect(chk(R({ G: 6.1667, H: 9.0 }), 'Trần').st).toBe('warn');
    expect(chk(R({ G: 6.1667, H: 9.5 }), 'Trần').st).toBe('ok');
  });
  it('A5 tee lệch không cảnh báo', () => {
    const r = R({ W: 10, D: 17, H: 8.917, lm: 'gcquad', hand: 'R' });
    expect(r.checks.filter(c => c.st === 'warn' || c.st === 'fail')).toEqual([]);
    expect(r.plan.layout).toBe('offset');
    near(r.plan.sides.back, 7); near(r.plan.sides.face, 3);
    expect(r.plan.mat.kind).toBe('single');
    expect(r.plan.screen.sx).toBeGreaterThan(5);
  });
  it('A6 chật nhưng không fail', () => {
    const r = R({ W: 8.5, D: 14.5, H: 8.417, lm: 'gcquad', enc: 'auto' });
    const roomEnc = r.checks.filter(c => c.g === 'room');
    expect(roomEnc.some(c => c.st === 'fail')).toBe(false);
    expect(roomEnc.some(c => c.st === 'warn')).toBe(true);
  });
  it('A7 cả hai tay, rộng 14', () => {
    const p = R({ W: 14, hand: 'B' }).plan;
    expect(p.tees.length).toBe(1); expect(p.layout).toBe('centre'); near(p.sides.back, 7); near(p.sides.face, 7);
  });
  it('A8 cả hai tay, rộng 12 → hai tee ±1', () => {
    const p = R({ W: 12, hand: 'B' }).plan;
    expect(p.tees.length).toBe(2);
    near(p.tees.find(t => t.hand === 'R')!.x - 6, 1); near(p.tees.find(t => t.hand === 'L')!.x - 6, -1);
  });
  it('A9 tắt tường trái', () => {
    const r = R({ W: 9, hand: 'R', walls: { left: false, back: true, right: true } });
    expect(r.plan.sides.back).toBe(Infinity);
  });
});

describe('B. Launch monitor', () => {
  it('B1/B2 R10', () => {
    const r1 = R({ lm: 'r10', D: 15.5, W: 14, H: 10 });
    expect(chk(r1, 'vị trí sau bóng').st).not.toBe('fail');
    expect(chk(r1, 'Tee tới màn').st).toBe('warn');
    expect(chk(R({ lm: 'r10', D: 15.3 }), 'vị trí sau bóng').st).toBe('fail');
  });
  it('B3 phòng ngắn nhất các radar', () => {
    for (const [lm, D] of [['mevogen2', 16.5], ['mlm2pro', 16], ['kit', 17.5], ['tm4', 17.5]] as const) {
      const r = R({ lm, D });
      expect(r.checks.filter(c => c.g === 'lm' && c.st === 'fail'), lm).toEqual([]);
    }
  });
  it('B4 ProTee VX', () => {
    expect(chk(R({ lm: 'proteevx', H: 8.75 }), 'độ cao lắp').st).toBe('warn');
    expect(chk(R({ lm: 'proteevx', H: 8.5 }), 'độ cao lắp').st).toBe('fail');
    expect(chk(R({ lm: 'proteevx', H: 12 }), 'độ cao lắp').st).toBe('note');
  });
  it('B5 EYE XR sau tee', () => {
    const r = R({ lm: 'eyexr' });
    expect(r.plan.lm.z).toBeGreaterThan(r.plan.teeZ);
    expect(chk(R({ lm: 'eyexr', auto: false, teeDist: 10 }), 'đường bay').st).toBe('ok');
    expect(chk(R({ lm: 'eyexr', auto: false, teeDist: 9 }), 'đường bay').st).toBe('fail');
  });
  it('B6 danh sách LM chạy được', () => {
    const c = countFits(lmFits(withDefaults({})));
    expect(c.ok + c.warn + c.fail).toBe(30);
    expect(c.ok).toBeGreaterThanOrEqual(25);
  });
});

describe('C. Máy chiếu', () => {
  it('C1 mặc định AK700ST', () => {
    const p = R({}).plan.proj;
    expect(p.p.id).toBe('ak700st');
    near(p.r, 0.76, 0.001); near(p.imgW, 15.25, 0.05); near(p.imgH, 8.58, 0.02);
    near(p.throw, 11 + 7 / 12); near(p.lensY, 9 + 2 / 12); expect(Math.round(p.drop * 12)).toBe(10);
    expect(p.fill).toBe('4:3');
  });
  it('C2 phòng mẫu tham chiếu', () => {
    const pre = PRESETS.find(x => x.id === 'studio_ref')!;
    const r = R({ W: pre.W!, D: pre.D!, H: pre.H!, ...(pre.state as Partial<State>), auto: true });
    const p = r.plan.proj;
    near(p.throw, 9.83, 0.12);
    near(p.imgW, 14.25, 0.05); near(p.imgH, 8.0, 0.05);
    expect(p.fill).toBe('16:10');
    expect(r.checks.filter(c => c.st === 'warn' || c.st === 'fail')).toEqual([]);
  });
  it('C3 keystone', () => {
    const base = R({ proj: 'ak700st' }).plan.proj;
    const dx = (deg: number) => base.throw * Math.tan((deg * Math.PI) / 180);
    expect(chk(R({ proj: 'ak700st', projX: dx(10) }), 'hình ảnh').st).toBe('note');
    expect(R({ proj: 'ak700st', projX: dx(2) }).checks.some(c => c.title.includes('hình ảnh'))).toBe(false);
    near(R({ proj: 'ak700st', projX: dx(16) }).plan.proj.keystoneDeg, 15, 0.01);
  });
  it('C4 AK900ST lens shift ngang', () => {
    const b = R({ proj: 'ak900st' }).plan.proj;
    expect(R({ proj: 'ak900st', projX: 0.2 * b.imgW }).plan.proj.keystoneDeg).toBe(0);
  });
  it('C5 AH500ST trần thấp', () => {
    const r = R({ proj: 'ah500st', enc: 'sig8', H: 8.5 });
    expect(chk(r, 'AH500ST: vị trí').st).toBe('warn');
  });
  it('C6 danh sách máy chiếu', () => {
    const c = countFits(projFits(withDefaults({}), 'ak700st'));
    expect(c.ok + c.warn + c.fail).toBe(20);
    expect(c.ok).toBeGreaterThanOrEqual(10);
  });
});

describe('D. Màn, thảm, cỏ', () => {
  it('D2 cỏ kín tường W=16 → 2 tấm', () => {
    const t = R({ turf: 'room', W: 16 }).plan.turf!;
    expect(t.pieces.length).toBe(2);
    const p = R({ turf: 'room', W: 16 }).plan;
    expect([p.mat.z0, p.mat.z1].some(z => Math.abs(z - t.seams[0]) < 0.01)).toBe(true);
  });
  it('D3 thảm chìm làm trần chật', () => {
    expect(chk(R({ H: 8.917 }), 'Trần').st).toBe('ok');
    expect(chk(R({ H: 8.917, recess: true }), 'Trần').st).toBe('warn');
  });
  it('D4 sàn SIGPRO W=12 → SIG10', () => {
    expect(R({ turfKind: 'sigpro', W: 12 }).plan.screen.enc?.id).toBe('sig10');
  });
});

describe('E. Gara & ô tô', () => {
  const door = (w: number, h = 7) => ({ kind: 'garage' as const, dir: 'across' as const, pos: 10, w: 0, drop: 0, wall: 'back' as const, doorW: w, doorH: h, opener: 'side' as const, isOpen: false });
  it('E1 F-150 không qua cửa 8,4 ft', () => {
    expect(chk(R({ W: 20, park: 'beside', car: 'f150', obs: [door(8.4)] }), 'Qua cửa').st).toBe('fail');
    expect(chk(R({ W: 20, park: 'beside', car: 'f150', obs: [door(8.6)] }), 'Qua cửa').st).toBe('ok');
  });
  it('E2 chiều cao xe', () => {
    expect(chk(R({ W: 20, park: 'beside', car: 'f150', obs: [door(9, 7)] }), 'Qua cửa').st).toBe('ok');
  });
  it('E3 đỗ tại chỗ', () => {
    expect(chk(R({ D: 20, park: 'inplace', car: 'tahoe', obs: [door(9)] }), 'Trước-sau').st).toBe('ok');
  });
  it('E4 màn cuộn + ống gió', () => {
    const r = R({ roll: 'proscreen', obs: [{ kind: 'duct', dir: 'across', pos: 1.5, w: 1, drop: 0.67 }] });
    expect(chk(r, 'đường màn đi xuống').st).toBe('fail');
  });
});

describe('F. PC', () => {
  it('F1 khớp 4K', () => {
    expect(R({ pc: 'cab', proj: 'ak700st' }).plan.pc!.pcId).toBe('sg3-5702ti');
  });
  it('F2 GSPro + 1080p', () => {
    expect(R({ pc: 'cab', soft: 'gspro', proj: 'ah700st' }).plan.pc!.pcId).toBe('sg3-5602');
  });
  it('F3 PC tường phải, sau bóng, cách ≥ 3 ft', () => {
    const p = R({ pc: 'cab', hand: 'R' }).plan;
    expect(p.pc!.wall).toBe('R'); expect(p.pc!.desk.z0).toBeGreaterThan(p.teeZ);
    expect(p.pc!.distBall).toBeGreaterThanOrEqual(3);
  });
});
