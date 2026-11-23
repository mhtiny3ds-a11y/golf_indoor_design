import { State } from '../engine/state';
import { Result, FitItem, countFits } from '../engine';
import { ENCLOSURES, LMS, PROJECTORS, SCREENS, CARS, PCS, PRESETS, VN_PRESETS, MATS, OBSTACLE_TYPES, SOFTWARE } from '../engine/data';
import { fmtLen, fmtDims, shortFtIn, ftToM, fmtGap } from '../engine/units';
import { lenInput, seg, sel, chk, range, badge, esc } from './fmt';

export interface Lists { enc: FitItem[]; lm: FitItem[]; proj: FitItem[] }

const sizeTxt = (W: number, D: number, H: number, metric: boolean) =>
  metric ? `${ftToM(W).toFixed(1).replace('.', ',')} × ${ftToM(D).toFixed(1).replace('.', ',')} × ${ftToM(H).toFixed(2).replace('.', ',')} m` : `${shortFtIn(W)} × ${shortFtIn(D)} × ${shortFtIn(H)}`;

function section(id: string, title: string, body: string, open: Set<string>, summary = '') {
  return `<details class="sec" data-sec="${id}" ${open.has(id) ? 'open' : ''}><summary><h2>${title}</h2>${summary ? `<span class="sum">${summary}</span>` : ''}</summary><div class="sec-body">${body}</div></details>`;
}
function sub(id: string, title: string, summary: string, body: string, open: Set<string>) {
  return `<details class="subsec" data-sec="${id}" ${open.has(id) ? 'open' : ''}><summary><span>${title}</span><span class="sum">${summary}</span></summary><div class="sec-body">${body}</div></details>`;
}
function fitList(items: FitItem[], key: string, current: string) {
  return `<div class="fitlist">${items.map(i => `<button type="button" data-set="${key}" data-v="${i.id}" class="${i.id === current ? 'cur' : ''}"><span>${esc(i.name)}</span>${i.best ? '<span class="badge b-best">Phù hợp nhất</span>' : ''}${badge(i.st)}</button>`).join('')}</div>`;
}
const fitSummary = (items: FitItem[]) => { const c = countFits(items); return `${c.ok} vừa${c.warn ? ` · ${c.warn} chật` : ''}${c.fail ? ` · ${c.fail} không vừa` : ''}`; };

