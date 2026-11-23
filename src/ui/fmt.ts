import { ftToM, mToFt } from '../engine/units';

export const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Ô nhập độ dài: mét (1 ô) hoặc ft + in (2 ô). data-len="key" để main.ts gắn sự kiện. */
export function lenInput(key: string, ft: number, metric: boolean, label: string, opts: { min?: number; max?: number } = {}): string {
  const id = 'len-' + key.replace(/[^a-z0-9]/gi, '-');
  if (metric) {
    return `<label class="len" for="${id}"><span>${label}</span><span class="len-in"><input id="${id}" type="number" inputmode="decimal" step="0.01" min="${opts.min != null ? ftToM(opts.min).toFixed(2) : ''}" max="${opts.max != null ? ftToM(opts.max).toFixed(2) : ''}" value="${ftToM(ft).toFixed(2)}" data-len="${key}" data-u="m"><em>m</em></span></label>`;
  }
  const f = Math.floor(ft + 1e-6), i = Math.round((ft - f) * 12 * 10) / 10;
  return `<label class="len" for="${id}"><span>${label}</span><span class="len-in"><input id="${id}" type="number" inputmode="numeric" step="1" value="${f}" data-len="${key}" data-u="ft"><em>ft</em><input id="${id}-in" type="number" inputmode="decimal" step="0.5" value="${i}" data-len="${key}" data-u="in" aria-label="${label} (inch)"><em>in</em></span></label>`;
}

export function readLen(root: HTMLElement, key: string): number | null {
  const m = root.querySelector<HTMLInputElement>(`input[data-len="${key}"][data-u="m"]`);
  if (m) { const v = parseFloat(m.value.replace(',', '.')); return isFinite(v) ? mToFt(v) : null; }
  const f = root.querySelector<HTMLInputElement>(`input[data-len="${key}"][data-u="ft"]`);
  const i = root.querySelector<HTMLInputElement>(`input[data-len="${key}"][data-u="in"]`);
  if (!f) return null;
  const fv = parseFloat(f.value || '0'), iv = parseFloat((i?.value || '0').replace(',', '.'));
  if (!isFinite(fv) || !isFinite(iv)) return null;
  return fv + iv / 12;
}

export function seg(key: string, value: string, opts: [string, string][], aria: string): string {
  return `<div class="seg" role="group" aria-label="${aria}">${opts.map(([v, l]) => `<button type="button" data-set="${key}" data-v="${v}" aria-pressed="${v === value}" class="${v === value ? 'on' : ''}">${l}</button>`).join('')}</div>`;
}

export function sel(key: string, value: string, opts: [string, string][], label: string, extra = ''): string {
  const id = 'sel-' + key;
  return `<label class="field" for="${id}"><span>${label}</span><select id="${id}" data-k="${key}" ${extra}>${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
}

export function chk(key: string, on: boolean, label: string): string {
  return `<label class="chk" for="chk-${key}"><input type="checkbox" id="chk-${key}" data-k="${key}" data-type="bool" ${on ? 'checked' : ''}><span>${label}</span></label>`;
}

export function range(key: string, value: number, min: number, max: number, step: number, label: string, out: string): string {
  return `<label class="range" for="rg-${key}"><span>${label}</span><output id="out-${key}">${out}</output><input type="range" id="rg-${key}" data-range="${key}" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
}

export const badge = (st: string) => {
  const map: Record<string, string> = { ok: 'Vừa', note: 'Ghi chú', warn: 'Chật', fail: 'Không vừa' };
  return `<span class="badge b-${st}">${map[st] ?? st}</span>`;
};
