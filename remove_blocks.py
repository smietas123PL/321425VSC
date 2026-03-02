import os

file_path = r'c:\Users\User\Downloads\AgentSpark\321425VSC\js\app.js'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if '// ─── SHARING VIA URL ──────────────────────────────────────' in line:
        skip = True
    elif '// ─── ONBOARDING WIZARD ────────────────────────────────────' in line:
        skip = False
        
    if '// ─── PWA ──────────────────────────────────────────────────' in line:
        skip = True
    elif 'document.getElementById(\'modal\').addEventListener(\'click\', function (e) {' in line:
        skip = False
        
    if not skip:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Done removing blocks from app.js")