export function renderLeft(s: State, r: Result, lists: Lists, open: Set<string>): string {
  const m = s.metric, p = r.plan;
  const L = (v: number) => fmtLen(v, m);
  const presetMatch = (W: number, D: number, H: number) => Math.abs(W - s.W) < 0.01 && Math.abs(D - s.D) < 0.01 && Math.abs(H - s.H) < 0.01;
  const presets = [
    ...PRESETS.filter(x => x.W != null).map(x => ({ id: x.id, name: x.nameVi, W: x.W!, D: x.D!, H: x.H! })),
    ...VN_PRESETS.map((x, i) => ({ id: 'vn' + i, name: x.nameVi.replace(/ \(.*\)/, ''), W: x.W, D: x.D, H: x.H })),
  ];
  const anyMatch = presets.some(x => presetMatch(x.W, x.D, x.H));
  const wallsOn = s.walls.left && s.walls.back && s.walls.right;

  // ---------- 1. Phòng ----------
  const obsList = s.obs.map((o, i) => {
    const t = OBSTACLE_TYPES.find(x => x.id === o.kind)!;
    if (o.kind === 'garage') {
      return `<div class="obs"><div class="obs-h"><b>Cửa gara</b><button type="button" class="x" data-obs-del="${i}" aria-label="Xoá cửa gara">Xoá</button></div>
        <div class="row2">${selObs(i, 'wall', o.wall ?? 'back', [['back', 'Tường sau'], ['front', 'Tường màn'], ['left', 'Tường trái'], ['right', 'Tường phải']], 'Tường')}
        ${selObs(i, 'opener', o.opener ?? 'rail', [['rail', 'Motor ray trần'], ['side', 'Motor gắn hông']], 'Motor')}</div>
        <div class="row2">${lenInput(`obs.${i}.doorW`, o.doorW ?? 9, m, 'Rộng cửa')}${lenInput(`obs.${i}.doorH`, o.doorH ?? 7, m, 'Cao cửa')}</div>
        ${lenInput(`obs.${i}.pos`, o.pos, m, 'Tâm cửa, tính từ góc')}
        <label class="chk"><input type="checkbox" data-obs="${i}" data-f="isOpen" ${o.isOpen ? 'checked' : ''}><span>Cửa đang mở</span></label></div>`;
    }
    return `<div class="obs"><div class="obs-h"><b>${t.nameVi} ${i + 1}</b><button type="button" class="x" data-obs-del="${i}" aria-label="Xoá ${t.nameVi}">Xoá</button></div>
      ${selObs(i, 'dir', o.dir, [['across', 'Ngang phòng'], ['along', 'Dọc phòng']], 'Hướng')}
      ${lenInput(`obs.${i}.pos`, o.pos, m, o.dir === 'across' ? 'Vị trí tâm, tính từ tường màn' : 'Vị trí tâm, tính từ tường trái')}
      <div class="row2">${lenInput(`obs.${i}.w`, o.w, m, o.kind === 'round' ? 'Đường kính' : 'Rộng')}${o.kind === 'round' ? '' : lenInput(`obs.${i}.drop`, o.drop, m, 'Thả xuống')}</div></div>`;
  }).join('');

  const fixtures = s.fixtures.map((f, i) => `<div class="obs"><div class="obs-h"><b>${f.kind === 'cabinet' ? 'Tủ' : 'Cửa ra vào'} ${i + 1}</b><button type="button" class="x" data-fix-del="${i}" aria-label="Xoá">Xoá</button></div>
    ${selFix(i, 'wall', f.wall, [['left', 'Tường trái'], ['right', 'Tường phải'], ['back', 'Tường sau']], 'Tường')}
    ${lenInput(`fix.${i}.pos`, f.pos, m, f.wall === 'back' ? 'Tâm, tính từ tường trái' : 'Tâm, tính từ tường màn')}
    <div class="row2">${lenInput(`fix.${i}.w`, f.w, m, 'Rộng')}${lenInput(`fix.${i}.d`, f.d, m, 'Sâu')}</div></div>`).join('');

  const pcOpts: [string, string][] = [['none', 'Không'], ['cab', 'Tủ PC + màn cảm ứng 27"'], ['shelf', 'PC tower + kệ tường + màn 27"'], ['stand', 'Chân đứng có khay laptop + màn 32/43"']];
  const extrasSum = [s.seatOn ? 'Ghế' : '', s.pc !== 'none' ? 'Máy tính' : ''].filter(Boolean).join(', ') || 'Không';
  const extras = `
    <div class="field"><span>Ghế ngồi</span>${seg('seatOn', String(s.seatOn), [['false', 'Không'], ['true', 'Thêm ghế dọc tường sau']], 'Ghế')}</div>
    <div class="field"><span>Máy tính</span><div class="radios">${pcOpts.map(([v, l]) => `<label class="chk"><input type="radio" name="pc" data-k="pc" value="${v}" ${s.pc === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
    ${sel('soft', s.soft, SOFTWARE.map(x => [x.id, x.name]), 'Phần mềm mô phỏng')}
    ${sel('pcMake', s.pcMake, [['match', `Tự khớp theo máy chiếu (${PCS.find(x => x.id === p.pcMatchId)?.name})`], ...PCS.map(x => [x.id, `${x.name} · ${x.gpu}`] as [string, string]), ['other', 'Máy khác']], 'Máy tính nào')}
    ${s.pc !== 'none' ? `
    ${sel('tvs', String(s.tvs), [['0', 'Không'], ['1', 'Một màn'], ['2', 'Hai màn cạnh nhau'], ['3', 'Hai màn chồng nhau']], 'Màn cảm ứng treo tường')}
    ${s.tvs ? `<div class="field"><span>Cỡ màn</span>${seg('tvIn', String(s.tvIn), [['32', '32"'], ['43', '43"']], 'Cỡ màn')}</div>${chk('keepDesk', s.keepDesk, 'Giữ màn 27" trên bàn')}` : ''}
    <div class="field"><span>Tường đặt</span>${seg('stSide', s.stSide, [['auto', 'Tự chọn'], ['L', 'Tường trái'], ['R', 'Tường phải']], 'Tường đặt máy tính')}</div>
    ${range('stZ', s.stZ ?? (p.pc ? (p.pc.desk.z0 + p.pc.desk.z1) / 2 : s.D - 2), 1, s.D - 1, 0.25, 'Vị trí giữa, tính từ tường màn', L(s.stZ ?? (p.pc ? (p.pc.desk.z0 + p.pc.desk.z1) / 2 : s.D - 2)))}` : ''}`;

  const garage = s.obs.some(o => o.kind === 'garage');
  const garageSum = garage || s.roll !== 'none' || s.park !== 'none' ? 'Bật' : 'Tắt';
  const carOpts: [string, string][] = [...CARS.map(c => [c.id, `${c.name} · ${fmtDims(c.L, c.W, m)}`] as [string, string]), ['custom', 'Kích thước tự nhập']];
  const garageBody = `
    ${garage ? '' : `<button type="button" class="btn sm" data-act="addGarage">Thêm cửa gara</button>`}
    ${sel('roll', s.roll, [['none', 'Không'], ['gtrak', 'G-TRAK (trên ray cửa gara)'], ['stealth', 'Par2Pro Stealth (từ trần)'], ['proscreen', 'HomeCourse ProScreen 180 (từ trần)']], 'Màn cuộn')}
    ${s.roll === 'gtrak' ? range('gtW', s.gtW, 7, 14, 1, 'Bề rộng G-TRAK', L(s.gtW)) : ''}
    ${s.roll === 'stealth' ? sel('stW', String(s.stW), [['0', 'Lớn nhất vừa phòng'], ...[8, 9, 10, 11, 12, 13, 14, 15].map(w => [String(w), `S${w} · hình ${L(w)}`] as [string, string])], 'Cỡ Stealth') : ''}
    <div class="field"><span>Đỗ xe</span><div class="radios">${([['none', 'Không'], ['beside', 'Cạnh simulator, ô bên kia'], ['inplace', 'Ở chỗ simulator, cất màn']] as [string, string][]).map(([v, l]) => `<label class="chk"><input type="radio" name="park" data-k="park" value="${v}" ${s.park === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
    ${s.park !== 'none' ? `${sel('car', s.car, carOpts, 'Xe')}
      ${s.car === 'custom' ? `<div class="row3">${lenInput('carL', s.carL, m, 'Dài')}${lenInput('carW', s.carW, m, 'Rộng')}${lenInput('carH', s.carH, m, 'Cao')}</div>` : ''}
      <div class="field"><span>Ô đỗ</span>${seg('carSide', s.carSide, [['auto', 'Tự chọn'], ['L', 'Ô trái'], ['R', 'Ô phải']], 'Ô đỗ')}</div>
      ${s.park === 'inplace' ? `<div class="field"><span>Trạng thái</span>${seg('parkView', s.parkView, [['play', 'Sẵn sàng chơi'], ['parked', 'Đang đỗ xe']], 'Trạng thái gara')}</div>` : ''}` : ''}
    <p class="hint">Danh sách xe phổ biến tại Việt Nam sẽ bổ sung khi có thông số chính hãng.</p>`;

  const room = `
    <div class="presets">${presets.map(x => `<button type="button" data-preset="${x.id}" class="${presetMatch(x.W, x.D, x.H) ? 'on' : ''}"><b>${esc(x.name)}</b><small>${sizeTxt(x.W, x.D, x.H, m)}</small></button>`).join('')}
      <button type="button" class="${anyMatch ? '' : 'on'}" data-act="custom"><b>Tuỳ chỉnh</b><small>Nhập số đo bên dưới</small></button></div>
    ${lenInput('W', s.W, m, 'Rộng', { min: 6, max: 40 })}${lenInput('D', s.D, m, 'Sâu', { min: 8, max: 50 })}${lenInput('H', s.H, m, 'Trần', { min: 7, max: 20 })}
    ${sub('walls', 'Tường', wallsOn ? 'đủ 4 phía' : 'thiếu tường', `<div class="seg" role="group" aria-label="Tường">${(['left', 'back', 'right'] as const).map(w => `<button type="button" data-wall="${w}" aria-pressed="${!s.walls[w]}" class="${s.walls[w] ? '' : 'off'}">${{ left: 'Trái', back: 'Sau', right: 'Phải' }[w]}</button>`).join('')}</div><p class="hint">Bấm vào phía không có tường. Rèm và khung vẫn được kiểm tra.</p>`, open)}
    ${chk('metric', s.metric, 'Đơn vị mét (m, cm)')}
    <label class="field" for="addObs"><span>Dầm, ống gió, trần giật cấp</span><select id="addObs" data-act="addObs" ${s.obs.length >= 6 ? 'disabled' : ''}><option value="">Thêm dầm, ống gió hoặc trần giật cấp…</option>${OBSTACLE_TYPES.filter(t => t.id !== 'garage').map(t => `<option value="${t.id}">${t.nameVi}</option>`).join('')}</select></label>
    ${s.obs.length >= 6 ? '<p class="hint">Tối đa 6 vật (tính cả cửa gara).</p>' : ''}
    ${obsList}
    ${sub('extras', 'Tiện ích phòng', extrasSum, extras, open)}
    ${sub('fixtures', 'Tủ và cửa', s.fixtures.length ? `${s.fixtures.length} vật` : 'Không', `<div class="row2"><button type="button" class="btn sm" data-act="addCab">Thêm tủ</button><button type="button" class="btn sm" data-act="addDoor">Thêm cửa ra vào</button></div>${fixtures}`, open)}
    ${sub('garage', 'Gara', garageSum, garageBody, open)}`;

  // ---------- 2. Golfer ----------
  const golfer = `${lenInput('G', s.G, m, 'Chiều cao người cao nhất', { min: 4, max: 7.5 })}
    <div class="field"><span>Tay thuận</span>${seg('hand', s.hand, [['R', 'Tay phải'], ['L', 'Tay trái'], ['B', 'Cả hai']], 'Tay thuận')}</div>`;

  // ---------- 3. Màn ----------
  const enc = p.screen.enc;
  const scrOpts: [string, string][] = [['wall', 'Lấp đầy tường'], ['custom', 'Tự nhập'],
    ...SCREENS.map(x => [x.id, `${x.brand === 'sig' ? 'SIGPRO' : "Carl's"} ${x.ratio} · ${m ? `${ftToM(x.oh).toFixed(2).replace('.', ',')} × ${ftToM(x.ow).toFixed(2).replace('.', ',')} m: hình ${ftToM(x.vw).toFixed(2).replace('.', ',')} × ${ftToM(x.vh).toFixed(2).replace('.', ',')}` : `${shortFtIn(x.oh)} x ${shortFtIn(x.ow)}: hình ${shortFtIn(x.vw)} x ${shortFtIn(x.vh)}`}`] as [string, string])];
  const screenBody = s.roll !== 'none' ? `<p class="hint">Đang dùng màn cuộn ${esc(p.screen.name)} (mục Gara).</p>` : `
    ${seg('screen', s.screen, [['enc', 'Khung (enclosure)'], ['built', 'Màn gắn tường']], 'Loại màn')}
    ${s.screen === 'enc' ? `
      ${sel('enc', s.enc, [['auto', `Phù hợp nhất cho phòng này${s.enc === 'auto' && enc ? ` (${enc.name})` : ''}`], ...ENCLOSURES.map(e => [e.id, e.name] as [string, string])], 'Enclosure')}
      ${enc?.deep ? `<div class="field"><span>Độ sâu Carl's Pro</span>${seg('encD', String(s.encD), [['5', L(5)], ['8', L(8)], ['10', L(10)], ['15', L(15)]], 'Độ sâu')}</div>
        <div class="field"><span>Lưới mở rộng</span>${seg('netW', String(s.netW), [['0', 'Không'], ['6', L(6)], ['8', L(8)], ['10', L(10)]], 'Lưới mở rộng')}</div>` : ''}
      ${enc?.minRoom ? `${chk('giHalf', s.giHalf, 'Vách lửng')}${chk('giBeam', s.giBeam, 'Máy chiếu trên dầm GolfIn')}` : ''}
      ${sub('encAll', 'Mọi enclosure vừa phòng này thế nào', fitSummary(lists.enc), fitList(lists.enc, 'enc', s.enc === 'auto' ? enc?.id ?? '' : s.enc), open)}
      <div class="brandbest">${p.encBestByBrand.map(b => `<div><small>Tốt nhất của ${b.brand}</small><b>${b.enc ? esc(b.enc.name) : 'Không mẫu nào vừa'}</b></div>`).join('')}</div>`
    : `
      ${sel('scr', s.scr, scrOpts, 'Kích thước màn')}
      ${s.scr === 'custom' ? `<div class="row2">${lenInput('scrW', s.scrW, m, 'Rộng hình')}${lenInput('scrH', s.scrH, m, 'Cao hình')}</div>` : ''}
      ${chk('frame', s.frame, 'Trong khung (không phủ tường-tới-tường)')}
      ${s.frame ? range('frOff', s.frOff, -4, 4, 1 / 12, 'Lệch khung so với tâm', fmtGap(s.frOff, m)) : ''}
      <div class="field"><span>Hoàn thiện xung quanh</span>${seg('fin', s.fin, [['pad', 'Đệm mút'], ['curt', 'Rèm'], ['bare', 'Tường trơn']], 'Hoàn thiện')}</div>
      ${s.fin !== 'bare' ? `<div class="field"><span>Chạy dọc tường bên</span>${seg('finRun', String(s.finRun), [3, 5, 6, 9, 10, 12].map(v => [String(v), L(v)] as [string, string]), 'Độ phủ')}</div>` : ''}
      ${s.fin === 'pad' ? `<div class="field"><span>Cỡ tấm đệm</span>${seg('padSize', s.padSize, [['3x3', m ? '0,9 × 0,9 m' : '3 × 3 ft'], ['2x2', m ? '0,6 × 0,6 m' : '2 × 2 ft']], 'Cỡ đệm')}</div>${chk('finCeil', s.finCeil, 'Ốp đệm cả trần')}` : ''}
      ${range('scrUp', s.scrUp, 0, 2, 1 / 12, 'Mép dưới màn cách sàn', fmtGap(s.scrUp, m))}`}`;

  // ---------- 4. LM ----------
  const lmBody = `${sel('lm', s.lm, LMS.map(l => [l.id, `${l.name} · ${l.type === 'overhead' ? 'treo trần' : l.type === 'side' ? 'cạnh bóng' : 'sau bóng'}`]), 'Launch monitor')}
    ${p.lm.lm.specVi ? `<p class="hint">${esc(p.lm.lm.specVi)}</p>` : ''}
    ${sub('lmAll', 'Mọi launch monitor vừa phòng này', fitSummary(lists.lm), fitList(lists.lm, 'lm', s.lm), open)}`;

  // ---------- 5. Máy chiếu ----------
  const projBody = `${sel('proj', s.proj, [['auto', `Phù hợp nhất${s.proj === 'auto' ? ` (${p.proj.p.name})` : ''}`], ...PROJECTORS.map(x => [x.id, `${x.name} · ${x.res ?? ''}`] as [string, string])], 'Máy chiếu')}
    ${chk('projFloor', s.projFloor, 'Máy chiếu đặt sàn')}
    ${sub('projAll', 'Mọi máy chiếu vừa màn này', fitSummary(lists.proj), fitList(lists.proj, 'proj', s.proj === 'auto' ? p.proj.p.id : s.proj), open)}`;

  // ---------- 6. Thảm ----------
  const matBody = `<div class="field"><span>Hãng</span><div class="seg" role="group" aria-label="Hãng thảm"><button type="button" class="on" aria-pressed="true">SIGPRO</button><button type="button" disabled title="Chưa có dữ liệu">Carl's</button><button type="button" disabled title="Chưa có dữ liệu">Fiberbuilt</button></div></div>
    ${sel('mat', s.mat, [['auto', `Tự chọn theo bố cục (${p.mat.mat?.nameVi.replace(' (gợi ý)', '') ?? '—'})`], ...MATS.map(x => [x.id, `${x.nameVi} · ${x.kind === 'double' ? 'rộng gấp đôi' : 'một phía'}`] as [string, string])], 'Mẫu thảm', s.turfKind === 'sigpro' ? 'disabled' : '')}
    ${sel('matMode', s.matMode, [['auto', 'Tốt nhất cho phòng'], ['double', 'Rộng gấp đôi, tee giữa'], ['single', 'Một phía, tee lệch']], 'Bố cục')}
    ${s.turfKind === 'sigpro' ? '<p class="hint">Sàn SIGPRO thay cho thảm đánh.</p>' : ''}`;

  // ---------- 7. Cỏ ----------
  const turfBody = `<div class="field"><span>Loại</span>${seg('turfKind', s.turfKind, [['partner', 'Cỏ đối tác'], ['pad', 'Thảm đáp bóng SIG'], ['sigpro', 'Sàn SIGPRO']], 'Loại cỏ')}</div>
    ${s.turfKind !== 'sigpro' ? `<div class="field"><span>Phạm vi</span>${seg('turf', s.turf, [['mat', `${L(3)} quá thảm`], ['enc', 'Dài bằng enclosure'], ['room', 'Kín tường'], ['none', 'Không cỏ']], 'Phạm vi cỏ')}</div>` : ''}
    ${chk('recess', s.recess, 'Đặt thảm chìm, bằng mặt cỏ')}
    ${s.recess ? `<p class="hint">Sàn được nâng ${fmtGap(p.floorRaise, m)} bằng tấm gym/ván; trần, màn và enclosure đo từ sàn đã nâng.</p>` : ''}`;

  // ---------- 8. Tự di chuyển ----------
  const teeOff = s.auto ? p.teeOffAuto : s.teeOff, encOff = s.auto ? p.encOffAuto : s.encOff;
  const moveBody = `${!s.auto ? `<div class="banner">Bạn đã tự di chuyển. <button type="button" class="link" data-act="autoLayout">Khôi phục bố cục tự động</button></div>` : ''}
    ${range('teeDist', p.teeDist, 5, 15, 1 / 12, 'Tee tới màn', L(p.teeDist))}
    ${range('teeOff', teeOff, -7, 7, 1 / 12, 'Tee lệch trái/phải so với tâm phòng', fmtGap(teeOff, m))}
    ${p.screen.kind === 'enc' ? range('encOff', encOff, -6, 6, 1 / 12, 'Enclosure lệch so với tâm phòng', fmtGap(encOff, m)) : ''}
    <div class="row2"><button type="button" class="btn sm" data-act="autoLayout" ${s.auto ? 'disabled' : ''}>Để app tự đặt</button><button type="button" class="btn sm" data-act="undo">Hoàn tác</button></div>
    ${range('zoom', s.zoom, 0, 1, 0.01, 'Khoảng cách máy chiếu (zoom)', `${L(p.proj.throw)}`)}
    ${range('projX', Math.max(-p.proj.dxMax, Math.min(p.proj.dxMax, s.projX)), -Math.round(p.proj.dxMax * 100) / 100, Math.round(p.proj.dxMax * 100) / 100, 1 / 12, 'Máy chiếu lệch trái/phải', fmtGap(s.projX, m))}
    ${p.proj.lensShift ? range('lift', s.lift ?? 0.9, 0, 1, 0.01, 'Độ cao máy chiếu (lens shift)', `${Math.round(p.proj.off * 100)}%`) : ''}`;

  return [
    section('room', '1. Phòng của bạn', room, open),
    section('golfer', '2. Golfer', golfer, open, `${L(s.G)} · ${{ R: 'tay phải', L: 'tay trái', B: 'cả hai' }[s.hand]}`),
    section('screen', '3. Màn hình', screenBody, open, p.screen.name),
    section('lm', '4. Launch monitor', lmBody, open, p.lm.lm.name),
    section('proj', '5. Máy chiếu', projBody, open, p.proj.p.name),
    section('mat', '6. Thảm đánh', matBody, open, p.mat.name.replace('SIGPRO ', '')),
    section('turf', '7. Cỏ', turfBody, open, p.turf ? fmtDims(p.turf.x1 - p.turf.x0, p.turf.z1 - p.turf.z0, m) : 'Không'),
    section('move', '8. Tự di chuyển', `<p class="hint">Tee, enclosure và máy chiếu. Bật "Tự di chuyển" trên khung 3D để kéo thảm.</p>${moveBody}`, open, s.auto ? 'Tự động' : 'Đã chỉnh tay'),
  ].join('');
}

function selObs(i: number, f: string, v: string, opts: [string, string][], label: string) {
  return `<label class="field"><span>${label}</span><select data-obs="${i}" data-f="${f}">${opts.map(([a, b]) => `<option value="${a}" ${a === v ? 'selected' : ''}>${b}</option>`).join('')}</select></label>`;
}
function selFix(i: number, f: string, v: string, opts: [string, string][], label: string) {
  return `<label class="field"><span>${label}</span><select data-fix="${i}" data-f="${f}">${opts.map(([a, b]) => `<option value="${a}" ${a === v ? 'selected' : ''}>${b}</option>`).join('')}</select></label>`;
}
