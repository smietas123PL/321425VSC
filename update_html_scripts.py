import re

html_path = r'c:\Users\User\Downloads\AgentSpark\321425VSC\index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Replace <script src="js/...js"></script>
# with <script type="module" src="js/...ts"></script>
# Specifically target ones that start with js/
def repl(m):
    # m.group(1) is the inner part like src="js/app.js"
    # Actually, simpler:
    tag = m.group(0)
    tag = tag.replace('.js"', '.ts"')
    if 'type="module"' not in tag:
        tag = tag.replace('<script ', '<script type="module" ')
    return tag

html = re.sub(r'<script[^>]*src="js/[^>]*>', repl, html)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("HTML script updated to module TS tags")
