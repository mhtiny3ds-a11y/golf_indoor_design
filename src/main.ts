import './style.css';
import { run, withDefaults, State, Obstacle, enclosureFits, lmFits, projFits, Result } from './engine';
import { PRESETS, VN_PRESETS, OBSTACLE_TYPES, PARTNERS } from './engine/data';
import { encodeState, decodeState } from './engine/share';
import { summaryText } from './engine/summary';
import { fmtLen, fmtGap } from './engine/units';
import { SceneView, View } from './scene/scene';
import { renderLeft, Lists } from './ui/left';
import { renderRight, statusBox } from './ui/right';
import { readLen, esc } from './ui/fmt';

const LS_KEY = 'gcsb.build';
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;

// ---------- state ----------
function initialState(): State {
  const h = location.hash;
  if (h.startsWith('#b=')) { const s = decodeState(h.slice(3)); if (s) return s; }
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return withDefaults(JSON.parse(raw)); } catch { /* bỏ qua */ }
  return withDefaults({});
}
let S: State = initialState();
const history: State[] = [];
let R: Result = run(S);
let lists: Lists = { enc: [], lm: [], proj: [] };
const open = new Set<string>(['room', 'golfer', 'screen', 'lm', 'proj']);
let okOpen = false;

// ---------- DOM ----------
document.title = PARTNERS.brand.name;
$('#tagline').textContent = PARTNERS.brand.tagline;
const scene = new SceneView($('#viewport'));
scene.view = S.view as View;
scene.onDragTee = (x, z) => {
  const p = R.plan;
  set({ auto: false, teeOff: x - p.W / 2, teeDist: Math.max(5, Math.min(15, z - p.screen.screenZ)), encOff: p.screen.sx - p.W / 2 }, { history: false, lists: false });
};

let saveT = 0;
function persist() {
  clearTimeout(saveT);
  saveT = window.setTimeout(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch { /* bỏ qua */ } }, 300);
}

let listT = 0;
function computeLists() {
  clearTimeout(listT);
  const go = () => {
    lists = { enc: enclosureFits(S, R.plan.screen.enc?.id && S.enc === 'auto' ? R.plan.screen.enc.id : undefined), lm: lmFits(S), proj: projFits(S, S.proj === 'auto' ? R.plan.proj.p.id : undefined) };
    renderLeftPanel();
  };
  listT = window.setTimeout(go, 120);
}

function set(patch: Partial<State>, o: { history?: boolean; left?: boolean; lists?: boolean } = {}) {
  if (o.history !== false) { history.push(structuredClone(S)); if (history.length > 40) history.shift(); }
  S = { ...S, ...patch };
  refresh(o.left !== false, o.lists !== false);
}

function refresh(left = true, recomputeLists = true) {
  R = run(S);
  scene.update(R.plan);
  $('#status').innerHTML = statusBox(R);
  renderRightPanel();
  if (left) renderLeftPanel();
  else updateRangeOutputs();
  if (recomputeLists) computeLists();
  persist();
}

function renderLeftPanel() {
  const panel = $('#left');
  const active = document.activeElement as HTMLElement | null;
  const activeId = active && panel.contains(active) ? active.id : '';
  const scroll = panel.scrollTop;
  panel.innerHTML = renderLeft(S, R, lists, open);
  panel.scrollTop = scroll;
  if (activeId) document.getElementById(activeId)?.focus({ preventScroll: true });
}
function renderRightPanel() {
  const panel = $('#right');
  const scroll = panel.scrollTop;
  panel.innerHTML = renderRight(R, okOpen);
  panel.scrollTop = scroll;
}
function updateRangeOutputs() {
  const p = R.plan, m = S.metric;
  const o = (k: string, v: string) => { const el = document.getElementById('out-' + k); if (el) el.textContent = v; };
  o('teeDist', fmtLen(p.teeDist, m)); o('teeOff', fmtGap(S.auto ? p.teeOffAuto : S.teeOff, m)); o('encOff', fmtGap(S.auto ? p.encOffAuto : S.encOff, m));
  o('zoom', fmtLen(p.proj.throw, m)); o('projX', fmtGap(S.projX, m)); o('lift', `${Math.round(p.proj.off * 100)}%`);
  o('stZ', fmtLen(S.stZ ?? 0, m)); o('gtW', fmtLen(S.gtW, m)); o('frOff', fmtGap(S.frOff, m)); o('scrUp', fmtGap(S.scrUp, m));
}

