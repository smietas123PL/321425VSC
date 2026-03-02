import os

app_path = r'c:\Users\User\Downloads\AgentSpark\321425VSC\js\app.js'
share_loader_path = r'c:\Users\User\Downloads\AgentSpark\321425VSC\js\features\share-loader.js'

with open(app_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
share_block = []
in_share = False
in_pwa = False

for line in lines:
    if '// ─── SHARING VIA URL ──────────────────────────────────────' in line:
        in_share = True
        
    if '// ─── PWA ──────────────────────────────────────────────────' in line:
        in_pwa = True
        
    if in_share:
        if '// share modal functions' in line or '// ─── ONBOARDING WIZARD ────────────────────────────────────' in line:
            in_share = False
            # If onboarding wizard, we keep it, but if share modal functions, we skip it
            if '// ─── ONBOARDING WIZARD' not in line:
                continue
        else:
            share_block.append(line)
            continue
            
    if in_pwa:
        if 'document.getElementById(\'modal\').addEventListener(\'click\', function (e) {' in line:
            in_pwa = False
        else:
            continue
            
    new_lines.append(line)

with open(app_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

# Append to share-loader.js
# NOTE: Instead of appending to bottom, let's just append to the end. Wait, share-loader.js exposes window.loadFromHash at the bottom.
# Is it safe to just append these helper functions at the end of the file? Yes, they are mostly just functions.
# Let's prepend them instead, so it's top-level or insert them before window.loadFromGistUrl = loadFromGistUrl; etc.

with open(share_loader_path, 'r', encoding='utf-8') as f:
    share_lines = f.readlines()

insert_index = 0
for i, line in enumerate(share_lines):
    if 'window.loadFromGistUrl =' in line:
        insert_index = i
        break

if insert_index > 0:
    share_lines = share_lines[:insert_index] + ['\n'] + share_block + ['\n'] + share_lines[insert_index:]
else:
    share_lines.extend(['\n'] + share_block)
    
with open(share_loader_path, 'w', encoding='utf-8') as f:
    f.writelines(share_lines)

print("Done refactoring app.js to share-loader.js")
