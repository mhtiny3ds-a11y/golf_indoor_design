import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// SINGLEFILE=1 builds one self-contained index.html (used for the artifact preview).
export default defineConfig({
  base: './', // chạy được ở thư mục con (GitHub Pages, hosting tĩnh)
  plugins: process.env.SINGLEFILE ? [viteSingleFile()] : [],
  test: { globals: true, environment: 'node' },
});
