import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();

function canvasTex(key: string, w: number, h: number, draw: (x: CanvasRenderingContext2D, w: number, h: number) => void, repeat = false) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  cache.set(key, t);
  return t;
}

/** Hình sân golf tự vẽ, theo tỉ lệ màn, có HUD giả và đường ngắm thẳng từ tee. */
export function courseTexture(aspect: number, darkTopFrac: number, ballFrac: number): THREE.Texture {
  const key = `course:${aspect.toFixed(2)}:${darkTopFrac.toFixed(2)}:${ballFrac.toFixed(2)}`;
  const H = 640, W = Math.round(H * aspect);
  return canvasTex(key, W, H, (x, w, h) => {
    const hz = h * 0.42;
    let g = x.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, '#4f8fd0'); g.addColorStop(1, '#d4e7f3');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,255,255,.85)';
    for (const [a, b, r] of [[0.18, 0.12, 70], [0.25, 0.1, 50], [0.7, 0.16, 80], [0.78, 0.13, 55]]) { x.beginPath(); x.ellipse(a * w, b * h, r, r * 0.36, 0, 0, 7); x.fill(); }
    // hàng cây xa
    x.fillStyle = '#3f6f47';
    x.beginPath(); x.moveTo(0, hz + 10);
    for (let i = 0; i <= w; i += 24) x.lineTo(i, hz - 8 - Math.sin(i / 70) * 14 - Math.sin(i / 23) * 5);
    x.lineTo(w, h); x.lineTo(0, h); x.fill();
    x.fillStyle = '#284f2f';
    for (let i = -10; i < w; i += 17) { const y = hz + 4 - Math.sin(i / 70) * 10; x.beginPath(); x.moveTo(i, y + 12); x.lineTo(i + 8.5, y - 26 - ((i * 37) % 17)); x.lineTo(i + 17, y + 12); x.fill(); }
    g = x.createLinearGradient(0, hz, 0, h);
    g.addColorStop(0, '#5b9b4b'); g.addColorStop(1, '#386f30');
    x.fillStyle = g; x.fillRect(0, hz + 10, w, h);
    // fairway
    const cx = ballFrac * w;
    x.fillStyle = '#7cc05d';
    x.beginPath(); x.moveTo(w * 0.47, hz + 12); x.lineTo(w * 0.53, hz + 12); x.lineTo(cx + w * 0.3, h); x.lineTo(cx - w * 0.3, h); x.fill();
    x.fillStyle = '#e3cf96'; x.beginPath(); x.ellipse(w * 0.6, h * 0.55, 46, 10, 0, 0, 7); x.fill();
    x.fillStyle = '#93d473'; x.beginPath(); x.ellipse(w * 0.5, hz + 18, 50, 8, 0, 0, 7); x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(w * 0.5, hz + 18); x.lineTo(w * 0.5, hz - 30); x.stroke();
    x.fillStyle = '#e8412c'; x.beginPath(); x.moveTo(w * 0.5, hz - 30); x.lineTo(w * 0.5 + 18, hz - 25); x.lineTo(w * 0.5, hz - 20); x.fill();
    // đường ngắm
    x.strokeStyle = 'rgba(255,255,255,.75)'; x.setLineDash([10, 10]); x.lineWidth = 3;
    x.beginPath(); x.moveTo(cx, h); x.lineTo(w * 0.5, hz + 18); x.stroke(); x.setLineDash([]);
    // HUD giả
    x.fillStyle = 'rgba(8,14,11,.72)';
    x.fillRect(20, 20, 150, 52); x.fillRect(20, 80, 150, 52); x.fillRect(20, 140, 150, 52);
    x.fillRect(w - 190, 20, 170, 60);
    x.fillStyle = '#d8ef3a'; x.font = '600 13px sans-serif';
    x.fillText('TỐC ĐỘ BÓNG', 32, 40); x.fillText('CARRY', 32, 100); x.fillText('GÓC BAY', 32, 160); x.fillText('HỐ 1 · PAR 4', w - 176, 42);
    x.fillStyle = '#fff'; x.font = '700 18px sans-serif';
    x.fillText('152 mph', 32, 63); x.fillText('248 yd', 32, 123); x.fillText('12,4°', 32, 183); x.fillText('384 yd', w - 176, 68);
    if (darkTopFrac > 0) { x.fillStyle = '#050706'; x.fillRect(0, 0, w, h * darkTopFrac); }
  });
}

export const netTexture = () => canvasTex('net', 128, 128, (x, w, h) => {
  x.fillStyle = '#0c0f0e'; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(120,135,128,.55)'; x.lineWidth = 1.5;
  for (let i = 0; i <= w; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
}, true);

export const turfTexture = () => canvasTex('turf', 256, 256, (x, w, h) => {
  x.fillStyle = '#3d7a37'; x.fillRect(0, 0, w, h);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 6000; i++) { x.fillStyle = rnd() < 0.5 ? '#478a40' : '#336a2f'; x.fillRect(rnd() * w, rnd() * h, 1.5, 3); }
}, true);

export const padTexture = (cells: number) => canvasTex('pad' + cells, 256, 256, (x, w, h) => {
  x.fillStyle = '#1c2220'; x.fillRect(0, 0, w, h);
  x.strokeStyle = '#0c0f0e'; x.lineWidth = 6; x.strokeRect(0, 0, w, h);
  x.fillStyle = 'rgba(255,255,255,.04)'; x.fillRect(8, 8, w - 16, 20);
}, true);

export const curtainTexture = () => canvasTex('curtain', 256, 64, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, w, 0);
  for (let i = 0; i <= 8; i++) { g.addColorStop(i / 8, i % 2 ? '#151a18' : '#262d2a'); }
  x.fillStyle = g; x.fillRect(0, 0, w, h);
}, true);
