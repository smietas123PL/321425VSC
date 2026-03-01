# ⚡ AgentSpark

> **Build your AI agent team in minutes — no code required.**

AgentSpark interviews you about your project, then generates a complete team of specialized AI agents with ready-to-deploy prompt files.

![AgentSpark Screenshot](https://agentspark.app/og-image.png)

## ✨ Features

- **AI Interview** — Conversational wizard that understands your project through smart multiple-choice questions
- **Auto-generates** agent + skill Markdown files ready for Claude, GPT-4, Gemini, and more
- **Multi-provider** — Supports Gemini, OpenAI, Anthropic, Mistral, and Groq
- **Gallery** — 8 ready-made templates (E-commerce, Data, HR, Finance, Education, Hospitality...)
- **Playground** — Test each agent interactively with full multi-turn chat
- **Projects** — Save, load, and manage multiple teams via IndexedDB
- **Version History** — Full undo/redo with diff view
- **Refinement** — Iterate on individual agents with AI-assisted edits
- **Export ZIP** — Download all agent files + README + code examples
- **Share Links** — One-click share via URL hash
- **PWA** — Installable as a desktop/mobile app
- **100% client-side** — No backend, no data sent anywhere except your chosen AI API

## 🚀 Quick Start

### Option 1: Use online
👉 **[agentspark.app](https://agentspark.app)**

### Option 2: Run locally
```bash
git clone https://github.com/yourusername/agentspark.git
cd agentspark
python -m http.server 8000
# Open http://localhost:8000
```

### Option 3: Deploy your own
```bash
./deploy.sh
```

## ✅ Release Gates

```bash
npm install
npm run lint
npm run smoke
```

Release docs:
- `docs/RELEASE_CHECKLIST.md`
- `docs/ROLLBACK_RUNBOOK.md`
- `docs/REGRESSION_TEST_REPORT.md`

## 🔑 API Keys

AgentSpark works with any of these providers (you supply your own key):

| Provider | Models | Get Key |
|----------|--------|---------|
| Google Gemini | gemini-2.5-flash, gemini-2.5-pro | [aistudio.google.com](https://aistudio.google.com) |
| OpenAI | gpt-4o, gpt-4o-mini | [platform.openai.com](https://platform.openai.com) |
| Anthropic | claude-sonnet-4, claude-opus-4 | [console.anthropic.com](https://console.anthropic.com) |
| Mistral | mistral-large, mistral-small | [console.mistral.ai](https://console.mistral.ai) |
| Groq | llama-3.3-70b (free) | [console.groq.com](https://console.groq.com) |

> **No key?** Use the **Try Demo** button to explore with sample data.

## 📁 Project Structure

```
agentspark/
├── index.html              # Main app (single-file, self-contained)
├── featured_templates.json # Gallery templates data
├── manifest.json           # PWA manifest
├── service-worker.js       # PWA offline support
├── icons/                  # PWA icons (192px, 512px)
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions → GitHub Pages
├── netlify.toml            # Netlify deployment config
├── vercel.json             # Vercel deployment config
├── deploy.sh               # Interactive deploy script
├── package.json            # Dev tooling (prettier, eslint)
├── LICENSE                 # MIT
└── README.md               # This file
```

## 🏗️ How It Works

1. **Enter your project topic** (e.g. "customer support for a SaaS app")
2. **Pick a complexity level** — Iskra (2 agents), Płomień (4), Pożar (6)
3. **Answer 5 questions** — The AI learns your tech stack, audience, goals
4. **Get your team** — Specialized agents with roles, descriptions, and full prompt files
5. **Test in Playground** — Chat with each agent, export conversation as Markdown
6. **Download ZIP** — All files ready to paste into your AI platform

## 🖥️ Deploy Options

### GitHub Pages (free)
Push to `main` branch — GitHub Actions deploys automatically via `.github/workflows/deploy.yml`.

### Netlify (recommended)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/agentspark)

### Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/agentspark)

## 🤝 Contributing

1. Fork the repo
2. Make your changes to `index.html`
3. Test locally with `python -m http.server 8000`
4. Submit a PR

**Adding templates:** Edit `featured_templates.json` and follow the existing schema.

## 📄 License

MIT — see [LICENSE](LICENSE)

---

Built with ❤️ using vanilla JS + [Anthropic Claude](https://anthropic.com)
