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
async function executeAction(bot, action, config, signal, permissions = {}) {
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
    case 'mine': {
      if (!permissions.mining) return 'Mining requires an explicit operator mining instruction.';
      const dx = clamp(action.dx, -2, 2, 0);
      const dy = clamp(action.dy, -2, 2, 0);
      const dz = clamp(action.dz, -2, 2, 0);
      if (![dx, dy, dz].every(Number.isInteger) || (dx === 0 && dy === 0 && dz === 0)) {
        return 'Mining target rejected: invalid relative position.';
      }
      if (!bot.entity?.position || typeof bot.blockAt !== 'function' || typeof bot.dig !== 'function') {
        return 'Mining unavailable: required world interaction is unsupported.';
      }
      const target = bot.entity.position.offset(dx, dy, dz);
      const block = bot.blockAt(target);
      if (!block || !block.name || block.name === 'air' || block.name === 'cave_air' || block.name === 'void_air') {
        return 'Mining skipped: no known block at the requested position.';
      }
      const protectedName = /chest|barrel|shulker|furnace|hopper|spawner|command_block|sign|banner|lectern|beacon|end_portal|nether_portal|bedrock/i;
      if (block.entity || protectedName.test(block.name)) {
        return 'Mining skipped: protected or interactive block.';
      }
      if (block.boundingBox !== 'block' || !Number.isFinite(block.hardness) || block.hardness <= 0) {
        return 'Mining skipped: block is not confirmed as safely diggable.';
      }
      if (typeof bot.canDigBlock !== 'function' || !bot.canDigBlock(block)) {
        return 'Mining skipped: block is out of reach or cannot be dug.';
      }
      if (signal?.aborted) return 'Mining cancelled before starting.';
      const stopDigging = () => { try { bot.stopDigging(); } catch {} };
      signal?.addEventListener('abort', stopDigging, { once: true });
      try {
        await bot.dig(block, true);
        if (signal?.aborted) return 'Mining interrupted by operator.';
        return `Mined one block at relative position ${dx}, ${dy}, ${dz}.`;
      } finally {
        signal?.removeEventListener('abort', stopDigging);
      }
    }
    case 'craft': {
      if (!permissions.crafting) return 'Crafting requires an explicit operator crafting instruction.';
      const itemType = Number(action.itemType);
      const count = clamp(action.count, 1, 4, 1);
      if (!Number.isInteger(itemType) || itemType <= 0 || !Number.isInteger(count)) {
        return 'Crafting request rejected: invalid item type or count.';
      }
      if (typeof bot.recipesFor !== 'function' || typeof bot.craft !== 'function' || !bot.inventory) {
        return 'Crafting unavailable: required crafting APIs are unsupported.';
      }
      let table = null;
      if (typeof bot.findBlock === 'function') {
        try {
          table = bot.findBlock({
            matching: block => block?.name === 'crafting_table',
            maxDistance: 4
          }) || null;
        } catch {}
      }
      let recipes = [];
      try {
        recipes = bot.recipesFor(itemType, null, 1, table);
        if (!recipes.length && table) recipes = bot.recipesFor(itemType, null, 1, null);
      } catch (error) {
        return `Crafting recipe lookup failed: ${error.message}`;
      }
      if (!recipes.length) return 'Crafting skipped: no matching recipe with the current inventory and nearby table.';
      if (signal?.aborted) return 'Crafting cancelled before starting.';
      try {
        await bot.craft(recipes[0], count, recipes[0].requiresTable ? table : null);
        if (signal?.aborted) return 'Crafting interrupted by operator.';
        return `Crafted item type ${itemType} using ${count} recipe operation(s).`;
      } catch (error) {
        return `Crafting failed: ${error.message}`;
      }
    }
    case 'place': {
      if (!permissions.building) return 'Block placement requires an explicit operator building instruction.';
      const dx = Number(action.dx);
      const dy = Number(action.dy);
      const dz = Number(action.dz);
      const itemType = Number(action.itemType);
      if (![dx, dy, dz].every(Number.isInteger) || [dx, dy, dz].some(v => v < -3 || v > 3) ||
          (dx === 0 && dy === 0 && dz === 0) || !Number.isInteger(itemType) || itemType <= 0) {
        return 'Placement rejected: invalid target offset or item type.';
      }
      if (!bot.entity?.position || typeof bot.blockAt !== 'function' ||
          typeof bot.placeBlock !== 'function' || typeof bot.equip !== 'function' || !bot.inventory) {
        return 'Block placement unavailable: required world interaction APIs are unsupported.';
      }
      const target = bot.entity.position.offset(dx, dy, dz);
      if (bot.entity.position.distanceTo(target) > 4.5) return 'Placement skipped: target is too far away.';
      const existing = bot.blockAt(target);
      if (!existing || !['air', 'cave_air', 'void_air'].includes(existing.name)) {
        return 'Placement skipped: target space is not confirmed empty.';
      }
      const protectedNames = /water|lava|fire|portal|chest|barrel|shulker|furnace|hopper|spawner|command_block|bedrock/i;
      const item = bot.inventory.items().find(entry => entry.type === itemType && entry.count > 0);
      if (!item || protectedNames.test(item.name)) return 'Placement skipped: requested safe block is not in inventory.';
      const faces = [
        { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
        { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
      ];
      let reference = null;
      let face = null;
      for (const candidate of faces) {
        const block = bot.blockAt(target.offset(-candidate.x, -candidate.y, -candidate.z));
        if (block && block.boundingBox === 'block' && !block.entity && !protectedNames.test(block.name || '')) {
          reference = block;
          face = candidate;
          break;
        }
      }
      if (!reference || !face) return 'Placement skipped: no safe solid supporting block is adjacent to the target.';
      if (signal?.aborted) return 'Placement cancelled before starting.';
      try {
        await bot.equip(item, 'hand');
        if (signal?.aborted) return 'Placement cancelled before placing the block.';
        await bot.placeBlock(reference, face);
        return `Placed one block at relative position ${dx}, ${dy}, ${dz}.`;
      } catch (error) {
        return `Block placement failed: ${error.message}`;
      } finally {
        try { await bot.unequip('hand'); } catch {}
      }
    }
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