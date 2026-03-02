import os
import glob
import subprocess

directory = r'c:\Users\User\Downloads\AgentSpark\321425VSC\js'
ts_files = glob.glob(os.path.join(directory, '**', '*.ts'), recursive=True)

for ts_file in ts_files:
    with open(ts_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if '// @ts-nocheck' in content:
        content = content.replace('// @ts-nocheck\n', '')
        content = content.replace('// @ts-nocheck', '')
        with open(ts_file, 'w', encoding='utf-8') as f:
            f.write(content)

print(f"Removed @ts-nocheck from {len(ts_files)} files.")
