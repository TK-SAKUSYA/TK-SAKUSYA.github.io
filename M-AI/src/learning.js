function keyCounts(items, key) {
  const result = {};
  for (const item of items || []) {
    const value = item?.[key];
    if (typeof value === 'string') result[value] = (result[value] || 0) + 1;
  }
  return result;
}
function compareObservations(before, after) {
  if (!before || !after) return { available: false };
  const oldMaterials = keyCounts(before.materials, 'sensorId');
  const newMaterials = keyCounts(after.materials, 'sensorId');
  const oldEntities = keyCounts(before.entities, 'sensorId');
  const newEntities = keyCounts(after.entities, 'sensorId');
  const diff = (oldMap, newMap) => {
    const added = [], removed = [];
    for (const [key, count] of Object.entries(newMap)) {
      if (count > (oldMap[key] || 0)) added.push({ sensorId: key, count: count - (oldMap[key] || 0) });
    }
    for (const [key, count] of Object.entries(oldMap)) {
      if (count > (newMap[key] || 0)) removed.push({ sensorId: key, count: count - (newMap[key] || 0) });
    }
    return { added, removed };
  };
  return {
    available: true,
    positionDelta: {
      x: Number((after.position.x - before.position.x).toFixed(1)),
      y: Number((after.position.y - before.position.y).toFixed(1)),
      z: Number((after.position.z - before.position.z).toFixed(1))
    },
    healthDelta: after.health - before.health,
    foodDelta: after.food - before.food,
    materials: diff(oldMaterials, newMaterials),
    entities: diff(oldEntities, newEntities)
  };
}
module.exports = { compareObservations };
