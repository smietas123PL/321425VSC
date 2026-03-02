import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const fail = [];

const indexHtml = read('index.html');
const manifest = JSON.parse(read('manifest.json'));
const serviceWorker = read('service-worker.js');
const appJs = read('js/app.js');
const galleryJs = read('js/gallery.js');

const checks = [
  {
    name: 'Gallery remote fetch uses relative path',
    ok: galleryJs.includes("fetch('./featured_templates.json'")
  },
  {
    name: 'Unsafe inline gallery onclick removed',
    ok: !indexHtml.includes("onclick=\"showTemplateDetail('${t.id}')\"")
  },
  {
    name: 'Template schema normalization exists',
    ok: galleryJs.includes('function normalizeTemplate(raw)')
  },
  {
    name: 'AI HTML sanitizer exists',
    ok: appJs.includes('function sanitizeRichText(input)')
  },
  {
    name: 'Share payload schema validation exists',
    ok: appJs.includes('function validateSharePayload(raw)')
  },
  {
    name: 'Share limits are defined',
    ok: appJs.includes('const SHARE_LIMITS =')
  },
  {
    name: 'Manifest start_url is relative',
    ok: manifest.start_url === './'
  },
  {
    name: 'Manifest shortcuts are relative',
    ok: Array.isArray(manifest.shortcuts) && manifest.shortcuts.every(s => String(s.url || '').startsWith('./'))
  },
  {
    name: 'Service worker caches relative assets',
    ok: serviceWorker.includes("'./index.html'") && serviceWorker.includes("'./featured_templates.json'")
  },
  {
    name: 'Service worker has explicit offline fallback response',
    ok: serviceWorker.includes("new Response('Offline'")
  },
  {
    name: 'Main app script parses without syntax errors',
    ok: (() => {
      try {
        // Syntax check only, no execution.
        // eslint-disable-next-line no-new-func
        new Function(appJs);
        return true;
      } catch {
        return false;
      }
    })()
  },
  {
    name: 'Gallery script parses without syntax errors',
    ok: (() => {
      try {
        // Syntax check only, no execution.
        // eslint-disable-next-line no-new-func
        new Function(galleryJs);
        return true;
      } catch {
        return false;
      }
    })()
  }
];

for (const check of checks) {
  if (!check.ok) fail.push(check.name);
}

if (fail.length) {
  console.error('Release smoke checks failed:');
  fail.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log('Release smoke checks passed.');
