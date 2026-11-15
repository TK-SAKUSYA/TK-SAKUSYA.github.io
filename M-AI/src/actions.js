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
function directionVector(yaw, direction) {
  const forward = { x: -Math.sin(yaw), z: Math.cos(yaw) };
  const right = { x: Math.cos(yaw), z: Math.sin(yaw) };
  if (direction === 'back') return { x: -forward.x, z: -forward.z };
  if (direction === 'left') return { x: -right.x, z: -right.z };
  if (direction === 'right') return right;
  return forward;
}
function canStepSafely(bot, direction) {
  if (!bot.entity?.position || typeof bot.blockAt !== 'function') return false;
  const vector = directionVector(bot.entity.yaw || 0, direction);
  const target = bot.entity.position.offset(vector.x * 0.65, 0, vector.z * 0.65);
  const feet = bot.blockAt(target.offset(0, 0.1, 0));
  const head = bot.blockAt(target.offset(0, 1.0, 0));
  const support = bot.blockAt(target.offset(0, -0.6, 0));
  // Unknown collision data is treated conservatively. Empty space below means no step.
  if (!feet || !head || !support) return false;
  if (feet.boundingBox !== 'empty' || head.boundingBox !== 'empty') return false;
  if (support.boundingBox !== 'block') return false;
  return true;
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
      if (bot.entity?.onGround === false) return 'Movement skipped because the agent is not grounded.';
      if (!canStepSafely(bot, direction)) return 'Movement stopped: the next step may be blocked or unsupported.';
      const startedAt = Date.now();
      let movedFor = 0;
      try {
        bot.clearControlStates();
        bot.setControlState(direction, true);
        while (movedFor < duration) {
          const slice = Math.min(150, duration - movedFor);
          await delay(slice, signal);
          movedFor += slice;
          if (bot.entity?.onGround === false || !canStepSafely(bot, direction)) {
            return 'Movement stopped early by the safety check.';
          }
        }
        return `Tried moving ${direction} for ${Date.now() - startedAt} ms with step checks.`;
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
module.exports = { executeAction, canStepSafely };