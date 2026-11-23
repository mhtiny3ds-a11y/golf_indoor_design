// checks(plan) → Check[] (docs/04)
import { Plan, Status, worst, envClearance } from './solve';
import { RULES } from './rules';
import { CAR_RULES, PCS, byId } from './data';
import { fmtLen, fmtGap, fmtDims, fmtFtIn, ftToM, fmtNum } from './units';
import { box, overlap1 } from './geom';

export type CheckGroup = 'room' | 'enc' | 'lm' | 'proj' | 'turf' | 'pc' | 'car' | 'obs';
export interface Check { g: CheckGroup; title: string; st: Status; text: string; estimate?: boolean; fix?: string }

const IN = 1 / 12;
const rin = (ft: number) => Math.round(ft * 12 + 1e-9);

export function checks(p: Plan): Check[] {
  const m = p.metric;
  const L = (ft: number) => fmtLen(ft, m);
  const G = (ft: number) => fmtGap(ft, m);
  const out: Check[] = [];
  const s = p.state;
  const k = p.k;
  const lenOrNone = (v: number) => (v === Infinity ? 'không có tường' : L(v));

  // 1. Trần
  const hrIn = rin(p.headroom);
  const st1: Status = hrIn < RULES.headroomFailIn ? 'fail' : hrIn < RULES.headroomOkIn ? 'warn' : 'ok';
  out.push({
    g: 'room', title: 'Trần phía trên cú swing', st: st1,
    text: `Cú swing driver của golfer cao ${L(p.G)} lên tới khoảng ${L(p.swingTopAbs)}. ` +
      (hrIn >= 0 ? `Còn ${G(p.headroom)} khoảng trống tới trần ${L(p.H)}.` : `Thiếu ${G(-p.headroom)} so với trần ${L(p.H)}.`) +
      (st1 === 'warn' ? ' Hãy thử swing chậm trước khi đánh hết lực.' : ''),
    fix: st1 === 'ok' ? undefined : (s.recess ? 'Bỏ "đặt thảm chìm" để lấy lại chiều cao, hoặc giới hạn gậy dài.' : 'Golfer thấp hơn, gậy ngắn hơn, hoặc bỏ lớp sàn nâng.'),
  });

  // 2. Hai bên
  const stBack = (v: number): Status => v === Infinity ? 'ok' : rin(v) >= rin(RULES.backOk * k) ? 'ok' : rin(v) >= rin(RULES.backWarn * k) ? 'warn' : 'fail';
  const stFace = (v: number): Status => v === Infinity ? 'ok' : rin(v) >= rin(RULES.faceOk) ? 'ok' : rin(v) >= rin(RULES.faceWarn) ? 'warn' : 'fail';
  const st2 = worst([stBack(p.sides.back), stFace(p.sides.face)]);
  const centreOne = p.layout === 'centre' && p.tees.length === 1 && Math.abs(p.tees[0].x - p.W / 2) < 0.05;
  out.push({
    g: 'room', title: 'Khoảng swing hai bên', st: st2,
    text: centreOne && p.sides.back === p.sides.face
      ? `${lenOrNone(p.sides.back)} từ bóng tới mỗi tường bên. Khuyến nghị cho cú driver đầy đủ là ${L(RULES.backOk * k)} phía lưng golfer.`
      : `${lenOrNone(p.sides.back)} từ bóng tới tường sau lưng golfer, và ${lenOrNone(p.sides.face)} từ bóng tới tường phía golfer nhìn. Khuyến nghị ${L(RULES.backOk * k)} phía lưng và ${L(RULES.faceOk)} phía mặt.`,
    fix: st2 === 'ok' ? undefined : 'Dời tee lệch về phía golfer nhìn, chọn thảm một phía, hoặc dùng launch monitor treo trần để bỏ thiết bị cạnh bóng.',
  });

  // 3. Sau tee
  const st3 = stBack(p.backWall);
  out.push({
    g: 'room', title: 'Khoảng sau tee', st: st3,
    text: p.backWall === Infinity ? 'Không có tường sau.' : `${L(p.backWall)} từ tee tới tường sau. Khuyến nghị ${L(RULES.backOk * k)} để không chạm driver.`,
    fix: st3 === 'ok' ? undefined : 'Kéo tee gần màn hơn (không dưới 2,44 m) hoặc chọn enclosure nông hơn.',
  });

  // 4. Tee tới màn
  const td = p.teeDist;
  const st4: Status = td < RULES.teeMin - 1e-6 ? 'fail' : td < RULES.teeOkMin - 1e-6 ? 'warn' : td > RULES.teeMax + 1e-6 ? 'note' : 'ok';
  out.push({
    g: 'room', title: 'Tee tới màn', st: st4,
    text: `${L(td)} từ tee tới màn. ${L(8)} là tối thiểu, ${L(10)} là lý tưởng và ${L(12)} là xa nhất nên đánh, vì bóng nảy ngược và kích thước hình.`,
    fix: st4 === 'fail' ? 'Lùi tee ra xa màn; bóng nảy ngược ở khoảng này rất nguy hiểm.' : undefined,
  });

  // Enclosure / màn
  const sc = p.screen;
  if (sc.kind === 'enc' && sc.enc) {
    const e = sc.enc;
    if (e.minRoom) {
      const [mw, md, mh] = e.minRoom;
      const ok = p.W >= mw - 1e-6 && p.D >= md - 1e-6 && p.Heff >= mh - 1e-6;
      out.push({ g: 'enc', title: `${e.name}: phòng tối thiểu`, st: ok ? 'ok' : 'fail', text: `GolfIn yêu cầu phòng tối thiểu ${fmtDims(mw, md, m)}, trần ${L(mh)}. Cần thêm ${G(e.needBehind ?? 1)} phía sau buồng${e.needSides ? ` và ${G(e.needSides)} mỗi bên` : ''}.` });
    }
    const lw = s.walls.left ? sc.encX0 : Infinity, rw = s.walls.right ? p.W - sc.encX1 : Infinity;
    const minSide = Math.min(lw, rw);
    const stw: Status = minSide < RULES.encSideSpare - 1e-6 ? 'fail' : 'ok';
    out.push({
      g: 'enc', title: `${e.name}: chiều rộng`, st: stw,
      text: `Rộng ${L(e.w)}. ` + (lw === Infinity && rw === Infinity ? 'Không có tường bên.' : `Dư ${lw === Infinity ? '—' : G(lw)} bên trái, ${rw === Infinity ? '—' : G(rw)} bên phải.`) + (stw === 'fail' ? ` Cần ít nhất ${G(RULES.encSideSpare)} mỗi bên để lắp.` : ''),
      fix: stw === 'fail' ? 'Chọn enclosure hẹp hơn hoặc chuyển sang màn gắn tường.' : undefined,
    });
    const spareH = p.H - (sc.encY0 + e.h);
    const sth: Status = spareH < RULES.encTopSpare - 1e-6 ? 'fail' : 'ok';
    out.push({
      g: 'enc', title: `${e.name}: chiều cao`, st: sth,
      text: `Cao ${L(e.h)} dưới trần ${L(p.Heff)}${p.floorRaise ? ' (đo từ sàn đã nâng)' : ''}. ${spareH >= 0 ? `Dư ${G(spareH)}.` : `Thiếu ${G(-spareH)}.`}`,
      fix: sth === 'fail' ? 'Chọn enclosure thấp hơn, bỏ thảm chìm, hoặc dùng màn gắn tường.' : undefined,
    });
  } else if (sc.kind === 'built') {
    const fitsW = sc.outerW <= p.W + 1e-6, fitsH = sc.sTop <= p.H + 1e-6;
    out.push({
      g: 'enc', title: 'Màn gắn tường: kích thước', st: fitsW && fitsH ? 'ok' : 'fail',
      text: `Hình ${fmtDims(sc.sw, sc.sh, m)} (${sc.ratio}, ${Math.round(sc.diagIn)} in đường chéo), mép dưới cách sàn ${G(sc.sBottom)}. ` +
        (fitsW ? '' : `Rộng hơn tường ${G(sc.outerW - p.W)}. `) + (fitsH ? `Mép trên cách trần ${G(p.H - sc.sTop)}.` : `Cao hơn trần ${G(sc.sTop - p.H)}.`),
    });
    if (s.fin !== 'bare') {
      const side = (p.W - sc.outerW) / 2, top = p.H - sc.sTop;
      const bare = Math.max(0, side - 1.5), bareTop = Math.max(0, top - 1.5);
      out.push({
        g: 'enc', title: s.fin === 'pad' ? 'Đệm mút quanh màn' : 'Rèm quanh màn', st: 'note', estimate: true,
        text: `${s.fin === 'pad' ? `Đệm ${s.padSize === '3x3' ? '3×3' : '2×2'} ft` : 'Rèm'} phủ hai bên và phía trên màn, tối đa ${G(1.5)}, chạy dọc tường bên ${L(s.finRun)} về phía sau.` +
          (bare > 0.04 || bareTop > 0.04 ? ` Còn ${G(bare)} tường trơn mỗi bên và ${G(bareTop)} phía trên.` : ' Không còn tường trơn quanh màn.') + (s.finCeil ? ' Có ốp đệm trần.' : ''),
      });
    }
  } else if (sc.kind === 'roll') {
    const path = p.obstacles.filter(o => overlap1(o.z0, o.z1, sc.screenZ - 0.4, sc.screenZ + 0.4) > 0 && overlap1(o.x0, o.x1, sc.sx - sc.sw / 2, sc.sx + sc.sw / 2) > 0 && o.y0 < sc.sTop + 0.4);
    out.push({
      g: 'enc', title: `${sc.name}: đường màn đi xuống`, st: path.length ? 'fail' : 'ok', estimate: true,
      text: path.length ? `Vật cản đường màn đi xuống: ${path.map(o => o.name).join(', ')}.` : `Màn cuộn đi xuống thông thoáng, hình ${fmtDims(sc.sw, sc.sh, m)}.`,
      fix: path.length ? 'Dời vật treo hoặc dời màn cuộn ra xa tường hơn.' : undefined,
    });
  }

  // LM
  const lp = p.lm, lm = lp.lm;
  if (lp.type === 'overhead') {
    const h = lp.hVal!;
    let st: Status;
    if (lm.hMin == null || lm.hMax == null) st = 'note';
    else if (h > lm.hMax + 1e-6) st = 'note';
    else if (h >= lm.hMin - 1e-6) st = 'ok';
    else if (lm.lowTo != null && h >= lm.lowTo - 1e-6) st = 'warn';
    else st = 'fail';
    const clr = envClearance(p.env, lp.body);
    if (clr < 0) st = 'fail';
    const dir = (lp.fwd ?? 0) >= 0 ? 'trước tee' : 'sau tee';
    out.push({
      g: 'lm', title: `${lm.name}: độ cao lắp`, st,
      text: `${lm.name}: cảm biến cách ${lm.ref === 'floor' ? 'sàn' : 'mặt đánh'} ${L(lm.hMin ?? 9)}–${L(lm.hMax ?? 10)}, ${L(Math.abs(lp.fwd ?? 0))} ${dir}. Trần tại đó là ${L(h)}.` +
        (st === 'note' && h > (lm.hMax ?? Infinity) ? ` Dùng ống thả xuống tới ${L(lm.hMax!)} (thả ${G(lp.dropPole!)}).` : '') +
        (st === 'warn' ? ' Thấp hơn khuyến nghị nhưng vẫn chạy được.' : '') + (clr < 0 ? ' Gậy có thể chạm thiết bị.' : '') +
        (lm.id === 'tmio' ? ` Chọn phiên bản ${h < 9.5 ? 'Low' : h < 10 ? 'Mid' : 'High'} (ước tính).` : ''),
      fix: st === 'fail' ? 'Chọn launch monitor đặt cạnh bóng hoặc sau bóng.' : undefined,
    });
  } else if (lp.type === 'side') {
    const ok = lp.sideHave! >= lp.sideNeed! - 1e-6;
    out.push({
      g: 'lm', title: `${lm.name}: vị trí`, st: ok ? 'ok' : 'fail',
      text: `Đặt cạnh bóng phía golfer nhìn, cách bóng ${G(lm.dist ?? 1.83)}. Từ bóng tới tường phía đó còn ${lp.sideHave === Infinity ? 'không giới hạn' : L(lp.sideHave!)}.`,
      fix: ok ? undefined : 'Dời tee ra xa tường phía golfer nhìn.',
    });
  } else {
    const ok = lp.behindHave! >= lp.behindNeed! - 1e-6;
    const shortest = p.screen.screenZ + Math.max(RULES.teeMin, lm.minFlight ?? 8) + (lm.bMin ?? 6) + RULES.radarWallGap;
    out.push({
      g: 'lm', title: `${lm.name}: vị trí sau bóng`, st: ok ? 'ok' : 'fail',
      text: `Radar đặt sau bóng ${L(lp.z - p.teeZ)} (hãng: ${L(lm.bMin ?? 6)}–${L(lm.bMax ?? 8)}, khuyên ${L(lm.bRec ?? 7)}), cách tường sau ít nhất ${G(RULES.radarWallGap)}. ` +
        (ok ? `Từ tee tới tường sau còn ${L(lp.behindHave!)}.` : `Cần ≥ ${L(lp.behindNeed!)} sau bóng, phòng chỉ còn ${L(lp.behindHave!)}. Phòng ngắn nhất cho thiết bị này: ${L(shortest)}.`),
      fix: ok ? undefined : 'Chọn launch monitor treo trần hoặc đặt cạnh bóng.',
    });
  }
  if (lp.type !== 'side') {
    const minF = lm.minFlight, least = lm.flightLeast;
    let st: Status = 'ok';
    let note = '';
    if (minF != null) {
      if (td >= minF - 1e-6) st = 'ok';
      else if (least != null && td >= least - 1e-6) { st = 'warn'; note = ` Thử nghiệm thực tế cho thấy ${L(least)} vẫn chạy ổn.`; }
      else st = 'fail';
      if (lm.maxFlight && td > lm.maxFlight + 1e-6) { st = st === 'ok' ? 'note' : st; note += ` Hãng khuyên tối đa ${L(lm.maxFlight)}.`; }
      if (lm.idealFlight && td < lm.idealFlight - 1e-6 && st === 'ok') note += ` Lý tưởng ${L(lm.idealFlight)}.`;
    }
    out.push({
      g: 'lm', title: `${lm.name}: đường bay bóng`, st,
      text: `${L(td)} từ tee tới màn. ` + (minF != null ? `Hãng yêu cầu ${L(minF)}.` : `Hãng không công bố; dùng mức tối thiểu chung ${L(8)}.`) + note,
      fix: st === 'fail' ? 'Lùi tee ra xa màn hoặc chọn thiết bị khác.' : undefined,
    });
  }

  // Máy chiếu
  const pp = p.proj, pr = pp.p;
  const out1 = pp.lensZ + (pp.body.z1 - pp.body.z0) / 2 > p.D + 1e-6;
  const stPos: Status = out1 ? 'fail' : pp.topShort > 1e-6 ? 'warn' : pp.floor ? 'note' : 'ok';
  out.push({
    g: 'proj', title: `${pr.name}: vị trí`, st: stPos,
    text: `Cách màn ${L(pp.throw)} (zoom ${Math.round(pp.zoom * 100)}%, tỉ lệ chiếu ${fmtNum(pp.r, 2)}), ` +
      (pp.floor ? `đặt sàn, thấu kính cao ${L(pp.lensY)}.` : `thấu kính cao ${L(pp.lensY)}, ống thả ${G(pp.drop)} dưới trần.`) +
      (pp.lensShift ? ` Dịch thấu kính dọc: offset ${Math.round(pp.off * 100)}% (dải ${Math.round(pp.offLo * 100)}–${Math.round(pp.offHi * 100)}%).` : ` Offset cố định ${fmtNum(pr.off! * 100, 1)}%.`) +
      (out1 ? ` Máy chiếu cần chỗ ở ${L(pp.lensZ)} nhưng phòng chỉ sâu ${L(p.D)}.` : '') +
      (pp.topShort > 1e-6 ? ` Trần không đủ cao: ảnh sẽ rơi thấp ${G(pp.topShort)} (mép trên tối), hoặc phải ngửa máy + keystone (giảm nét và sáng).` : ''),
    fix: out1 ? 'Chọn máy tỉ lệ chiếu ngắn hơn hoặc màn nhỏ hơn.' : pp.topShort > 1e-6 ? 'Chọn máy có offset thấp hoặc có lens shift, giảm chiều cao màn, hoặc hạ máy và chấp nhận keystone.' : undefined,
  });
  const blocked = pp.rays.filter(r => r.blocked);
  out.push({
    g: 'proj', title: `${pr.name}: tia sáng`, st: blocked.length ? 'fail' : 'ok',
    text: pp.floor ? 'Máy chiếu đặt sàn, chiếu từ dưới lên; không vướng vật treo trần.'
      : blocked.length ? `${blocked.map(b => b.name).join(', ')} che một phần hình (thấp hơn tia sáng ${G(-blocked[0].gap)}).`
        : pp.rays.length ? 'Ánh sáng đi qua ' + pp.rays.map(r => `dưới ${r.name} (${G(r.gap)})`).join(', ') + '.' : 'Không có vật nào nằm trên đường tia sáng.',
    fix: blocked.length ? 'Đổi vị trí máy chiếu (khoảng cách/độ cao), dời vật treo, hoặc chọn máy khác.' : undefined,
  });
  const cg = pp.clubGap;
  const stClub: Status = cg < 0 ? 'fail' : cg * 12 < RULES.projClubOkIn ? 'warn' : 'ok';
  out.push({
    g: 'proj', title: `${pr.name}: gậy`, st: stClub,
    text: cg === Infinity ? 'Máy chiếu nằm ngoài dải swing.' : cg < 0 ? `Đường swing chạm thân máy chiếu (lấn ${G(-cg)}).` : `Gậy cách máy chiếu ${G(cg)} ở điểm gần nhất (cần ≥ ${G(RULES.projClubOkIn * IN)}).`,
    fix: stClub === 'ok' ? undefined : 'Đổi zoom để dời máy, nâng máy sát trần, hoặc chọn máy tỉ lệ chiếu khác.',
  });
  if (pp.keystoneDeg > RULES.keystoneOkDeg) {
    out.push({
      g: 'proj', title: `${pr.name}: hình ảnh`, st: 'note',
      text: `Máy lệch ${fmtNum(pp.keystoneDeg, 1)}° so với tâm màn — dùng keystone, mất một chút nét và độ sáng.${pr.ksNoteVi ? ' ' + pr.ksNoteVi : ''}`,
    });
  }

  // PC theo máy chiếu
  if (s.pc !== 'none' && p.pc) {
    const pc = byId(PCS, p.pc.pcId), need = byId(PCS, p.pcMatchId)!;
    const under = pc && pc.rank < need.rank;
    out.push({
      g: 'proj', title: 'Máy tính cho máy chiếu', st: s.pcMake === 'other' ? 'note' : under ? 'note' : 'ok',
      text: s.pcMake === 'other' ? `Máy khác: cần tương đương ${need.name} (${need.gpu}) cho máy chiếu ${pp.res} ${pr.name}.`
        : `${pc?.name}: ${pc?.descVi} (${pc?.gpu}). ` + (under ? `Dưới mức khuyến nghị; nên dùng ${need.name}.` : `Khớp với máy chiếu ${pp.res} ${pr.name}.`) + ' Chỉ mang tính tham khảo: đội tư vấn sẽ xác nhận máy tính cho toàn bộ hệ thống.',
    });
  }

  // Cỏ
  if (p.turf) {
    const t = p.turf, w = t.x1 - t.x0, l = t.z1 - t.z0;
    if (t.kind === 'sigpro') out.push({ g: 'turf', title: 'Sàn SIGPRO', st: 'note', estimate: true, text: `Sàn SIGPRO ${fmtDims(w, l, m)}, cao 2 3/8 in, mép vát, dải đánh 12×28 in và 4 lỗ cốc, thay cho thảm. Vị trí dải đánh và cốc là ước tính.` });
    else {
      const cover = t.cover === 'mat' ? `từ màn tới ${L(RULES.turfPast)} quá thảm` : t.cover === 'enc' ? 'dài bằng enclosure' : 'kín tường';
      out.push({
        g: 'turf', title: t.kind === 'pad' ? 'Thảm đáp bóng' : 'Cỏ', st: 'note', estimate: true,
        text: `Cỏ ${cover}: ${fmtDims(w, l, m)}. Cuộn rộng tối đa ${L(RULES.turfRoll)}, cắt theo chiều dài. ` +
          (t.pieces.length === 1 ? 'Một tấm, trải từ màn về, không có đường nối.' : `${t.pieces.length} tấm trải ngang phòng, đường nối tại ${t.seams.map(z => L(z)).join(', ')} từ tường màn (mép thảm, dễ giấu nhất).`) +
          ' Cỏ tính dày 1/2 in.',
      });
    }
  }

  // PC vị trí
  if (p.pc) {
    const pc = p.pc;
    let st: Status = pc.clearance < 0 ? 'fail' : 'ok';
    if (pc.faceSide && pc.desk.z0 < p.teeZ + 0.5 && Math.abs((pc.wall === 'R' ? pc.desk.x0 : pc.desk.x1) - p.ballX) < RULES.pcFaceGap) st = worst([st, 'warn']);
    if (pc.desk.z1 < p.teeZ) st = worst([st, 'warn']);
    out.push({
      g: 'pc', title: 'Vị trí máy tính', st,
      text: `Đặt ở tường ${pc.wall === 'R' ? 'phải' : 'trái'}, ${pc.faceSide ? 'phía golfer nhìn' : 'phía sau lưng golfer'}, cách bóng ${L(pc.distBall)}. ` +
        (pc.clearance < 0 ? 'Nằm trong vùng swing.' : 'Ngoài vùng swing.') + (pc.desk.z1 < p.teeZ ? ' Đang ở trước bóng — không nên.' : ''),
      fix: st === 'ok' ? undefined : 'Dời máy tính về góc sau, phía golfer nhìn.',
    });
    if (s.tvs === 3 && p.Heff < 9.5) out.push({ g: 'pc', title: 'Hai màn chồng nhau', st: 'note', text: `Trần ${L(p.Heff)} hơi thấp cho hai màn chồng; màn trên sẽ sát trần.` });
  }
  if (p.seat) {
    const c = envClearance(p.env, p.seat);
    out.push({ g: 'pc', title: 'Ghế ngồi', st: c < 0 ? 'fail' : c * 12 < 6 ? 'warn' : 'ok', text: c === Infinity ? 'Ghế dọc tường sau, ngoài dải swing.' : c < 0 ? 'Ghế nằm trong vùng swing.' : `Ghế cách đường swing ${G(c)}.` });
  }

  // Vật treo
  for (const o of p.obstacles) {
    const c = envClearance(p.env, o);
    if (c === Infinity) { out.push({ g: 'obs', title: `${o.name}: swing`, st: 'ok', text: `Đáy ${o.name.toLowerCase()} cao ${L(o.y0)}, nằm ngoài dải swing.`, estimate: true }); continue; }
    const st: Status = c * 12 < RULES.headroomFailIn ? 'fail' : c * 12 < RULES.headroomOkIn ? 'warn' : 'ok';
    out.push({
      g: 'obs', title: `${o.name}: swing`, st, estimate: true,
      text: `Đáy ${o.name.toLowerCase()} cao ${L(o.y0)}; ${c >= 0 ? `còn ${G(c)}` : `thiếu ${G(-c)}`} tới đường swing.`,
      fix: st === 'ok' ? undefined : 'Dời tee ra khỏi vật treo hoặc giảm độ thả của vật.',
    });
  }
  for (const f of p.fixtures) {
    const c = envClearance(p.env, f);
    out.push({ g: 'obs', title: `${f.name}`, st: c < 0 ? 'fail' : c < 0.5 ? 'warn' : 'ok', text: c === Infinity ? `${f.name} ngoài dải swing.` : c < 0 ? `${f.name} nằm trong vùng swing.` : `${f.name} cách đường swing ${G(c)}.` });
  }

  // Ô tô
  if (p.car) {
    const c = p.car, car = c.car, R = CAR_RULES;
    const needW = car.W + 2 * R.doorSideSpare_in * IN;
    if (c.door) {
      const okW = c.doorW >= needW - 1e-6, okH = c.doorH >= car.H - 1e-6;
      out.push({ g: 'car', title: 'Qua cửa', st: okW && okH ? 'ok' : 'fail', text: `${car.name}: rộng ${L(car.W)}${car.mirrors ? ' kể gương' : ''}, cần cửa ≥ ${L(needW)}; cửa rộng ${L(c.doorW)}. Xe cao ${L(car.H)}, cửa cao ${L(c.doorH)}.` });
    } else out.push({ g: 'car', title: 'Qua cửa', st: 'note', text: 'Chưa thêm cửa gara; thêm ở mục Gara để kiểm tra xe qua cửa.' });
    // trước-sau
    let front = 0;
    const cb = c.body;
    if (s.park === 'inplace') front = p.screen.screenZ + 0.3;
    else {
      if (p.screen.kind === 'enc' && overlap1(cb.x0, cb.x1, p.screen.encX0, p.screen.encX1) > 0) front = Math.max(front, p.screen.screenZ + p.screen.encDepth);
      if (p.pc && overlap1(cb.x0, cb.x1, p.pc.desk.x0, p.pc.desk.x1) > 0) front = Math.max(front, p.pc.desk.z1);
    }
    const doorBack = !c.door || c.door.z0 >= p.D - 0.01;
    const gapFront = doorBack ? cb.z0 - front : (p.D - cb.z1);
    const okFB = gapFront >= R.frontGap_in * IN - 1e-6;
    out.push({ g: 'car', title: 'Trước-sau', st: okFB ? 'ok' : 'fail', text: `Xe dài ${L(car.L)}, đỗ cách cửa ${G(R.insideDoor_in * IN)} vào trong; phía trước còn ${G(gapFront)} (cần ≥ ${G(R.frontGap_in * IN)}).` });
    // xuống xe (bên trái xe khi đi vào)
    const driverLeft = doorBack; // xe đi về phía màn: bên tài là -x
    let lim = driverLeft ? 0 : p.W;
    const simBoxes = [p.mat, p.screen.kind === 'enc' ? { x0: p.screen.encX0, x1: p.screen.encX1 } : null].filter(Boolean) as { x0: number; x1: number }[];
    if (s.park === 'beside') for (const b of simBoxes) { if (driverLeft && b.x1 <= cb.x0 + 1e-6) lim = Math.max(lim, b.x1); if (!driverLeft && b.x0 >= cb.x1 - 1e-6) lim = Math.min(lim, b.x0); }
    const dd = driverLeft ? cb.x0 - lim : lim - cb.x1;
    out.push({ g: 'car', title: 'Xuống xe', st: dd >= R.driverDoor_ft - 1e-6 ? 'ok' : 'warn', text: `Cạnh cửa tài xế còn ${G(dd)} (cần ${L(R.driverDoor_ft)}).` });
    // nóc xe
    const over = [...p.obstacles, { ...p.proj.body, name: p.proj.p.name }, p.lm.type === 'overhead' ? { ...p.lm.body, name: p.lm.lm.name } : null].filter(Boolean) as (typeof cb & { name: string })[];
    let low = p.H, lowName = 'trần';
    for (const o of over) if (overlap1(o.x0, o.x1, cb.x0, cb.x1) > 0 && overlap1(o.z0, o.z1, cb.z0, cb.z1) > 0 && o.y0 < low) { low = o.y0; lowName = o.name; }
    const roofGap = low - cb.y1;
    out.push({ g: 'car', title: 'Nóc xe', st: roofGap >= R.roofGap_in * IN - 1e-6 ? 'ok' : 'fail', text: `Nóc xe cách ${lowName.toLowerCase()} ${G(roofGap)} (cần ≥ ${G(R.roofGap_in * IN)}).` });
    if (s.park === 'beside') {
      const sx0 = Math.min(p.env.x0, ...simBoxes.map(b => b.x0)), sx1 = Math.max(p.env.x1, ...simBoxes.map(b => b.x1));
      const gap = cb.x0 >= p.W / 2 ? cb.x0 - Math.min(sx1, p.ballX + RULES.faceOk) : Math.max(sx0, p.ballX - RULES.faceOk) - cb.x1;
      const st: Status = gap >= R.carToSim_ft - 1e-6 ? 'ok' : gap >= 0 ? 'warn' : 'fail';
      out.push({ g: 'car', title: 'Swing cạnh xe', st, text: `Xe coi như một bức tường: còn ${G(gap)} giữa xe và vùng simulator (cần ${L(R.carToSim_ft)}).` });
    }
  }

  return out;
}

export function overall(list: Check[]) {
  const st = worst(list.map(c => c.st));
  const count = (x: Status) => list.filter(c => c.st === x).length;
  return { st, ok: count('ok'), note: count('note'), warn: count('warn'), fail: count('fail') };
}

export const ST_LABEL: Record<Status, string> = { ok: 'Vừa', note: 'Ghi chú', warn: 'Chật', fail: 'Không vừa' };
export const OVERALL_LABEL: Record<Status, string> = { ok: 'Vừa', note: 'Vừa, có lưu ý', warn: 'Vừa nhưng chật', fail: 'Không vừa' };

export { ftToM, fmtFtIn, box };
