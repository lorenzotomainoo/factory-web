import { evaluatePowerGrid } from './PowerGrid';
import { RECIPES, RESOURCE_TO_ITEM } from './recipes';
import {
  BUILDING_DEFS,
  CRAFTING_BUILDING_TYPES,
  isBeltType,
  isMinerType,
  PURITY_RATE,
  type Building,
  type Direction,
  type ItemType,
} from './types';
import type { World } from './World';

const MAX_BUFFER_PER_ITEM = 50;

function oppositeDir(dir: Direction): Direction {
  return ((dir + 2) % 4) as Direction;
}

export class Simulation {
  private readonly world: World;

  constructor(world: World) {
    this.world = world;
  }

  step(dtSec: number) {
    const dt = Math.min(dtSec, 0.1);
    if (dt <= 0) return;

    this.world.powerStats = evaluatePowerGrid(this.world);

    for (const b of this.world.buildings.values()) {
      if (isMinerType(b.type)) {
        this.stepMiner(b, dt);
      } else if (CRAFTING_BUILDING_TYPES.has(b.type)) {
        this.stepCrafter(b, dt);
      } else if (isBeltType(b.type)) {
        this.stepBelt(b, dt);
      } else if (b.type === 'splitter') {
        this.stepSplitter(b);
      } else if (b.type === 'merger') {
        this.stepMerger(b);
      }
    }
  }

  private stepMiner(b: Building, dt: number) {
    const node = this.world.getNode(b.x, b.y);
    if (!node) return;

    const item = RESOURCE_TO_ITEM[node.type];
    b.outputBuffer ??= {};

    if (b.powered) {
      const currentOut = b.outputBuffer[item] ?? 0;
      if (currentOut < MAX_BUFFER_PER_ITEM) {
        const mult = BUILDING_DEFS[b.type].minerMultiplier ?? 1;
        const ratePerSec = (PURITY_RATE[node.purity] * mult) / 60;
        b.progress = (b.progress ?? 0) + ratePerSec * dt;

        if (b.progress >= 1) {
          const produced = Math.min(
            Math.floor(b.progress),
            MAX_BUFFER_PER_ITEM - currentOut
          );
          if (produced > 0) {
            b.outputBuffer[item] = currentOut + produced;
            b.progress -= produced;
          }
        }
      }
    }

    this.tryPushFromOutput(b, item);
  }

  private stepCrafter(b: Building, dt: number) {
    const recipe = b.recipeId ? RECIPES[b.recipeId] : undefined;
    if (!recipe) return;

    b.inputBuffer ??= {};
    b.outputBuffer ??= {};

    const outItem = recipe.output.item;
    const outCount = b.outputBuffer[outItem] ?? 0;

    if (b.powered) {
      const hasAllInputs = recipe.inputs.every(
        (req) => (b.inputBuffer![req.item] ?? 0) >= req.count
      );
      const hasOutputSpace =
        outCount + recipe.output.count <= MAX_BUFFER_PER_ITEM;

      if (hasAllInputs && hasOutputSpace) {
        b.progress = (b.progress ?? 0) + dt / recipe.durationSec;
        if (b.progress >= 1) {
          for (const req of recipe.inputs) {
            const left = (b.inputBuffer[req.item] ?? 0) - req.count;
            if (left <= 0) delete b.inputBuffer[req.item];
            else b.inputBuffer[req.item] = left;
          }
          b.outputBuffer[outItem] = outCount + recipe.output.count;
          b.progress = Math.max(0, b.progress - 1);
        }
      } else if (!hasAllInputs) {
        b.progress = 0;
      }
    }

    this.tryPushFromOutput(b, outItem);
  }

  private stepBelt(b: Building, dt: number) {
    if (!b.beltSlot) return;

    const tilesPerSec = (BUILDING_DEFS[b.type].beltSpeed ?? 60) / 60;
    b.beltSlot.progress += tilesPerSec * dt;

    if (b.beltSlot.progress >= 1) {
      const target = this.world.getNeighbor(b.x, b.y, b.dir);
      if (target && this.tryInsertItem(target, b.beltSlot.item, b.dir)) {
        b.beltSlot = null;
      } else {
        b.beltSlot.progress = 1;
      }
    }
  }

  private stepSplitter(b: Building) {
    if (!b.beltSlot) return;

    const dirs: Direction[] = [
      b.dir,
      ((b.dir + 3) % 4) as Direction,
      ((b.dir + 1) % 4) as Direction,
    ];

    const start = b.rrIndex ?? 0;
    for (let i = 0; i < 3; i++) {
      const idx = (start + i) % 3;
      const outDir = dirs[idx];
      const target = this.world.getNeighbor(b.x, b.y, outDir);
      if (target && this.tryInsertItem(target, b.beltSlot.item, outDir)) {
        b.beltSlot = null;
        b.rrIndex = (idx + 1) % 3;
        return;
      }
    }
  }

  private stepMerger(b: Building) {
    if (!b.beltSlot) return;

    const target = this.world.getNeighbor(b.x, b.y, b.dir);
    if (target && this.tryInsertItem(target, b.beltSlot.item, b.dir)) {
      b.beltSlot = null;
    }
  }

  private tryPushFromOutput(b: Building, item: ItemType) {
    if (!b.outputBuffer) return;
    const count = b.outputBuffer[item] ?? 0;
    if (count <= 0) return;

    const target = this.world.getNeighbor(b.x, b.y, b.dir);
    if (target && this.tryInsertItem(target, item, b.dir)) {
      const next = count - 1;
      if (next <= 0) delete b.outputBuffer[item];
      else b.outputBuffer[item] = next;
    }
  }

  private tryInsertItem(
    target: Building,
    item: ItemType,
    incomingDir: Direction
  ): boolean {
    if (target.type === 'hub') {
      this.world.addToHub(item, 1);
      return true;
    }

    if (isBeltType(target.type)) {
      // Un nastro non accetta oggetti dal proprio lato di uscita
      if (target.dir === oppositeDir(incomingDir)) return false;
      if (target.beltSlot) return false;
      target.beltSlot = { item, progress: 0 };
      return true;
    }

    if (target.type === 'splitter') {
      if (incomingDir !== target.dir) return false;
      if (target.beltSlot) return false;
      target.beltSlot = { item, progress: 0.5 };
      return true;
    }

    if (target.type === 'merger') {
      if (incomingDir === oppositeDir(target.dir)) return false;
      if (target.beltSlot) return false;
      target.beltSlot = { item, progress: 0.5 };
      return true;
    }

    if (CRAFTING_BUILDING_TYPES.has(target.type)) {
      // Le macchine accettano materiali da retro, sinistra e destra (fino a 3 nastri contemporanei)
      if (incomingDir === oppositeDir(target.dir)) return false;
      const recipe = target.recipeId ? RECIPES[target.recipeId] : undefined;
      if (!recipe) return false;

      const accepted = recipe.inputs.some((req) => req.item === item);
      if (!accepted) return false;

      target.inputBuffer ??= {};
      const current = target.inputBuffer[item] ?? 0;
      if (current >= MAX_BUFFER_PER_ITEM) return false;

      target.inputBuffer[item] = current + 1;
      return true;
    }

    return false;
  }
}