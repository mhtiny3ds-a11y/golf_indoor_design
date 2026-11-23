// Nạp mô hình .glb thực tế (quy ước: docs/danh-sach-mo-hinh-3d.xlsx).
// Mô hình chuẩn: đơn vị mét, Y lên trên, mặt trước hướng +Z. File thiếu → trả null, cảnh dùng khối hình thay thế.
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface LoadedModel {
  scene: THREE.Group;
  clips: THREE.AnimationClip[];
  /** Khung bao theo mét, đã tính cả transform của file */
  box: THREE.Box3;
  /** Tâm hai bàn chân (điểm thấp nhất), dùng làm gốc cho người */
  feet: THREE.Vector3;
}

const BASE = './models/';
const cache = new Map<string, Promise<LoadedModel | null>>();
const ready = new Map<string, LoadedModel | null>();
const loader = new GLTFLoader();

function feetCentre(root: THREE.Object3D, box: THREE.Box3): THREE.Vector3 {
  // trung bình các đỉnh nằm trong 8 cm sát đáy → tâm bàn chân
  const lim = box.min.y + 0.08, sum = new THREE.Vector3(); let n = 0;
  const v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const pos = m.geometry.getAttribute('position');
    const step = Math.max(1, Math.floor(pos.count / 20000));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      if (v.y <= lim) { sum.add(v); n++; }
    }
  });
  if (!n) return new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
  sum.divideScalar(n); sum.y = box.min.y;
  return sum;
}

/** Bắt đầu nạp (một lần cho mỗi file). onReady được gọi khi nạp xong, kể cả khi thất bại. */
export function requestModel(path: string, onReady: () => void): void {
  if (cache.has(path)) return;
  const p = loader.loadAsync(BASE + path).then((g: GLTF): LoadedModel => {
    const scene = g.scene;
    scene.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
    });
    const box = new THREE.Box3().setFromObject(scene);
    return { scene, clips: g.animations, box, feet: feetCentre(scene, box) };
  }).catch(() => null);
  cache.set(path, p);
  p.then(m => { ready.set(path, m); onReady(); });
}

/** Mô hình đã nạp xong (bản sao mới mỗi lần gọi), hoặc null nếu chưa có / không có file. */
export function getModel(path: string): (LoadedModel & { instance: THREE.Object3D }) | null {
  const m = ready.get(path);
  if (!m) return null;
  return { ...m, instance: skeletonClone(m.scene) };
}
