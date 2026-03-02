import os

app_path = r'c:\Users\User\Downloads\AgentSpark\321425VSC\js\app.js'
graph_path = r'c:\Users\User\Downloads\AgentSpark\321425VSC\js\ui\graph.js'

with open(app_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if '// ─── DEPENDENCY GRAPH ────────────────────────────────────' in line:
        skip = True
    if '// ─── REFINE MODE ─────────────────────────────────────────────' in line:
        skip = False
    
    if not skip:
        new_lines.append(line)

with open(app_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Done removing orphaned graph logic from app.js")
