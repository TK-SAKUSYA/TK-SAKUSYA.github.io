# M-AI — Minecraft AI

**M-AI** is an experimental Minecraft Java AI player system. Each agent can have its own name, personality, memory, and optional in-game diary.

- Target: Minecraft Java **26.3**
- Runtime: Node.js 22+
- Bot API: `@wp2508/mineflayer` (third-party Mineflayer fork)
- Local reasoning: Ollama
- Memory: separate local JSON file for each agent

> **Experimental:** this project has not been tested end-to-end against a live Minecraft 26.3 world. The current connection mode is offline authentication for an isolated local test server. It does not yet automatically join a normal single-player world.

## Version 0.6.0 — Fifth update

- Added a one-block mining action using Mineflayer's `canDigBlock` and `dig` APIs.
- Mining is only permitted during an explicit operator instruction; autonomous decisions and ordinary non-operator chat cannot mine.
- Targets must be within two blocks on each axis, loaded, visible to the bot's dig-range check, solid, and have finite positive hardness.
- Interactive/container-like blocks and bedrock are excluded. Operator interruption stops an active dig.
- This is a guarded first step: no autonomous resource gathering, crafting, or building is included yet. Live Minecraft 26.3 behavior has not been verified.

## Version 0.5.1 — Fourth update improvement

- The first successful `!mai claim` registers one operator for all configured agents.
- The same operator can pause, resume, reset, and direct any AI without claiming separately on every bot.
- The shared operator identity is synchronized into each agent's existing local memory file and survives normal restarts.

## Version 0.5.0 — Fourth update

Implemented in source:
- Walking now checks the next step repeatedly instead of holding a movement key for the entire duration without checks.
- The safety check stops movement when the next space is blocked, the supporting block is missing, collision information is unknown, or the agent is no longer grounded.
- Existing operator interruption remains able to cancel an action.
- Existing individual names, self-introductions, personalities, memories, and optional diaries are retained.

## Version 0.4.0 — Third update

Implemented in source:
- Each AI asks the local language model to choose its own Japanese name at first launch.
- The chosen name and self-introduction are saved in that agent's local identity record and remain stable across restarts.
- Different agents are asked to choose names that do not duplicate names already assigned.
- Memory reset preserves the AI's chosen identity; it clears learned records without erasing who the AI calls itself.

## Version 0.3.0 — Second update

Implemented in source:
- Multiple agents can be configured in one process (maximum 8)
- Each agent has an individual ID, Minecraft username, personality prompt, and independent memory file.
- Japanese system instructions and Japanese chat output preference
- `!mai reset all` clears every agent's observations, experiences, conversations, and diary index, then pauses all agents
- `!mai reset 名前` clears one named agent's memory
- Reset preserves the operator authorization so the operator does not get locked out
- `!mai pause` and `!mai resume` control all agents
- `!mai 名前 指示` or `!mai to 名前 指示` directs a message to one agent
- Optional diary writing: an agent with `diaryEnabled: true` writes a short Japanese entry into a writable book in its inventory when one is available
- Destructive and disruptive actions are prohibited in the agent's system instructions

## Important limits

- A reset clears M-AI's saved local records, not the language model's pretrained knowledge or model weights.
- Personality affects the agent's conversational and decision style; it is not a guarantee of human-like stable personality.
- The diary feature requires the agent to already have a writable book in its inventory. M-AI does not yet craft or fetch books. Diary writing has not been verified on Minecraft 26.3.
- The current action set remains limited to look, walk, jump, wait, inspect, and say. Mining, crafting, building, farming, combat, full pathfinding, and autonomous settlement-building are not implemented.
- Step checks reduce some movement risks but are not a complete pathfinder and cannot guarantee avoidance of every hazard.
- The selected Mineflayer fork's compatibility, multi-bot login, and book-writing behavior have not been verified in a live 26.3 world.
- More agents require more RAM and local model inference time. Start with one or two agents on an 8 GB PC; multiple agents may respond slowly.

## What “no supplied Minecraft knowledge” means

M-AI ships no Minecraft tutorials, recipes, wiki data, or strategy guides. Sensor IDs remain opaque. A language model's pretrained knowledge cannot be erased, so a truly blank model is not guaranteed.

## Requirements

1. Windows 10/11.
2. Minecraft Java 26.3.
3. Node.js 22 or later.
4. Ollama and a local model, if LLM reasoning is enabled.

## Setup

1. Back up your world before experimenting.
2. Use an isolated local test server configured only for local connections. Do not expose an offline-mode server to the internet.
3. Copy `config.example.json` to `config.json`.
4. Set the local server port.
5. Edit the `agents` array. Each agent needs a unique `id` and `username`. The AI chooses its own display name on first launch. Set `diaryEnabled` to `true` for agents allowed to write diaries.
6. Start Ollama if enabled.
7. Run `start.bat`.

The sample configuration creates two agents. They use offline-mode usernames MAI001 and MAI002 on the isolated local server, then each AI chooses its own display name using the local Ollama model.

## Chat commands

- `!mai claim` — register the shared operator for all agents (first claim wins)
- `!mai help` — show commands
- `!mai status` — show this agent's status
- `!mai pause` — stop all agents (operator only)
- `!mai resume` — resume all agents (operator only)
- `!mai think` — request one decision from the addressed agent
- `!mai reset all` — clear every agent's saved memory and pause all agents
- `!mai reset アキラ` — clear only アキラ's saved memory
- `!mai アキラ 周囲を観察して` — direct an instruction to one named agent
- `!mai to ミドリ 周囲を観察して` — alternate named-instruction syntax

Each agent stores its local data, including its chosen identity, in `data/agents/<id>.json`. Do not publish this folder: it may contain player names and chat history.

## License

MIT. See [LICENSE](LICENSE).