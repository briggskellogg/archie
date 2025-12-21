# Intersect

**Multi-agent AI companion for macOS** — powered by OpenAI GPT-4o and Anthropic Claude.

Think with three minds. Decide with clarity.

---

## What is Intersect?

Intersect is a native macOS app that gives you access to three distinct AI perspectives in a single conversation. Whether you're making decisions, exploring ideas, or seeking balanced advice — Intersect's agents work together (and sometimes debate) to give you a fuller picture.

**Meet the Agents:**

- 🔥 **Snap** (Instinct) — Gut feelings, intuition, pattern recognition
- 🧠 **Dot** (Logic) — Analytical thinking, structured reasoning, evidence-based conclusions  
- 💜 **Puff** (Psyche) — Self-awareness, emotional depth, the "why" behind the "what"

**Features:**

- 🎭 **Intelligent turn-taking** — The Governor orchestrates who responds and when
- 💬 **Dynamic debates** — Agents can agree, add context, or challenge each other
- 🧬 **Learns your style** — Weights evolve based on your engagement patterns
- 🔒 **Local-first** — Your conversations stay on your device
- ⌨️ **Keyboard shortcuts** — Power-user friendly
- 🎨 **Beautiful UI** — Dark, minimal, Apple-like design

---

## Getting Started

### Step 1: Download

[Download Intersect](https://github.com/briggskellogg/intersect/releases/latest)

1. Download `Intersect.dmg` from the latest release
2. Open the DMG file
3. Drag **Intersect** into your **Applications** folder
4. Open Intersect from Applications (you may need to right-click → Open the first time)

### Step 2: Get API Keys

Intersect requires two API keys:

**OpenAI (powers the agents):**
1. Go to [platform.openai.com](https://platform.openai.com) and create an account
2. Navigate to **API Keys** → [Create new key](https://platform.openai.com/api-keys)
3. Copy your key (starts with `sk-`)

**Anthropic (powers the Governor):**
1. Go to [console.anthropic.com](https://console.anthropic.com) and create an account
2. Navigate to **Settings → API Keys** → [Create key](https://console.anthropic.com/settings/keys)
3. Copy your key (starts with `sk-ant-`)

### Step 3: Start Chatting

1. Enter both API keys when prompted
2. Start a conversation — the Governor will route your message to the right agent(s)
3. Watch as agents respond, build on each other, or respectfully disagree

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘ + N | New conversation |
| ⌘ + P | Open profile |
| Enter | Send message |
| Esc | Close modal |

---

## How It Works

### The Governor

The Governor (powered by Claude) acts as an orchestration layer. It decides:
- Which agent should respond first
- Whether a second agent should add context or challenge
- When to trigger a debate between perspectives

### Weight Evolution

Your agent weights start at 50% Logic, 30% Psyche, 20% Instinct. As you chat, Intersect analyzes your engagement patterns:
- Following up on an agent's suggestion? Their weight increases.
- Dismissing or disagreeing? Their weight decreases.
- The system becomes more rigid over time — after thousands of messages, your profile stabilizes.

### Memory System

Intersect extracts facts and patterns from your conversations, building a profile that helps agents give more personalized responses over time.

---

## Building from Source

### Prerequisites

- **macOS** 12.0 or later
- **Node.js** 18+ ([download](https://nodejs.org))
- **Rust** ([install via rustup](https://rustup.rs))
- **Xcode Command Line Tools** (`xcode-select --install`)

### Build Steps

```bash
# Clone the repository
git clone https://github.com/briggskellogg/intersect.git
cd intersect

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Or build for production
npm run tauri build
```

The built app will be in `src-tauri/target/release/bundle/`.

---

## FAQ

**Q: Is my data sent to the cloud?**  
A: Messages are sent to OpenAI/Anthropic for processing. Your conversation history and profile are stored locally on your device.

**Q: Does it work offline?**  
A: No, Intersect requires an internet connection for AI responses.

**Q: How much does it cost?**  
A: Intersect itself is free. You pay OpenAI and Anthropic directly for API usage.

**Q: Can I reset my profile?**  
A: Yes — open Profile (⌘+P) and use the reset option in the star chart.

---

## License

MIT — do whatever you want with it.

---

Made with ❤️ by [Briggs Kellogg](https://briggskellogg.com)
