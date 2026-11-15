const fs = require('node:fs');
const path = require('node:path');
const mineflayer = require('@wp2508/mineflayer');
const { loadMemory, saveMemory, resetMemory, addBounded } = require('./memory');
const { observe } = require('./observer');
const { thinkAndAct } = require('./brain');
const { compareObservations } = require('./learning');
const { generateIdentity } = require('./identity');

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

const profiles = Array.isArray(config.agents) && config.agents.length
  ? config.agents
  : [{
      id: 'mai-001',
      username: config.botUsername || 'MAI001',
      name: '',
      personality: config.personality || '慎重で協調的',
      diaryEnabled: false
    }];

if (profiles.length > 8) {
  console.error('Safety stop: at most 8 agents can be started in one process.');
  process.exit(1);
}
const ids = new Set();
const usernames = new Set();
for (const profile of profiles) {
  profile.id = String(profile.id || '').trim();
  profile.username = String(profile.username || '').trim();
  profile.name = String(profile.name || '').trim();
  if (!profile.id || !profile.username || ids.has(profile.id) || usernames.has(profile.username.toLowerCase())) {
    console.error('Each agent needs a unique id and username in config.json.');
    process.exit(1);
  }
  ids.add(profile.id);
  usernames.add(profile.username.toLowerCase());
  profile.personality = String(profile.personality || '慎重で協調的').slice(0, 300);
  profile.diaryEnabled = Boolean(profile.diaryEnabled);
}

const agents = new Map();
let globalPaused = !config.autonomy.enabled;
let globalOperator = null;

function log(profile, message) {
  console.log(`[M-AI:${profile.name}] ${message}`);
}
function isOperator(state, username) {
  return Boolean(globalOperator && username.toLowerCase() === globalOperator.toLowerCase());
}
function setGlobalOperator(username) {
  globalOperator = String(username || '').trim();
  for (const state of agents.values()) {
    state.memory.operator = globalOperator;
    save(state);
  }
}
function save(state) {
  saveMemory(state.profile.id, state.memory);
}
function recordExperience(state, entry) {
  addBounded(state.memory.experiences, { at: new Date().toISOString(), ...entry }, 500);
  save(state);
}
function recordObservation(state) {
  state.latestObservation = observe(state.bot, config.observation);
  if (!state.latestObservation) return null;
  addBounded(state.memory.observations, state.latestObservation, 100);
  save(state);
  return state.latestObservation;
}
function stopState(state) {
  if (state.activeActionController) state.activeActionController.abort();
  try { state.bot.clearControlStates(); } catch {}
}
function stopAll() {
  globalPaused = true;
  for (const state of agents.values()) stopState(state);
}

async function runThinking(state, message = null, fromOperator = false, allowActions = true) {
  if (!state.bot.entity || state.resetting) return;
  if (state.thinking) {
    if (fromOperator) {
      state.pendingOperatorMessage = message;
      stopState(state);
      log(state.profile, '担当者の指示を優先します。');
    }
    return;
  }
  if (globalPaused && !fromOperator && !message) return;
  state.thinking = true;
  state.activeActionController = new AbortController();
  try {
    const before = recordObservation(state);
    const result = await thinkAndAct(
      state.bot, config, state.memory, before, message, fromOperator,
      allowActions, state.activeActionController.signal, state.profile
    );
    const after = recordObservation(state);
    recordExperience(state, {
      source: fromOperator ? 'operator' : 'autonomy',
      input: message,
      actionResult: result.result,
      learningNote: result.learningNote,
      before,
      after,
      observedChanges: compareObservations(before, after)
    });
    log(state.profile, result.result);
  } catch (error) {
    if (!state.activeActionController?.signal.aborted) log(state.profile, `思考できませんでした: ${error.message}`);
  } finally {
    state.thinking = false;
    state.activeActionController = null;
    if (state.pendingOperatorMessage !== null) {
      const next = state.pendingOperatorMessage;
      state.pendingOperatorMessage = null;
      setImmediate(() => runThinking(state, next, true, true));
    }
  }
}

