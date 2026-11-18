# M-AI — Minecraft AI

## Version 0.25.0 — Twenty-fifth update

- Connected the Fabric chat bridge to the project's existing per-agent memory system.
- The bridge now selects the configured agent (`bridge.agentId`) or the first configured agent, and uses that agent's saved identity/name and personality in Ollama's system prompt.
- Added bounded conversation history (up to 200 stored messages; the latest 10 are supplied as context) and saves each successful exchange to that agent's existing memory file.
- Existing agent memories are reused; the bridge does not reset them. If no generated identity exists yet, it falls back to the configured agent name/username.
- Kept the Fabric bridge chat-only: it still cannot move, mine, build, or spawn an AI player.
- Corrected the Fabric dependency scopes to `implementation`: Minecraft 26.1+ uses the non-obfuscated Loom plugin, for which `modImplementation` is not available. The real Gradle log exposed this exact error.
- Updated the playtest ZIP to include `src/memory.js`, which the new chat brain now imports. Without it, the packaged chat brain would fail at startup.
- Removed the temporary duplicate build workflow; the original M-AI workflow is the single build path again.
- Fixed the next Gradle blocker found by the real runner: `processResources` referenced `project.version` from an execution-time closure, which Gradle 9.8.2 rejects with configuration cache. The version is now captured as a plain string before task execution.
- **Build status:** JavaScript syntax checks passed. The first build after the Loom dependency correction reached `processResources` but exposed this configuration-cache issue; a new run is required to verify the fix before claiming a JAR or playtest ZIP.

**M-AI** is an experimental Minecraft Java AI player system with a client-side Fabric bridge for Minecraft 26.3. Each agent can have its own name, personality, memory, and optional in-game diary.

- Target: Minecraft Java **26.3**
- Runtime: Node.js 22+
- Bot API: `@wp2508/mineflayer` (third-party Mineflayer fork)
- Local reasoning: Ollama
- Memory: separate local JSON file for each agent

> **Experimental:** the Fabric client mod connects to the Node-side local bridge, sends limited player observations, and can display short Ollama-generated speech in the local Minecraft chat. It does not yet control movement or spawn separate AI players. No live Minecraft 26.3 test has been completed.

## Version 0.23.0 — Twenty-third update

- Checked the actual GitHub Actions run created after adding the fresh workflow file and updating the project.
- The new push event still resolved to the synthetic workflow path `BuildFailed` with conclusion `startup_failure`.
- Queried the run's jobs endpoint: **0 jobs**. Queried its artifacts: **0 artifacts**.
- This proves the new workflow has still not reached a runner. Node.js checks, Java setup, Gradle compilation, and ZIP packaging did not execute.
- GitHub Status shows the November 11, 2026 Actions/Pages incident as resolved, but this repository continues to show the same pre-job failure. Similar reports exist in GitHub Community; they are reports, not a confirmed diagnosis for this repository.
- **Decision:** stop adding duplicate workflows or changing Minecraft/Gradle source without a runner log. The current blocker must be resolved at GitHub Actions workflow registration/dispatch level.
- Project version bumped to `0.23.0`. Fabric Mod remains `0.7.0`.
- **Status:** no JAR, no playtest ZIP, and no Minecraft installation test. The new workflow approach did not resolve the blocker.

## Version 0.20.0 — Nineteenth update

- Pin the build runner to Ubuntu 24.04 instead of the moving `ubuntu-latest` image.
- Add a build-environment diagnostic step that prints Node.js, npm, Java, Gradle, Minecraft, and Fabric dependency versions before compilation.
- This helps distinguish runner startup failures from actual Java/Gradle compilation failures once GitHub starts the job.
- Fabric Mod version bumped to `0.7.0`; M-AI project version bumped to `0.20.0`.
- **Current blocker:** GitHub Actions has been returning `startup_failure` before creating any job (the latest run reported zero jobs). That is earlier than the Gradle build, so changing Java source cannot fix it. No JAR is claimed as built.

## Version 0.19.0 — Eighteenth update

- The GitHub Actions artifact now includes an all-in-one `M-AI-Chat-Playtest.zip` with the Fabric JAR, Windows launcher, example config, and the two Node bridge scripts.
- The quick-start instructions now describe the exact chat-only test flow instead of requiring the user to start two commands manually.
- The package still requires Minecraft Java 26.3, Fabric Loader/API, Node.js 22+, and local Ollama. It does not include Minecraft or Ollama itself.
- Fabric mod version bumped to `0.6.0`; M-AI project version bumped to `0.19.0`.
- **Important:** the ZIP is created only after a successful GitHub Actions build. A source-code commit is not itself a built JAR.

## Version 0.18.0 — Seventeenth update

