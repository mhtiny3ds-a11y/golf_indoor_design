// Chuẩn hoá mô hình: models-src/**/*.glb → public/models/**/*.glb
// - đổi vật liệu specular-glossiness (định dạng cũ) sang metal-roughness mà three.js đọc được
// - gộp cây node (flatten), bỏ dữ liệu trùng/thừa. Giữ nguyên hướng trục và kích thước của file.
// Ảnh (textures/*.jpg|png) được chép nguyên.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { metalRough, flatten, dedup, prune } from '@gltf-transform/functions';
import { readdirSync, statSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';

const SRC = 'models-src', OUT = 'public/models';
if (!existsSync(SRC)) { console.log('Không có thư mục models-src/, bỏ qua.'); process.exit(0); }
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
let n = 0;
for (const file of walk(SRC)) {
  const rel = relative(SRC, file), out = join(OUT, rel), ext = extname(file).toLowerCase();
  mkdirSync(dirname(out), { recursive: true });
  if (ext === '.glb') {
    const doc = await io.read(file);
    await doc.transform(metalRough(), flatten(), dedup(), prune());
    await io.write(out, doc);
    n++;
  } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) { copyFileSync(file, out); n++; }
}
console.log(`Đã chuẩn hoá ${n} file vào ${OUT}/`);