async function writeDiary(state) {
  if (!state.profile.diaryEnabled || !state.bot.entity || globalPaused || state.diaryWriting) return;
  const book = state.bot.inventory?.findInventoryItem?.('writable_book');
  if (!book || typeof state.bot.writeBook !== 'function') return;
  state.diaryWriting = true;
  try {
    const latest = state.memory.experiences.slice(-5);
    const lines = latest.map((entry, index) => {
      const note = String(entry.learningNote || entry.actionResult || '周囲を観察した').replace(/[\r\n]/g, ' ').slice(0, 55);
      return `${index + 1}. ${note}`;
    });
    const page = (`【${state.profile.name}の日記】\n${new Date().toLocaleString('ja-JP')}\n\n${lines.join('\n') || '今日は周囲を観察した。'}`).slice(0, 240);
    const entries = [...state.memory.diaryEntries, { at: new Date().toISOString(), page }].slice(-100);
    await state.bot.writeBook(book.slot, entries.map(entry => entry.page));
    state.memory.diaryEntries = entries;
    save(state);
    log(state.profile, '本と羽ペンに日記を書きました。');
  } catch (error) {
    log(state.profile, `日記を書けませんでした: ${error.message}`);
  } finally {
    state.diaryWriting = false;
  }
}

function resetOne(state) {
  state.resetting = true;
  stopState(state);
  state.pendingOperatorMessage = null;
  resetMemory(state.profile.id, state.memory);
  state.latestObservation = null;
  const writableBook = state.bot.inventory?.findInventoryItem?.('writable_book');
  if (writableBook && typeof state.bot.writeBook === 'function') {
    state.bot.writeBook(writableBook.slot, ['']).catch(error => log(state.profile, `日記帳を空にできませんでした: ${error.message}`));
  }
  state.resetting = false;
}
function handleCommand(state, username, command) {
  const parts = command.trim().split(/\s+/);
  const sub = (parts[1] || '').toLowerCase();
  if (sub === 'claim') {
    if (!globalOperator) {
      setGlobalOperator(username);
      state.bot.chat(`${state.profile.name}: ${username}を全AI共通の操作担当者として登録しました。`);
    } else if (isOperator(state, username)) state.bot.chat(`${state.profile.name}: あなたは全AI共通の操作担当者です。`);
    else state.bot.chat(`${state.profile.name}: 操作担当者は既に登録されています。`);
    return true;
  }
  if (sub === 'help') {
    state.bot.chat('コマンド: !mai claim / status / pause / resume / think / reset all / reset 名前 / 名前 指示');
    return true;
  }
  if (sub === 'status') {
    state.bot.chat(`${state.profile.name}: ${globalPaused ? '停止中' : '活動中'} / 観察 ${state.memory.observations.length}件 / 経験 ${state.memory.experiences.length}件`);
    return true;
  }
  if (sub === 'reset') {
    if (!isOperator(state, username)) { state.bot.chat('記憶リセットには操作担当者登録が必要です。'); return true; }
    const target = parts.slice(2).join(' ');
    if (!target) { state.bot.chat('例: !mai reset all または !mai reset アキラ'); return true; }
    if (target.toLowerCase() === 'all') {
      stopAll();
      for (const item of agents.values()) resetOne(item);
      state.bot.chat('全AIの記憶をリセットしました。安全のため全AIを停止中にしました。再開は !mai resume です。');
    } else {
      const targetState = [...agents.values()].find(item => item.profile.name.toLowerCase() === target.toLowerCase());
      if (!targetState) state.bot.chat(`「${target}」という名前のAIはいません。`);
      else {
        resetOne(targetState);
        state.bot.chat(`${targetState.profile.name}の記憶をリセットしました。自律行動は全体停止中でなければ再開します。`);
      }
    }
    return true;
  }
  if (sub === 'pause') {
    if (!isOperator(state, username)) { state.bot.chat('この操作には担当者登録が必要です。'); return true; }
    stopAll();
    state.bot.chat('全AIの自律行動を停止しました。');
    return true;
  }
  if (sub === 'resume') {
    if (!isOperator(state, username)) { state.bot.chat('この操作には担当者登録が必要です。'); return true; }
    globalPaused = false;
    state.bot.chat('全AIの自律行動を再開します。');
    return true;
  }
  if (sub === 'think') {
    if (!isOperator(state, username)) { state.bot.chat('この操作には担当者登録が必要です。'); return true; }
    runThinking(state, '周囲を観察し、次に何を試すか考えてください。', true);
    return true;
  }
  return false;
}

