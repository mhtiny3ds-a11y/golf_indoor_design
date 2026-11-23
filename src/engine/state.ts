// Mô hình trạng thái (docs/05). Đơn vị độ dài: feet thập phân.

export type Hand = 'R' | 'L' | 'B';
export type ObstacleKind = 'beam' | 'ibeam' | 'duct' | 'round' | 'soffit' | 'garage';
export type Wall = 'front' | 'back' | 'left' | 'right';

export interface Obstacle {
  kind: ObstacleKind;
  dir: 'across' | 'along';
  pos: number;     // across: toạ độ z tâm; along: toạ độ x tâm; garage: tâm cửa dọc theo tường
  w: number;
  drop: number;
  wall?: Wall;
  doorW?: number; doorH?: number;
  opener?: 'rail' | 'side';
  isOpen?: boolean;
}

export interface Fixture { kind: 'cabinet' | 'door'; wall: 'left' | 'right' | 'back'; pos: number; w: number; h: number; d: number }

export interface State {
  W: number; D: number; H: number;
  walls: { left: boolean; back: boolean; right: boolean };
  obs: Obstacle[];
  fixtures: Fixture[];
  metric: boolean;
  G: number; hand: Hand;
  screen: 'enc' | 'built';
  enc: string;            // 'auto' | id
  encD: 5 | 8 | 10 | 15;
  netW: 0 | 6 | 8 | 10;
  giHalf: boolean; giBeam: boolean;
  scr: string;            // 'wall' | 'custom' | id
  scrW: number; scrH: number; scrUp: number; scrGap: number;
  frame: boolean; frW: number; frOff: number;
  fin: 'pad' | 'curt' | 'bare'; finRun: number; finCeil: boolean; padSize: '3x3' | '2x2';
  lm: string;
  proj: string;           // 'auto' | id
  projFloor: boolean;
  zoom: number; projX: number; lift: number | null;
  matBrand: 'sigpro' | 'carls' | 'fiberbuilt';
  mat: string;            // 'auto' | id
  matMode: 'auto' | 'double' | 'single';
  auto: boolean;
  teeDist: number; teeOff: number; encOff: number;
  turf: 'mat' | 'enc' | 'room' | 'none';
  turfKind: 'partner' | 'pad' | 'sigpro';
  recess: boolean;
  seatOn: boolean;
  pc: 'none' | 'cab' | 'shelf' | 'stand';
  pcMake: string;         // 'match' | id | 'other'
  soft: string;
  tvs: 0 | 1 | 2 | 3; tvIn: 32 | 43;
  keepDesk: boolean; standBeside: boolean;
  stSide: 'auto' | 'L' | 'R'; stZ: number | null;
  roll: 'none' | 'gtrak' | 'stealth' | 'proscreen';
  gtW: number; stW: number;
  park: 'none' | 'beside' | 'inplace';
  car: string; carL: number; carW: number; carH: number;
  carSide: 'auto' | 'L' | 'R';
  parkView: 'play' | 'parked';
  view: '3d' | 'top' | 'side' | 'front';
}

export const DEFAULT_STATE: State = {
  W: 14, D: 18, H: 10,
  walls: { left: true, back: true, right: true },
  obs: [], fixtures: [],
  metric: true,
  G: 5.75, hand: 'R',
  screen: 'enc', enc: 'auto', encD: 5, netW: 0, giHalf: false, giBeam: false,
  scr: 'wall', scrW: 12, scrH: 8, scrUp: 0, scrGap: 1.1667,
  frame: false, frW: 12, frOff: 0,
  fin: 'pad', finRun: 6, finCeil: true, padSize: '3x3',
  lm: 'eyexo2',
  proj: 'auto', projFloor: false, zoom: 0.5, projX: 0, lift: null,
  matBrand: 'sigpro', mat: 'auto', matMode: 'auto',
  auto: true, teeDist: 10, teeOff: 0, encOff: 0,
  turf: 'mat', turfKind: 'partner', recess: false,
  seatOn: false,
  pc: 'none', pcMake: 'match', soft: 'none',
  tvs: 0, tvIn: 32, keepDesk: false, standBeside: false, stSide: 'auto', stZ: null,
  roll: 'none', gtW: 12, stW: 0,
  park: 'none', car: 'f150', carL: 16, carW: 7, carH: 6,
  carSide: 'auto', parkView: 'play',
  view: '3d',
};

export function withDefaults(partial: Partial<State>): State {
  const s = structuredClone(DEFAULT_STATE);
  Object.assign(s, structuredClone(partial));
  s.walls = { ...DEFAULT_STATE.walls, ...(partial.walls ?? {}) };
  return s;
}
