## Install

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/narlei/ulanzideck-ai-cost/main/install.sh)"
```

One command. No configuration files. No API keys.

> **Requirements:** macOS · [Ulanzi Studio](https://www.ulanzi.com/pages/download) · Node.js ≥ 22 (`brew install node`)

---

## What it does

AI Cost Monitor puts your AI coding spend on a physical button — always visible, no app switching, no dashboards.

Drag a button to your deck, pick a platform and time period, and you're done.

**Supported platforms:** Claude · Codex · Cursor · Gemini · Copilot · Aider · Windsurf · Continue · and more

**Without a spend limit** — shows the dollar amount in the platform's brand color.

**With a spend limit** — the button becomes a live progress bar that fills as you spend, shifting from green → yellow → orange → red as you approach the limit.

All cost data is read **locally** from your AI tools' session files. Nothing leaves your machine.

---

## Powered by

Cost calculation is powered by **[codeburn](https://github.com/getagentseal/codeburn)** (MIT) — reads AI session files and calculates spend using LiteLLM pricing data.
