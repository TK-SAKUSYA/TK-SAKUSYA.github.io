package dev.mai.bridge;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.message.v1.ClientSendMessageEvents;
import net.minecraft.client.Minecraft;
import net.minecraft.network.chat.Component;
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
    private static final AtomicReference<String> LATEST_CHAT = new AtomicReference<>();
    private static int tickCounter = 0;

    @Override
    public void onInitializeClient() {
        ClientSendMessageEvents.ALLOW_CHAT.register(message -> {
            if (message != null && !message.isBlank()) LATEST_CHAT.set(message);
            return true;
        });

        Thread bridgeThread = new Thread(MaiBridgeClient::connectionLoop, "M-AI-Bridge-Client");
        bridgeThread.setDaemon(true);
        bridgeThread.start();

        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            if (++tickCounter < 100) return;
            tickCounter = 0;
            Minecraft game = client;
            if (game.player == null || game.level == null) return;

            String dimension = game.level.dimension().identifier().toString();
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
                        String chat = LATEST_CHAT.getAndSet(null);
                        if (chat != null) {
                            send(writer, "{\"type\":\"chat\",\"text\":\"" + jsonEscape(chat) + "\"}");
                        }
                        String observation = LATEST_OBSERVATION.getAndSet(null);
                        if (observation != null) {
                            send(writer, "{\"type\":\"observation\",\"summary\":\"" + jsonEscape(observation) + "\"}");
                        }
                        try {
                            String response = reader.readLine();
                            if (response == null) throw new IOException("Bridge closed the connection.");
                            handleBridgeMessage(response);
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


    private static void handleBridgeMessage(String json) {
        if (json == null || !json.contains("\"type\":\"ai_say\"")) return;
        java.util.regex.Matcher matcher = java.util.regex.Pattern
            .compile("\"text\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"")
            .matcher(json);
        if (!matcher.find()) return;
        String message = decodeJsonString(matcher.group(1));
        if (message.isBlank()) return;
        Minecraft.getInstance().execute(() -> {
            Minecraft client = Minecraft.getInstance();
            if (client.player != null) {
                client.gui.getChat().addClientSystemMessage(Component.literal("[M-AI] " + message));
            }
        });
    }

    private static String decodeJsonString(String value) {
        StringBuilder decoded = new StringBuilder(value.length());
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (c != '\\' || i + 1 >= value.length()) {
                decoded.append(c);
                continue;
            }
            char escaped = value.charAt(++i);
            switch (escaped) {
                case '"' -> decoded.append('"');
                case '\\' -> decoded.append('\\');
                case '/' -> decoded.append('/');
                case 'b' -> decoded.append('\b');
                case 'f' -> decoded.append('\f');
                case 'n' -> decoded.append('\n');
                case 'r' -> decoded.append('\r');
                case 't' -> decoded.append('\t');
                case 'u' -> {
                    if (i + 4 < value.length()) {
                        try {
                            decoded.append((char) Integer.parseInt(value.substring(i + 1, i + 5), 16));
                            i += 4;
                        } catch (NumberFormatException invalidEscape) {
                            decoded.append('u');
                        }
                    } else {
                        decoded.append('u');
                    }
                }
                default -> decoded.append(escaped);
            }
        }
        return decoded.toString();
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
