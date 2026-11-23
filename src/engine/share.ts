// Chia sẻ: chỉ lưu khoá khác mặc định → JSON → lz-string (an toàn cho URL) → #b=...
import LZ from 'lz-string';
import { DEFAULT_STATE, State, withDefaults } from './state';

const SKIP: (keyof State)[] = ['view'];

export function diffState(s: State): Partial<State> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(s) as (keyof State)[]) {
    if (SKIP.includes(k)) continue;
    if (JSON.stringify(s[k]) !== JSON.stringify(DEFAULT_STATE[k])) out[k] = s[k];
  }
  return out as Partial<State>;
}

export function encodeState(s: State): string {
  return LZ.compressToEncodedURIComponent(JSON.stringify(diffState(s)));
}

export function decodeState(code: string): State | null {
  try {
    const raw = code.replace(/^#?b=/, '').trim();
    const json = LZ.decompressFromEncodedURIComponent(raw);
    if (!json) return null;
    const obj = JSON.parse(json);
    if (typeof obj !== 'object' || obj === null) return null;
    return withDefaults(obj);
  } catch { return null; }
}
