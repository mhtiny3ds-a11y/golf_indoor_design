// Cảnh three.js — chỉ đọc Plan. Toạ độ engine (x, y, z) → three (x − W/2, y, z).
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Plan } from '../engine/solve';
import type { Box } from '../engine/geom';
import { fmtLen, fmtGap, fmtSmall } from '../engine/units';
import { requestModel, getModel } from './models';
import { courseTexture, netTexture, turfTexture, padTexture, curtainTexture } from './textures';

export type View = '3d' | 'top' | 'side' | 'front';
interface Label { el: HTMLDivElement; pos: THREE.Vector3; key: string }

const C = {
  wall: 0x1e2622, floor: 0x18201c, edge: 0x55655c, lime: 0xd8ef3a, pipe: 0x2b302e, mat: 0x23552b, strip: 0x5aa64b,
  proj: 0xe7ebe8, lm: 0x1b1f22, scan: 0x55e08a, beam: 0x7a5a3a, duct: 0x8c969a, pc: 0x2a2f33, car: 0x51606e,
};

export class SceneView {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  persp: THREE.PerspectiveCamera;
  ortho: THREE.OrthographicCamera;
  camera: THREE.Camera;
  controls: OrbitControls;
  root = new THREE.Group();
  labelLayer: HTMLDivElement;
  labels: Label[] = [];
  plan: Plan | null = null;
  view: View = '3d';
  golfer: THREE.Group | null = null;
  swingArms: THREE.Group[] = [];
  swingT = -1;
  mixer: THREE.AnimationMixer | null = null;
  swingClip: THREE.AnimationClip | null = null;
  private clock = new THREE.Clock();
  /** true khi golfer đang là mô hình thực tế (.glb) */
  realGolfer = false;
  moveMode = false;
  onDragTee?: (x: number, z: number) => void;
  focusTargets = new Map<string, THREE.Vector3>();
  private dragging = false;
  private raycaster = new THREE.Raycaster();
  private floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private lastKey = '';

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(this.renderer.domElement);
    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'labels';
    host.appendChild(this.labelLayer);
    this.scene.background = new THREE.Color(0x0b1210);
    this.persp = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
    this.ortho = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 400);
    this.camera = this.persp;
    this.controls = new OrbitControls(this.persp, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.scene.add(new THREE.HemisphereLight(0xe8f1ea, 0x1a221e, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(6, 30, 26); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, far: 80 });
    this.scene.add(sun);
    this.scene.add(this.root);
    new ResizeObserver(() => this.resize()).observe(host);
    this.bindDrag();
    const rebuild = () => { if (this.plan) this.update(this.plan); };
    requestModel('people/golfer.glb', rebuild);
    requestModel('furniture/pc-cabinet.glb', rebuild);
    const loop = (t: number) => { this.tick(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  // ---------- helpers ----------
  private X(x: number) { return x - (this.plan?.W ?? 0) / 2; }
  private v(x: number, y: number, z: number) { return new THREE.Vector3(this.X(x), y, z); }
  private mat(color: number, o: THREE.MeshStandardMaterialParameters = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o }); }
  private boxMesh(b: Box, m: THREE.Material, shadow = true) {
    const g = new THREE.BoxGeometry(Math.max(b.x1 - b.x0, 0.01), Math.max(b.y1 - b.y0, 0.01), Math.max(b.z1 - b.z0, 0.01));
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(this.X((b.x0 + b.x1) / 2), (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2);
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    this.root.add(mesh);
    return mesh;
  }
  private tube(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material) {
    const d = new THREE.Vector3().subVectors(b, a), L = d.length();
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 10), m);
    c.position.copy(a).addScaledVector(d, 0.5);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    c.castShadow = true; this.root.add(c); return c;
  }
  private line(pts: THREE.Vector3[], color: number, opts: { dashed?: boolean; opacity?: number; segments?: boolean } = {}) {
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = opts.dashed
      ? new THREE.LineDashedMaterial({ color, dashSize: 0.35, gapSize: 0.25, transparent: true, opacity: opts.opacity ?? 0.8 })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity: opts.opacity ?? 1 });
    const l = opts.segments ? new THREE.LineSegments(g, m) : new THREE.Line(g, m);
    if (opts.dashed) l.computeLineDistances();
    this.root.add(l); return l;
  }
  private plane(w: number, h: number, m: THREE.Material, pos: THREE.Vector3, rot: [number, number, number]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    p.position.copy(pos); p.rotation.set(...rot); p.receiveShadow = true; this.root.add(p); return p;
  }
  private label(key: string, text: string, pos: THREE.Vector3, cls = '') {
    const el = document.createElement('div');
    el.className = 'lbl ' + cls; el.textContent = text;
    this.labelLayer.appendChild(el);
    this.labels.push({ el, pos, key });
  }

  // ---------- build ----------
  update(plan: Plan) {
    this.plan = plan;
    this.root.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
      mats.forEach(mt => mt.dispose());
    });
    this.scene.remove(this.root);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.labelLayer.innerHTML = ''; this.labels = []; this.swingArms = []; this.focusTargets.clear();
    const p = plan, W = p.W, D = p.D, H = p.H, m = p.metric;
    const L = (v: number) => fmtLen(v, m), G = (v: number) => fmtGap(v, m);

    // Phòng: mặt hướng vào trong, nhìn từ ngoài tự ẩn
    const wallM = this.mat(C.wall, { side: THREE.FrontSide });
    const floorM = this.mat(C.floor);
    this.plane(W, D, floorM, this.v(W / 2, 0, D / 2), [-Math.PI / 2, 0, 0]);
    this.plane(W, H, wallM, this.v(W / 2, H / 2, 0), [0, 0, 0]);                                     // tường màn
    if (p.walls.back) this.plane(W, H, wallM, this.v(W / 2, H / 2, D), [0, Math.PI, 0]);
    if (p.walls.left) this.plane(D, H, wallM, this.v(0, H / 2, D / 2), [0, Math.PI / 2, 0]);
    if (p.walls.right) this.plane(D, H, wallM, this.v(W, H / 2, D / 2), [0, -Math.PI / 2, 0]);
    this.plane(W, D, this.mat(0x141a17), this.v(W / 2, H, D / 2), [Math.PI / 2, 0, 0]);               // trần
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)), new THREE.LineBasicMaterial({ color: C.edge, transparent: true, opacity: 0.7 }));
    edges.position.set(0, H / 2, D / 2); this.root.add(edges);
    if (p.floorRaise > 0) this.boxMesh({ x0: 0, x1: W, y0: 0, y1: p.floorRaise, z0: 0, z1: D }, this.mat(0x2a2f2c), false);

    // Cỏ
    if (p.turf) {
      const t = turfTexture().clone(); t.needsUpdate = true;
      for (const pc of p.turf.pieces) {
        const w = pc.x1 - pc.x0, l = pc.z1 - pc.z0;
        const tt = t.clone(); tt.repeat.set(w / 3, l / 3); tt.needsUpdate = true;
        const color = p.turf.kind === 'sigpro' ? 0x6c8f5a : 0xffffff;
        const y = p.turf.kind === 'sigpro' ? p.floorRaise + 2.375 / 12 : p.turfTop;
        if (p.turf.kind === 'sigpro') this.boxMesh({ x0: pc.x0, x1: pc.x1, y0: p.floorRaise, y1: y, z0: pc.z0, z1: pc.z1 }, this.mat(color, { map: tt }), false);
        else this.plane(w, l, this.mat(color, { map: tt }), this.v((pc.x0 + pc.x1) / 2, y + 0.003, (pc.z0 + pc.z1) / 2), [-Math.PI / 2, 0, 0]);
      }
      for (const z of p.turf.seams) this.line([this.v(p.turf.x0, p.turfTop + 0.02, z), this.v(p.turf.x1, p.turfTop + 0.02, z)], 0xffffff, { dashed: true, opacity: 0.8 });
    }

    // Màn / enclosure
    const sc = p.screen, pp = p.proj;
    const imgTop = sc.sTop - pp.topShort;
    const darkFrac = pp.topShort / sc.sh;
    const ballFrac = (p.ballX - (sc.sx - sc.sw / 2)) / sc.sw;
    const scrTex = courseTexture(sc.sw / sc.sh, darkFrac, Math.min(0.85, Math.max(0.15, ballFrac)));
    this.plane(sc.sw, sc.sh, new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }), this.v(sc.sx, (sc.sBottom + sc.sTop) / 2, sc.screenZ), [0, 0, 0]);
    const glow = new THREE.PointLight(0xbfdcff, 6, 14, 1.6);
    glow.position.set(this.X(sc.sx), (sc.sBottom + sc.sTop) / 2, sc.screenZ + 2); this.root.add(glow);
    this.focusTargets.set('screen', this.v(sc.sx, (sc.sBottom + sc.sTop) / 2, sc.screenZ));
    if (sc.kind === 'enc' && sc.enc) {
      const e = sc.enc, x0 = sc.encX0, x1 = sc.encX1, y0 = sc.encY0, y1 = sc.encY0 + sc.encH, z0 = sc.screenZ - 0.15, z1 = sc.screenZ + sc.encDepth;
      const pipeM = this.mat(C.pipe, { metalness: 0.5, roughness: 0.4 });
      const r = Math.max(0.05, sc.encPipe / 2);
      const P = (x: number, y: number, z: number) => this.v(x, y, z);
      [[P(x0, y0, z0), P(x0, y1, z0)], [P(x1, y0, z0), P(x1, y1, z0)], [P(x0, y0, z1), P(x0, y1, z1)], [P(x1, y0, z1), P(x1, y1, z1)],
       [P(x0, y1, z0), P(x1, y1, z0)], [P(x0, y1, z1), P(x1, y1, z1)], [P(x0, y1, z0), P(x0, y1, z1)], [P(x1, y1, z0), P(x1, y1, z1)],
       [P(x0, y0 + r, z0), P(x0, y0 + r, z1)], [P(x1, y0 + r, z0), P(x1, y0 + r, z1)]].forEach(([a, b]) => this.tube(a, b, r, pipeM));
      if (p.state.encD >= 10 && e.deep) this.tube(P(x0, y1, z0 + sc.encDepth * 0.55), P(x1, y1, z0 + sc.encDepth * 0.55), r, pipeM);
      const net = netTexture().clone(); net.repeat.set(sc.encDepth, sc.encH); net.needsUpdate = true;
      const sideM = this.mat(0x111614, { map: net, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
      this.plane(z1 - z0, y1 - y0, sideM, this.v(x0 + 0.02, (y0 + y1) / 2, (z0 + z1) / 2), [0, Math.PI / 2, 0]);
      this.plane(z1 - z0, y1 - y0, sideM, this.v(x1 - 0.02, (y0 + y1) / 2, (z0 + z1) / 2), [0, Math.PI / 2, 0]);
      const topM = this.mat(0x111614, { map: net, side: THREE.DoubleSide, transparent: true, opacity: 0.55 });
      this.plane(x1 - x0, z1 - z0, topM, this.v((x0 + x1) / 2, y1 - 0.02, (z0 + z1) / 2), [Math.PI / 2, 0, 0]);
      // viền đen quanh mặt chiếu
      const bm = this.mat(0x0a0d0c);
      this.boxMesh({ x0, x1, y0: sc.sTop, y1, z0: sc.screenZ - 0.05, z1: sc.screenZ - 0.01 }, bm, false);
      this.boxMesh({ x0, x1, y0, y1: sc.sBottom, z0: sc.screenZ - 0.05, z1: sc.screenZ - 0.01 }, bm, false);
      this.boxMesh({ x0, x1: sc.sx - sc.sw / 2, y0, y1, z0: sc.screenZ - 0.05, z1: sc.screenZ - 0.01 }, bm, false);
      this.boxMesh({ x0: sc.sx + sc.sw / 2, x1, y0, y1, z0: sc.screenZ - 0.05, z1: sc.screenZ - 0.01 }, bm, false);
      if (p.state.netW && e.brand === "Carl's Place") {
        const nl = p.state.netW;
        const nm = this.mat(0x111614, { map: net, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
        this.plane(nl, y1 - y0, nm, this.v(x0, (y0 + y1) / 2, z1 + nl / 2), [0, Math.PI / 2, 0]);
        this.plane(nl, y1 - y0, nm, this.v(x1, (y0 + y1) / 2, z1 + nl / 2), [0, Math.PI / 2, 0]);
      }
      this.label('enc', `${e.name}`, this.v((x0 + x1) / 2 - (x1 - x0) * 0.3, y1 + 0.3, z0));
    } else if (sc.kind === 'built') {
      const fin = p.state.fin;
      if (fin !== 'bare') {
        const ext = 1.5;
        const fx0 = Math.max(0, sc.sx - sc.sw / 2 - ext), fx1 = Math.min(W, sc.sx + sc.sw / 2 + ext), fy1 = Math.min(H, sc.sTop + ext);
        const tex = (fin === 'pad' ? padTexture(p.state.padSize === '3x3' ? 3 : 2) : curtainTexture()).clone();
        const cell = p.state.padSize === '3x3' ? 3 : 2;
        const mk = (x0: number, x1: number, y0: number, y1: number) => {
          if (x1 - x0 < 0.05 || y1 - y0 < 0.05) return;
          const t = tex.clone(); t.repeat.set((x1 - x0) / (fin === 'pad' ? cell : 3), fin === 'pad' ? (y1 - y0) / cell : 1); t.needsUpdate = true;
          this.plane(x1 - x0, y1 - y0, this.mat(0xffffff, { map: t }), this.v((x0 + x1) / 2, (y0 + y1) / 2, 0.03), [0, 0, 0]);
        };
        mk(fx0, sc.sx - sc.sw / 2, 0, fy1); mk(sc.sx + sc.sw / 2, fx1, 0, fy1); mk(sc.sx - sc.sw / 2, sc.sx + sc.sw / 2, sc.sTop, fy1); mk(sc.sx - sc.sw / 2, sc.sx + sc.sw / 2, 0, sc.sBottom);
        const run = p.state.finRun;
        const sideT = tex.clone(); sideT.repeat.set(run / 3, fin === 'pad' ? H / cell : 1); sideT.needsUpdate = true;
        if (p.walls.left) this.plane(run, H, this.mat(0xffffff, { map: sideT }), this.v(0.03, H / 2, run / 2), [0, Math.PI / 2, 0]);
        if (p.walls.right) this.plane(run, H, this.mat(0xffffff, { map: sideT }), this.v(W - 0.03, H / 2, run / 2), [0, -Math.PI / 2, 0]);
        if (p.state.finCeil && fin === 'pad') this.plane(W, run, this.mat(0x1c2220), this.v(W / 2, H - 0.03, run / 2), [Math.PI / 2, 0, 0]);
      }
      this.boxMesh({ x0: sc.sx - sc.sw / 2 - 0.08, x1: sc.sx + sc.sw / 2 + 0.08, y0: sc.sBottom - 0.08, y1: sc.sTop + 0.08, z0: sc.screenZ - 0.08, z1: sc.screenZ - 0.02 }, this.mat(0x0a0d0c), false);
      this.label('enc', sc.name, this.v(sc.sx - sc.sw * 0.3, sc.sTop + 0.25, sc.screenZ));
    } else {
      this.tube(this.v(sc.sx - sc.sw / 2 - 0.3, sc.sTop + 0.25, sc.screenZ), this.v(sc.sx + sc.sw / 2 + 0.3, sc.sTop + 0.25, sc.screenZ), 0.22, this.mat(0x2c3230, { metalness: 0.4 }));
      this.label('enc', sc.name, this.v(sc.sx - sc.sw * 0.3, sc.sTop + 0.6, sc.screenZ));
    }

    // Thảm, vùng đánh, tee
    const mt = p.mat;
    if (!mt.sigpro) {
      this.boxMesh({ x0: mt.x0, x1: mt.x1, y0: p.floorRaise, y1: p.floorRaise + 2.5 / 12, z0: mt.z0, z1: mt.z1 }, this.mat(C.mat), false);
      for (const t of p.tees) this.boxMesh({ x0: t.x - 0.6, x1: t.x + 0.6, y0: p.floorRaise, y1: p.floorRaise + 2.5 / 12 + 0.01, z0: mt.z0 + 0.15, z1: mt.z1 - 0.15 }, this.mat(C.strip), false);
    }
    const zy = p.standY + p.floorRaise + 0.02, zn = p.zone;
    this.line([this.v(zn.x0, zy, zn.z0), this.v(zn.x1, zy, zn.z0), this.v(zn.x1, zy, zn.z1), this.v(zn.x0, zy, zn.z1), this.v(zn.x0, zy, zn.z0)], C.lime);
    this.label('zone', `Vùng ${m ? `${Math.round(zn.dIn * 2.54)} × ${Math.round(zn.wIn * 2.54)} cm` : `${Math.round(zn.dIn)} × ${Math.round(zn.wIn)} in`}`, this.v(p.ballX, zy, zn.z1 + 0.5), 'lime');
    for (const t of p.tees) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), this.mat(0xffffff, { roughness: 0.4 }));
      ball.position.copy(this.v(t.x, zy + 0.12, p.teeZ)); ball.castShadow = true; this.root.add(ball);
    }
    this.focusTargets.set('mat', this.v(p.ballX, 0, p.teeZ));
    this.focusTargets.set('turf', this.v(p.ballX, 0, p.teeZ));

    // Golfer
    this.buildGolfer(p);

    // Đường bao swing (cung nét đứt trong mặt phẳng y-z tại vai golfer)
    const env = p.env, pts: THREE.Vector3[] = [];
    const ex = p.tees[0].hand === 'L' ? p.tees[0].x + 1.1 * p.k : p.tees[0].x - 1.1 * p.k;
    for (let i = 0; i <= 72; i++) { const a = (i / 72) * Math.PI * 2; const y = env.yc + Math.sin(a) * env.R; if (y < p.floorRaise) continue; pts.push(this.v(ex, y, env.zc + Math.cos(a) * env.R)); }
    this.line(pts, C.lime, { dashed: true, opacity: 0.45 });
    // dấu chân đường bao trên sàn
    const fy = p.floorRaise + 0.03;
    this.line([this.v(env.x0, fy, env.zc - env.R), this.v(env.x1, fy, env.zc - env.R), this.v(env.x1, fy, env.zc + env.R), this.v(env.x0, fy, env.zc + env.R), this.v(env.x0, fy, env.zc - env.R)], C.lime, { dashed: true, opacity: 0.25 });

    // Máy chiếu
    const pb = pp.body;
    const projMesh = this.boxMesh(pb, this.mat(C.proj, { roughness: 0.45 }));
    projMesh.name = 'proj';
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 20), this.mat(0x111111, { metalness: 0.6 }));
    lens.rotation.x = Math.PI / 2; lens.position.copy(this.v(pp.lensX, pp.lensY, pp.lensZ - 0.02)); this.root.add(lens);
    if (!pp.floor) this.tube(this.v(pp.lensX, pb.y1, (pb.z0 + pb.z1) / 2), this.v(pp.lensX, H, (pb.z0 + pb.z1) / 2), 0.05, this.mat(0x222222));
    const lensV = this.v(pp.lensX, pp.lensY, pp.lensZ);
    const cs = [[-1, sc.sBottom], [1, sc.sBottom], [1, imgTop], [-1, imgTop]].map(([sx, y]) => this.v(sc.sx + (sx * sc.sw) / 2, y, sc.screenZ + 0.01));
    this.line(cs.flatMap(c => [lensV, c]), 0xbfe3ff, { segments: true, opacity: 0.35 });
    const cone = new THREE.BufferGeometry().setFromPoints([lensV, cs[0], cs[1], lensV, cs[1], cs[2], lensV, cs[2], cs[3], lensV, cs[3], cs[0]]);
    this.root.add(new THREE.Mesh(cone, new THREE.MeshBasicMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false })));
    this.label('proj', `${pp.p.name} · thấu kính cách sàn ${L(pp.lensY)}`, this.v(pp.lensX + 0.6, pp.lensY - 0.5, pp.lensZ));
    if (!pp.floor) this.label('drop', `thả ${G(pp.drop)}`, this.v(pp.lensX, H - 0.1, pp.lensZ + 0.3), 'lime');
    this.focusTargets.set('proj', this.v(pp.lensX, pp.lensY, pp.lensZ));

    // LM
    const lp = p.lm;
    this.boxMesh(lp.body, this.mat(C.lm, { roughness: 0.35 }));
    const scanM = C.scan;
    if (lp.type === 'overhead') {
      if (lp.dropPole) this.tube(this.v(lp.x, lp.body.y1, lp.z), this.v(lp.x, H, lp.z), 0.04, this.mat(0x222222));
      const yb = lp.body.y0;
      this.line([this.v(zn.x0, zy, zn.z0), this.v(lp.x, yb, lp.z), this.v(zn.x1, zy, zn.z1)], scanM, { opacity: 0.7 });
      this.line([this.v(zn.x1, zy, zn.z0), this.v(lp.x, yb, lp.z), this.v(zn.x0, zy, zn.z1)], scanM, { opacity: 0.7 });
    } else if (lp.type === 'side') {
      this.line([this.v(lp.x, lp.body.y1, lp.z), this.v(p.ballX, zy + 0.1, p.teeZ)], scanM, { opacity: 0.8 });
    } else {
      const c = lp.body;
      [[-0.15, 0], [0.15, 0], [0, 0.2]].forEach(([dx, dz]) => this.tube(this.v(lp.x, c.y0, lp.z), this.v(lp.x + dx, p.floorRaise, lp.z + dz), 0.02, this.mat(0x222222)));
      this.line([this.v(lp.x, c.y0 + 0.2, c.z0), this.v(p.ballX, zy + 0.1, p.teeZ), this.v(sc.sx, sc.sBottom + 1, sc.screenZ)], scanM, { opacity: 0.7 });
    }
    this.label('lm', lp.lm.name, this.v(lp.x - 1.2, lp.type === 'overhead' ? lp.body.y0 - 0.2 : lp.body.y1 + 0.4, lp.z));
    this.focusTargets.set('lm', this.v(lp.x, lp.y, lp.z));

    // Vật treo, đồ đạc
    for (const o of p.obstacles) {
      const color = o.kind === 'beam' ? C.beam : o.kind === 'soffit' ? 0x2a312d : o.kind === 'garage' ? 0x6b7570 : C.duct;
      if (o.kind === 'round') {
        const along = o.z1 - o.z0 > o.x1 - o.x0;
        const len = along ? o.z1 - o.z0 : o.x1 - o.x0, r = (o.y1 - o.y0) / 2;
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 20), this.mat(color, { metalness: 0.6, roughness: 0.35 }));
        cyl.position.copy(this.v((o.x0 + o.x1) / 2, (o.y0 + o.y1) / 2, (o.z0 + o.z1) / 2));
        if (along) cyl.rotation.x = Math.PI / 2; else cyl.rotation.z = Math.PI / 2;
        this.root.add(cyl);
      } else this.boxMesh(o, this.mat(color, { metalness: o.kind === 'duct' || o.kind === 'ibeam' ? 0.5 : 0 }));
      this.label('obs' + o.name, `${o.name} · đáy ${L(o.y0)}`, this.v((o.x0 + o.x1) / 2, o.y0 - 0.25, (o.z0 + o.z1) / 2));
    }
    for (const g of p.state.obs.filter(o => o.kind === 'garage')) {
      const dW = g.doorW ?? 9, dH = g.doorH ?? 7, wall = g.wall ?? 'back';
      const doorM = this.mat(0xa9b2ad);
      if (wall === 'back' || wall === 'front') {
        const z = wall === 'back' ? D - 0.04 : 0.04;
        if (!g.isOpen) this.plane(dW, dH, doorM, this.v(g.pos, dH / 2, z), [0, wall === 'back' ? Math.PI : 0, 0]);
        else this.plane(dW, dH, this.mat(0x070909), this.v(g.pos, dH / 2, z), [0, wall === 'back' ? Math.PI : 0, 0]);
      } else {
        const x = wall === 'left' ? 0.04 : W - 0.04;
        this.plane(dW, dH, g.isOpen ? this.mat(0x070909) : doorM, this.v(x, dH / 2, g.pos), [0, wall === 'left' ? Math.PI / 2 : -Math.PI / 2, 0]);
      }
    }
    for (const f of p.fixtures) this.boxMesh(f, this.mat(f.kind === 'cabinet' ? 0x5a4632 : 0x3b302a));
    const kiosk = p.pc && p.state.pc === 'cab' ? getModel('furniture/pc-cabinet.glb') : null;
    if (p.pc && kiosk) {
      // Mô hình chuẩn: mét, mặt trước (màn hình) hướng +Z. Lưng áp tường, màn quay vào phòng.
      const d = p.pc.desk, b = kiosk.box;
      const obj = kiosk.instance;
      obj.position.set(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
      const g = new THREE.Group(); g.add(obj); g.scale.setScalar(1 / 0.3048);
      g.rotation.y = p.pc.wall === 'R' ? -Math.PI / 2 : Math.PI / 2;
      g.position.copy(this.v((d.x0 + d.x1) / 2, d.y0, (d.z0 + d.z1) / 2));
      this.root.add(g);
      for (const tv of p.pc.tvs) this.boxMesh(tv, this.mat(0x2c6fb0, { emissive: 0x153a66, emissiveIntensity: 0.8 }));
      this.label('pc', 'Kiosk', this.v((d.x0 + d.x1) / 2, d.y1 + 0.5, (d.z0 + d.z1) / 2));
      this.focusTargets.set('pc', this.v((d.x0 + d.x1) / 2, d.y1, (d.z0 + d.z1) / 2));
    } else if (p.pc) {
      this.boxMesh(p.pc.desk, this.mat(C.pc));
      const d = p.pc.desk, inner = p.pc.wall === 'R' ? d.x0 : d.x1;
      if (!(p.state.pc === 'stand' && p.state.tvs > 0 && !p.state.keepDesk)) {
        const mx = p.pc.wall === 'R' ? inner + 0.25 : inner - 0.25;
        this.boxMesh({ x0: mx - 0.04, x1: mx + 0.04, y0: d.y1, y1: d.y1 + 1.4, z0: (d.z0 + d.z1) / 2 - 1, z1: (d.z0 + d.z1) / 2 + 1 }, this.mat(0x2c6fb0, { emissive: 0x153a66, emissiveIntensity: 0.8 }));
      }
      for (const tv of p.pc.tvs) this.boxMesh(tv, this.mat(0x2c6fb0, { emissive: 0x153a66, emissiveIntensity: 0.8 }));
      this.label('pc', 'Máy tính', this.v((d.x0 + d.x1) / 2, d.y1 + 1.6, (d.z0 + d.z1) / 2));
      this.focusTargets.set('pc', this.v((d.x0 + d.x1) / 2, d.y1, (d.z0 + d.z1) / 2));
    }
    if (p.seat) this.boxMesh(p.seat, this.mat(0x4a3b55));
    if (p.car) this.buildCar(p);

    // Nhãn kích thước
    const ly = p.floorRaise + 0.1;
    this.line([this.v(p.ballX + 0.9, ly, sc.screenZ), this.v(p.ballX + 0.9, ly, p.teeZ)], C.lime, { opacity: 0.9 });
    this.label('teeScreen', `${L(p.teeDist)} tee tới màn`, this.v(p.ballX + 0.9, ly, (sc.screenZ + p.teeZ) / 2), 'lime');
    if (p.walls.back) {
      this.line([this.v(p.ballX + 0.9, ly, p.teeZ), this.v(p.ballX + 0.9, ly, D)], C.lime, { opacity: 0.9 });
      this.label('teeBack', `${L(p.backWall)} tee tới tường sau`, this.v(p.ballX + 0.9, ly, (p.teeZ + D) / 2), 'lime');
    }
    this.label('W', `${L(W)}`, this.v(W / 2, 0, D + 0.3));
    this.label('D', `${L(D)}`, this.v(W + 0.3, 0, D / 2));
    this.label('H', `${L(H)}`, this.v(W + 0.2, H / 2, 0.2));
    this.resize();
    const key = `${W}|${D}|${H}`;
    if (key !== this.lastKey) { this.lastKey = key; this.setView(this.view, true); }
  }

  private buildGolfer(p: Plan) {
    const k = p.k, t = p.tees[0], hand = t.hand === 'L' ? 'L' : 'R';
    this.mixer = null; this.swingClip = null; this.realGolfer = false;
    const real = getModel('people/golfer.glb');
    if (real) {
      // Mô hình chuẩn: mét, Y lên, mặt trước +Z, golfer tay phải đánh về +X; giả định người cao 1,75 m (5'9").
      // Cảnh dùng feet → nhân 1/0,3048 và co theo chiều cao golfer (k).
      const inner = new THREE.Group();
      const obj = real.instance;
      obj.position.set(-real.feet.x, -real.feet.y, -real.feet.z);
      inner.add(obj);
      const s = k / 0.3048;
      inner.scale.set(hand === 'L' ? -s : s, s, s);              // tay trái: lật đối xứng
      const g = new THREE.Group();
      g.add(inner);
      g.rotation.y = hand === 'R' ? Math.PI / 2 : -Math.PI / 2; // hướng đánh (+X mô hình) → về phía màn (−z phòng)
      const gx = hand === 'R' ? t.x - 2.0 * k : t.x + 2.0 * k;
      g.position.set(this.X(gx), p.floorRaise + p.standY, p.teeZ);
      this.root.add(g);
      this.golfer = g;
      this.realGolfer = true;
      const clip = real.clips.find(c => /swing/i.test(c.name)) ?? real.clips[0] ?? null;
      if (clip) { this.mixer = new THREE.AnimationMixer(obj); this.swingClip = clip; }
      return;
    }
    const g = new THREE.Group();
    const skin = this.mat(0xd2a07c), shirt = this.mat(0xdfe5e2), pants = this.mat(0x2a2f36), shoe = this.mat(0xf4f4f4), dark = this.mat(0x1d2124);
    const cap = (r: number, l: number, mm: THREE.Material, x: number, y: number, z: number, rx = 0, rz = 0) => {
      const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 10), mm); c.position.set(x, y, z); c.rotation.set(rx, 0, rz); c.castShadow = true; g.add(c); return c;
    };
    // golfer hướng +x (tay phải); đơn vị: ft, chuẩn 5'9"
    cap(0.2, 2.3, pants, 0, 1.55, -0.45, 0, 0.12); cap(0.2, 2.3, pants, 0, 1.55, 0.45, 0, 0.12);
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.22, 0.36), shoe); s1.position.set(0.15, 0.11, -0.48); g.add(s1);
    const s2 = s1.clone(); s2.position.z = 0.48; g.add(s2);
    cap(0.45, 1.25, shirt, 0.35, 3.55, 0, 0, -0.5);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 18, 14), skin); head.position.set(0.95, 4.65, 0); head.castShadow = true; g.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.1), dark); hair.position.copy(head.position); hair.rotation.z = 0.5; g.add(hair);
    // tay + gậy xoay quanh vai
    const arms = new THREE.Group(); arms.position.set(0.85, 4.05, 0);
    const a1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 1.55, 4, 8), shirt); a1.position.set(0.25, -0.85, -0.18); a1.rotation.set(0.15, 0, 0.35); arms.add(a1);
    const a2 = a1.clone(); a2.position.z = 0.18; a2.rotation.x = -0.15; arms.add(a2);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.6, 8), this.mat(0xaab3b8, { metalness: 0.8, roughness: 0.3 }));
    shaft.position.set(0.95, -2.95, 0); shaft.rotation.z = 0.3; arms.add(shaft);
    const head2 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.24), dark); head2.position.set(1.48, -4.6, 0); arms.add(head2);
    g.add(arms);
    this.swingArms = [arms];
    g.scale.setScalar(k);
    const gx = hand === 'R' ? t.x - 2.0 * k : t.x + 2.0 * k;
    g.position.set(this.X(gx), p.floorRaise + p.standY, p.teeZ);
    g.rotation.y = hand === 'R' ? 0 : Math.PI;
    this.root.add(g);
    this.golfer = g;
  }

  private buildCar(p: Plan) {
    const c = p.car!, b = c.body;
    const bodyM = this.mat(C.car, { metalness: 0.5, roughness: 0.35 });
    const glass = this.mat(0x111820, { metalness: 0.2, roughness: 0.1 });
    const h = b.y1 - b.y0, wheelR = Math.min(1.1, h * 0.22);
    this.boxMesh({ ...b, y0: b.y0 + wheelR * 0.7, y1: b.y0 + h * 0.6 }, bodyM);
    const along = b.z1 - b.z0 > b.x1 - b.x0;
    const cab = along ? { ...b, x0: b.x0 + 0.25, x1: b.x1 - 0.25, z0: b.z0 + (b.z1 - b.z0) * 0.25, z1: b.z1 - (b.z1 - b.z0) * 0.3, y0: b.y0 + h * 0.6, y1: b.y1 } : b;
    this.boxMesh(cab, glass);
    const wm = this.mat(0x111111);
    for (const fz of [0.18, 0.82]) for (const sx of [b.x0 + 0.15, b.x1 - 0.15]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, 0.7, 20), wm);
      w.rotation.z = Math.PI / 2; w.position.copy(this.v(sx, b.y0 + wheelR, b.z0 + (b.z1 - b.z0) * fz)); this.root.add(w);
    }
    this.label('car', c.car.name, this.v((b.x0 + b.x1) / 2, b.y1 + 0.5, (b.z0 + b.z1) / 2));
  }

  // ---------- cameras ----------
  setView(v: View, instant = false) {
    this.view = v;
    const p = this.plan; if (!p) return;
    const W = p.W, D = p.D, H = p.H;
    if (v === '3d') {
      this.camera = this.persp;
      this.controls.object = this.persp;
      this.controls.enableRotate = true;
      const r = this.host.getBoundingClientRect();
      const asp = r.width / Math.max(1, r.height);
      const far = Math.max(W, D) * 0.75 * (asp < 1.3 ? 1.3 / Math.max(asp, 0.5) : 1);
      this.persp.position.set(W * 0.35, H * 1.15 + 2 + (asp < 1 ? far * 0.25 : 0), D + far);
      this.controls.target.set(0, H * 0.38, D * 0.42);
    } else {
      this.camera = this.ortho;
      this.controls.object = this.ortho;
      this.controls.enableRotate = false;
      const cx = 0, cz = D / 2;
      if (v === 'top') { this.ortho.position.set(cx, H + 60, cz); this.ortho.up.set(0, 0, -1); this.controls.target.set(cx, 0, cz); }
      if (v === 'side') { this.ortho.position.set(W / 2 + 60, H / 2, cz); this.ortho.up.set(0, 1, 0); this.controls.target.set(0, H / 2, cz); }
      if (v === 'front') { this.ortho.position.set(0, H / 2, D + 60); this.ortho.up.set(0, 1, 0); this.controls.target.set(0, H / 2, D / 2); }
      this.ortho.zoom = 1;
    }
    this.controls.update();
    this.resize();
  }

  zoomBy(f: number) {
    if (this.camera === this.ortho) { this.ortho.zoom *= f; this.ortho.updateProjectionMatrix(); }
    else { const t = this.controls.target, pos = this.persp.position; pos.sub(t).multiplyScalar(1 / f).add(t); }
    this.controls.update();
  }

  focus(key: string) {
    const t = this.focusTargets.get(key);
    if (!t) return;
    if (this.view !== '3d') this.setView('3d');
    const off = new THREE.Vector3().subVectors(this.persp.position, this.controls.target).normalize().multiplyScalar(9);
    this.controls.target.copy(t); this.persp.position.copy(t).add(off); this.controls.update();
  }

  resize() {
    const r = this.host.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    this.renderer.setSize(w, h, false);
    this.persp.aspect = w / h; this.persp.updateProjectionMatrix();
    const p = this.plan;
    if (p) {
      const span = this.view === 'top' ? Math.max(p.W, p.D * (w / h) ** -1) : this.view === 'side' ? Math.max(p.D, p.H * (w / h)) : Math.max(p.W, p.H * (w / h));
      const half = (span / 2) * 1.18;
      const aspect = w / h;
      let hw = half, hh = half / aspect;
      if (this.view === 'top') { hh = Math.max(p.D, p.W / aspect) / 2 * 1.15; hw = hh * aspect; }
      if (this.view === 'side') { hw = Math.max(p.D, p.H * aspect) / 2 * 1.15; hh = hw / aspect; }
      if (this.view === 'front') { hw = Math.max(p.W, p.H * aspect) / 2 * 1.2; hh = hw / aspect; }
      Object.assign(this.ortho, { left: -hw, right: hw, top: hh, bottom: -hh });
      this.ortho.updateProjectionMatrix();
    }
  }

  /** Phát swing. Trả về false nếu golfer hiện tại không có animation. */
  playSwing(): boolean {
    if (this.realGolfer) {
      if (!this.mixer || !this.swingClip) return false;
      const a = this.mixer.clipAction(this.swingClip);
      a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false; a.play();
      return true;
    }
    this.swingT = 0; return true;
  }

  snapshot(caption: string): string {
    this.renderer.render(this.scene, this.camera);
    const src = this.renderer.domElement;
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height + 60;
    const x = c.getContext('2d')!;
    x.drawImage(src, 0, 0);
    x.fillStyle = '#0f1a17'; x.fillRect(0, src.height, c.width, 60);
    x.fillStyle = '#d8ef3a'; x.font = '600 22px sans-serif'; x.fillText(caption, 18, src.height + 38);
    return c.toDataURL('image/png');
  }

  // ---------- drag ----------
  private bindDrag() {
    const el = this.renderer.domElement;
    const toFloor = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(ndc, this.camera);
      this.floorPlane.constant = -((this.plan?.floorRaise ?? 0) + 0.2);
      const hit = new THREE.Vector3();
      return this.raycaster.ray.intersectPlane(this.floorPlane, hit) ? hit : null;
    };
    el.addEventListener('pointerdown', e => {
      if (!this.moveMode || !this.plan) return;
      const h = toFloor(e); if (!h) return;
      const m = this.plan.mat;
      const x = h.x + this.plan.W / 2;
      if (x > m.x0 - 1 && x < m.x1 + 1 && h.z > m.z0 - 1 && h.z < m.z1 + 1) {
        this.dragging = true; this.controls.enabled = false; el.setPointerCapture(e.pointerId);
      }
    });
    el.addEventListener('pointermove', e => {
      if (!this.dragging || !this.plan) return;
      const h = toFloor(e); if (!h) return;
      const snap = (v: number) => Math.round(v * 12) / 12;
      this.onDragTee?.(snap(h.x + this.plan.W / 2), snap(h.z));
    });
    const end = () => { this.dragging = false; this.controls.enabled = true; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }

  // ---------- frame ----------
  private tick(t: number) {
    const dt = this.clock.getDelta();
    this.mixer?.update(dt);
    this.controls.update();
    if (this.swingT >= 0 && this.swingArms.length) {
      this.swingT += 1 / 60;
      const T = this.swingT, dur = 2.6;
      // gậy lên (backswing) rồi xuống qua bóng tới follow-through
      let a: number;
      if (T < 1.2) a = (T / 1.2) * 2.3;
      else if (T < 1.6) a = 2.3 - ((T - 1.2) / 0.4) * 4.4;
      else a = -2.1;
      for (const arm of this.swingArms) arm.rotation.x = a;
      if (T > dur) { this.swingT = -1; for (const arm of this.swingArms) arm.rotation.x = 0; }
    }
    this.renderer.render(this.scene, this.camera);
    // nhãn
    const r = this.renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector3();
    for (const l of this.labels) {
      v.copy(l.pos).project(this.camera);
      const vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      l.el.style.display = vis ? '' : 'none';
      if (vis) l.el.style.transform = `translate(${((v.x + 1) / 2) * r.width}px, ${((1 - v.y) / 2) * r.height}px) translate(-50%, -50%)`;
    }
  }
}

export { fmtSmall };
