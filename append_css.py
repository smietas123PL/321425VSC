import os

css_path = r'c:\Users\User\Downloads\AgentSpark\321425VSC\css\style.css'
skip_css = """
/* Accessibility */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--accent);
  color: var(--bg);
  padding: 8px;
  z-index: 1000;
  transition: top 0.2s;
}
.skip-link:focus {
  top: 0;
}
"""

with open(css_path, 'a', encoding='utf-8') as f:
    f.write(skip_css)

print("Added skip-link CSS")
