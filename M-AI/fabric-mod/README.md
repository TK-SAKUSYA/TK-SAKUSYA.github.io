# M-AI Fabric Bridge Mod

Client-side Fabric mod for **Minecraft Java 26.3**.

## What this first integration milestone does

- Starts with the Minecraft client.
- Connects only to `127.0.0.1:25580`.
- Performs the version 1 JSON Lines handshake expected by the Node bridge.
- Every five seconds, sends the local player's X/Y/Z position, current health, dimension ID, and main-hand item name as a small observation message.
- Uses a background thread for socket I/O; it does not block the game tick.
- Reconnects if the Node bridge is not running yet.

## Observation fields (version 0.2.0)

- `player_position`: X/Y/Z coordinates
- `health`: current and maximum health
- `dimension`: dimension identifier such as `minecraft:overworld`
- `main_hand`: displayed name of the item currently held in the main hand

The observation is sampled on the Minecraft client tick and sent by the background socket thread.

## Two-way chat playtest (version 0.6.0)

Ordinary player chat is forwarded to the local bridge using Fabric's client send-chat event. The normal Minecraft chat send is still allowed. The bridge brain passes the new message and latest observation to local Ollama; the AI reply returns to the client chat with an `[M-AI]` prefix.

On Windows, double-click `M-AI/start-bridge.bat` to open both local processes. Start the Fabric 26.3 client, enter a single-player world, and send a normal chat message. The AI reply appears with an `[M-AI]` prefix. The brain waits for player chat and does not speak from observations alone.

## In-game AI speech (version 0.3.0)

When the local bridge relays a new `ai_say` message, the mod schedules it on the Minecraft client thread and displays it in the local chat. Run both `npm run bridge` and `npm run bridge:think` for the full observation-to-speech path.

## What it does not do yet

- It does not send movement commands, full inventory contents, nearby block/entity details, or full chat history. A newly sent ordinary chat message is forwarded as a separate conversation input.
- It displays new Ollama-generated `ai_say` messages in the local player chat with an `[M-AI]` prefix.
- It does not execute AI actions or control the player. The player can talk to the AI, but the AI cannot yet move or act. This is a chat-only playtest build.
- It does not spawn a separate bot entity.
- It does not connect to remote servers or expose a network listener.

This is the first live in-client communication slice, not the finished M-AI single-player integration.

## Build

Requirements: JDK 25 and internet access for Gradle dependency downloads.

From this directory, run:

```powershell
gradle build
```

The resulting mod JAR is written to `build/libs/`.

The repository GitHub Actions workflow builds the artifact **M-AI-Fabric-26.3**. It contains the remapped mod JAR, a quick-start note, this installation guide, a SHA-256 checksum, and `M-AI-Chat-Playtest.zip`. The ZIP contains the JAR, Windows launcher, example config, and Node bridge scripts. Artifacts are retained for 30 days.

## Install from the GitHub Actions package

1. Open the repository's [Actions page](https://github.com/TK-SAKUSYA/TK-SAKUSYA.github.io/actions/workflows/build-m-ai-fabric.yml).
2. Open the newest **Build M-AI Fabric Mod** run. Wait until its status is successful.
3. In the run's **Artifacts** section, download **M-AI-Fabric-26.3** and extract the downloaded ZIP.
4. Install Fabric Loader for Minecraft Java 26.3 and Fabric API for Minecraft 26.3.
5. Copy `M-AI-Fabric-26.3.jar` from the extracted package into that Minecraft instance's `mods` folder.
6. Extract `M-AI-Chat-Playtest.zip` into a folder on the PC.
7. Confirm Ollama is running with the model configured in `config.example.json` (default: `qwen2.5-coder:3b`).
8. Double-click `start-bridge.bat` and keep both terminal windows open. Node.js 22+ is required.
9. Start the Minecraft Java 26.3 Fabric profile and enter a single-player world.
10. Send a normal chat message and wait for an `[M-AI]` reply.

If the Actions run is not successful or no artifact is shown, there is no verified install package yet. Do not rename a sources JAR or use an unverified build.

Do not use this build on a valuable world before testing and backing up the world.
