import os
import glob

# directories
dirs = [
    r'c:\Users\User\Downloads\AgentSpark\321425VSC\js',
    r'c:\Users\User\Downloads\AgentSpark\321425VSC\js\features'
]

js_files = []
for d in dirs:
    js_files.extend(glob.glob(os.path.join(d, '*.js')))

# skip some that don't need or cant be renamed directly if they are loaded differently, actually NO, rename all.
for src in js_files:
    # dont mess with node_modules or things not matching js extension exactly
    if src.endswith('.js'):
        dst = src[:-3] + '.ts'
        with open(src, 'r', encoding='utf-8') as f:
            content = f.read()
        
        with open(dst, 'w', encoding='utf-8') as f:
            f.write("// @ts-nocheck\n" + content)
            
        os.remove(src)

print("Renamed remaining root/feature JS files to .ts")
