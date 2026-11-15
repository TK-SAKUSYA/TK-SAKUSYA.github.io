const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'agents');
const MEMORY_FILE = path.join(DATA_DIR, 'mai-001.json');

function emptyMemory() {
  return {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    observations: [],
    experiences: [],
    conversations: [],
    operator: null
  };
}

function loadMemory() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(MEMORY_FILE)) {
    const initial = emptyMemory();
    saveMemory(initial);
    return initial;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    return { ...emptyMemory(), ...parsed };
  } catch (error) {
    const backup = MEMORY_FILE + '.corrupt-' + Date.now();
    fs.copyFileSync(MEMORY_FILE, backup);
    throw new Error(`Memory file is invalid. Original preserved at ${backup}: ${error.message}`);
  }
}

function saveMemory(memory) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  memory.updatedAt = new Date().toISOString();
  const temporary = MEMORY_FILE + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(memory, null, 2), 'utf8');
  fs.renameSync(temporary, MEMORY_FILE);
}

function addBounded(list, value, max = 500) {
  list.push(value);
  if (list.length > max) list.splice(0, list.length - max);
}

module.exports = { loadMemory, saveMemory, addBounded };
