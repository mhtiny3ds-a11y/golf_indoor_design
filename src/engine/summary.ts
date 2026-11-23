// Bảng thông số, diễn giải, danh sách thiết bị, văn bản tóm tắt.
import { Plan } from './solve';
import { Check, OVERALL_LABEL } from './checks';
import { fmtLen, fmtGap, fmtDims } from './units';
import { PCS, byId, PARTNERS } from './data';
import { RULES } from './rules';

export interface Row { label: string; value: string; estimate?: boolean }

export function readout(p: Plan): Row[] {
  const m = p.metric, L = (v: number) => fmtLen(v, m), G = (v: number) => fmtGap(v, m);
  const sc = p.screen, pp = p.proj;
  const rows: Row[] = [];
  rows.push({ label: 'Màn hình', value: `${sc.name}, ${fmtDims(sc.sw, sc.sh, m)} mặt chiếu, ${sc.ratio} (${Math.round(sc.diagIn)} in đường chéo)` });
  rows.push({
    label: 'Hình chiếu', value: `${fmtDims(pp.picW, pp.picH, m)}, ${pp.fill ? `Screen Fill đặt ${pp.fill}` : pp.nativeRatio === sc.ratio ? `khớp tỉ lệ gốc ${pp.nativeRatio}` : 'đặt tỉ lệ trong cài đặt hiển thị của máy tính và phần mềm'}; ảnh gốc ${pp.nativeRatio} ${fmtDims(pp.imgW, pp.imgH, m)}`,
  });
  rows.push({ label: 'Tee tới màn', value: L(p.teeDist) });
  const pos = p.layout === 'centre' ? (Math.abs(p.ballX - sc.sx) < 0.1 ? 'Giữa màn' : `Lệch ${G(Math.abs(p.ballX - sc.sx))} so với tâm màn`)
    : p.layout === 'two' ? `Hai tee, cách tâm ±${G(Math.abs(p.tees[0].x - p.W / 2))}` : `Tee lệch, cách tường lưng ${L(p.sides.back)}`;
  rows.push({ label: 'Vị trí tee', value: pos });
  rows.push({ label: 'Thảm đánh', value: p.mat.name + (p.mat.kind === 'double' ? ' (rộng gấp đôi)' : p.mat.kind === 'single' ? ' (một phía)' : '') });
  if (p.turf) rows.push({ label: 'Cỏ', value: p.turf.kind === 'sigpro' ? 'Sàn SIGPRO' : `${p.turf.kind === 'pad' ? 'Thảm đáp bóng SIG' : 'Cỏ đối tác'}, ${fmtDims(p.turf.x1 - p.turf.x0, p.turf.z1 - p.turf.z0, m)}${p.turf.pieces.length > 1 ? `, ${p.turf.pieces.length} tấm` : ''}`, estimate: true });
  else rows.push({ label: 'Cỏ', value: 'Không' });
  const pc = byId(PCS, p.pc?.pcId ?? p.pcMatchId);
  rows.push({ label: 'Máy tính', value: pc ? `${pc.name}, ${pc.gpu}` : 'Máy khác' });
  rows.push({ label: 'Vùng đánh', value: m ? `${Math.round(p.zone.dIn * 2.54)} × ${Math.round(p.zone.wIn * 2.54)} cm` : `${Math.round(p.zone.dIn)} × ${Math.round(p.zone.wIn)} in` });
  rows.push({ label: 'Tee tới tường sau', value: p.backWall === Infinity ? 'Không có tường' : L(p.backWall) });
  const lp = p.lm;
  rows.push({
    label: lp.lm.name, value: lp.type === 'overhead' ? `Treo trần, ${L(Math.abs(lp.fwd ?? 0))} ${(lp.fwd ?? 0) >= 0 ? 'trước' : 'sau'} tee${lp.dropPole ? `, ống thả ${G(lp.dropPole)}` : ''}`
      : lp.type === 'side' ? `Cạnh bóng, cách ${G(lp.lm.dist ?? 1.83)} phía golfer nhìn` : `Sau bóng ${L(lp.z - p.teeZ)}`,
  });
  rows.push({ label: pp.p.name, value: `Cách màn ${L(pp.throw)}` });
  rows.push({ label: 'Thấu kính máy chiếu', value: pp.floor ? `Đặt sàn, cao ${L(pp.lensY)}` : `Cách sàn ${L(pp.lensY)}, ống thả ${G(pp.drop)} dưới trần` });
  return rows;
}

export function explain(p: Plan): string {
  const m = p.metric, L = (v: number) => fmtLen(v, m);
  const parts: string[] = [];
  if (p.layout === 'centre') parts.push(`Tee ở giữa phòng: ${L(p.sides.back)} mỗi bên bóng. Thảm rộng gấp đôi nên người tay trái dùng chung tee.`);
  else if (p.layout === 'two') parts.push(`Phòng hẹp hơn ${L(2 * RULES.backOk * p.k)} nên dùng hai tee trên thảm rộng gấp đôi, mỗi tee lệch về phía golfer nhìn để đủ chỗ phía lưng.`);
  else parts.push(`Phòng hẹp nên tee lệch: ${L(p.sides.back)} phía lưng golfer, ${L(p.sides.face)} phía mặt. Enclosure dịch theo để bóng gần tâm màn; nhớ đặt offset tương ứng trong phần mềm mô phỏng.`);
  if (p.encAutoReason && p.state.enc === 'auto') parts.push(p.encAutoReason);
  return parts.join(' ');
}