async function startAgents() {
for (const profile of profiles) {
  const memory = loadMemory(profile.id);
  if (!globalOperator && memory.operator) globalOperator = memory.operator;
  if (globalOperator && memory.operator !== globalOperator) {
    memory.operator = globalOperator;
    saveMemory(profile.id, memory);
  }
  if (!memory.identity?.name) {
    const existingNames = [...agents.values()].map(item => item.profile.name);
    memory.identity = await generateIdentity(config, profile.personality, existingNames);
    saveMemory(profile.id, memory);
  }
  profile.name = memory.identity.name;
  const bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username: profile.username,
    version: config.minecraftVersion,
    auth: 'offline'
  });
  const state = {
    profile, memory, bot, thinking: false, resetting: false,
    pendingOperatorMessage: null, activeActionController: null,
    observationTimer: null, autonomyTimer: null, diaryTimer: null,
    latestObservation: null
  };
  agents.set(profile.id, state);

  bot.once('spawn', () => {
    log(profile, 'ローカルMinecraftワールドに接続しました。');
    bot.chat(`こんにちは！私は${profile.name}です。${memory.identity.introduction || 'よろしくお願いします！'}`);
    recordObservation(state);
    state.observationTimer = setInterval(() => recordObservation(state), 15000);
    state.autonomyTimer = setInterval(() => {
      if (!globalPaused) runThinking(state);
    }, config.autonomy.intervalMs);
    if (profile.diaryEnabled) {
      const interval = Math.max(60000, Number(config.diary?.intervalMs) || 1800000);
      state.diaryTimer = setInterval(() => writeDiary(state), interval);
    }
  });

  bot.on('chat', (username, message) => {
    if (!message || username.toLowerCase() === bot.username.toLowerCase()) return;
    addBounded(memory.conversations, { at: new Date().toISOString(), username, message: String(message).slice(0, 300) }, 300);
    save(state);
    const command = message.trim();
    if (command.startsWith('!mai')) {
      const parts = command.split(/\s+/);
      const maybeName = parts[1];
      if (maybeName && !['claim','help','status','pause','resume','think','reset','to'].includes(maybeName.toLowerCase())) {
        if (maybeName.toLowerCase() !== profile.name.toLowerCase()) return;
        if (!isOperator(state, username)) { bot.chat('個別指示には操作担当者登録が必要です。'); return; }
        const instruction = parts.slice(2).join(' ');
        if (instruction) runThinking(state, instruction, true, true);
        return;
      }
      if (parts[1]?.toLowerCase() === 'to') {
        const targetName = parts[2];
        if (targetName?.toLowerCase() !== profile.name.toLowerCase()) return;
        if (!isOperator(state, username)) { bot.chat('個別指示には操作担当者登録が必要です。'); return; }
        const instruction = parts.slice(3).join(' ');
        if (instruction) runThinking(state, instruction, true, true);
        return;
      }
      handleCommand(state, username, command);
      return;
    }
    if (isOperator(state, username)) runThinking(state, command, true, true);
    else runThinking(state, command, false, false);
  });

  bot.on('error', error => log(profile, `接続エラー: ${error.message}`));
  bot.on('kicked', reason => log(profile, `サーバーから切断: ${JSON.stringify(reason)}`));
  bot.on('end', () => {
    stopState(state);
    for (const timer of [state.observationTimer, state.autonomyTimer, state.diaryTimer]) if (timer) clearInterval(timer);
    save(state);
    log(profile, '切断しました。ローカル記憶を保存しました。');
  });
}

}

startAgents().catch(error => {
  console.error(`[M-AI] 起動できませんでした: ${error.message}`);
  process.exitCode = 1;
});

process.on('SIGINT', () => {
  stopAll();
  for (const state of agents.values()) {
    for (const timer of [state.observationTimer, state.autonomyTimer, state.diaryTimer]) if (timer) clearInterval(timer);
    try { state.bot.quit(); } catch {}
    save(state);
  }
  process.exit(0);
});
