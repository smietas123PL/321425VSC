import fs from 'fs';

// --- state.ts update ---
let stateContent = fs.readFileSync('js/core/state.ts', 'utf-8');
if (!stateContent.includes('currentProjectId')) {
    stateContent = stateContent.replace(
        `currentModalTab: 'preview' as string,`,
        `currentModalTab: 'preview' as string,\n    currentProjectId: null as string | null,`
    );
    // screens.ts also complained about lastScreenName
    stateContent = stateContent.replace(
        `currentModalFile: '' as string,`,
        `currentModalFile: '' as string,\n    lastScreenName: '' as string,`
    );
    fs.writeFileSync('js/core/state.ts', stateContent, 'utf-8');
}

// --- db.ts update ---
let dbContent = fs.readFileSync('js/db.ts', 'utf-8');
dbContent = dbContent.replace("let _currentProjectId: string | null = null;", ""); // Remove local
dbContent = dbContent.replace(/_currentProjectId/g, "state.currentProjectId");
fs.writeFileSync('js/db.ts', dbContent, 'utf-8');

// --- app.ts update ---
let appContent = fs.readFileSync('js/app.ts', 'utf-8');
appContent = appContent.replace(/_currentProjectId/g, "state.currentProjectId");
appContent = appContent.replace(/scheduleAutoSave\(\)/g, "(window as any).scheduleAutoSave()");
appContent = appContent.replace(/_clearGistImportError\(\)/g, "(window as any)._clearGistImportError()");
appContent = appContent.replace(/closeMdBrowser\(\)/g, "(window as any).closeMdBrowser()");
fs.writeFileSync('js/app.ts', appContent, 'utf-8');

console.log('Fixed implicit global references round 2.');