// ---------- events: left ----------
const left = $('#left');
left.addEventListener('toggle', e => {
  const d = e.target as HTMLDetailsElement;
  if (d.dataset.sec) d.open ? open.add(d.dataset.sec) : open.delete(d.dataset.sec);
}, true);

left.addEventListener('change', e => {
  const t = e.target as HTMLInputElement | HTMLSelectElement;
  if (t.dataset.len) return commitLen(t.dataset.len);
  if (t.dataset.act === 'addObs' && t.value) return addObstacle(t.value as Obstacle['kind']);
  if (t.dataset.obs != null) {
    const i = +t.dataset.obs, obs = structuredClone(S.obs);
    (obs[i] as unknown as Record<string, unknown>)[t.dataset.f!] = t.type === 'checkbox' ? (t as HTMLInputElement).checked : t.value;
    return set({ obs });
  }
  if (t.dataset.fix != null) {
    const i = +t.dataset.fix, fx = structuredClone(S.fixtures);
    (fx[i] as unknown as Record<string, unknown>)[t.dataset.f!] = t.value;
    return set({ fixtures: fx });
  }
  if (t.dataset.range) return set({}, { history: false });
  const k = t.dataset.k as keyof State | undefined;
  if (!k) return;
  let v: unknown = t.type === 'checkbox' ? (t as HTMLInputElement).checked : t.value;
  if (['tvs', 'tvIn', 'encD', 'netW', 'stW'].includes(k)) v = Number(v);
  const patch: Partial<State> = { [k]: v } as Partial<State>;
  if (k === 'proj' || k === 'enc' || k === 'lm') Object.assign(patch, { projX: 0, lift: null });
  if (k === 'turfKind' && v === 'sigpro') patch.enc = 'auto';
  set(patch);
});

left.addEventListener('input', e => {
  const t = e.target as HTMLInputElement;
  const k = t.dataset.range;
  if (!k) return;
  const v = parseFloat(t.value);
  const p = R.plan;
  const patch: Partial<State> = {};
  if (k === 'teeDist' || k === 'teeOff' || k === 'encOff') {
    Object.assign(patch, { auto: false, teeDist: p.teeDist, teeOff: S.auto ? p.teeOffAuto : S.teeOff, encOff: S.auto ? p.encOffAuto : S.encOff });
  }
  (patch as Record<string, unknown>)[k] = v;
  const firstMove = S.auto && (k === 'teeDist' || k === 'teeOff' || k === 'encOff');
  if (firstMove) history.push(structuredClone(S));
  set(patch, { history: false, left: false, lists: false });
});

left.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
  if (!b) return;
  if (b.dataset.set) {
    const k = b.dataset.set as keyof State;
    let v: unknown = b.dataset.v;
    if (v === 'true' || v === 'false') v = v === 'true';
    else if (['encD', 'netW', 'tvIn', 'finRun'].includes(k)) v = Number(v);
    const patch = { [k]: v } as Partial<State>;
    if (k === 'proj' || k === 'enc' || k === 'lm') Object.assign(patch, { projX: 0, lift: null });
    if (k === 'hand' || k === 'screen') patch.auto = true;
    return set(patch);
  }
  if (b.dataset.preset) return applyPreset(b.dataset.preset);
  if (b.dataset.wall) { const w = b.dataset.wall as 'left' | 'back' | 'right'; return set({ walls: { ...S.walls, [w]: !S.walls[w] } }); }
  if (b.dataset.obsDel != null) { const obs = S.obs.filter((_, i) => i !== +b.dataset.obsDel!); return set({ obs }); }
  if (b.dataset.fixDel != null) { const fixtures = S.fixtures.filter((_, i) => i !== +b.dataset.fixDel!); return set({ fixtures }); }
  switch (b.dataset.act) {
    case 'custom': open.add('room'); (left.querySelector('input[data-len="W"]') as HTMLInputElement)?.focus(); break;
    case 'autoLayout': set({ auto: true, teeOff: 0, encOff: 0 }); break;
    case 'undo': undo(); break;
    case 'addCab': if (S.fixtures.length < 6) set({ fixtures: [...S.fixtures, { kind: 'cabinet', wall: 'back', pos: S.W - 2, w: 3, h: 3, d: 2 }] }); break;
    case 'addDoor': if (S.fixtures.length < 6) set({ fixtures: [...S.fixtures, { kind: 'door', wall: 'left', pos: S.D - 2, w: 3, h: 6.67, d: 3 }] }); break;
    case 'addGarage': addObstacle('garage'); break;
  }
});

