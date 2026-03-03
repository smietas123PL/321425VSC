import fs from 'fs';

// --- app.ts update ---
let appContent = fs.readFileSync('js/app.ts', 'utf-8');
// Only replace the actual function calls
appContent = appContent.replace(/closeTemplateDetail\(\)/g, '(window as any).closeTemplateDetail()');
appContent = appContent.replace(/_unlockReject\(/g, '(window as any)._unlockReject(');
appContent = appContent.replace(/loadFromHash\(\)/g, '(window as any).loadFromHash()');
appContent = appContent.replace(/refreshStaticI18n\(\)/g, '(window as any).refreshStaticI18n()');
appContent = appContent.replace(/loadFeaturedTemplates\(\)/g, '(window as any).loadFeaturedTemplates()');
appContent = appContent.replace(/closeModal\(\)/g, '(window as any).closeModal()');
fs.writeFileSync('js/app.ts', appContent, 'utf-8');

console.log('Fixed implicit global references.');
