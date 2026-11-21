import { BUILDING_DEFS, type Building, type PowerStats } from './types';
import type { World } from './World';

export function evaluatePowerGrid(world: World): PowerStats {
  const byId = new Map<string, Building>();
  const adj = new Map<string, string[]>();

  for (const b of world.buildings.values()) {
    b.powered = false;
    b.fuseBlown = false;
    byId.set(b.id, b);
    adj.set(b.id, []);
  }

  // Costruisce il grafo bidirezionale dei cavi esistenti
  for (const w of world.wires) {
    if (byId.has(w.fromId) && byId.has(w.toId)) {
      adj.get(w.fromId)!.push(w.toId);
      adj.get(w.toId)!.push(w.fromId);
    }
  }

  const visited = new Set<string>();
  let totalProducedMW = 0;
  let totalConsumedMW = 0;
  let anyFuseBlown = false;

  // Analizza ogni sottorete elettrica separata (componente connessa)
  for (const startId of byId.keys()) {
    if (visited.has(startId)) continue;

    const component: Building[] = [];
    const queue: string[] = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const currId = queue.shift()!;
      const curr = byId.get(currId)!;
      component.push(curr);

      for (const nextId of adj.get(currId)!) {
        if (!visited.has(nextId)) {
          visited.add(nextId);
          queue.push(nextId);
        }
      }
    }

    let compProduced = 0;
    let compConsumed = 0;

    for (const b of component) {
      const mw = BUILDING_DEFS[b.type].powerMW;
      if (mw < 0) compProduced += -mw;
      else if (mw > 0) compConsumed += mw;
    }

    totalProducedMW += compProduced;

    if (compProduced > 0) {
      totalConsumedMW += compConsumed;
      const blown = compConsumed > compProduced;
      if (blown) anyFuseBlown = true;

      for (const b of component) {
        b.fuseBlown = blown;
        b.powered = !blown;
      }
    }
  }

  const stats: PowerStats = {
    producedMW: totalProducedMW,
    consumedMW: totalConsumedMW,
    fuseBlown: anyFuseBlown,
  };

  world.powerStats = stats;
  return stats;
}