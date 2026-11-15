function round(value) {
  return Math.round(Number(value) * 10) / 10;
}

function observe(bot, settings) {
  if (!bot.entity) return null;

  const radius = settings.radius;
  const positions = bot.findBlocks({
    matching: block => Boolean(block && block.type !== 0),
    maxDistance: radius,
    count: settings.maxBlocks
  });

  const materials = positions.map(position => {
    const block = bot.blockAt(position);
    return {
      sensorId: block ? `material_${block.type}` : 'material_unknown',
      offset: {
        x: round(position.x - bot.entity.position.x),
        y: round(position.y - bot.entity.position.y),
        z: round(position.z - bot.entity.position.z)
      },
      distance: round(bot.entity.position.distanceTo(position))
    };
  });

  const entities = Object.values(bot.entities)
    .filter(entity => entity && entity.id !== bot.entity.id && entity.position)
    .slice(0, settings.maxEntities)
    .map(entity => ({
      sensorId: Number.isInteger(entity.type)
        ? `entity_${entity.type}`
        : 'entity_unknown',
      offset: {
        x: round(entity.position.x - bot.entity.position.x),
        y: round(entity.position.y - bot.entity.position.y),
        z: round(entity.position.z - bot.entity.position.z)
      },
      distance: round(bot.entity.position.distanceTo(entity.position))
    }));

  return {
    at: new Date().toISOString(),
    position: {
      x: round(bot.entity.position.x),
      y: round(bot.entity.position.y),
      z: round(bot.entity.position.z)
    },
    health: bot.health,
    food: bot.food,
    onGround: Boolean(bot.entity.onGround),
    materials,
    entities,
    inventory: bot.inventory.items().map(item => ({
      sensorId: Number.isInteger(item.type) ? `item_${item.type}` : 'item_unknown',
      count: item.count
    }))
  };
}

module.exports = { observe };
