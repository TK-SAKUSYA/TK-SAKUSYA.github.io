const { executeAction } = require('./actions');

const SYSTEM_PROMPT = `あなたはMinecraftの未知の環境を観察と実験で学ぶAIプレイヤーです。
Minecraftの攻略情報・レシピ・Wiki・ブロック名の説明は与えられていません。
material_17、entity_4、item_5のようなセンサーIDは意味不明の識別子として扱い、推測で意味を決めないでください。
観察と行動結果に記録された事実だけを学習済みの事実として扱ってください。
言語モデルの事前学習知識を完全に消すことはできません。可能な限り観察データを根拠に判断してください。
人間の操作担当者の指示は自律目標より常に優先されます。
慎重に行動し、最近失敗した行動を理由なく繰り返さないでください。
ワールドや建築物を壊す、アイテムを捨てる、他プレイヤーを攻撃するなど、迷惑や破壊につながる行動は禁止です。
指定された性格は話し方や興味の傾向にだけ反映し、安全制約を上書きしてはいけません。
返答・発言は自然な日本語にしてください。
行動は look, walk, jump, wait, inspect, say のいずれか1つだけ選んでください。
walkのdirectionはforward, back, left, rightのいずれか、durationMsは最大1800です。
JSONだけを返してください:
{"say":"短い日本語の発言または空文字","action":{"type":"wait","durationMs":1000},"learningNote":"観察した結果または空文字"}`;

function parseJson(text) {
  const cleaned = String(text || '').trim().replace(/^\uFEFF/, '');
  try { return JSON.parse(cleaned); }
  catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('The model did not return valid JSON.');
  }
}

function validateDecision(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Decision must be a JSON object.');
  const allowed = new Set(['look', 'walk', 'jump', 'wait', 'inspect', 'say']);
  const action = value.action;
  if (!action || typeof action !== 'object' || !allowed.has(action.type)) {
    return { say: '', action: { type: 'wait', durationMs: 1000 }, learningNote: '' };
  }
  if (action.type === 'walk' && !['forward', 'back', 'left', 'right'].includes(action.direction)) {
    return { say: '', action: { type: 'wait', durationMs: 1000 }, learningNote: '' };
  }
  if (action.type === 'walk') action.durationMs = Math.max(200, Math.min(1800, Number(action.durationMs) || 700));
  return value;
}

async function requestDecision(config, payload) {
  if (!config.ollama.enabled) throw new Error('Ollama is disabled in config.json.');
  const endpoint = new URL('/api/chat', config.ollama.baseUrl);
  if (!['127.0.0.1', 'localhost', '::1'].includes(endpoint.hostname)) {
    throw new Error('M-AI only allows a local Ollama endpoint by default.');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.ollama.timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.ollama.model,
        stream: false,
        format: 'json',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(payload) }
        ],
        options: { temperature: 0.5 }
      })
    });
    if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}. Is the model installed and running?`);
    const result = await response.json();
    return validateDecision(parseJson(result.message?.content));
  } finally { clearTimeout(timer); }
}

async function thinkAndAct(bot, config, memory, latestObservation, operatorMessage, isOperator, allowActions = true, signal, profile = {}) {
  const recentExperiences = memory.experiences.slice(-20).map(entry => ({
    source: entry.source,
    input: entry.input,
    actionResult: entry.actionResult,
    learningNote: entry.learningNote,
    observedChanges: entry.observedChanges
  }));
  const decision = await requestDecision(config, {
    agent: {
      name: profile.name || 'M-AI',
      personality: profile.personality || '慎重で協調的',
      diaryEnabled: Boolean(profile.diaryEnabled)
    },
    currentObservation: latestObservation,
    recentObservations: memory.observations.slice(-5),
    recentExperiences,
    operatorMessage: operatorMessage || null,
    isOperator: Boolean(isOperator),
    knownFacts: memory.experiences.filter(entry => entry.learningNote).slice(-30).map(entry => entry.learningNote)
  });
  const say = typeof decision.say === 'string' ? decision.say.replace(/[\r\n]/g, ' ').slice(0, 100) : '';
  if (say && !signal?.aborted) bot.chat(say);
  const selectedAction = allowActions ? decision.action : { type: 'wait', durationMs: 500 };
  const result = await executeAction(bot, selectedAction, config, signal);
  return {
    result,
    learningNote: typeof decision.learningNote === 'string' ? decision.learningNote.slice(0, 300) : ''
  };
}
module.exports = { thinkAndAct };
