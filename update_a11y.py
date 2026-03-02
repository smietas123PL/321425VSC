import re

file_path = r'c:\Users\User\Downloads\AgentSpark\321425VSC\index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add skip link
if '<a href="#main-content" class="skip-link"' not in html:
    html = html.replace('<body>', '<body>\n  <a href="#main-content" class="skip-link">Skip to main content</a>')

# 2. Add id="main-content" to the main app container
if 'id="main-content"' not in html:
    html = html.replace('<div class="app-container">', '<div class="app-container" id="main-content" role="main">')

# 3. Add aria-labels to some known buttons without text (just icons)
# E.g. <button class="theme-toggle"
html = re.sub(r'(<button\s+[^>]*class="theme-toggle"[^>]*)(>)', r'\1 aria-label="Toggle theme"\2', html)
# Modals close buttons
html = re.sub(r'(<button\s+[^>]*class="modal-close"[^>]*)(>)', r'\1 aria-label="Close modal"\2', html)
# Other icon buttons like back button
html = re.sub(r'(<button\s+[^>]*onclick="showHome\(\)"[^>]*)(>)', r'\1 aria-label="Back to home"\2', html)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Accessibility updates applied to index.html")