function commitLen(key: string) {
  const v = readLen(left, key);
  if (v == null || !(v >= 0)) return;
  if (key.startsWith('obs.')) {
    const [, i, f] = key.split('.'); const obs = structuredClone(S.obs);
    (obs[+i] as unknown as Record<string, number>)[f] = v; return set({ obs });
  }
  if (key.startsWith('fix.')) {
    const [, i, f] = key.split('.'); const fx = structuredClone(S.fixtures);
    (fx[+i] as unknown as Record<string, number>)[f] = v; return set({ fixtures: fx });
  }
  const lim: Record<string, [number, number]> = { W: [6, 40], D: [8, 50], H: [7, 20], G: [4, 7.5], scrW: [4, 20], scrH: [3, 12], carL: [10, 25], carW: [5, 9], carH: [4, 9] };
  const [a, b] = lim[key] ?? [0, 100];
  set({ [key]: Math.max(a, Math.min(b, v)) } as Partial<State>);
}

function addObstacle(kind: Obstacle['kind']) {
  if (S.obs.length >= 6) return;
  const t = OBSTACLE_TYPES.find(x => x.id === kind)!;
  const o: Obstacle = kind === 'garage'
    ? { kind, dir: 'across', pos: S.W / 2, w: 0, drop: 0, wall: 'back', doorW: t.doorW ?? 9, doorH: t.doorH ?? 7, opener: 'rail', isOpen: false }
    : { kind, dir: 'across', pos: Math.round(S.D * 0.55), w: t.w ?? 1, drop: t.drop ?? 0.67 };
  if (kind === 'garage') open.add('garage');
  set({ obs: [...S.obs, o] });
}

function applyPreset(id: string) {
  const pre = PRESETS.find(x => x.id === id);
  if (pre && pre.W != null) {
    const base = pre.state ? withDefaults({ metric: S.metric, ...(pre.state as Partial<State>) }) : { ...S };
    return set({ ...base, W: pre.W, D: pre.D!, H: pre.H!, auto: true, view: S.view });
  }
  if (id.startsWith('vn')) { const v = VN_PRESETS[+id.slice(2)]; return set({ W: v.W, D: v.D, H: v.H, auto: true }); }
}

function undo() {
  const prev = history.pop();
  if (!prev) return toast('Không còn bước để hoàn tác');
  S = prev; refresh();
}

// ---------- events: right ----------
const right = $('#right');
right.addEventListener('toggle', e => { const d = e.target as HTMLDetailsElement; if (d.dataset.sec === 'okList') okOpen = d.open; }, true);
right.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
  if (!b) return;
  if (b.dataset.focus) { scene.focus(b.dataset.focus); setViewTabs('3d'); return; }
  if (b.dataset.copy) return copy(b.dataset.copy, 'Đã sao chép mã');
  switch (b.dataset.act) {
    case 'lead': return openLead();
    case 'share': return openShare();
    case 'shareImg': return openImage();
    case 'copySummary': return copy(summaryText(R.plan, R.checks, R.overall, shareLink()), 'Đã sao chép tóm tắt');
    case 'scrollBuild': document.getElementById('build')?.scrollIntoView({ behavior: 'smooth' }); return;
  }
});

// ---------- viewport ----------
function setViewTabs(v: View) {
  document.querySelectorAll<HTMLButtonElement>('#views button').forEach(b => { b.classList.toggle('on', b.dataset.view === v); b.setAttribute('aria-pressed', String(b.dataset.view === v)); });
}
$('#views').addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest('button'); if (!b?.dataset.view) return;
  const v = b.dataset.view as View; S.view = v; scene.setView(v); setViewTabs(v); persist();
});
$('#moveBtn').addEventListener('click', () => {
  scene.moveMode = !scene.moveMode;
  $('#moveBtn').classList.toggle('on', scene.moveMode);
  $('#moveBtn').setAttribute('aria-pressed', String(scene.moveMode));
  toast(scene.moveMode ? 'Kéo thảm/tee trên sàn để di chuyển' : 'Đã tắt tự di chuyển');
  if (scene.moveMode && scene.view === '3d') { scene.setView('top'); setViewTabs('top'); }
});
$('#swingBtn').addEventListener('click', () => { if (!scene.playSwing()) toast('Mô hình golfer này chưa có animation swing'); });
$('#zoomIn').addEventListener('click', () => scene.zoomBy(1.2));
$('#zoomOut').addEventListener('click', () => scene.zoomBy(1 / 1.2));
$('#resetCam').addEventListener('click', () => scene.setView(scene.view, true));
$('#snap').addEventListener('click', () => openImage());

