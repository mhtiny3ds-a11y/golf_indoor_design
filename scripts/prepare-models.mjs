// Chuẩn hoá mô hình: models-src/**/*.glb → public/models/**/*.glb
// - đổi vật liệu specular-glossiness (định dạng cũ) sang metal-roughness mà three.js đọc được
// - gộp cây node (flatten), bỏ dữ liệu trùng/thừa. Giữ nguyên hướng trục và kích thước của file.
// Ảnh (textures/*.jpg|png) được chép nguyên.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { metalRough, flatten, dedup, prune } from '@gltf-transform/functions';
import { readdirSync, statSync, mkdirSync, copyFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';

const SRC = 'models-src', OUT = 'public/models';
if (!existsSync(SRC)) { console.log('Không có thư mục models-src/, bỏ qua.'); process.exit(0); }
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
// models-src/fix.json: { "duong/dan.glb": { "rotateY": 180 } } để sửa hướng file không theo quy ước
const FIX = existsSync(join(SRC, 'fix.json')) ? JSON.parse(readFileSync(join(SRC, 'fix.json'), 'utf8')) : {};
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
let n = 0;
for (const file of walk(SRC)) {
  const rel = relative(SRC, file), out = join(OUT, rel), ext = extname(file).toLowerCase();
  mkdirSync(dirname(out), { recursive: true });
  if (ext === '.glb') {
    const doc = await io.read(file);
    await doc.transform(metalRough(), flatten(), dedup(), prune());
    const fix = FIX[rel.split('\\').join('/')];
    if (fix?.rotateY) {
      const a = (fix.rotateY * Math.PI) / 180;
      for (const scene of doc.getRoot().listScenes()) {
        const pivot = doc.createNode('fix-rotate').setRotation([0, Math.sin(a / 2), 0, Math.cos(a / 2)]);
        for (const child of scene.listChildren()) { scene.removeChild(child); pivot.addChild(child); }
        scene.addChild(pivot);
      }
    }
    await io.write(out, doc);
    n++;
  } else if (rel === 'fix.json') { continue;
  } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) { copyFileSync(file, out); n++; }
}
console.log(`Đã chuẩn hoá ${n} file vào ${OUT}/`);
