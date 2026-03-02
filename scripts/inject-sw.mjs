import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const manifestPath = path.join(dist, '.vite', 'manifest.json');
const swSourcePath = path.join(root, 'service-worker.js');
const swDestPath = path.join(dist, 'service-worker.js');

if (!fs.existsSync(manifestPath)) {
    console.log('No Vite manifest found, skipping SW injection.');
    process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const assetsToCache = [
    './',
    './index.html',
    './manifest.json',
    './featured_templates.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
];

for (const key of Object.keys(manifest)) {
    const chunk = manifest[key];
    if (chunk.file) {
        assetsToCache.push('./' + chunk.file);
    }
    if (chunk.css) {
        for (const cssFile of chunk.css) {
            assetsToCache.push('./' + cssFile);
        }
    }
}

let swContent = fs.readFileSync(swSourcePath, 'utf8');

// Replace everything inside const ASSETS = [ ... ]; with our dynamic list
swContent = swContent.replace(
    /const ASSETS = \[[^\]]+\];/,
    `const ASSETS = ${JSON.stringify(assetsToCache, null, 2)};`
);

// Write to dist folder
fs.writeFileSync(swDestPath, swContent);
console.log(`Injected ${assetsToCache.length} hashed assets into Service Worker.`);

// Also copy featured_templates.json, manifest.json and icons to dist if not there
function copyIfMissing(fileOrDir) {
    const src = path.join(root, fileOrDir);
    const dest = path.join(dist, fileOrDir);
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
        if (fs.statSync(src).isDirectory()) {
            fs.cpSync(src, dest, { recursive: true });
        } else {
            fs.copyFileSync(src, dest);
        }
    }
}

copyIfMissing('manifest.json');
copyIfMissing('featured_templates.json');
copyIfMissing('icons');
