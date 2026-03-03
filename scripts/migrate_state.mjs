import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const JS_DIR = path.resolve('js');
const files = globSync('js/**/*.ts', { nodir: true });

// List of global variables that have been moved to state.ts
const stateVars = [
    'lang', 'apiKey', 'selectedModel', 'currentTopic', 'currentLevel',
    'chatHistory', 'conversationState', 'questionCount', 'MAX_QUESTIONS',
    'generatedAgents', 'generatedFiles', 'refineHistory', 'isRefining',
    'currentUser', 'isPro', 'versionHistory', 'traceSpans', 'GALLERY_TEMPLATES',
    'currentModalFile', 'mdBrowserActiveFile', 'currentModalTab', '_pendingRefineData'
];

// Regex matching whole word boundary for the target variable, 
// ensuring it isn't preceded by a dot (like object.lang) or state. (already migrated)
// and checking it isn't used as a function parameter or interface property name.
// Simplistic approach: find \bVAR\b and replace if not preceded by `.` or `'` or `"`
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

for (const file of files) {
    if (file.includes('state.ts')) continue;

    let content = fs.readFileSync(file, 'utf-8');
    let originalContent = content;
    let modified = false;

    // First inject the import if any of these variables are used in the file
    let needsImport = false;
    for (const v of stateVars) {
        // Broad check for usage to decide if import is needed
        const broadCheck = new RegExp(`\\b${v}\\b`, 'g');
        if (broadCheck.test(content)) {
            needsImport = true;
            break;
        }
    }

    if (needsImport) {
        // Let's replace usages of the state variables with state.varName
        for (const v of stateVars) {
            // First, catch explicit window.varName -> state.varName
            content = content.replace(new RegExp(`window\\.${v}\\b`, 'g'), `state.${v}`);

            // Second, catch standalone TS variable usages
            // Exclude anything that follows a dot EXCEPT when the dot is part of `window.` or `this.` (but we don't have this.)
            // We caught object properties before, so we must be very careful.
            // A variable usage is typically NOT preceded by a dot.
            // It is NOT followed by a colon (object key).
            const regex = new RegExp(`(^|[^a-zA-Z0-9_.'"\`])(${v})(\\b(?!\\s*:))`, 'g');
            content = content.replace(regex, (match, p1, p2, p3) => {
                // If it's already state.X, skip
                if (p1 === 'state.') return match;
                // If it's something like obj.lang, skip
                if (p1 === '.') return match;

                // Extra check: if p1 is part of a URL or path, skip maybe?
                modified = true;
                return `${p1}state.${p2}${p3}`;
            });
        }
    }

    // Add import statement at the top if modified
    if (modified || content !== originalContent) {
        const importPath = path.relative(path.dirname(file), path.join(JS_DIR, 'core', 'state')).replace(/\\/g, '/');
        const importPathWithExt = `'${importPath.startsWith('.') ? importPath : './' + importPath}'`;

        // Remove existing state imports to avoid duplicates if run multiple times
        content = content.replace(/import\s+\{\s*state\s*\}\s+from\s+[^;\n]+;?\n?/g, '');

        // Put it after the other imports or at the top
        const importStmt = `import { state } from ${importPathWithExt};\n`;
        content = importStmt + content;

        fs.writeFileSync(file, content, 'utf-8');
        console.log(`Migrated state variables in ${file}`);
    }
}
