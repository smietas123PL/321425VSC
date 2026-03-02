import os

files_to_rename = ['screens.js', 'graph.js', 'results-render.js']

for fname in files_to_rename:
    src = os.path.join(r'c:\Users\User\Downloads\AgentSpark\321425VSC\js\ui', fname)
    dst = os.path.join(r'c:\Users\User\Downloads\AgentSpark\321425VSC\js\ui', fname.replace('.js', '.ts'))
    
    if os.path.exists(src):
        with open(src, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Add basic typing workaround for immediate compilation
        # TS will complain about undeclared variables
        header = "// @ts-nocheck\n"
        
        with open(dst, 'w', encoding='utf-8') as f:
            f.write(header + content)
            
        os.remove(src)

print("Renamed remaining UI files to .ts")
