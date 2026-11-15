function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}
function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Action interrupted by operator.'));
    const timer = setTimeout(done, ms);
    function done() { signal?.removeEventListener('abort', abort); resolve(); }
    function abort() { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(new Error('Action interrupted by operator.')); }
    signal?.addEventListener('abort', abort, { once: true });
  });
}
async function executeAction(bot, action, config, signal) {
  if (!action || typeof action !== 'object') return 'No action selected.';
  if (signal?.aborted) return 'Action cancelled before execution.';
  switch (action.type) {
    case 'look': {
      const yaw = clamp(action.yaw, -Math.PI, Math.PI, 0);
      const pitch = clamp(action.pitch, -1.45, 1.45, 0);
      await bot.look(yaw, pitch, true);
      return 'Changed viewing direction.';
    }
    case 'walk': {
      const direction = ['forward', 'back', 'left', 'right'].includes(action.direction) ? action.direction : 'forward';
      const duration = clamp(action.durationMs, 200, Math.min(1800, config.autonomy.maxWalkMs), 700);
      try {
        bot.clearControlStates();
        bot.setControlState(direction, true);
        await delay(duration, signal);
        return `Tried moving ${direction} for ${duration} ms.`;
      } finally { bot.clearControlStates(); }
    }
    case 'jump':
      try { bot.setControlState('jump', true); await delay(350, signal); return 'Tried jumping.'; }
      finally { bot.setControlState('jump', false); }
    case 'inspect': return 'A fresh observation will be recorded.';
    case 'wait': {
      const duration = clamp(action.durationMs, 500, 5000, 1500);
      await delay(duration, signal);
      return `Waited ${duration} ms.`;
    }
    case 'say': {
      const message = String(action.message || '').replace(/[\\r\\n]/g, ' ').slice(0, 100);
      if (message) bot.chat(message);
      return 'Sent a chat message.';
    }
    default: return 'Unknown action. No operation was performed.';
  }
}
module.exports = { executeAction };
