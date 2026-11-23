import lmJson from '../../data/launch-monitors.json';
import projJson from '../../data/projectors.json';
import encJson from '../../data/enclosures.json';
import scrJson from '../../data/screens.json';
import carJson from '../../data/cars.json';
import presetJson from '../../data/presets.json';
import pcJson from '../../data/pcs.json';
import matJson from '../../data/mats.json';
import obsJson from '../../data/obstacles.json';
import rollJson from '../../data/rollup-screens.json';
import partnersJson from '../../config/partners.json';

export interface LaunchMonitor {
  id: string; name: string; type: 'overhead' | 'side' | 'radar';
  fwd?: number; hMin?: number; hMax?: number; lowTo?: number; ref?: 'floor';
  zone?: number; minFlight?: number; flightLeast?: number; idealFlight?: number; maxFlight?: number;
  dist?: number; bMin?: number; bRec?: number; bMax?: number; shortestRoom?: number;
  dim?: [number, number, number] | null; specVi?: string;
}
export interface Projector {
  id: string; name: string; r0: number; r1: number; off: number | null;
  vs?: number; hs?: number; vlo?: number; asp?: number; ksd?: string | null;
  dim?: [number, number, number]; fill?: string[] | null; res?: string; ksNoteVi?: string; note?: string;
}
export interface Enclosure {
  id: string; brand: string; name: string; w: number; h: number; d: number; sw: number; sh: number;
  ratio?: string; floor?: boolean; deep?: boolean; pipe?: number; needW?: number; needH?: number;
  landingPad?: boolean; sigproFloor?: [number, number];
  minRoom?: [number, number, number]; needBehind?: number; needSides?: number; depthWithFloor?: number;
}
export interface Screen { id: string; brand: string; ratio: string; vw: number; vh: number; ow: number; oh: number; priceUSD: number | null }
export interface Car { id: string; name: string; L: number; W: number; mirrors: boolean; H: number }
export interface Mat { id: string; nameVi: string; size_ft: [number, number]; kind: 'double' | 'single' }
export interface Pc { id: string; name: string; gpu: string; cpu: string; ram: string; descVi: string; rank: number }
export interface Preset { id: string; nameVi: string; W: number | null; D: number | null; H: number | null; state?: Record<string, unknown>; default?: boolean; todo?: string }

export const LMS = lmJson.items as LaunchMonitor[];
export const PROJECTORS = projJson.items as Projector[];
export const ENCLOSURES = encJson.items as Enclosure[];
export const SCREENS: Screen[] = (scrJson.items as (string | number | null)[][]).map(r => ({
  id: r[0] as string, brand: r[1] as string, ratio: r[2] as string,
  vw: r[3] as number, vh: r[4] as number, ow: r[5] as number, oh: r[6] as number, priceUSD: r[7] as number | null,
}));
export const CARS = carJson.items as Car[];
export const CAR_RULES = carJson._meta.rules;
export const PRESETS = presetJson.items as Preset[];
export const VN_PRESETS = presetJson.vnSuggestions;
export const PCS = pcJson.pcs as Pc[];
export const SOFT_MATRIX = pcJson.softwareMatrix as Record<string, { name: string; HD: string; '4K': string }>;
export const MATS = (matJson.brands.sigpro as Mat[]);
export const MAT_BRANDS = matJson.brands;
export const OBSTACLE_TYPES = obsJson.types as { id: string; nameVi: string; w?: number; drop?: number; doorW?: number; doorH?: number; railMotorDrop?: number }[];
export const ROLLUPS = rollJson.items;
export const PARTNERS = partnersJson as {
  brand: { name: string; tagline: string; primaryColor: string; bgColor: string };
  leadEndpoint: string; contact: { email: string; phone: string; zalo: string }; currency: string;
  items: Record<string, { url?: string; code?: string; codeNote?: string; priceVND?: number | null }>;
};

export const byId = <T extends { id: string }>(list: T[], id: string): T | undefined => list.find(x => x.id === id);
export const lmById = (id: string) => byId(LMS, id) ?? LMS[0];
export const projById = (id: string) => byId(PROJECTORS, id) ?? PROJECTORS[0];
export const encById = (id: string) => byId(ENCLOSURES, id) ?? ENCLOSURES[2];
export const matById = (id: string) => byId(MATS, id) ?? MATS[0];

/** Thân máy chiếu khi dữ liệu thiếu `dim` (ước tính) */
export const DEFAULT_PROJ_DIM: [number, number, number] = [1.0, 0.37, 0.8];
/** Thân LM khi dữ liệu thiếu `dim` (ước tính) */
export const DEFAULT_LM_DIM: Record<string, [number, number, number]> = {
  overhead: [2.6, 0.35, 0.6], side: [0.4, 1.0, 0.5], radar: [0.5, 0.6, 0.3],
};

export const SOFTWARE = [
  { id: 'none', name: 'Chưa chọn' },
  { id: 'gspro', name: 'GSPro' },
  { id: 'tvg', name: 'Trackman Virtual Golf' },
  { id: 'fsx', name: 'Foresight FSX Play' },
  { id: 'premier', name: 'Foresight Premier' },
  { id: 'pureplay', name: 'PurePlay' },
];
