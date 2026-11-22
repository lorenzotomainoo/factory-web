import { Container, Graphics } from 'pixi.js';
import { ITEM_META, RECIPES, RESOURCE_TO_ITEM } from '../engine/recipes';
import {
  BUILDING_DEFS,
  CRAFTING_BUILDING_TYPES,
  isMinerType,
} from '../engine/types';
import type { World } from '../engine/World';
import { getBeltItemPosition, TILE_SIZE } from './GridRenderer';

export class BeltRenderer {
  readonly root = new Container();
  private readonly itemLayer = new Graphics();
  private readonly statusLayer = new Graphics();
  private readonly world: World;

  constructor(world: World) {
    this.world = world;
    this.root.addChild(this.itemLayer, this.statusLayer);
  }

  render(elapsedSec: number) {
    const items = this.itemLayer;
    const status = this.statusLayer;
    items.clear();
    status.clear();

    const blinkOn = Math.floor(elapsedSec * 3.5) % 2 === 0;

    for (const b of this.world.buildings.values()) {
      // 1. Oggetti in transito su nastri (Mk.1 e Mk.2), splitter e merger
      if (b.beltSlot) {
        const pos = getBeltItemPosition(this.world, b, b.beltSlot.progress);
        const meta = ITEM_META[b.beltSlot.item];
        const size = 11;

        items
          .roundRect(pos.x - size / 2, pos.y - size / 2, size, size, 2.5)
          .fill({ color: meta.color })
          .stroke({ width: 1.5, color: 0x09090b });
      }

      const px = b.x * TILE_SIZE;
      const py = b.y * TILE_SIZE;
      const def = BUILDING_DEFS[b.type];

      // 2. LED stato per generatori (Biomassa, Carbone, Nucleare)
      if (def.powerMW < 0) {
        const ledColor = b.fuseBlown
          ? blinkOn
            ? 0xef4444
            : 0x7f1d1d
          : b.powered
            ? 0x4ade80
            : 0xf59e0b;

        status
          .circle(px + TILE_SIZE - 9, py + 9, 3.6)
          .fill({ color: ledColor })
          .stroke({ width: 1.2, color: 0x09090b });
        continue;
      }

      // 3. LED stato + barra progresso per Miner Mk.1 / Mk.2
      if (isMinerType(b.type)) {
        const node = this.world.getNode(b.x, b.y);
        const item = node ? RESOURCE_TO_ITEM[node.type] : undefined;
        const outCount = item ? (b.outputBuffer?.[item] ?? 0) : 0;
        const isWorking = Boolean(b.powered && !b.fuseBlown && outCount < 50);

        const ledColor =
          !b.powered || b.fuseBlown
            ? blinkOn
              ? 0xef4444
              : 0x7f1d1d
            : isWorking
              ? 0x4ade80
              : 0xfacc15;

        status
          .circle(px + TILE_SIZE - 9, py + 9, 3.5)
          .fill({ color: ledColor })
          .stroke({ width: 1.2, color: 0x09090b });

        if (isWorking && (b.progress ?? 0) > 0) {
          const pct = Math.min(1, b.progress ?? 0);
          status
            .rect(px + 8, py + TILE_SIZE - 6, TILE_SIZE - 16, 3)
            .fill({ color: 0x09090b, alpha: 0.75 });
          status
            .rect(px + 8, py + TILE_SIZE - 6, (TILE_SIZE - 16) * pct, 3)
            .fill({ color: 0x4ade80 });
        }
        continue;
      }

      // 4. LED stato + barra progresso per Smelter, Fonderia, Constructor, Assembler, Manufacturer
      if (CRAFTING_BUILDING_TYPES.has(b.type)) {
        const recipe = b.recipeId ? RECIPES[b.recipeId] : undefined;
        const hasInputs = recipe
          ? recipe.inputs.every(
              (req) => (b.inputBuffer?.[req.item] ?? 0) >= req.count
            )
          : false;
        const outCount = recipe
          ? (b.outputBuffer?.[recipe.output.item] ?? 0)
          : 0;
        const hasSpace = recipe
          ? outCount + recipe.output.count <= 50
          : false;

        const isWorking = Boolean(
          b.powered &&
            !b.fuseBlown &&
            ((b.progress ?? 0) > 0 || (hasInputs && hasSpace))
        );

        const ledColor =
          !b.powered || b.fuseBlown
            ? blinkOn
              ? 0xef4444
              : 0x7f1d1d
            : isWorking
              ? 0x4ade80
              : 0xfacc15;

        status
          .circle(px + TILE_SIZE - 9, py + 9, 3.5)
          .fill({ color: ledColor })
          .stroke({ width: 1.2, color: 0x09090b });

        if ((b.progress ?? 0) > 0 && b.powered && !b.fuseBlown) {
          const pct = Math.min(1, b.progress ?? 0);
          status
            .rect(px + 8, py + TILE_SIZE - 5.5, TILE_SIZE - 16, 3)
            .fill({ color: 0x09090b, alpha: 0.8 });
          status
            .rect(px + 8, py + TILE_SIZE - 5.5, (TILE_SIZE - 16) * pct, 3)
            .fill({ color: 0x38bdf8 });
        }
      }
    }
  }
}