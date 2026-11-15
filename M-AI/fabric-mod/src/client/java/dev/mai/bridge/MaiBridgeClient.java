package dev.mai.bridge;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.minecraft.client.Minecraft;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicReference;

public final class MaiBridgeClient implements ClientModInitializer {
    private static final Logger LOGGER = LoggerFactory.getLogger("m_ai_bridge");
    private static final AtomicReference<String> LATEST_OBSERVATION = new AtomicReference<>();
    private static int tickCounter = 0;

    @Override
    public void onInitializeClient() {
        Thread bridgeThread = new Thread(MaiBridgeClient::connectionLoop, "M-AI-Bridge-Client");
        bridgeThread.setDaemon(true);
        bridgeThread.start();

        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            if (++tickCounter < 100) return;
            tickCounter = 0;
            Minecraft game = client;
            if (game.player == null || game.level == null) return;

            String dimension = game.level.dimension().location().toString();
            String heldItem = game.player.getMainHandItem().getHoverName().getString();
            String observation = String.format(
                Locale.ROOT,
                "player_position x=%.2f y=%.2f z=%.2f; health=%.1f/%.1f; dimension=%s; main_hand=%s",
                game.player.getX(),
                game.player.getY(),
                game.player.getZ(),
                game.player.getHealth(),
                game.player.getMaxHealth(),
                dimension,
                heldItem
            );
            LATEST_OBSERVATION.set(observation);
        });

        LOGGER.info("M-AI Bridge Mod loaded. Waiting for the local Node bridge at 127.0.0.1:25580.");
    }

    private static void connectionLoop() {
        while (!Thread.currentThread().isInterrupted()) {
            try (Socket socket = new Socket()) {
                socket.connect(new InetSocketAddress("127.0.0.1", 25580), 1500);
                socket.setSoTimeout(1000);

                try (BufferedWriter writer = new BufferedWriter(
                         new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8));
                     BufferedReader reader = new BufferedReader(
                         new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8))) {

                    send(writer, "{\"type\":\"hello\",\"protocol\":1,\"client\":\"M-AI-Fabric\",\"minecraftVersion\":\"26.3\"}");
                    String acknowledgement = reader.readLine();
                    if (acknowledgement == null || !acknowledgement.contains("\"hello_ack\"")
                            || !acknowledgement.contains("\"accepted\":true")) {
                        throw new IOException("Bridge handshake was rejected.");
                    }
                    LOGGER.info("Connected to local M-AI bridge.");

                    while (!Thread.currentThread().isInterrupted() && !socket.isClosed()) {
                        String observation = LATEST_OBSERVATION.getAndSet(null);
                        if (observation != null) {
                            send(writer, "{\"type\":\"observation\",\"summary\":\"" + jsonEscape(observation) + "\"}");
                        }
                        try {
                            String response = reader.readLine();
                            if (response == null) throw new IOException("Bridge closed the connection.");
                        } catch (java.net.SocketTimeoutException ignored) {
                            // Poll again without blocking the Minecraft client thread.
                        }
                        Thread.sleep(100);
                    }
                }
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
            } catch (IOException error) {
                LOGGER.debug("M-AI bridge unavailable; retrying: {}", error.getMessage());
                try {
                    Thread.sleep(3000);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                }
            }
        }
    }

    private static String jsonEscape(String value) {
        StringBuilder escaped = new StringBuilder(value.length() + 16);
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '"' -> escaped.append("\\\"");
                case '\\' -> escaped.append("\\\\");
                case '\b' -> escaped.append("\\b");
                case '\f' -> escaped.append("\\f");
                case '\n' -> escaped.append("\\n");
                case '\r' -> escaped.append("\\r");
                case '\t' -> escaped.append("\\t");
                default -> {
                    if (c < 0x20) escaped.append(String.format(Locale.ROOT, "\\u%04x", (int) c));
                    else escaped.append(c);
                }
            }
        }
        return escaped.toString();
    }

    private static void send(BufferedWriter writer, String json) throws IOException {
        writer.write(json);
        writer.newLine();
        writer.flush();
    }
}
