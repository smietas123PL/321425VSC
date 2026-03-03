import fs from 'fs';

let content = fs.readFileSync('js/features/share.ts', 'utf-8');

// Fix 1: The payload shorthand
content = content.replace('      state.lang,', '      lang: state.lang,');

// Fix 2: The window exports
content = content.replace('window.generateShareUrl = generateShareUrl;', '(window as any).generateShareUrl = generateShareUrl;');
content = content.replace('window.onShareModeChange = onShareModeChange;', '(window as any).onShareModeChange = onShareModeChange;');
content = content.replace('window.openShareModal = openShareModal;', '(window as any).openShareModal = openShareModal;');
content = content.replace('window.closeShareModal = closeShareModal;', '(window as any).closeShareModal = closeShareModal;');
content = content.replace('window.copyShareUrl = copyShareUrl;', '(window as any).copyShareUrl = copyShareUrl;');

fs.writeFileSync('js/features/share.ts', content, 'utf-8');
console.log('Fixed share.ts literally using substring matching.');
