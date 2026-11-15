function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

async function executeAction(bot, action, config) {
  if (!action || typeof action !== 'object') return 'No action selected.';

  switch (action.type) {
    case 'look': {
      const yaw = clamp(action.yaw, -Math.PI, Math.PI, 0);
      const pitch = clamp(action.pitch, -1.45, 1.45, 0);
      await bot.look(yaw, pitch, true);
      return 'Changed viewing direction.';
    }
    case 'walk': {
      const direction = ['forward', 'back', 'left', 'right'].includes(action.direction)
        ? action.direction
        : 'forward';
      const duration = clamp(action.durationMs, 200, config.autonomy.maxWalkMs, 700);
      bot.clearControlStates();
      bot.setControlState(direction, true);
      await new Promise(resolve => setTimeout(resolve, duration));
      bot.setControlState(direction, false);
      bot.clearControlStates();
      return `Tried moving ${direction} for ${duration} ms.`;
    }
    case 'jump': {
      bot.setControlState('jump', true);
      await new Promise(resolve => setTimeout(resolve, 450));
      bot.setControlState('jump', false);
      return 'Tried jumping.';
    }
    case 'inspect':
      return 'A fresh observation will be recorded.';
    case 'wait': {
      const duration = clamp(action.durationMs, 500, 5000, 1500);
      await new Promise(resolve => setTimeout(resolve, duration));
      return `Waited ${duration} ms.`;
    }
    case 'say': {
      const message = String(action.message || '').replace(/[\r\n]/g, ' ').slice(0, 100);
      if (message) bot.chat(message);
      return 'Sent a chat message.';
    }
    default:
      return 'Unknown action. No operation was performed.';
  }
}

module.exports = { executeAction };
