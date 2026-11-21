import { evaluatePowerGrid } from './PowerGrid';
import { RECIPES, RESOURCE_TO_ITEM } from './recipes';
import {
  PURITY_RATE,
  type Building,
  type Direction,
  type ItemType,
} from './types';
import type { World } from './World';

const BELT_SPEED = 1.0; // 1 cella/sec = 60 item/min (Nastro Mk.1)
const MAX_BUFFER = 50;

export class Simulation {
  private readonly world: World;
  private movedThisTick = new Set<string>();

  constructor(world: World) {
    this.world = world;
  }

  /** Avanza la simulazione di dt secondi */
  step(dt: number) {
    const clampedDt = Math.min(dt, 0.1);
    evaluatePowerGrid(this.world);
    this.movedThisTick.clear();

    // 1. Produzione macchine: lavora solo chi è collegato via cavo a una rete attiva
    for (const b of this.world.buildings.values()) {
      if (!b.powered) continue;

      if (b.type === 'miner') {
        this.updateMiner(b, clampedDt);
      } else if (b.type === 'smelter' || b.type === 'constructor') {
        this.updateCrafter(b, clampedDt);
      }
    }

    // 2. Spinta dagli output delle macchine verso i nastri (i nastri non consumano corrente)
    for (const b of this.world.buildings.values()) {
      if (b.type === 'miner' || b.type === 'smelter' || b.type === 'constructor') {
        this.pushMachineOutput(b);
      }
    }

    // 3. Movimento continuo su nastri, Splitter e Merger
    for (const b of this.world.buildings.values()) {
      if (b.type === 'belt' || b.type === 'splitter' || b.type === 'merger') {
        this.updateLogistics(b, clampedDt);
      }
    }
  }

  private updateMiner(b: Building, dt: number) {
    const node = this.world.getNode(b.x, b.y);
    if (!node) return;

    const item = RESOURCE_TO_ITEM[node.type];
    const out = (b.outputBuffer ??= {});
    const currentCount = out[item] ?? 0;

    if (currentCount >= MAX_BUFFER) {
      b.progress = 0;
      return;
    }

    const itemsPerSec = PURITY_RATE[node.purity] / 60;
    b.progress = (b.progress ?? 0) + itemsPerSec * dt;

    if (b.progress >= 1) {
      b.progress -= 1;
      out[item] = currentCount + 1;
    }
  }

  private updateCrafter(b: Building, dt: number) {
    if (!b.recipeId) return;
    const recipe = RECIPES[b.recipeId];
    if (!recipe) return;

    const inputBuf = (b.inputBuffer ??= {});
    const outputBuf = (b.outputBuffer ??= {});

    const hasInput = (inputBuf[recipe.input.item] ?? 0) >= recipe.input.count;
    const outCount = outputBuf[recipe.output.item] ?? 0;
    const hasSpace = outCount + recipe.output.count <= MAX_BUFFER;

    if (!hasInput || !hasSpace) {
      return;
    }

    b.progress = (b.progress ?? 0) + dt / recipe.durationSec;

    if (b.progress >= 1) {
      b.progress -= 1;
      inputBuf[recipe.input.item] =
        (inputBuf[recipe.input.item] ?? 0) - recipe.input.count;
      outputBuf[recipe.output.item] = outCount + recipe.output.count;
    }
  }

  private pushMachineOutput(b: Building) {
    const outputBuf = b.outputBuffer;
    if (!outputBuf) return;

    const entry = Object.entries(outputBuf).find(([, count]) => (count ?? 0) > 0);
    if (!entry) return;

    const item = entry[0] as ItemType;
    const count = entry[1] ?? 0;
    const target = this.world.getNeighbor(b.x, b.y, b.dir);

    if (target && this.tryInsertItem(target, item)) {
      outputBuf[item] = count - 1;
      if (outputBuf[item] === 0) delete outputBuf[item];
    }
  }

  private updateLogistics(b: Building, dt: number) {
    if (!b.beltSlot || this.movedThisTick.has(b.id)) return;

    const speed = b.type === 'belt' ? BELT_SPEED : BELT_SPEED * 2;
    b.beltSlot.progress = Math.min(1, b.beltSlot.progress + speed * dt);

    if (b.beltSlot.progress < 1) return;

    if (b.type === 'splitter') {
      const dirs: Direction[] = [
        ((b.dir + 3) % 4) as Direction,
        b.dir,
        ((b.dir + 1) % 4) as Direction,
      ];
      const start = b.rrIndex ?? 0;

      for (let i = 0; i < 3; i++) {
        const idx = (start + i) % 3;
        const target = this.world.getNeighbor(b.x, b.y, dirs[idx]);
        if (target && this.tryInsertItem(target, b.beltSlot.item)) {
          b.beltSlot = null;
          b.rrIndex = (idx + 1) % 3;
          return;
        }
      }
      return;
    }

    const target = this.world.getNeighbor(b.x, b.y, b.dir);
    if (target && this.tryInsertItem(target, b.beltSlot.item)) {
      b.beltSlot = null;
    }
  }

  private tryInsertItem(target: Building, item: ItemType): boolean {
    if (target.type === 'hub') {
      this.world.addToHub(item, 1);
      return true;
    }

    if (
      target.type === 'belt' ||
      target.type === 'splitter' ||
      target.type === 'merger'
    ) {
      if (target.beltSlot) return false;
      target.beltSlot = { item, progress: 0 };
      this.movedThisTick.add(target.id);
      return true;
    }

    if (target.type === 'smelter' || target.type === 'constructor') {
      if (!target.recipeId) return false;
      const recipe = RECIPES[target.recipeId];
      if (!recipe || recipe.input.item !== item) return false;

      const inputBuf = (target.inputBuffer ??= {});
      const current = inputBuf[item] ?? 0;
      if (current >= MAX_BUFFER) return false;

      inputBuf[item] = current + 1;
      return true;
    }

    return false;
  }
}