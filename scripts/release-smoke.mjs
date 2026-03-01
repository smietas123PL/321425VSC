import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const fail = [];

const indexHtml = read('index.html');
const manifest = JSON.parse(read('manifest.json'));
const serviceWorker = read('service-worker.js');
const inlineScripts = [...indexHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
const mainInlineScript = inlineScripts
  .map(m => m[1])
  .filter(Boolean)
  .sort((a, b) => b.length - a.length)[0] || '';

const checks = [
  {
    name: 'Gallery remote fetch uses relative path',
    ok: indexHtml.includes("fetch('./featured_templates.json'")
  },
  {
    name: 'Unsafe inline gallery onclick removed',
    ok: !indexHtml.includes("onclick=\"showTemplateDetail('${t.id}')\"")
  },
  {
    name: 'Template schema normalization exists',
    ok: indexHtml.includes('function normalizeTemplate(raw)')
  },
  {
    name: 'AI HTML sanitizer exists',
    ok: indexHtml.includes('function sanitizeRichText(input)')
  },
  {
    name: 'Share payload schema validation exists',
    ok: indexHtml.includes('function validateSharePayload(raw)')
  },
  {
    name: 'Share limits are defined',
    ok: indexHtml.includes('const SHARE_LIMITS =')
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
    name: 'Main inline script parses without syntax errors',
    ok: (() => {
      if (!mainInlineScript) return false;
      try {
        // Syntax check only, no execution.
        // eslint-disable-next-line no-new-func
        new Function(mainInlineScript);
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
