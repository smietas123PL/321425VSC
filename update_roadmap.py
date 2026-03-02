import os

file_path = r'c:\Users\User\Downloads\AgentSpark\321425VSC\docs\TECHNICAL_ROADMAP.md'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(119, 204):
    if i < len(lines):
        # Mark things that are actually done according to my checks
        if '**Setup Node.js backend**' in lines[i] or \
           '**User Authentication**' in lines[i] or \
           '**Projects API**' in lines[i] or \
           '**LLM Call Proxy**' in lines[i] or \
           '**Code modularization**' in lines[i] or \
           '**Better error handling**' in lines[i] or \
           '**Offline + Sync**' in lines[i]:
            lines[i] = lines[i].replace('- [ ]', '- [x]')

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Checkboxes updated.")
