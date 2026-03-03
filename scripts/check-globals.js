const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const regex = /on(?:click|change|input|submit|keydown|keyup)=["']([^"']+)["']/g;
const matches = new Set();
let m;
while ((m = regex.exec(html)) !== null) {
    matches.add(m[1]);
}

const words = new Set();
for (const match of matches) {
    const parts = match.split(';');
    for (let part of parts) {
        part = part.trim();
        if (!part) continue;
        if (part.startsWith('if')) continue;
        if (part.includes('=')) continue; // assignments
        if (part.includes('.')) continue; // like this.nextElementSibling.style.display

        // Check if it's a function call
        if (part.includes('(')) {
            const fnName = part.split('(')[0].trim();
            if (fnName) words.add(fnName);
        }
    }
}

const fns = Array.from(words).sort();

const globRegex = /window\.([a-zA-Z0-9_]+)\s*=|^\s*\(\s*window\s+as\s+any\s*\)\.([a-zA-Z0-9_]+)\s*=/gm;
const jsMods = [];
try { jsMods.push(...fs.readdirSync('js').filter(f => f.endsWith('.ts')).map(f => 'js/' + f)); } catch (e) {/* eslint-disable-line no-empty */ }
['core', 'features', 'ui', 'utils'].forEach(dir => {
    try {
        jsMods.push(...fs.readdirSync('js/' + dir).filter(f => f.endsWith('.ts')).map(f => 'js/' + dir + '/' + f));
    } catch (e) {/* eslint-disable-line no-empty */ }
});

const exported = new Set();
jsMods.forEach(f => {
    const code = fs.readFileSync(f, 'utf8');
    let match;
    while ((match = globRegex.exec(code)) !== null) {
        exported.add(match[1] || match[2]);
    }
});

console.log('--- MISSING EXPORTS ---');
let missingCount = 0;
fns.forEach(f => {
    // some false positives might exist (like basic JS methods if any), but mostly they should be ours
    if (!exported.has(f) && f !== 'navigator' && f !== 'console' && f !== 'window' && f !== 'setTimeout') {
        console.log(f);
        missingCount++;
    }
});
if (missingCount === 0) {
    console.log('All functions appear to be exported.');
}
