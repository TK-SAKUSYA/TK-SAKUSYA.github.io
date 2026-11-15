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

The repository GitHub Actions workflow builds a ready-to-install package and publishes it as the artifact **M-AI-Fabric-26.3**. The artifact contains the remapped mod JAR, a quick-start note, this installation guide, and a SHA-256 checksum. Artifacts are retained for 30 days.

## Install from the GitHub Actions package

1. Open the repository's [Actions page](https://github.com/TK-SAKUSYA/TK-SAKUSYA.github.io/actions/workflows/build-m-ai-fabric.yml).
2. Open the newest **Build M-AI Fabric Mod** run. Wait until its status is successful.
3. In the run's **Artifacts** section, download **M-AI-Fabric-26.3** and extract the downloaded ZIP.
4. Install Fabric Loader for Minecraft Java 26.3 and Fabric API for Minecraft 26.3.
5. Copy `M-AI-Fabric-26.3.jar` from the extracted package into that Minecraft instance's `mods` folder.
6. From the M-AI project folder, make `config.json` by copying `config.example.json` and run `npm run bridge`. Node.js 22+ is required.
7. Start the Minecraft Java 26.3 Fabric profile and enter a single-player world.
8. Check the Node terminal for a Fabric client connection and periodic `observation` messages.

If the Actions run is not successful or no artifact is shown, there is no verified install package yet. Do not rename a sources JAR or use an unverified build.

Do not use this build on a valuable world before testing and backing up the world.
