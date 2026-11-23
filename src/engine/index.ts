import { State } from './state';
import { solve, Plan, Status, worst, projStatuses } from './solve';
import { checks, Check, overall } from './checks';
import { ENCLOSURES, LMS, PROJECTORS } from './data';

export * from './state';
export * from './solve';
export * from './checks';

export interface Result { plan: Plan; checks: Check[]; overall: ReturnType<typeof overall> }

export function run(s: State): Result {
  const plan = solve(s);
  const cs = checks(plan);
  return { plan, checks: cs, overall: overall(cs) };
}

export interface FitItem { id: string; name: string; st: Status; best?: boolean }

const statusOf = (cs: Check[], groups: Check['g'][]) => worst(cs.filter(c => groups.includes(c.g)).map(c => c.st === 'note' ? 'ok' : c.st));

/** "Mọi enclosure vừa phòng này" */
export function enclosureFits(s: State, autoId: string | undefined): FitItem[] {
  return ENCLOSURES.map(e => {
    const r = run({ ...s, screen: 'enc', enc: e.id, roll: 'none' });
    return { id: e.id, name: e.name, st: statusOf(r.checks, ['enc', 'room']), best: e.id === autoId };
  });
}

/** "Mọi launch monitor vừa phòng này" */
export function lmFits(s: State): FitItem[] {
  return LMS.map(l => {
    const r = run({ ...s, lm: l.id });
    return { id: l.id, name: l.name, st: statusOf(r.checks, ['lm']) };
  });
}

/** "Mọi máy chiếu vừa màn này" */
export function projFits(s: State, autoId: string | undefined): FitItem[] {
  return PROJECTORS.map(p => {
    const plan = solve({ ...s, proj: p.id });
    const st = worst(projStatuses(plan.proj, plan.D).map(x => (x === 'note' ? 'ok' : x)));
    return { id: p.id, name: p.name, st, best: p.id === autoId };
  });
}

export function countFits(items: FitItem[]) {
  return { ok: items.filter(i => i.st === 'ok').length, warn: items.filter(i => i.st === 'warn').length, fail: items.filter(i => i.st === 'fail').length };
}
