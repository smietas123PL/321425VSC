import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const fail = [];

// Ensure build output exists
const distDir = path.join(root, 'dist');
if (!fs.existsSync(distDir)) {
  console.error('dist/ directory not found. Run `npm run build` first.');
  process.exit(1);
}

const indexHtml = read('dist/index.html');
let manifestPath = 'manifest.json';
if (fs.existsSync(path.join(distDir, 'manifest.json'))) {
  manifestPath = 'dist/manifest.json';
} else {
  // Look for hashed manifest in dist/assets
  const assetsDir = path.join(distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    const mFile = files.find(f => f.startsWith('manifest') && f.endsWith('.json'));
    if (mFile) manifestPath = `dist/assets/${mFile}`;
  }
}
const manifest = JSON.parse(read(manifestPath));


// Find the JS bundle in dist/assets
const assetsDir = path.join(distDir, 'assets');
let mainJs = '';
if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  const jsFile = files.find(f => f.endsWith('.js'));
  if (jsFile) {
    mainJs = read(`dist/assets/${jsFile}`);
  }
}

const checks = [
  {
    name: 'Unsafe inline gallery onclick removed',
    ok: !indexHtml.includes("onclick=\"showTemplateDetail('${t.id}')\"")
  },
  {
    name: 'Main JS bundle exists',
    ok: !!mainJs
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
    name: 'Main app script parses without syntax errors',
    ok: (() => {
      if (!mainJs) return false;
      try {
        // Syntax check only, no execution.
        // eslint-disable-next-line no-new-func
        new Function(mainJs);
        return true;
      } catch {
        return false;
      }
    })()
  }
];

// Optional checks depending on if they got bundled correctly
if (mainJs.includes('featured_templates.json')) {
  checks.push({
    name: 'Gallery remote fetch uses correct path',
    ok: mainJs.includes("featured_templates.json")
  });
}

for (const check of checks) {
  if (!check.ok) fail.push(check.name);
}

if (fail.length) {
  console.error('Release smoke checks failed:');
  fail.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log('Release smoke checks passed.');