export interface BuildItem { key: string; title: string; name: string; reason: string; url?: string; code?: string; price?: number | null; focus: string }

export function buildList(p: Plan): BuildItem[] {
  const it = (key: string) => PARTNERS.items[key] ?? {};
  const out: BuildItem[] = [];
  const sc = p.screen, s = p.state;
  if (sc.kind === 'enc' && sc.enc) {
    out.push({ key: sc.enc.id, title: 'Khung màn (enclosure)', name: sc.enc.name, reason: s.enc === 'auto' ? 'Phù hợp nhất cho phòng này' : 'Bạn chọn', ...it(sc.enc.id), price: it(sc.enc.id).priceVND, focus: 'screen' });
    const other = p.encBestByBrand.find(b => b.enc && b.enc.brand !== sc.enc!.brand);
    if (other?.enc) out.push({ key: other.enc.id, title: 'Phương án hãng khác', name: other.enc.name, reason: `Lựa chọn tốt nhất của ${other.brand} cho phòng này`, ...it(other.enc.id), price: it(other.enc.id).priceVND, focus: 'screen' });
  } else out.push({ key: sc.stdId ?? 'screen', title: 'Màn chiếu', name: sc.name, reason: `${fmtDims(sc.sw, sc.sh, p.metric)}, ${sc.ratio}`, focus: 'screen' });
  out.push({ key: p.lm.lm.id, title: 'Launch monitor', name: p.lm.lm.name, reason: p.lm.type === 'overhead' ? 'Treo trần' : p.lm.type === 'side' ? 'Đặt cạnh bóng' : 'Đặt sau bóng', ...it(p.lm.lm.id), price: it(p.lm.lm.id).priceVND, focus: 'lm' });
  out.push({ key: p.proj.p.id, title: 'Máy chiếu', name: p.proj.p.name, reason: s.proj === 'auto' ? 'Phù hợp nhất cho màn này' : 'Bạn chọn', ...it(p.proj.p.id), price: it(p.proj.p.id).priceVND, focus: 'proj' });
  out.push({ key: p.mat.mat?.id ?? 'sigpro-floor', title: 'Thảm đánh', name: p.mat.name, reason: p.mat.kind === 'double' ? 'Rộng gấp đôi, dùng cho cả hai tay' : p.mat.kind === 'single' ? 'Một phía, tee lệch' : 'Thay thảm', focus: 'mat' });
  if (p.turf && p.turf.kind !== 'sigpro') out.push({ key: 'turf', title: 'Cỏ', name: p.turf.kind === 'pad' ? 'Thảm đáp bóng SIG' : 'Cỏ đối tác', reason: `${fmtDims(p.turf.x1 - p.turf.x0, p.turf.z1 - p.turf.z0, p.metric)} (ước tính)`, focus: 'turf' });
  const pc = byId(PCS, p.pc?.pcId ?? p.pcMatchId);
  if (pc) out.push({ key: pc.id, title: 'Máy tính', name: pc.name, reason: `${pc.gpu} · ${pc.descVi}`, ...it(pc.id), price: it(pc.id).priceVND, focus: 'pc' });
  return out;
}

export function summaryText(p: Plan, checks: Check[], ov: { st: Check['st']; ok: number; note: number; warn: number; fail: number }, link?: string): string {
  const m = p.metric, L = (v: number) => fmtLen(v, m);
  const sc = p.screen, pp = p.proj, lp = p.lm;
  const hand = p.state.hand === 'R' ? 'tay phải' : p.state.hand === 'L' ? 'tay trái' : 'cả hai tay';
  const pc = byId(PCS, p.pc?.pcId ?? p.pcMatchId);
  const lines = [
    `${PARTNERS.brand.name} — cấu hình`,
    `Phòng: ${fmtDims(p.W, p.D, m)}, trần ${L(p.H)} · Golfer ${L(p.G)}, ${hand}`,
    `Màn: ${sc.name}, hình ${fmtDims(sc.sw, sc.sh, m)} (${sc.ratio}, ${Math.round(sc.diagIn)}")`,
    `Launch monitor: ${lp.lm.name} — ${lp.type === 'overhead' ? `trần, ${L(Math.abs(lp.fwd ?? 0))} ${(lp.fwd ?? 0) >= 0 ? 'trước' : 'sau'} tee` : lp.type === 'side' ? 'cạnh bóng' : `sau bóng ${L(lp.z - p.teeZ)}`}`,
    `Máy chiếu: ${pp.p.name} — cách màn ${L(pp.throw)}, thấu kính cao ${L(pp.lensY)}`,
    `Tee tới màn: ${L(p.teeDist)} · Tee tới tường sau: ${p.backWall === Infinity ? '—' : L(p.backWall)}`,
    `Thảm: ${p.mat.name} · Cỏ: ${p.turf ? fmtDims(p.turf.x1 - p.turf.x0, p.turf.z1 - p.turf.z0, m) : 'không'} · PC: ${pc?.name ?? 'máy khác'}`,
    `Kết luận: ${OVERALL_LABEL[ov.st].toUpperCase()} (${ov.ok} vừa, ${ov.note} ghi chú, ${ov.warn} chật, ${ov.fail} không vừa)`,
  ];
  const bad = checks.filter(c => c.st === 'warn' || c.st === 'fail');
  if (bad.length) lines.push('Cần lưu ý:', ...bad.map(c => `- ${c.title}: ${c.text}`));
  if (link) lines.push(`Link: ${link}`);
  return lines.join('\n');
}
