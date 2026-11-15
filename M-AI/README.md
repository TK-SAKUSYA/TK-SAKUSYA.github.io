# M-AI — Minecraft AI

**M-AI** is an experimental Minecraft Java AI player system with a client-side Fabric bridge for Minecraft 26.3. Each agent can have its own name, personality, memory, and optional in-game diary.

- Target: Minecraft Java **26.3**
- Runtime: Node.js 22+
- Bot API: `@wp2508/mineflayer` (third-party Mineflayer fork)
- Local reasoning: Ollama
- Memory: separate local JSON file for each agent

> **Experimental:** the Fabric client mod connects to the Node-side local bridge and sends player-position observations. The eleventh update adds local persistence for the latest observation. It does not yet execute AI actions or spawn separate AI players. No live Minecraft 26.3 test has been completed.

## Version 0.12.0 — Eleventh update

- The local bridge now validates incoming observation summaries and saves the latest one to `data/bridge/latest-observation.json`.
- The saved record includes its receive time, source client, and a bounded summary; writes use a temporary file followed by rename.
- Invalid or empty observation messages are rejected, and a save failure is reported to the client.
- The bridge remains bound to `127.0.0.1`; no external network listener was added.
- **Limit:** this makes Minecraft observations persist on the PC. The Ollama decision loop and player-control commands are not yet connected to the Fabric client mod, and live Minecraft testing is still required.

## Version 0.11.0 — Tenth update

- Added a real Fabric client-mod project under `fabric-mod/`, based on the official Fabric 26.3 example project layout.
- The mod starts inside the Minecraft client and connects only to `127.0.0.1:25580`.
- It performs the existing version 1 JSON Lines handshake with the Node bridge.
- Every five seconds, while inside a world, it sends the local player's X/Y/Z position as an observation.
- Socket work runs on a daemon background thread, not the Minecraft tick thread; it retries when the bridge is unavailable.
- Added a GitHub Actions build workflow for the Fabric JAR using Java 25 and Gradle 9.8.2.
- **Limit:** this is now a Minecraft client-side connection and basic position-observation milestone. The mod does not yet control the player, read inventory/blocks/entities, relay chat, or create AI-controlled player entities. End-to-end Minecraft 26.3 testing is still required.

## Version 0.10.0 — Ninth update

- Added the first local integration bridge server using Node.js built-in TCP networking; no extra npm dependency is required.
- The bridge listens only on `127.0.0.1` and the configured port (default `25580`), never on external network interfaces.
- Added a versioned JSON-lines handshake for a future Minecraft client mod, bounded message parsing, a 16 KiB input limit, a 30-second idle timeout, and explicit event types.
- The bridge can receive test observations, chat events, status messages, and command results, then acknowledge them.
- Added `npm run bridge` to start the bridge independently from the existing Mineflayer bot.
- **Important:** this is communication infrastructure only. There is no Fabric mod yet, and the bridge does not read the world, make AI decisions, or execute Minecraft actions. The ninth update does not yet achieve in-game integration.

## Version 0.9.0 — Eighth update

- Added operator-directed small structure construction with two fixed patterns: a 3-wide × 2-high wall (6 blocks) or a 3-block pillar.
- The AI must choose a block type already in its inventory and have enough of that full solid block before starting.
- Every target cell is checked as empty before construction; each placement rechecks the target and an adjacent solid reference block.
- Construction is limited to a short range and requires an explicit operator building instruction. The operator can interrupt between placements.
- This is a bounded template builder, not free-form or autonomous architecture. A partially completed structure may remain if construction is interrupted or a later placement fails. Live Minecraft 26.3 behavior has not been verified.

## Version 0.8.0 — Seventh update

- Added operator-directed single-block placement using the bot's inventory and Mineflayer placement API.
- Placement requires an explicit operator instruction containing a building/placing request.
- Targets are limited to a small relative range, must be confirmed air, and must have an adjacent solid reference block.
- The requested block must already be in inventory; protected or interactive blocks and fluids are excluded.
- This is a one-block primitive, not automatic house construction or blueprint building. Live Minecraft 26.3 behavior has not been verified.

## Version 0.7.0 — Sixth update

- Added operator-directed crafting for a selected numeric item type (`itemType`).
- Recipe lookup uses the bot's current inventory and a nearby crafting table when available.
- Each request is limited to 1–4 recipe operations; no recipe or insufficient materials results in a safe skip.
- Crafting requires an explicit operator instruction containing a crafting request. Autonomous decisions and ordinary non-operator chat cannot craft.
- Cancellation is checked before crafting starts; an in-progress craft is not guaranteed to be interruptible. Live Minecraft 26.3 crafting behavior has not been verified.

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
- The current action set includes look, walk, jump, wait, inspect, say, operator-directed single-block mining, operator-directed crafting, operator-directed single-block placement, and operator-directed template building (small wall or pillar). Autonomous resource gathering, free-form building, farming, full pathfinding, and autonomous settlement-building are not implemented.
- Step checks reduce some movement risks but are not a complete pathfinder and cannot guarantee avoidance of every hazard.
- The selected Mineflayer fork advertises protocol support for Minecraft 26.3, but M-AI's full login, action, and world behavior have not been verified in a live 26.3 world.
- The local bridge is only a transport layer. Until the Fabric client mod and AI adapter are complete, it cannot access or control a single-player world.
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
7. Run `start.bat` for the existing Mineflayer bot, or run `npm run bridge` for the local bridge server. After a Fabric client sends an observation, the latest record is saved at `data/bridge/latest-observation.json`.

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
## Local bridge protocol

- TCP address: `127.0.0.1`
- Default port: `25580`
- Encoding: UTF-8 JSON Lines (one JSON object per line)
- First message: `{"type":"hello","protocol":1,"client":"M-AI-Fabric","minecraftVersion":"26.3"}`
- Server reply: `hello_ack` with protocol version 1
- Supported later event types: `observation`, `chat`, `command_result`, `status`
- Maximum incoming buffer: 16 KiB; idle connection timeout: 30 seconds

The protocol is a preliminary contract for the future client mod. It is not a Minecraft mod and does not yet perform in-game actions.


## Fabric client mod (tenth update)

See [fabric-mod/README.md](fabric-mod/README.md) for build and installation notes. The GitHub Actions workflow builds the JAR and publishes it as an artifact when the Fabric project changes.
