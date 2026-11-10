// Renders the app icon (an italic Newsreader letter, cream on ink, with an
// amber sprocket mark) at every size the site needs, using the real font
// through Chromium, then packs the small sizes into a PNG-in-ICO favicon.
//
//   node scripts/make-icons.js M      (pass the brand's initial)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, '..');
const LETTER = (process.argv[2] || 'M').slice(0, 2);
const FONT = path.join(APP, 'node_modules/@fontsource-variable/newsreader/files/newsreader-latin-opsz-italic.woff2');
const OUT = path.join(APP, 'public');

const page = (size, { safe }) => `<!doctype html><html><head><style>
@font-face { font-family: 'NR'; src: url('file://${FONT}') format('woff2'); font-style: italic; font-weight: 200 800; }
html, body { margin: 0; }
.icon { width: ${size}px; height: ${size}px; background: #1a1815; position: relative; overflow: hidden; }
.m { position: absolute; left: 0; right: 0; top: 50%; text-align: center;
     font-family: 'NR'; font-style: italic; font-weight: 400; color: #f3efe7;
     font-size: ${Math.round(size * (safe ? 0.56 : 0.74))}px; line-height: 1;
     font-variation-settings: 'opsz' 72; transform: translate(-1.5%, -54%); }
.bar { position: absolute; left: 50%; width: ${Math.max(1, Math.round(size * 0.035))}px;
       height: ${Math.max(2, Math.round(size * 0.075))}px; background: #e29b4c;
       bottom: ${Math.round(size * (safe ? 0.2 : 0.11))}px; transform: translateX(-50%);
       border-radius: ${Math.max(0.5, size * 0.006)}px; }
</style></head><body><div class="icon"><span class="m">${LETTER}</span>${size >= 48 ? '<span class="bar"></span>' : ''}</div></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const targets = [
    ['icon-512.png', 512, true],
    ['icon-192.png', 192, true],
    ['apple-touch-icon.png', 180, false],
    ['favicon-32x32.png', 32, false],
    ['favicon-16x16.png', 16, false],
  ];
  const buffers = {};
  for (const [name, size, safe] of targets) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(page(size, { safe }));
    await p.evaluate(() => document.fonts.ready);
    const buf = await p.locator('.icon').screenshot();
    fs.writeFileSync(path.join(OUT, name), buf);
    buffers[size] = buf;
    console.log('wrote', name, buf.length, 'bytes');
  }
  await browser.close();

  // PNG-in-ICO: header + one directory entry per image + the PNG data.
  const images = [buffers[32], buffers[16]];
  const sizes = [32, 16];
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const dir = Buffer.alloc(16 * images.length);
  let offset = 6 + dir.length;
  images.forEach((img, i) => {
    const o = i * 16;
    dir.writeUInt8(sizes[i], o);
    dir.writeUInt8(sizes[i], o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(img.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += img.length;
  });
  const ico = Buffer.concat([header, dir, ...images]);
  fs.writeFileSync(path.join(OUT, 'favicon.ico'), ico);
  console.log('wrote favicon.ico', ico.length, 'bytes');
})();
