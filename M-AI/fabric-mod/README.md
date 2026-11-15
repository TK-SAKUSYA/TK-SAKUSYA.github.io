# M-AI Fabric Bridge Mod

Client-side Fabric mod for **Minecraft Java 26.3**.

## What this first integration milestone does

- Starts with the Minecraft client.
- Connects only to `127.0.0.1:25580`.
- Performs the version 1 JSON Lines handshake expected by the Node bridge.
- Every five seconds, sends the local player's X/Y/Z position as a small observation message.
- Uses a background thread for socket I/O; it does not block the game tick.
- Reconnects if the Node bridge is not running yet.

## What it does not do yet

- It does not send movement, inventory, block, entity, health, or chat history.
- It does not execute AI actions or control the player.
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

The repository GitHub Actions workflow also builds the mod and publishes the JAR as a workflow artifact whenever this project changes.

## Install and test (after a successful build)

1. Install Fabric Loader for Minecraft 26.3 and Fabric API 26.3.
2. Put the generated `m-ai-fabric-0.1.0.jar` in the Minecraft 26.3 `mods` folder.
3. Start the Node bridge from the M-AI project folder with `npm run bridge`.
4. Start the Minecraft Java 26.3 Fabric profile and enter a single-player world.
5. Check the Node terminal for a client connection and periodic `observation` messages.

Do not use this build on a valuable world before testing and backing up the world.
