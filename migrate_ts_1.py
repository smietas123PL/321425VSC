import os
import shutil

# Create utils directory
os.makedirs(r'c:\Users\User\Downloads\AgentSpark\321425VSC\js\utils', exist_ok=True)

# Path to old i18n
old_i18n = r'c:\Users\User\Downloads\AgentSpark\321425VSC\js\i18n.js'
new_i18n = r'c:\Users\User\Downloads\AgentSpark\321425VSC\js\utils\i18n.ts'

with open(old_i18n, 'r', encoding='utf-8') as f:
    content = f.read()

# Make it valid TypeScript and attach to window so we don't break the global scope
ts_additions = """
// Types
interface AgentSparkWindow extends Window {
    lang: string;
    t: (key: string) => any;
    tr: (enText: string, plText: string) => string;
    setLang: (l: string) => void;
    refreshStaticI18n: () => void;
}
declare let window: AgentSparkWindow;

"""

# Add explicit types to functions.
content = content.replace("function t(key) {", "function t(key: string): any {")
content = content.replace("function tr(enText, plText) {", "function tr(enText: string, plText: string): string {")
content = content.replace("function setLang(l) {", "function setLang(l: string): void {")
content = content.replace("function refreshStaticI18n() {", "function refreshStaticI18n(): void {")

# Attach to window at the bottom
window_attach = """
window.lang = lang;
window.t = t;
window.tr = tr;
window.setLang = setLang;
window.refreshStaticI18n = refreshStaticI18n;
"""

with open(new_i18n, 'w', encoding='utf-8') as f:
    f.write(ts_additions + content + window_attach)

# Also create validation.ts
validation_ts = """
interface AgentSparkWindow extends Window {
    validateProjectSchema: (project: any) => boolean;
}
declare let window: AgentSparkWindow;

export function validateProjectSchema(project: any): boolean {
    if (!project) return false;
    if (typeof project !== 'object') return false;
    if (project.v !== 3) return false;
    if (!Array.isArray(project.agents)) return false;
    return true;
}

window.validateProjectSchema = validateProjectSchema;
"""
with open(r'c:\Users\User\Downloads\AgentSpark\321425VSC\js\utils\validation.ts', 'w', encoding='utf-8') as f:
    f.write(validation_ts)

# Delete old i18n.js
os.remove(old_i18n)

# Update index.html
html_path = r'c:\Users\User\Downloads\AgentSpark\321425VSC\index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Change script reference to use type="module" eventually for ts files (for vite)
# But wait, Vite replaces <script src="js/i18n.ts"> with <script type="module" src="/js/i18n.ts"> out of the box if we use type="module".
html = html.replace('<script src="js/i18n.js"></script>', '<script type="module" src="js/utils/i18n.ts"></script>\\n  <script type="module" src="js/utils/validation.ts"></script>')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Migrated utils to TypeScript.")
