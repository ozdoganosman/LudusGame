/**
 * Web sürümünü dist/ altına paketler. Üç çıktı, tek kaynaktan:
 *
 *   dist/index.html + main.js   statik site (GitHub Pages, Netlify)
 *   dist/nanogemi.html          tek dosyalık sürüm; çift tıklayıp oynanır,
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

const TITLE = 'Nanogemi';
const DESCRIPTION =
  'Nanogemi — küçültülmüş bir geminin kaptanı olarak insan dokusunu mikrop ve virüslerden temizle.';
const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%231b0f2e'/%3E%3Cpath d='M6 16 L20 9 L18 16 L20 23 Z' fill='%23eaf6ff'/%3E%3Ccircle cx='24' cy='16' r='3.5' fill='%233ff0c0'/%3E%3C/svg%3E";

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
  writeFileSync(resolve(outDir, 'nanogemi.html'), documentPage(css, body, inline));
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
  console.log(`Nanogemi: http://${hosts[0]}:${port}`);
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log('dist/ hazır: index.html + main.js, nanogemi.html (tek dosya), artifact.html');
}
