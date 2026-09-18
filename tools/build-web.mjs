/**
 * Web sürümünü dist/ altına paketler. Üç çıktı, tek kaynaktan:
 *
 *   dist/index.html + main.js   statik site (GitHub Pages, Netlify)
 *   dist/kusat.html             tek dosyalık sürüm; çift tıklayıp oynanır,
 *                               tek başına da paylaşılabilir
 *   dist/artifact.html          gövde + stil, belge iskeleti olmadan
 *                               (Claude Artifact gibi sayfayı kendi saran ortamlar)
 *
 *   node tools/build-web.mjs           tek seferlik derleme
 *   node tools/build-web.mjs --serve   yerel sunucu + değişiklikte yeniden derleme
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { context } from 'esbuild';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = resolve(root, 'dist');
const serve = process.argv.includes('--serve');

const TITLE = 'Kuşat';
const DESCRIPTION =
  'Kuşat — Volfied tarzı alan kapatma oyunu. Kenardan içeri dal, izini bağla, alanı ele geçir.';
const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%2305070f'/%3E%3Crect x='4' y='16' width='10' height='12' fill='%231b4b8f'/%3E%3Ccircle cx='22' cy='10' r='4' fill='%23ff3b7f'/%3E%3C/svg%3E";

const read = (file) => readFileSync(resolve(root, file), 'utf8');

/** Tam belge: kendi meta etiketleri ve stiliyle. */
function documentPage(css, body, script) {
  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
    />
    <meta name="theme-color" content="#05070f" />
    <meta name="description" content="${DESCRIPTION}" />
    <title>${TITLE}</title>
    <link rel="icon" href="${FAVICON}" />
    <style>
${css}
    </style>
  </head>
  <body>
${body}
${script}
  </body>
</html>
`;
}

/**
 * İskeletsiz sayfa: sayfayı saran ortam <html>/<head>/<body> ve güvenli alan
 * dolgusunu kendisi verdiğinden #app'in kendi dolgusu sıfırlanır.
 */
function embeddedPage(css, body, script) {
  return `<title>${TITLE}</title>
<style>
${css}

/* Sayfayı saran ortam güvenli alan dolgusunu kendisi veriyor. */
#app {
  padding: 0;
}
</style>
${body}
${script}
`;
}

function writeOutputs() {
  const css = read('web/styles.css');
  const body = read('web/body.html');
  const bundle = readFileSync(resolve(outDir, 'main.js'), 'utf8');
  const inline = `<script type="module">\n${bundle}\n</script>`;

  writeFileSync(
    resolve(outDir, 'index.html'),
    documentPage(css, body, '<script type="module" src="./main.js"></script>')
  );
  writeFileSync(resolve(outDir, 'kusat.html'), documentPage(css, body, inline));
  writeFileSync(resolve(outDir, 'artifact.html'), embeddedPage(css, body, inline));
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const ctx = await context({
  entryPoints: [resolve(root, 'web/main.ts')],
  outfile: resolve(outDir, 'main.js'),
  bundle: true,
  minify: !serve,
  sourcemap: serve,
  format: 'esm',
  target: ['es2020'],
  logLevel: 'info',
  plugins: [
    {
      name: 'compose-html',
      setup(build) {
        build.onEnd(writeOutputs);
      },
    },
  ],
});

if (serve) {
  await ctx.watch();
  const { hosts, port } = await ctx.serve({ servedir: outDir, port: 4173 });
  console.log(`Kuşat web: http://${hosts[0]}:${port}`);
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log('dist/ hazır: index.html + main.js, kusat.html (tek dosya), artifact.html');
}