// ---------- header ----------
$('#fullBtn').addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('#app').requestFullscreen(); }
  catch { toast('Trình duyệt này không cho phép toàn màn hình'); }
});
$('#leadBtn').addEventListener('click', () => openLead());
$('#shareBtn').addEventListener('click', () => openShare());
$('#resetBtn').addEventListener('click', () => openModal('Làm lại từ đầu?', `<p>Mọi lựa chọn sẽ về mặc định và cấu hình đã lưu trên trình duyệt này bị xoá.</p><div class="row2"><button type="button" class="btn" data-close>Huỷ</button><button type="button" class="btn danger" id="doReset">Làm lại</button></div>`, m => {
  m.querySelector('#doReset')!.addEventListener('click', () => {
    try { localStorage.removeItem(LS_KEY); } catch { /* bỏ qua */ }
    history.length = 0; S = withDefaults({}); if (location.hash) history_replace(); closeModal(); refresh(); scene.setView('3d', true); setViewTabs('3d'); toast('Đã về cấu hình mặc định');
  });
}));
function history_replace() { try { window.history.replaceState(null, '', location.pathname + location.search); } catch { /* bỏ qua */ } }

// ---------- modals ----------
function openModal(title: string, body: string, init?: (m: HTMLElement) => void) {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><header><h3 id="modalTitle">${title}</h3><button type="button" class="x" data-close aria-label="Đóng">✕</button></header><div class="modal-body">${body}</div></div>`;
  m.hidden = false;
  m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
  init?.(m);
  (m.querySelector('input, button.primary, button') as HTMLElement | null)?.focus();
}
function closeModal() { $('#modal').hidden = true; $('#modal').innerHTML = ''; }
$('#modal').addEventListener('click', e => { if (e.target === $('#modal')) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

function shareLink() { return `${location.origin}${location.pathname}#b=${encodeState(S)}`; }

function openShare() {
  const code = encodeState(S), link = shareLink();
  openModal('Chia sẻ cấu hình', `
    <label class="field"><span>Link cấu hình</span><input id="shareLink" readonly value="${esc(link)}"></label>
    <div class="row2"><button type="button" class="btn primary" id="cpLink">Sao chép link</button><button type="button" class="btn" id="cpCode">Sao chép mã cấu hình</button></div>
    <p class="hint">Nếu link không mở đúng cấu hình (ví dụ khi app được nhúng trong trang khác), dán mã cấu hình vào ô dưới.</p>
    <label class="field"><span>Mở từ mã cấu hình</span><textarea id="importCode" rows="3" placeholder="Dán mã ở đây"></textarea></label>
    <button type="button" class="btn" id="doImport">Mở cấu hình</button>
    <hr><button type="button" class="btn" id="toImg">Tạo ảnh cấu hình</button>`, m => {
    m.querySelector('#cpLink')!.addEventListener('click', () => copy(link, 'Đã sao chép link'));
    m.querySelector('#cpCode')!.addEventListener('click', () => copy(code, 'Đã sao chép mã'));
    m.querySelector('#doImport')!.addEventListener('click', () => {
      const s = decodeState((m.querySelector('#importCode') as HTMLTextAreaElement).value);
      if (!s) return toast('Mã không hợp lệ. Kiểm tra lại đoạn đã dán.');
      history.push(structuredClone(S)); S = s; closeModal(); refresh(); toast('Đã mở cấu hình');
    });
    m.querySelector('#toImg')!.addEventListener('click', () => openImage());
  });
}

function openImage() {
  const url = scene.snapshot(`${PARTNERS.brand.name} · ${R.plan.screen.name} · ${R.plan.proj.p.name} · ${R.plan.lm.lm.name}`);
  openModal('Ảnh cấu hình', `<img class="snap" src="${url}" alt="Ảnh 3D của cấu hình phòng golf"><p class="hint">Nhấn giữ (điện thoại) hoặc chuột phải (máy tính) để lưu ảnh.</p><a class="btn" href="${url}" download="cau-hinh-phong-golf.png">Tải ảnh</a>`);
}

function openLead() {
  const summary = summaryText(R.plan, R.checks, R.overall, shareLink());
  openModal('Nhận báo giá + mã', `
    <form id="leadForm" novalidate>
      <label class="field"><span>Họ tên *</span><input id="lf-name" required autocomplete="name"></label>
      <div class="row2"><label class="field"><span>Email</span><input id="lf-email" type="email" autocomplete="email"></label>
      <label class="field"><span>Điện thoại / Zalo</span><input id="lf-phone" type="tel" autocomplete="tel"></label></div>
      <label class="field"><span>Tỉnh/thành</span><input id="lf-city" autocomplete="address-level1"></label>
      <fieldset><legend>Bạn cần</legend>${['Báo giá trọn gói', 'Mã giảm giá thiết bị', 'Kiểm tra bố cục', 'Giá lắp đặt', 'Máy tính trong gói'].map((x, i) => `<label class="chk"><input type="checkbox" id="lf-need${i}" value="${x}" ${i < 3 ? 'checked' : ''}><span>${x}</span></label>`).join('')}</fieldset>
      <label class="field"><span>Ghi chú</span><textarea id="lf-note" rows="3"></textarea></label>
      <p class="err" id="lf-err" role="alert"></p>
      <button type="submit" class="btn primary">Gửi yêu cầu</button>
      <p class="hint">Cấu hình và ảnh 3D được gửi kèm. Không có gì được gửi trước khi bạn bấm Gửi.</p>
    </form>`, m => {
    m.querySelector('#leadForm')!.addEventListener('submit', async ev => {
      ev.preventDefault();
      const val = (id: string) => (m.querySelector('#' + id) as HTMLInputElement).value.trim();
      const err = m.querySelector('#lf-err')!;
      if (!val('lf-name')) { err.textContent = 'Nhập họ tên để đội tư vấn xưng hô.'; return; }
      if (!val('lf-email') && !val('lf-phone')) { err.textContent = 'Nhập email hoặc số điện thoại để đội tư vấn liên hệ lại.'; return; }
      const needs = [...m.querySelectorAll<HTMLInputElement>('fieldset input:checked')].map(x => x.value);
      const payload = { name: val('lf-name'), email: val('lf-email'), phone: val('lf-phone'), city: val('lf-city'), needs, note: val('lf-note'), state: S, summary, image: scene.snapshot(PARTNERS.brand.name) };
      if (PARTNERS.leadEndpoint) {
        try {
          const res = await fetch(PARTNERS.leadEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (!res.ok) throw new Error(String(res.status));
          m.querySelector('.modal-body')!.innerHTML = '<p class="ok-msg">Đã gửi. Đội tư vấn sẽ liên hệ lại trong 1 ngày làm việc.</p><button type="button" class="btn" data-close>Đóng</button>';
          m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
        } catch { err.textContent = 'Không gửi được. Kiểm tra kết nối mạng rồi thử lại.'; }
        return;
      }
      const c = PARTNERS.contact;
      const text = `Yêu cầu tư vấn\nHọ tên: ${payload.name}\nEmail: ${payload.email}\nĐiện thoại: ${payload.phone}\nTỉnh/thành: ${payload.city}\nCần: ${needs.join(', ')}\nGhi chú: ${payload.note}\n\n${summary}`;
      m.querySelector('.modal-body')!.innerHTML = `<p>Chưa cấu hình nơi nhận tự động. Sao chép nội dung dưới đây và gửi cho đội tư vấn${c.email ? ` qua email <b>${esc(c.email)}</b>` : ''}${c.phone ? `, điện thoại <b>${esc(c.phone)}</b>` : ''}${c.zalo ? `, Zalo <b>${esc(c.zalo)}</b>` : ''}.</p><textarea rows="12" readonly id="leadText">${esc(text)}</textarea><button type="button" class="btn primary" id="cpLead">Sao chép nội dung</button>`;
      m.querySelector('#cpLead')!.addEventListener('click', () => copy(text, 'Đã sao chép nội dung'));
    });
  });
}

// ---------- utils ----------
async function copy(text: string, msg: string) {
  try { await navigator.clipboard.writeText(text); toast(msg); }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(msg); } catch { toast('Không sao chép được; hãy chọn và sao chép thủ công'); }
    ta.remove();
  }
}
let toastT = 0;
function toast(msg: string) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = window.setTimeout(() => (t.hidden = true), 2400);
}

window.addEventListener('hashchange', () => {
  if (location.hash.startsWith('#b=')) { const s = decodeState(location.hash.slice(3)); if (s) { S = s; refresh(); } }
});

// ---------- boot ----------
setViewTabs(S.view as View);
refresh();
scene.setView(S.view as View, true);
