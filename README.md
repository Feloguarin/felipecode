
# 🤖 Felipe Code

**Felipe Code** is a safe, open-source AI coding assistant for Android. It uses Gemini 3 Pro to write code and run terminal commands directly on your phone via Termux.

### 🌟 How it works
1. **The Bridge**: A tiny script runs in Termux (on your phone) to handle files.
2. **The Web UI**: A beautiful terminal-style dashboard you open in your browser to talk to the AI.
3. **The Security**: You approve every command before it runs. Your API Key stays on your phone.

---

### 🚀 Quick Start (Termux Setup)

Copy and paste this into your **Termux** app:

```bash
# 1. Update and install Node.js
pkg update && pkg upgrade -y
pkg install nodejs -y

# 2. Setup storage and workspace
termux-setup-storage
mkdir -p ~/felipe-workspace

# 3. Download the bridge
curl -O https://raw.githubusercontent.com/Feloguarin/felipecode/main/bridge.js

# 4. Start it!
node bridge.js
```

### 💻 Using the Web App
1. Open [Felipe Code Web](https://feloguarin.github.io/felipecode/) on your phone.
2. Go to **Settings** (Config_Override).
3. Paste your **Gemini API Key**.
4. Start chatting! Try: *"Create a hello world python script in my workspace."*

---
*Safe. Secure. Powerful. Built for Android Engineers.*
