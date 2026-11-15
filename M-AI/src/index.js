const fs = require('node:fs');
const path = require('node:path');
const mineflayer = require('@wp2508/mineflayer');
const { loadMemory, saveMemory, addBounded } = require('./memory');
const { observe } = require('./observer');
const { thinkAndAct } = require('./brain');

const configPath = path.join(__dirname, '..', 'config.json');
if (!fs.existsSync(configPath)) {
  console.error('config.json is missing. Copy config.example.json to config.json first.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const localHosts = new Set(['127.0.0.1', 'localhost', '::1']);
if (!localHosts.has(config.host)) {
  console.error('Safety stop: this release only connects to localhost. Set host to 127.0.0.1.');
  process.exit(1);
}

const memory = loadMemory();
let paused = !config.autonomy.enabled;
let thinking = false;
let observationTimer = null;
let autonomyTimer = null;
let latestObservation = null;

function log(message) {
  console.log(`[M-AI] ${message}`);
}

function recordExperience(entry) {
  addBounded(memory.experiences, {
    at: new Date().toISOString(),
    ...entry
  }, 500);
  saveMemory(memory);
}

function recordObservation() {
  latestObservation = observe(bot, config.observation);
  if (!latestObservation) return null;
  addBounded(memory.observations, latestObservation, 100);
  saveMemory(memory);
  return latestObservation;
}

function isOperator(username) {
  return Boolean(memory.operator && username.toLowerCase() === memory.operator.toLowerCase());
}

const bot = mineflayer.createBot({
  host: config.host,
  port: config.port,
  username: config.botUsername,
  version: config.minecraftVersion,
  auth: 'offline'
});

async function runThinking(message = null, fromOperator = false) {
  if (thinking || !bot.entity) return;
  if (paused && !fromOperator) return;

  thinking = true;
  try {
    const observation = recordObservation();
    const result = await thinkAndAct(
      bot,
      config,
      memory,
      observation,
      message,
      fromOperator
    );
    recordExperience({
      source: fromOperator ? 'operator' : 'autonomy',
      input: message,
      actionResult: result.result,
      learningNote: result.learningNote
    });
    log(result.result);
  } catch (error) {
    log(`Thinking unavailable: ${error.message}`);
    recordExperience({
      source: fromOperator ? 'operator' : 'autonomy',
      input: message,
      error: error.message
    });
  } finally {
    thinking = false;
  }
}

function showHelp() {
  bot.chat('M-AI: !mai claim / help / status / pause / resume / think');
}

bot.once('spawn', () => {
  log('Connected to the local Minecraft world.');
  log('Minecraft-specific guide data: none supplied.');
  bot.chat('こんにちは。私はM-AIです。ここでの経験を記録していきます。');

  recordObservation();

  observationTimer = setInterval(recordObservation, 15000);
  autonomyTimer = setInterval(() => {
    if (!paused) runThinking();
  }, config.autonomy.intervalMs);
});

bot.on('chat', (username, message) => {
  if (!message || username === bot.username) return;

  addBounded(memory.conversations, {
    at: new Date().toISOString(),
    username,
    message: String(message).slice(0, 300)
  }, 300);
  saveMemory(memory);

  const command = message.trim();

  if (command === '!mai claim') {
    if (!memory.operator) {
      memory.operator = username;
      saveMemory(memory);
      bot.chat(`${username}を操作担当者として登録しました。`);
    } else if (isOperator(username)) {
      bot.chat('あなたは既に操作担当者です。');
    } else {
      bot.chat('操作担当者は既に登録されています。');
    }
    return;
  }

  if (!command.startsWith('!mai')) {
    if (isOperator(username)) {
      runThinking(command, true);
    } else {
      log(`Chat received from ${username}.`);
    }
    return;
  }

  const subcommand = command.slice(4).trim().toLowerCase();

  if (subcommand === 'help') return showHelp();

  if (subcommand === 'status') {
    bot.chat(`M-AI: ${paused ? '停止中' : '活動中'} / 観察 ${memory.observations.length}件 / 経験 ${memory.experiences.length}件`);
    return;
  }

  if (subcommand === 'pause') {
    if (!isOperator(username)) return bot.chat('この操作には担当者登録が必要です。');
    paused = true;
    bot.clearControlStates();
    bot.chat('自律行動を停止しました。');
    return;
  }

  if (subcommand === 'resume') {
    if (!isOperator(username)) return bot.chat('この操作には担当者登録が必要です。');
    paused = false;
    bot.chat('自律行動を再開します。');
    return;
  }

  if (subcommand === 'think') {
    if (!isOperator(username)) return bot.chat('この操作には担当者登録が必要です。');
    runThinking('周囲を観察し、次に何を試すか考えてください。', true);
    return;
  }

  bot.chat('不明な命令です。!mai help を確認してください。');
});

bot.on('error', error => log(`Connection error: ${error.message}`));
bot.on('kicked', reason => log(`Kicked: ${JSON.stringify(reason)}`));

bot.on('end', () => {
  if (observationTimer) clearInterval(observationTimer);
  if (autonomyTimer) clearInterval(autonomyTimer);
  bot.clearControlStates();
  saveMemory(memory);
  log('Disconnected. Local memory saved.');
});

process.on('SIGINT', () => {
  if (observationTimer) clearInterval(observationTimer);
  if (autonomyTimer) clearInterval(autonomyTimer);
  try { bot.clearControlStates(); bot.quit(); } catch {}
  saveMemory(memory);
  process.exit(0);
});
