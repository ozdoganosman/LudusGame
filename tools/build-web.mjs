/**
 * Web sürümünü dist/ altına paketler: esbuild ile tek bir ES modülü ve index.html.
 * Çıktı göreli yol kullandığı için GitHub Pages alt dizininde de çalışır.
 *
 *   node tools/build-web.mjs           tek seferlik derleme
 *   node tools/build-web.mjs --serve   yerel sunucu + değişiklikte yeniden derleme
 */
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { context } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'dist');
const serve = process.argv.includes('--serve');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

/** index.html'i her derlemeden sonra çıktıya kopyalar. */
const copyHtml = {
  name: 'copy-html',
  setup(build) {
    build.onEnd(() => {
      copyFileSync(resolve(root, 'web/index.html'), resolve(outDir, 'index.html'));
    });
  },
};

const ctx = await context({
  entryPoints: [resolve(root, 'web/main.ts')],
  outfile: resolve(outDir, 'main.js'),
  bundle: true,
  minify: !serve,
  sourcemap: true,
  format: 'esm',
  target: ['es2020'],
  logLevel: 'info',
  plugins: [copyHtml],
});

if (serve) {
  await ctx.watch();
  const { hosts, port } = await ctx.serve({ servedir: outDir, port: 4173 });
  console.log(`Kuşat web: http://${hosts[0]}:${port}`);
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log('dist/ hazır');
}
