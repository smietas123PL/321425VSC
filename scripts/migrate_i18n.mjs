import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const JS_DIR = path.resolve('js');
const I18N_FILE = path.join(JS_DIR, 'utils', 'i18n.ts');

const files = globSync('js/**/*.ts', { nodir: true });
console.log(`Found ${files.length} TS files to process.`);

let i18nContent = fs.readFileSync(I18N_FILE, 'utf-8');

// We need to parse T.en and T.pl objects from i18n.ts.
// The structure is roughly:
// const T: any = {
//   en: { ... },
//   pl: { ... }
// };
// Instead of modifying the AST, since it's a huge TS file, we can append new keys at the end of the `en` and `pl` objects.
// Wait, appending programmatically to strings is tricky. We'll find the closing brace of `en: {` and `pl: {`.
// Or we can just dynamically populate translations via a new object and merge them.
// Let's create an `i18n-dynamic.ts` to export the new strings or inject them right before the T export.

// Regex to match: tr('Eng', 'Pol') or tr("Eng", "Pol")
// Handling newlines and escaped quotes can be tricky. Let's use a simpler match first.
const trRegex = /tr\(\s*(['"`])([^'"`]+)\1\s*,\s*(['"`])([^'"`]+)\3\s*\)/g;
// Wait, the regex above doesn't support strings containing the opposite quote. 
// Let's use a more robust logic or allow manual adjustments for corner cases, but for now we have simple cases mostly.
// Actually, some use backticks with variables like tr(`🔀 Forked: ${t.title}`, `🔀 Skopiowano: ${t.title}`)
// For template literals with dynamic content, it's better to NOT auto-extract unless we parameterize them.
// We can just extract plain string literals.
const simpleTrRegex = /tr\(\s*'(.*?)'\s*,\s*'(.*?)'\s*\)/g;

let newEn = {};
let newPl = {};
let counter = 1;

function generateKey(enStr) {
    let key = enStr.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').substring(0, 30);
    return key.replace(/^_|_$/g, '');
}

for (const file of files) {
    if (file.includes('i18n.ts')) continue;
    let content = fs.readFileSync(file, 'utf-8');
    let modified = false;

    content = content.replace(simpleTrRegex, (match, enMatch, plMatch) => {
        // Unescape internal escaped quotes if any
        let enStr = enMatch.replace(/\\'/g, "'");
        let plStr = plMatch.replace(/\\'/g, "'");

        let targetKey = generateKey(enStr);
        if (!targetKey) targetKey = `str_${counter}`;

        // Handle collisions
        let finalKey = targetKey;
        let suffix = 1;
        while (newEn[finalKey] && newEn[finalKey] !== enStr) {
            finalKey = `${targetKey}_${suffix}`;
            suffix++;
        }

        newEn[finalKey] = enStr;
        newPl[finalKey] = plStr;
        modified = true;

        return `t('${finalKey}')`;
    });

    if (modified) {
        fs.writeFileSync(file, content, 'utf-8');
        console.log(`Updated ${file}`);
    }
}

// Generate the TS additions
let enAdditions = Object.entries(newEn).map(([k, v]) => `    ${k}: '${v.replace(/'/g, "\\'")}',`).join('\n');
let plAdditions = Object.entries(newPl).map(([k, v]) => `    ${k}: '${v.replace(/'/g, "\\'")}',`).join('\n');

if (Object.keys(newEn).length > 0) {
    console.log(`Extracted ${Object.keys(newEn).length} strings.`);
    // Save them to a temp file to manually inject or write code to inject it.
    fs.writeFileSync('i18n-additions-en.txt', enAdditions, 'utf-8');
    fs.writeFileSync('i18n-additions-pl.txt', plAdditions, 'utf-8');
    console.log("Additions written to i18n-additions-*.txt");
} else {
    console.log("No new simple strings extracted.");
}
