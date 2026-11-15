# M-AI — Minecraft AI

**M-AI** is an experimental Minecraft Java AI player designed to begin without supplied Minecraft guides, recipes, block descriptions, or strategy data, then build a record of its own observations and experiences.

- Target: Minecraft Java **26.3**
- Runtime: Node.js 22+
- Bot API: `@wp2508/mineflayer` (third-party Mineflayer fork)
- Optional local reasoning: Ollama
- Memory: local JSON files

> **Experimental:** the selected third-party Mineflayer fork advertises 26.3 / protocol 777 support, but this project has not yet been tested against a live 26.3 server. Compatibility, login, movement, and chunk parsing must be verified on the user's setup. This is not an official PrismarineJS release.

## Important: what “Minecraft knowledge zero” means

M-AI does not ship Minecraft tutorials, recipes, wiki data, block-name explanations, or prewritten survival strategies. The observer records numeric material/entity identifiers as opaque sensor labels instead of telling the model what they mean. The agent is asked to treat unobserved facts as unknown and learn from logged outcomes.

**A language model cannot have its pretrained knowledge erased.** Ollama models may still know Minecraft from training. The prompt and opaque observations reduce direct knowledge leakage, but cannot mathematically guarantee a truly blank model. For strict zero-prior experiments, run without an LLM and use a future purpose-built learning policy.

## Current release: v0.2.0

Implemented:
- Connect to a local offline-mode Java server
- Observe nearby blocks and entities using opaque numeric identifiers
- Store observations, chats, actions, and before/after experiment records locally
- Compare position, health, food, and opaque sensor-count changes after each action
- Feed recent observed outcomes back into later decisions
- Interrupt an active movement/wait action when the operator gives a new instruction
- Validate model output and safely fall back to waiting when an action is malformed
- Chat with players (non-operator chat is conversation only)
- Claim one local operator account
- Give the operator priority over autonomous behavior
- Ask Ollama for a constrained action
- Basic look, walk, jump, wait, inspect, and say actions
- Pause/resume autonomy

Still not implemented (future development):
- Mining, crafting, inventory use, farming, building, combat, signs/books, pathfinding, multi-agent society, or long-term civilization systems
- A verified Minecraft 26.3 end-to-end test
- Single-player Open-to-LAN auto-discovery; for now a local server endpoint is still required
- Secure Microsoft-account authentication for public/online servers

## Requirements

1. Windows 10/11 (other Node.js platforms may work).
2. Minecraft Java 26.3.
3. Java 25 or later for a 26.3 dedicated server.
4. Node.js 22 or later.
5. Ollama is optional. If used, install a model locally and set its name in `config.json`.

## Safe local-server setup

M-AI v0.1.0 uses offline authentication for a **local-only test server**. Do not expose an offline-mode server to the internet, do not configure port forwarding, and do not use this setup on a public server.

1. Back up your single-player world before experimenting.
2. Create a separate local Java 26.3 server using the official server software.
3. Keep the server bound to loopback only (`server-ip=127.0.0.1`).
4. Set `online-mode=false` only for this isolated local test server. Never expose it to a network.
5. Copy a backup of your world into the server's world folder if you want to test with that world.
6. Start the server and join it from Minecraft using `localhost`.
7. Copy `config.example.json` to `config.json` and keep host as `127.0.0.1`.
8. Install and start Ollama if you want LLM reasoning.
9. Run `start.bat`.

M-AI intentionally refuses non-loopback hosts in its default configuration. Online-mode/Microsoft authentication is not included in this first release.

## Install and run

1. Install Node.js 22+.
2. Download this folder from GitHub.
3. Copy `config.example.json` to `config.json`.
4. Edit the local server port if needed. Keep host set to `127.0.0.1`.
5. Double-click `start.bat`.

Or from a terminal in this folder:

```powershell
npm install
npm start
```

## First chat commands

After the bot joins, use Minecraft chat:

- `!mai claim` — claim the operator role (first claimant only)
- `!mai help` — show commands
- `!mai status` — show status
- `!mai pause` — pause autonomous turns
- `!mai resume` — resume autonomous turns
- `!mai think` — ask the AI to make one observation-based decision

The operator's messages are treated as instructions and queued ahead of autonomous turns. Other players can chat; their messages are conversation only and cannot trigger movement.

## Data and privacy

All agent memory is stored locally in `data/agents/`. Do not publish this folder: it can contain player names and chat history. It is excluded by `.gitignore`.

Ollama requests are sent to the local address `127.0.0.1:11434`; no cloud AI API is configured.

## License

MIT. See [LICENSE](LICENSE).
