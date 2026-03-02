import os
import glob
import re

directory = r'c:\Users\User\Downloads\AgentSpark\321425VSC\js'
ts_files = glob.glob(os.path.join(directory, '**', '*.ts'), recursive=True)

# Regex to find document.getElementById('...') and document.querySelector('...')
# and add "as HTMLElement" or "as HTMLInputElement"

input_ids = ['apiKeyInput', 'apiKeySetupInput', 'main-topic', 'play-system', 'play-user', 'share-name-input', 'refine-input']

for ts_file in ts_files:
    with open(ts_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # We will do a simple regex substitution.
    # First, let's replace document.getElementById('xyz') with (document.getElementById('xyz') as HTMLElement)
    # Be careful not to replace it if it already has 'as '
    
    def repl_id(m):
        full = m.group(0)
        id_val = m.group(1)
        if ('as HTMLElement' in full) or ('as HTMLInputElement' in full) or ('as HTML' in full):
            return full
            
        cast = 'HTMLInputElement' if id_val in input_ids else 'HTMLElement'
        return f"(document.getElementById('{id_val}') as {cast})"

    content = re.sub(r"document\.getElementById\('([^']+)'\)", repl_id, content)
    
    # same for double quotes
    def repl_id_dq(m):
        full = m.group(0)
        id_val = m.group(1)
        if ('as HTMLElement' in full) or ('as HTMLInputElement' in full):
            return full
        cast = 'HTMLInputElement' if id_val in input_ids else 'HTMLElement'
        return f'(document.getElementById("{id_val}") as {cast})'

    content = re.sub(r'document\.getElementById\("([^"]+)"\)', repl_id_dq, content)

    # For querySelector that is simple string
    def repl_qs(m):
        full = m.group(0)
        sel_val = m.group(1)
        if ('as HTMLElement' in full) or ('as HTMLInputElement' in full):
            return full
        cast = 'HTMLInputElement' if 'input' in sel_val else 'HTMLElement'
        return f"(document.querySelector('{sel_val}') as {cast})"
        
    content = re.sub(r"document\.querySelector\('([^']+)'\)", repl_qs, content)

    # We also need to fix implicitly any functions by adding :any to params, but that's harder with regex.
    # Let's start with just DOM casts.
    
    with open(ts_file, 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Added DOM casting to {len(ts_files)} files.")
