const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'agents');

function safeId(value) {
  const id = String(value || 'mai-001').toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 40);
  if (!id || id === '.' || id === '..') throw new Error('Invalid agent id.');
  return id;
}

function memoryPath(agentId) {
  return path.join(DATA_DIR, safeId(agentId) + '.json');
}

function emptyMemory(operator = null) {
  const now = new Date().toISOString();
  return {
    schemaVersion: 2,
    createdAt: now,
    updatedAt: now,
    observations: [],
    experiences: [],
    conversations: [],
    diaryEntries: [],
    operator
  };
}

function loadMemory(agentId = 'mai-001') {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const file = memoryPath(agentId);
  if (!fs.existsSync(file)) {
    const initial = emptyMemory();
    saveMemory(agentId, initial);
    return initial;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ...emptyMemory(parsed.operator || null), ...parsed, schemaVersion: 2 };
  } catch (error) {
    const backup = file + '.corrupt-' + Date.now();
    fs.copyFileSync(file, backup);
    throw new Error(`Memory file is invalid. Original preserved at ${backup}: ${error.message}`);
  }
}

function saveMemory(agentId, memory) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  memory.updatedAt = new Date().toISOString();
  const file = memoryPath(agentId);
  const temporary = file + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(memory, null, 2), 'utf8');
  fs.renameSync(temporary, file);
}

function resetMemory(agentId, memory) {
  const operator = memory.operator || null;
  const fresh = emptyMemory(operator);
  for (const key of Object.keys(memory)) delete memory[key];
  Object.assign(memory, fresh);
  saveMemory(agentId, memory);
  return memory;
}

function addBounded(list, value, max = 500) {
  list.push(value);
  if (list.length > max) list.splice(0, list.length - max);
}

module.exports = { loadMemory, saveMemory, resetMemory, addBounded };
