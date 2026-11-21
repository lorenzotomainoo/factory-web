import { Graphics } from 'pixi.js';
import { ITEM_META } from '../engine/recipes';
import {
  DIR_VECTORS,
  type Building,
  type Direction,
  type ResourceNode,
} from '../engine/types';
import type { World } from '../engine/World';
import { getBeltItemPosition, TILE_SIZE } from './GridRenderer';

export class BeltRenderer {
  readonly root = new Graphics();
  private readonly world: World;

  constructor(world: World) {
    this.world = world;
  }

  render(elapsedSec: number) {
    const g = this.root;
    g.clear();

    // 0. Luccichio leggero sulle vene libere (non coperte da un Miner)
    for (const node of this.world.nodes.values()) {
      if (!this.world.getBuilding(node.x, node.y)) {
        this.drawNodeSparkle(g, node, elapsedSec);
      }
    }

    for (const b of this.world.buildings.values()) {
      // 1. Freccia animata in uscita dal Miner
      if (b.type === 'miner') {
        this.drawMinerOutputPulse(g, b, elapsedSec);
      }

      // 2. Oggetti fisici che scorrono sui nastri (dritti e curvi)
      if (b.beltSlot) {
        const meta = ITEM_META[b.beltSlot.item];
        const pos = getBeltItemPosition(this.world, b, b.beltSlot.progress);

        g.roundRect(pos.x - 6, pos.y - 6, 12, 12, 3)
          .fill({ color: meta.color })
          .stroke({ width: 1.5, color: 0x09090b });
      }

      // 3. LED di stato individuale su ogni macchina elettrica
      if (
        b.type === 'miner' ||
        b.type === 'smelter' ||
        b.type === 'constructor' ||
        b.type === 'generator'
      ) {
        this.drawStatusLed(g, b);
      }
    }
  }

  private drawNodeSparkle(g: Graphics, node: ResourceNode, elapsedSec: number) {
    const seed = node.x * 1.7 + node.y * 2.9;
    const cycle = (elapsedSec * (node.purity === 'pure' ? 0.65 : 0.42) + seed) % 3;
    if (cycle > 1) return;

    const strength = Math.sin(cycle * Math.PI);
    const r = (node.purity === 'pure' ? 6.5 : 4.8) * strength;
    if (r < 0.8) return;

    const flip = (node.x * 7 + node.y * 13) % 2 === 0 ? 1 : -1;
    const sx = node.x * TILE_SIZE + TILE_SIZE / 2 + -2 * flip;
    const sy = node.y * TILE_SIZE + TILE_SIZE / 2 - 7;
    const color = node.purity === 'pure' ? 0xfef08a : 0xffffff;
    const thin = r * 0.28;

    // Stella a 4 punte sottile
    g.poly([
      sx, sy - r,
      sx + thin, sy - thin,
      sx + r, sy,
      sx + thin, sy + thin,
      sx, sy + r,
      sx - thin, sy + thin,
      sx - r, sy,
      sx - thin, sy - thin,
    ]).fill({ color, alpha: strength * (node.purity === 'pure' ? 0.95 : 0.7) });
  }

  private drawMinerOutputPulse(g: Graphics, b: Building, elapsedSec: number) {
    const cx = b.x * TILE_SIZE + TILE_SIZE / 2;
    const cy = b.y * TILE_SIZE + TILE_SIZE / 2;
    const v = DIR_VECTORS[b.dir];

    const speed = b.powered ? 1.5 : 0.75;
    const arrowColor = b.fuseBlown
      ? 0xf87171
      : b.powered
        ? 0xfef08a
        : 0xf59e0b;

    for (const phaseOffset of [0, 0.5]) {
      const t = (elapsedSec * speed + phaseOffset) % 1;
      const dist = TILE_SIZE * (0.28 + t * 0.52);
      const alpha = Math.sin(t * Math.PI) * (b.powered ? 1 : 0.8);
      if (alpha <= 0.05) continue;

      const ax = cx + v.dx * dist;
      const ay = cy + v.dy * dist;
      this.drawArrow(g, ax, ay, b.dir, 8.5, arrowColor, alpha);
    }
  }

  private drawArrow(
    g: Graphics,
    cx: number,
    cy: number,
    dir: Direction,
    size: number,
    color: number,
    alpha: number
  ) {
    const angle = (dir - 1) * (Math.PI / 2);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const rot = (x: number, y: number): [number, number] => [
      cx + x * cos - y * sin,
      cy + x * sin + y * cos,
    ];

    const [tx, ty] = rot(size, 0);
    const [lx, ly] = rot(-size * 0.55, -size * 0.7);
    const [rx, ry] = rot(-size * 0.55, size * 0.7);

    g.poly([tx, ty, lx, ly, rx, ry])
      .fill({ color, alpha })
      .stroke({ width: 1.5, color: 0x09090b, alpha: alpha * 0.9 });
  }

  private drawStatusLed(g: Graphics, b: Building) {
    const lx = b.x * TILE_SIZE + TILE_SIZE - 10;
    const ly = b.y * TILE_SIZE + 10;

    let color = 0x52525b;
    if (b.fuseBlown) {
      color = 0xef4444;
    } else if (b.powered) {
      if (b.type === 'generator' || (b.progress ?? 0) > 0) {
        color = 0x22c55e;
      } else {
        color = 0xfacc15;
      }
    }

    g.circle(lx, ly, 3.8)
      .fill({ color })
      .stroke({ width: 1.2, color: 0x09090b });
  }
}