- Added `start-bridge.bat` for Windows: it creates `config.json` if needed and opens the local bridge and Ollama reply process in separate terminals.
- The reply process now waits for a new player chat message; it no longer speaks just because a new observation arrived. This prevents unsolicited messages while testing.
- A previous chat from before startup is ignored, so launching the bridge does not replay an old message.
- Updated the Fabric build dependency declarations to match the official Minecraft 26.3 example project's `implementation` configuration.
- The Fabric mod version is now `0.5.0`; project version is `0.18.0`.
- **Playtest scope:** talk to M-AI in Minecraft chat and receive a local Ollama reply. Movement, mining, building, and a separate AI player entity remain unavailable. The JAR still requires a successful build and installation.

- The Fabric client forwards ordinary Minecraft chat messages to the local bridge while still allowing the normal Minecraft chat flow.
- The Node bridge validates and stores the latest player message in `data/bridge/latest-chat.json`.
- `bridge:think` prioritizes a newly received player message, sends it with the latest world observation to local Ollama, and generates a Japanese reply.
- The existing `ai_say` relay displays that reply in Minecraft chat with an `[M-AI]` prefix.
- The Fabric mod version is now `0.4.0`; project version is `0.17.0`.
- **Limit:** chat is relayed locally only. The AI still cannot move, mine, build, or spawn as a separate player. Build and live Minecraft testing remain unverified.

## Version 0.16.0 — Fifteenth update

- The Node bridge watches `data/bridge/latest-thought.json` and relays each new non-empty AI `say` line to connected Fabric clients as an `ai_say` message.
- The Fabric client handles that message on the Minecraft client thread and displays it in the local chat with an `[M-AI]` prefix.
- The bridge remains restricted to `127.0.0.1`; no remote network endpoint was added.
- The Fabric mod version is now `0.3.0`.
- **Limit:** this makes the AI speak inside Minecraft, but it does not yet accept player chat as conversation input or execute movement/actions. The build and live game test remain unverified.

## Version 0.15.0 — Fourteenth update

- Fabric Mod version bumped to `0.2.0` and M-AI project version to `0.15.0`.
- Every five seconds, the client now reports player coordinates, current/maximum health, dimension ID, and the displayed name of the main-hand item.
- Added complete JSON string escaping for observation text so quotes, backslashes, and control characters cannot break the JSON Lines message.
- The Node bridge persists the richer observation unchanged within its existing 1,000-character bound; the local Ollama reasoning process can now consider these additional facts.
- **Limit:** full inventory, nearby blocks/entities, chat, and all game-control actions remain unimplemented in the Fabric bridge. The source has been committed, but the Gradle build and live Minecraft 26.3 test still need confirmation.

## Version 0.14.0 — Thirteenth update

- Added `src/bridge-brain.js`, a separate process that reads the latest Fabric observation saved by the local bridge.
- Added `npm run bridge:think` to ask the configured local Ollama model for a short Japanese interpretation of each new observation.
- Saves the model's bounded thought and short spoken line to `data/bridge/latest-thought.json` using a temporary file and rename.
- Ollama is restricted to `127.0.0.1`, `localhost`, or `::1`; requests have a timeout and overlapping inference is prevented.
- The model is explicitly told that observation text is data, not instructions, and that it cannot claim to have performed game actions.
- Added the new script to `npm run check` and made the Fabric workflow run JavaScript syntax checks on relevant changes.
- **Limit:** this is the first observation-to-Ollama reasoning link, not a control loop. The Fabric mod still sends only player coordinates, and M-AI cannot yet move or act through this Fabric bridge. The local Minecraft test and successful GitHub Actions build are still unverified.

## Version 0.13.0 — Twelfth update

- The Fabric Gradle project now gives the remapped output a predictable `m-ai-fabric` archive name.
- GitHub Actions now verifies that exactly one remapped mod JAR exists before packaging.
- The workflow creates a ready-to-install artifact named `M-AI-Fabric-26.3` containing the mod JAR, quick-start instructions, installation guide, and SHA-256 checksum.
- The artifact is retained for 30 days; download it from the successful workflow run's Artifacts section.
- **Limit:** this update prepares a downloadable installation package, but it does not prove the build passed. Actual installation and in-game communication still require a successful Actions run and a Minecraft test.

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
- The local bridge receives limited observations and ordinary player chat from the Fabric client. Local Ollama can generate replies that appear in Minecraft chat, but no AI-generated control command is sent back to Minecraft.
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
8. In a second terminal, run `npm run bridge:think` to let the local Ollama model interpret new observations and reply to new player chat messages. The result is saved at `data/bridge/latest-thought.json`. This command does not control Minecraft.

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

The Fabric client forwards ordinary chat messages to the local bridge as `chat` events. Messages are saved at `data/bridge/latest-chat.json` and passed to Ollama for a reply. The protocol does not execute AI game actions.


## Fabric client mod (tenth update)

See [fabric-mod/README.md](fabric-mod/README.md) for build and installation notes. The GitHub Actions workflow creates a ready-to-install artifact named `M-AI-Fabric-26.3` after a successful build.
