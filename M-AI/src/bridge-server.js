'use strict';
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const DATA_DIR = path.join(__dirname, '..', 'data', 'bridge');
const LATEST_OBSERVATION = path.join(DATA_DIR, 'latest-observation.json');
const configPath = path.join(__dirname, '..', 'config.json');
if (!fs.existsSync(configPath)) {
  console.error('[M-AI Bridge] config.json がありません。');
  process.exit(1);
}
let config;
try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); }
catch (error) { console.error('[M-AI Bridge] 設定エラー: ' + error.message); process.exit(1); }

const HOST = '127.0.0.1';
const PORT = Number(config.bridge?.port ?? 25580);
const PROTOCOL = 1;
const MAX_BYTES = 16 * 1024;
const EVENTS = new Set(['observation', 'chat', 'command_result', 'status']);
if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) {
  console.error('[M-AI Bridge] bridge.port は1024〜65535の整数にしてください。');
  process.exit(1);
}
function send(socket, value) {
  if (!socket.destroyed) socket.write(JSON.stringify(value) + '\n');
}
function clean(value, max = 300) {
  return typeof value === 'string' ? value.replace(/[\r\n\0]/g, ' ').slice(0, max) : '';
}
const server = net.createServer(socket => {
  socket.setNoDelay(true);
  socket.setTimeout(30000);
  let buffer = '';
  let paired = false;
  let label = 'client';
  socket.on('data', chunk => {
    buffer += chunk.toString('utf8');
    if (Buffer.byteLength(buffer, 'utf8') > MAX_BYTES) {
      send(socket, { type: 'error', code: 'MESSAGE_TOO_LARGE' });
      socket.destroy();
      return;
    }
    let split;
    while ((split = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, split).trim();
      buffer = buffer.slice(split + 1);
      if (!line) continue;
      let message;
      try { message = JSON.parse(line); }
      catch {
        send(socket, { type: 'error', code: 'INVALID_JSON' });
        socket.destroy();
        return;
      }
      if (!paired) {
        if (message.type !== 'hello' || message.protocol !== PROTOCOL ||
            message.client !== 'M-AI-Fabric' || typeof message.minecraftVersion !== 'string') {
          send(socket, { type: 'error', code: 'HANDSHAKE_REJECTED' });
          socket.destroy();
          return;
        }
        paired = true;
        label = 'M-AI-Fabric / Minecraft ' + clean(message.minecraftVersion, 24);
        console.log('[M-AI Bridge] 接続: ' + label);
        send(socket, {
          type: 'hello_ack',
          protocol: PROTOCOL,
          accepted: true,
          note: '通信確認OK。ゲーム操作の中継は次の段階で実装します。'
        });
        continue;
      }
      if (!message || typeof message !== 'object' || Array.isArray(message) || !EVENTS.has(message.type)) {
        send(socket, { type: 'error', code: 'UNSUPPORTED_MESSAGE' });
        continue;
      }
      const value = message.type === 'chat' ? message.text :
        message.type === 'command_result' ? message.result :
        message.type === 'status' ? message.state : message.summary;
      if (message.type === 'observation') {
        if (typeof message.summary !== 'string' || !message.summary.trim()) {
          send(socket, { type: 'error', code: 'INVALID_OBSERVATION' });
          continue;
        }
        try {
          fs.mkdirSync(DATA_DIR, { recursive: true });
          const record = {
            receivedAt: new Date().toISOString(),
            source: label,
            summary: clean(message.summary, 1000)
          };
          const temporaryPath = LATEST_OBSERVATION + '.tmp';
          fs.writeFileSync(temporaryPath, JSON.stringify(record, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
          fs.renameSync(temporaryPath, LATEST_OBSERVATION);
        } catch (error) {
          console.error('[M-AI Bridge] 観察データ保存エラー: ' + error.message);
          send(socket, { type: 'error', code: 'OBSERVATION_SAVE_FAILED' });
          continue;
        }
      }
      console.log('[M-AI Bridge] ' + message.type + ' (' + label + '): ' + clean(value));
      send(socket, { type: 'received', event: message.type });
    }
  });
  socket.on('timeout', () => socket.destroy());
  socket.on('error', error => console.error('[M-AI Bridge] 通信エラー: ' + error.message));
  socket.on('close', () => { if (paired) console.log('[M-AI Bridge] 切断: ' + label); });
});
server.on('error', error => {
  console.error('[M-AI Bridge] 起動エラー: ' + error.message);
  process.exitCode = 1;
});
server.listen(PORT, HOST, () => {
  console.log('[M-AI Bridge] 待受中: ' + HOST + ':' + PORT);
  console.log('[M-AI Bridge] このPC内だけで待ち受けます。外部ネットワークには公開しません。');
  console.log('[M-AI Bridge] 最新の観察データを data/bridge/latest-observation.json に保存します。AI判断・Minecraft操作はまだ未接続です。');
});
function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
