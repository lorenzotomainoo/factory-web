import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { ITEM_META, RECIPES } from '../engine/recipes';
import type { World } from '../engine/World';
import {
  BUILDING_DEFS,
  CRAFTING_BUILDING_TYPES,
  DIR_VECTORS,
  isBeltType,
  isMinerType,
  MAX_WIRE_DISTANCE,
  type Building,
  type BuildingType,
  type Direction,
  type ResourceNode,
} from '../engine/types';

export const TILE_SIZE = 48;
const BELT_WIDTH = TILE_SIZE * 0.56;

function oppositeDir(dir: Direction): Direction {
  return ((dir + 2) % 4) as Direction;
}

function feedsInto(neighbor: Building | undefined, dirToTarget: Direction): boolean {
  if (!neighbor) return false;

  if (
    isBeltType(neighbor.type) ||
    isMinerType(neighbor.type) ||
    CRAFTING_BUILDING_TYPES.has(neighbor.type) ||
    neighbor.type === 'merger'
  ) {
    return neighbor.dir === dirToTarget;
  }

  if (neighbor.type === 'splitter') {
    return dirToTarget !== oppositeDir(neighbor.dir);
  }

  return false;
}

/** Determina da quale lato (N/E/S/O) il nastro in (x, y) riceve gli oggetti */
export function getBeltInputSide(
  world: World,
  x: number,
  y: number,
  outDir: Direction
): Direction {
  const back = oppositeDir(outDir);
  const left = ((outDir + 3) % 4) as Direction;
  const right = ((outDir + 1) % 4) as Direction;

  if (feedsInto(world.getNeighbor(x, y, back), outDir)) {
    return back;
  }

  const leftFeeds = feedsInto(world.getNeighbor(x, y, left), oppositeDir(left));
  const rightFeeds = feedsInto(world.getNeighbor(x, y, right), oppositeDir(right));

  if (leftFeeds && !rightFeeds) return left;
  if (rightFeeds && !leftFeeds) return right;

  return back;
}

/** Parametri geometrici dell'arco a 90° per un nastro curvo */
export function getBeltCurveGeometry(
  tx: number,
  ty: number,
  inSide: Direction,
  outDir: Direction
) {
  const R = TILE_SIZE / 2;
  const cx = tx * TILE_SIZE + R;
  const cy = ty * TILE_SIZE + R;
  const vIn = DIR_VECTORS[inSide];
  const vOut = DIR_VECTORS[outDir];

  const cornerX = cx + (vIn.dx + vOut.dx) * R;
  const cornerY = cy + (vIn.dy + vOut.dy) * R;

  const startAngle = Math.atan2(-vOut.dy, -vOut.dx);
  const endAngle = Math.atan2(-vIn.dy, -vIn.dx);

  let delta = endAngle - startAngle;
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta <= -Math.PI) delta += Math.PI * 2;

  return { cornerX, cornerY, radius: R, startAngle, delta };
}

/** Calcola la posizione (x, y) esatta di un oggetto su un nastro dritto o curvo */
export function getBeltItemPosition(
  world: World,
  b: Building,
  progress: number
): { x: number; y: number } {
  const R = TILE_SIZE / 2;
  const cx = b.x * TILE_SIZE + R;
  const cy = b.y * TILE_SIZE + R;

  if (!isBeltType(b.type)) {
    return { x: cx, y: cy };
  }

  const inSide = getBeltInputSide(world, b.x, b.y, b.dir);
  if (inSide === oppositeDir(b.dir)) {
    const v = DIR_VECTORS[b.dir];
    const offset = (progress - 0.5) * TILE_SIZE;
    return {
      x: cx + v.dx * offset,
      y: cy + v.dy * offset,
    };
  }

  const { cornerX, cornerY, radius, startAngle, delta } = getBeltCurveGeometry(
    b.x,
    b.y,
    inSide,
    b.dir
  );
  const angle = startAngle + delta * progress;
  return {
    x: cornerX + Math.cos(angle) * radius,
    y: cornerY + Math.sin(angle) * radius,
  };
}

// --- Utilità per la generazione della texture organica del terreno ---

type RGB = [number, number, number];

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function lerpColor(a: RGB, b: RGB, t: number): RGB {
  const k = clamp01(t);
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];
}

function fastHash(x: number, y: number): number {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function sampleField(field: Float32Array, size: number, gx: number, gy: number): number {
  const cx = Math.max(0, Math.min(size - 1.001, gx));
  const cy = Math.max(0, Math.min(size - 1.001, gy));
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const fx = cx - x0;
  const fy = cy - y0;

  const i00 = y0 * size + x0;
  const top = field[i00] + (field[i00 + 1] - field[i00]) * fx;
  const bot = field[i00 + size] + (field[i00 + size + 1] - field[i00 + size]) * fx;
  return top + (bot - top) * fy;
}

function computeBiomeColor(elev: number, moist: number, px: number, py: number): RGB {
  if (elev < 0.34) {
    const deep: RGB = [13, 46, 74];
    const shallow: RGB = [26, 94, 130];
    const foam: RGB = [115, 178, 198];
    const t = clamp01((elev - 0.16) / 0.18);
    let col = lerpColor(deep, shallow, t);
    if (elev > 0.326) {
      col = lerpColor(col, foam, (elev - 0.326) / 0.014);
    }
    const wave = Math.sin(px * 0.28 + py * 0.12) * 3.5;
    return [col[0] + wave, col[1] + wave, col[2] + wave * 1.2];
  }

  const desertCol: RGB = [184, 144, 84];
  const savannaCol: RGB = [132, 136, 72];
  const plainsCol: RGB = [74, 114, 62];
  const forestCol: RGB = [44, 78, 46];
  const beachCol: RGB = [188, 168, 122];
  const highlandCol: RGB = [98, 95, 88];
  const mountainCol: RGB = [74, 74, 80];
  const snowCol: RGB = [208, 218, 228];

  let col: RGB;
  if (moist < 0.37) {
    const dune = Math.sin(px * 0.16 + py * 0.09) * 8;
    col = [desertCol[0] + dune, desertCol[1] + dune * 0.85, desertCol[2] + dune * 0.5];
  } else if (moist < 0.45) {
    col = lerpColor(desertCol, savannaCol, (moist - 0.37) / 0.08);
  } else if (moist < 0.62) {
    col = lerpColor(savannaCol, plainsCol, (moist - 0.45) / 0.17);
  } else {
    col = lerpColor(plainsCol, forestCol, clamp01((moist - 0.62) / 0.16));
  }

  if (elev < 0.382) {
    const t = clamp01((elev - 0.34) / 0.042);
    col = lerpColor(beachCol, col, t * t);
  }

  if (elev > 0.56) {
    const t = clamp01((elev - 0.56) / 0.06);
    col = lerpColor(col, highlandCol, t);
  }
  if (elev > 0.665) {
    const t = clamp01((elev - 0.665) / 0.04);
    col = lerpColor(col, mountainCol, t);
  }
  if (elev > 0.755) {
    const t = clamp01((elev - 0.755) / 0.045);
    col = lerpColor(col, snowCol, t);
  }

  return col;
}

export class GridRenderer {
  readonly root = new Container();
  private readonly terrainSprite: Sprite;
  private readonly gridLayer = new Graphics();
  private readonly nodeLayer = new Container();
  private readonly buildingLayer = new Graphics();
  private readonly hubLayer = new Container();
  private readonly badgeLayer = new Container();
  private readonly badgeBgLayer = new Graphics();
  private readonly badgeTextLayer = new Container();
  private readonly wireLayer = new Graphics();
  private readonly ghostLayer = new Graphics();
  private readonly world: World;

  private readonly nodeIcons: Graphics[] = [];
  private hubIcon: Graphics | null = null;
  private currentNodeScale = 1;
  private currentHubScale = 1;

  constructor(world: World) {
    this.world = world;
    this.terrainSprite = this.buildTerrainSprite();
    this.badgeLayer.addChild(this.badgeBgLayer, this.badgeTextLayer);

    this.root.addChild(
      this.terrainSprite,
      this.gridLayer,
      this.nodeLayer,
      this.buildingLayer,
      this.hubLayer,
      this.badgeLayer,
      this.wireLayer,
      this.ghostLayer
    );

    this.drawGrid();
    this.drawNodes();
    this.drawBuildings();
  }

  setAltIconsVisible(visible: boolean) {
    this.badgeLayer.visible = visible;
  }

  /** Adatta griglia e dimensione icone di minerali + HUB in base allo zoom */
  setZoomLevel(scale: number) {
    const fade = clamp01((scale - 0.18) / 0.28);
    this.gridLayer.alpha = fade;
    this.gridLayer.visible = fade > 0.02;

    // Più lo zoom scende sotto 1, più minerali e HUB si ingrandiscono (e viceversa)
    const nodeScale = scale >= 1 ? 1 : Math.min(8.5, Math.pow(1 / scale, 0.88));
    const hubScale = scale >= 1 ? 1 : Math.min(9.5, Math.pow(1 / scale, 0.92));

    this.currentNodeScale = nodeScale;
    this.currentHubScale = hubScale;

    for (const icon of this.nodeIcons) {
      icon.scale.set(nodeScale);
    }
    if (this.hubIcon) {
      this.hubIcon.scale.set(hubScale);
    }
  }

  private buildTerrainSprite(): Sprite {
    const sub = 4;
    const w = this.world.size * sub;
    const h = this.world.size * sub;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(w, h);
    const data = img.data;

    const size = this.world.size;
    const elevField = this.world.elevation;
    const moistField = this.world.moisture;

    for (let py = 0; py < h; py++) {
      const gy = (py + 0.5) / sub - 0.5;
      for (let px = 0; px < w; px++) {
        const gx = (px + 0.5) / sub - 0.5;

        const elev = sampleField(elevField, size, gx, gy);
        const moist = sampleField(moistField, size, gx, gy);
        const [r0, g0, b0] = computeBiomeColor(elev, moist, px, py);

        let shade = 1;
        if (elev >= 0.34) {
          const eL = sampleField(elevField, size, gx - 0.7, gy);
          const eR = sampleField(elevField, size, gx + 0.7, gy);
          const eU = sampleField(elevField, size, gx, gy - 0.7);
          const eD = sampleField(elevField, size, gx, gy + 0.7);

          const slope = (eL - eR) + (eU - eD);
          const intensity = elev > 0.65 ? 5.2 : 2.6;
          shade = Math.max(0.68, Math.min(1.28, 1 + slope * intensity));
        }

        const grain = (fastHash(px, py) - 0.5) * 9;
        const idx = (py * w + px) * 4;
        data[idx] = Math.max(0, Math.min(255, r0 * shade + grain));
        data[idx + 1] = Math.max(0, Math.min(255, g0 * shade + grain));
        data[idx + 2] = Math.max(0, Math.min(255, b0 * shade + grain));
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);

    for (let ty = 0; ty < size; ty++) {
      for (let tx = 0; tx < size; tx++) {
        const biome = this.world.getTerrain(tx, ty);
        const h1 = fastHash(tx * 3 + 7, ty * 5 + 11);
        const cx = (tx + 0.5) * sub;
        const cy = (ty + 0.5) * sub;

        if (biome === 'forest' && h1 < 0.52 && !this.world.getNode(tx, ty)) {
          const ox = (fastHash(tx, ty + 19) - 0.5) * 2.2;
          const oy = (fastHash(tx + 31, ty) - 0.5) * 2.2;
          ctx.fillStyle = 'rgba(10, 22, 12, 0.42)';
          ctx.beginPath();
          ctx.arc(cx + ox + 0.7, cy + oy + 0.7, 1.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = h1 < 0.25 ? '#1f4222' : '#2d5730';
          ctx.beginPath();
          ctx.arc(cx + ox, cy + oy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (biome === 'mountain' && h1 < 0.28) {
          ctx.fillStyle = 'rgba(20, 20, 26, 0.35)';
          ctx.beginPath();
          ctx.moveTo(cx - 2, cy + 1.5);
          ctx.lineTo(cx, cy - 2);
          ctx.lineTo(cx + 2, cy + 1.5);
          ctx.closePath();
          ctx.fill();
        } else if (biome === 'desert' && h1 < 0.12 && !this.world.getNode(tx, ty)) {
          ctx.fillStyle = 'rgba(122, 88, 44, 0.38)';
          ctx.fillRect(cx - 1, cy - 0.6, 2.2, 1.2);
        }
      }
    }

    const texture = Texture.from(canvas);
    const sprite = new Sprite(texture);
    sprite.width = size * TILE_SIZE;
    sprite.height = size * TILE_SIZE;
    return sprite;
  }

  private drawGrid() {
    const g = this.gridLayer;
    g.clear();

    const total = this.world.size * TILE_SIZE;

    for (let i = 0; i <= this.world.size; i++) {
      const pos = i * TILE_SIZE;
      const isMajor = i % 8 === 0;
      const color = 0x09090b;
      const alpha = isMajor ? 0.26 : 0.11;
      const width = isMajor ? 1.5 : 1;

      g.moveTo(pos, 0).lineTo(pos, total).stroke({ width, color, alpha });
      g.moveTo(0, pos).lineTo(total, pos).stroke({ width, color, alpha });
    }

    g.rect(0, 0, total, total).stroke({
      width: 4,
      color: 0xf59e0b,
      alpha: 0.55,
    });
  }

  private drawNodes() {
    for (const child of this.nodeLayer.removeChildren()) {
      child.destroy();
    }
    this.nodeIcons.length = 0;

    for (const node of this.world.nodes.values()) {
      const icon = new Graphics();
      icon.position.set(
        node.x * TILE_SIZE + TILE_SIZE / 2,
        node.y * TILE_SIZE + TILE_SIZE / 2
      );
      this.drawResourceNodeLocal(icon, node);
      icon.scale.set(this.currentNodeScale);

      this.nodeLayer.addChild(icon);
      this.nodeIcons.push(icon);
    }
  }

  /** Disegna il giacimento centrato su (0, 0) così scala perfettamente sul centro della cella */
  private drawResourceNodeLocal(g: Graphics, node: ResourceNode) {
    const cx = 0;
    const cy = -1;
    const flip = (node.x * 7 + node.y * 13) % 2 === 0 ? 1 : -1;

    const poly = (pts: [number, number][]) =>
      pts.flatMap(([dx, dy]) => [cx + dx * flip, cy + dy]);

    const bedColor =
      node.type === 'coal'
        ? 0x273043
        : node.type === 'copper'
          ? 0x231917
          : node.type === 'limestone'
            ? 0x242320
            : node.type === 'caterium'
              ? 0x29220e
              : node.type === 'quartz'
                ? 0x2a1425
                : node.type === 'sulfur'
                  ? 0x26260f
                  : node.type === 'bauxite'
                    ? 0x2e1319
                    : node.type === 'uranium'
                      ? 0x0f2617
                      : 0x1b212e;

    g.poly(
      poly([
        [-18, -5],
        [-12, -16],
        [4, -18],
        [17, -10],
        [18, 5],
        [10, 15],
        [-7, 16],
        [-17, 8],
      ])
    )
      .fill({ color: bedColor, alpha: 0.92 })
      .stroke({
        width: node.purity === 'pure' ? 2 : 1.3,
        color:
          node.type === 'uranium'
            ? 0x4ade80
            : node.purity === 'pure'
              ? 0xfacc15
              : node.purity === 'normal'
                ? 0xe2e8f0
                : 0x71717a,
        alpha: node.purity === 'pure' || node.type === 'uranium' ? 0.85 : 0.55,
      });

    if (node.type === 'iron') {
      g.poly(
        poly([
          [-13, 6],
          [-11, -7],
          [-1, -13],
          [10, -7],
          [12, 4],
          [2, 10],
        ])
      )
        .fill({ color: 0x64748b })
        .stroke({ width: 1.4, color: 0x0f172a });

      g.poly(
        poly([
          [-10, -6],
          [-1, -12],
          [9, -6],
          [1, -1],
          [-6, 1],
        ])
      ).fill({ color: 0xcbd5e1 });

      g.poly(
        poly([
          [1, -1],
          [9, -6],
          [11, 3],
          [2, 9],
        ])
      ).fill({ color: 0x94a3b8 });

      g.poly(
        poly([
          [-7, -5],
          [-1, -10],
          [3, -6],
          [-3, -2],
        ])
      ).fill({ color: 0xf1f5f9, alpha: 0.85 });

      g.poly(
        poly([
          [-15, 7],
          [-11, 1],
          [-5, 5],
          [-8, 11],
        ])
      )
        .fill({ color: 0x94a3b8 })
        .stroke({ width: 1.1, color: 0x0f172a });
    } else if (node.type === 'copper') {
      g.poly(
        poly([
          [-13, 5],
          [-10, -9],
          [1, -13],
          [12, -5],
          [11, 7],
          [-1, 11],
        ])
      )
        .fill({ color: 0x9a3412 })
        .stroke({ width: 1.4, color: 0x1c0a04 });

      g.poly(
        poly([
          [-9, -8],
          [1, -12],
          [10, -4],
          [1, 1],
          [-7, -1],
        ])
      ).fill({ color: 0xea580c });

      g.poly(
        poly([
          [-6, -7],
          [1, -10],
          [6, -5],
          [0, -2],
        ])
      ).fill({ color: 0xfdba74, alpha: 0.85 });

      g.poly(
        poly([
          [2, 1],
          [10, -3],
          [9, 5],
          [3, 7],
        ])
      ).fill({ color: 0x14b8a6, alpha: 0.9 });

      g.poly(
        poly([
          [-12, 4],
          [-7, 0],
          [-4, 6],
          [-9, 9],
        ])
      ).fill({ color: 0x2dd4bf, alpha: 0.8 });
    } else if (node.type === 'limestone') {
      g.poly(
        poly([
          [-15, 5],
          [-11, -3],
          [9, -4],
          [15, 4],
          [9, 10],
          [-9, 10],
        ])
      )
        .fill({ color: 0x78716c })
        .stroke({ width: 1.3, color: 0x1c1917 });

      g.poly(
        poly([
          [-12, 1],
          [-9, -8],
          [7, -9],
          [12, -1],
          [6, 5],
          [-8, 5],
        ])
      )
        .fill({ color: 0xd6d3d1 })
        .stroke({ width: 1.2, color: 0x44403c });

      g.poly(
        poly([
          [-7, -5],
          [-3, -12],
          [7, -11],
          [9, -5],
          [1, -2],
        ])
      )
        .fill({ color: 0xf5f5f4 })
        .stroke({ width: 1, color: 0xa8a29e });

      g.moveTo(cx - 5 * flip, cy + 1)
        .lineTo(cx + 1 * flip, cy + 4)
        .lineTo(cx + 6 * flip, cy + 2)
        .stroke({ width: 1.2, color: 0x57534e });
    } else if (node.type === 'coal') {
      g.poly(
        poly([
          [-12, 7],
          [-13, -3],
          [-4, -14],
          [6, -11],
          [13, 0],
          [8, 9],
          [-3, 11],
        ])
      )
        .fill({ color: 0x09090b })
        .stroke({ width: 1.5, color: 0x64748b });

      g.poly(
        poly([
          [-11, -2],
          [-4, -13],
          [4, -10],
          [-2, -1],
        ])
      ).fill({ color: 0x334155 });

      g.poly(
        poly([
          [-4, -12],
          [3, -9],
          [-1, -4],
          [-7, -5],
        ])
      ).fill({ color: 0x94a3b8, alpha: 0.7 });

      g.poly(
        poly([
          [1, 0],
          [11, 0],
          [7, 8],
          [-1, 9],
        ])
      ).fill({ color: 0x1e293b });

      g.poly(
        poly([
          [-15, 6],
          [-10, 1],
          [-6, 7],
          [-11, 11],
        ])
      )
        .fill({ color: 0x1e293b })
        .stroke({ width: 1.1, color: 0x64748b });
    } else if (node.type === 'caterium') {
      g.poly(
        poly([
          [-14, 6],
          [-11, -8],
          [0, -13],
          [12, -6],
          [12, 6],
          [0, 11],
        ])
      )
        .fill({ color: 0x422006 })
        .stroke({ width: 1.4, color: 0x1c1004 });

      g.poly(
        poly([
          [-10, -5],
          [-1, -12],
          [9, -5],
          [3, 2],
          [-6, 1],
        ])
      ).fill({ color: 0xeab308 });

      g.poly(
        poly([
          [-6, -6],
          [0, -10],
          [5, -5],
          [-1, -2],
        ])
      ).fill({ color: 0xfef08a, alpha: 0.92 });

      g.poly(
        poly([
          [2, 2],
          [10, -2],
          [9, 6],
          [2, 8],
        ])
      ).fill({ color: 0xfacc15 });

      g.poly(
        poly([
          [-13, 5],
          [-7, 1],
          [-4, 8],
          [-10, 10],
        ])
      ).fill({ color: 0xfde047 });
    } else if (node.type === 'quartz') {
      g.poly(
        poly([
          [-13, 8],
          [-14, -4],
          [-7, -14],
          [-2, -3],
          [-4, 8],
        ])
      )
        .fill({ color: 0xdb2777 })
        .stroke({ width: 1.2, color: 0x500724 });

      g.poly(
        poly([
          [-4, 9],
          [-3, -6],
          [3, -15],
          [9, -5],
          [7, 9],
        ])
      )
        .fill({ color: 0xf472b6 })
        .stroke({ width: 1.3, color: 0x831843 });

      g.poly(
        poly([
          [0, -13],
          [3, -14],
          [6, -5],
          [2, -2],
        ])
      ).fill({ color: 0xfce7f3, alpha: 0.9 });

      g.poly(
        poly([
          [5, 8],
          [8, -2],
          [14, -7],
          [14, 5],
        ])
      )
        .fill({ color: 0xf9a8d4 })
        .stroke({ width: 1.1, color: 0x831843 });
    } else if (node.type === 'sulfur') {
      g.poly(
        poly([
          [-14, 6],
          [-10, -8],
          [2, -13],
          [13, -5],
          [12, 7],
          [-2, 10],
        ])
      )
        .fill({ color: 0xa16207 })
        .stroke({ width: 1.4, color: 0x262605 });

      g.poly(
        poly([
          [-10, -5],
          [1, -11],
          [10, -4],
          [3, 4],
          [-8, 3],
        ])
      ).fill({ color: 0xded82a });

      g.poly(
        poly([
          [-5, -6],
          [2, -9],
          [6, -3],
          [-2, -1],
        ])
      ).fill({ color: 0xfef9c3, alpha: 0.9 });

      g.poly(
        poly([
          [-13, 6],
          [-7, 2],
          [-3, 9],
          [-10, 10],
        ])
      ).fill({ color: 0xfde047 });
    } else if (node.type === 'bauxite') {
      g.poly(
        poly([
          [-15, 6],
          [-12, -6],
          [0, -12],
          [13, -5],
          [14, 6],
          [1, 10],
        ])
      )
        .fill({ color: 0x881337 })
        .stroke({ width: 1.4, color: 0x2b0712 });

      g.poly(
        poly([
          [-11, -3],
          [-2, -10],
          [10, -4],
          [6, 3],
          [-8, 4],
        ])
      ).fill({ color: 0xe11d48 });

      g.poly(
        poly([
          [-6, -5],
          [0, -9],
          [6, -4],
          [0, -1],
        ])
      ).fill({ color: 0xfda4af, alpha: 0.85 });

      g.poly(
        poly([
          [-12, 6],
          [-5, 2],
          [3, 6],
          [-6, 10],
        ])
      ).fill({ color: 0xfb7185 });
    } else if (node.type === 'uranium') {
      g.poly(
        poly([
          [-14, 6],
          [-12, -7],
          [-1, -13],
          [11, -7],
          [13, 5],
          [2, 10],
        ])
      )
        .fill({ color: 0x14532d })
        .stroke({ width: 1.5, color: 0x4ade80 });

      g.poly(
        poly([
          [-9, 3],
          [-7, -10],
          [-2, -13],
          [1, -3],
          [-3, 5],
        ])
      ).fill({ color: 0x22c55e });

      g.poly(
        poly([
          [1, 6],
          [3, -8],
          [9, -11],
          [11, 2],
          [5, 7],
        ])
      ).fill({ color: 0x4ade80 });

      g.poly(
        poly([
          [-5, -7],
          [-2, -11],
          [0, -4],
          [-3, -2],
        ])
      ).fill({ color: 0xdcfce7, alpha: 0.9 });

      g.circle(cx, cy, 4).fill({ color: 0x86efac, alpha: 0.45 });
    }

    const pips =
      node.purity === 'pure' ? 3 : node.purity === 'normal' ? 2 : 1;
    const pipColor =
      node.purity === 'pure'
        ? 0xfacc15
        : node.purity === 'normal'
          ? 0xe2e8f0
          : 0xa1a1aa;

    const barW = pips * 7 + 6;
    const barY = TILE_SIZE / 2 - 9;

    g.roundRect(-barW / 2, barY - 3.5, barW, 7, 3.5)
      .fill({ color: 0x09090b, alpha: 0.85 })
      .stroke({ width: 1, color: pipColor, alpha: 0.5 });

    for (let i = 0; i < pips; i++) {
      const px = (i - (pips - 1) / 2) * 7;
      g.circle(px, barY, 2).fill({ color: pipColor });
    }
  }

  drawBuildings() {
    const g = this.buildingLayer;
    g.clear();

    for (const child of this.hubLayer.removeChildren()) {
      child.destroy();
    }
    this.hubIcon = null;

    for (const b of this.world.buildings.values()) {
      if (b.type === 'hub') {
        const hub = new Graphics();
        const def = BUILDING_DEFS.hub;
        const half = TILE_SIZE / 2;
        const pad = 2;

        hub
          .roundRect(-half + pad, -half + pad, TILE_SIZE - pad * 2, TILE_SIZE - pad * 2, 6)
          .fill({ color: def.color })
          .stroke({ width: 2, color: def.accent });
        hub
          .roundRect(-half + 11, -half + 11, TILE_SIZE - 22, TILE_SIZE - 22, 3)
          .fill({ color: 0x18181b });
        hub.circle(0, 0, 5).fill({ color: 0xfef08a });

        hub.position.set(b.x * TILE_SIZE + half, b.y * TILE_SIZE + half);
        hub.scale.set(this.currentHubScale);

        this.hubLayer.addChild(hub);
        this.hubIcon = hub;
        continue;
      }

      this.drawBuildingShape(g, b.type, b.x, b.y, b.dir, 1);
    }

    this.drawRecipeBadges();
    this.drawWires();
  }

  /** Disegna il badge Alt-Mode del prodotto sopra tutte le macchine di crafting */
  private drawRecipeBadges() {
    const bg = this.badgeBgLayer;
    bg.clear();

    for (const child of this.badgeTextLayer.removeChildren()) {
      child.destroy();
    }

    for (const b of this.world.buildings.values()) {
      if (!CRAFTING_BUILDING_TYPES.has(b.type)) continue;
      if (!b.recipeId) continue;

      const recipe = RECIPES[b.recipeId];
      if (!recipe) continue;

      const outItem = recipe.output.item;
      const meta = ITEM_META[outItem];

      const bx = b.x * TILE_SIZE + 15;
      const by = b.y * TILE_SIZE + TILE_SIZE - 13;

      bg.roundRect(bx - 10, by - 7.5, 20, 15, 4)
        .fill({ color: 0x09090b, alpha: 0.9 })
        .stroke({ width: 1.5, color: meta.color, alpha: 0.95 });

      const label = new Text({
        text: meta.badge,
        style: {
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 9.5,
          fontWeight: 'bold',
          fill: meta.hex,
        },
      });
      label.anchor.set(0.5);
      label.position.set(bx, by);
      this.badgeTextLayer.addChild(label);
    }
  }

  drawWires() {
    const g = this.wireLayer;
    g.clear();

    for (const w of this.world.wires) {
      const a = this.world.getBuildingById(w.fromId);
      const b = this.world.getBuildingById(w.toId);
      if (!a || !b) continue;

      const ax = a.x * TILE_SIZE + TILE_SIZE / 2;
      const ay = a.y * TILE_SIZE + TILE_SIZE / 2;
      const bx = b.x * TILE_SIZE + TILE_SIZE / 2;
      const by = b.y * TILE_SIZE + TILE_SIZE / 2;

      const dist = Math.hypot(bx - ax, by - ay);
      const sag = Math.min(28, dist * 0.12);
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2 + sag;

      const isBlown = a.fuseBlown || b.fuseBlown;
      const isPowered = a.powered && b.powered;
      const color = isBlown ? 0xef4444 : isPowered ? 0xfacc15 : 0x71717a;

      g.moveTo(ax, ay + 2)
        .quadraticCurveTo(mx, my + 4, bx, by + 2)
        .stroke({ width: 3.5, color: 0x000000, alpha: 0.4 });

      g.moveTo(ax, ay)
        .quadraticCurveTo(mx, my, bx, by)
        .stroke({ width: 2.2, color, alpha: 0.95 });

      g.circle(ax, ay, 3.2).fill({ color });
      g.circle(bx, by, 3.2).fill({ color });
    }
  }

  drawGhost(
    tile: { x: number; y: number } | null,
    selectedBuilding: BuildingType | null,
    rotation: Direction,
    dismantleMode: boolean,
    wireMode = false,
    wireStartId: string | null = null
  ) {
    const g = this.ghostLayer;
    g.clear();

    if (wireMode) {
      const startB = wireStartId
        ? this.world.getBuildingById(wireStartId)
        : undefined;

      if (startB) {
        const sx = startB.x * TILE_SIZE + TILE_SIZE / 2;
        const sy = startB.y * TILE_SIZE + TILE_SIZE / 2;

        g.circle(sx, sy, MAX_WIRE_DISTANCE * TILE_SIZE)
          .fill({ color: 0xfacc15, alpha: 0.06 })
          .stroke({ width: 1.8, color: 0xfacc15, alpha: 0.65 });

        g.circle(sx, sy, 9).stroke({ width: 2.5, color: 0xfacc15 });

        if (tile && this.world.inBounds(tile.x, tile.y)) {
          const tx = tile.x * TILE_SIZE + TILE_SIZE / 2;
          const ty = tile.y * TILE_SIZE + TILE_SIZE / 2;
          const targetB = this.world.getBuilding(tile.x, tile.y);
          const dist = Math.hypot(tile.x - startB.x, tile.y - startB.y);
          const canLink = targetB
            ? this.world.canConnect(startB.id, targetB.id)
            : false;

          const lineColor = canLink
            ? 0x22c55e
            : dist > MAX_WIRE_DISTANCE
              ? 0xef4444
              : 0xfacc15;

          g.moveTo(sx, sy)
            .lineTo(tx, ty)
            .stroke({ width: 2.5, color: lineColor, alpha: 0.95 });
        }
      }

      if (tile && this.world.inBounds(tile.x, tile.y)) {
        const hoveredB = this.world.getBuilding(tile.x, tile.y);
        const px = tile.x * TILE_SIZE;
        const py = tile.y * TILE_SIZE;

        if (hoveredB && BUILDING_DEFS[hoveredB.type].maxConnections > 0) {
          const used = this.world.getConnectionCount(hoveredB.id);
          const max = BUILDING_DEFS[hoveredB.type].maxConnections;
          const ok = startB
            ? this.world.canConnect(startB.id, hoveredB.id)
            : used < max;

          g.roundRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4, 6)
            .fill({ color: ok ? 0x22c55e : 0xef4444, alpha: 0.25 })
            .stroke({ width: 2.5, color: ok ? 0x4ade80 : 0xf87171 });
        } else {
          g.rect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2).stroke({
            width: 1.5,
            color: 0xfacc15,
            alpha: 0.55,
          });
        }
      }
      return;
    }

    if (!tile || !this.world.inBounds(tile.x, tile.y)) return;

    const px = tile.x * TILE_SIZE;
    const py = tile.y * TILE_SIZE;

    if (dismantleMode) {
      const target = this.world.getBuilding(tile.x, tile.y);
      const canRemove = Boolean(target && target.type !== 'hub');
      g.rect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4)
        .fill({ color: canRemove ? 0xef4444 : 0x71717a, alpha: 0.35 })
        .stroke({
          width: 2.5,
          color: canRemove ? 0xf87171 : 0x71717a,
          alpha: 0.95,
        });
      return;
    }

    if (!selectedBuilding) {
      g.rect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2).stroke({
        width: 1.8,
        color: 0xffffff,
        alpha: 0.55,
      });
      return;
    }

    const valid = this.world.canPlace(selectedBuilding, tile.x, tile.y);
    const ghostColor = valid ? 0x22c55e : 0xef4444;
    const effectiveDir = this.world.getPlacementDirection(
      selectedBuilding,
      tile.x,
      tile.y,
      rotation
    );
    const upgradingInPlace = this.world.canUpgradeInPlace(
      selectedBuilding,
      tile.x,
      tile.y
    );

    if (upgradingInPlace) {
      g.roundRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2, 7).stroke({
        width: 2.5,
        color: valid ? 0x4ade80 : 0xf87171,
        alpha: 0.95,
      });
    }

    this.drawBuildingShape(
      g,
      selectedBuilding,
      tile.x,
      tile.y,
      effectiveDir,
      0.62,
      ghostColor
    );

    if (
      upgradingInPlace ||
      isMinerType(selectedBuilding) ||
      CRAFTING_BUILDING_TYPES.has(selectedBuilding)
    ) {
      const v = DIR_VECTORS[effectiveDir];
      const outX =
        tile.x * TILE_SIZE + TILE_SIZE / 2 + v.dx * (TILE_SIZE * 0.72);
      const outY =
        tile.y * TILE_SIZE + TILE_SIZE / 2 + v.dy * (TILE_SIZE * 0.72);
      this.drawArrow(
        g,
        outX,
        outY,
        effectiveDir,
        11,
        valid ? 0xfef08a : 0xf87171,
        0.95
      );
    }
  }

  private drawBelt(
    g: Graphics,
    type: BuildingType,
    tx: number,
    ty: number,
    outDir: Direction,
    fillCol: number,
    accentCol: number,
    alpha: number
  ) {
    const px = tx * TILE_SIZE;
    const py = ty * TILE_SIZE;
    const cx = px + TILE_SIZE / 2;
    const cy = py + TILE_SIZE / 2;
    const halfW = BELT_WIDTH / 2;
    const isMk2 = type === 'belt_mk2';
    const railCol = isMk2 ? 0x0c4a6e : 0x18181b;

    const inSide = getBeltInputSide(this.world, tx, ty, outDir);

    if (inSide === oppositeDir(outDir)) {
      const isVertical = outDir === 0 || outDir === 2;
      const bw = isVertical ? BELT_WIDTH : TILE_SIZE;
      const bh = isVertical ? TILE_SIZE : BELT_WIDTH;

      g.rect(cx - bw / 2, cy - bh / 2, bw, bh).fill({ color: fillCol, alpha });

      if (isVertical) {
        g.moveTo(cx - halfW, py)
          .lineTo(cx - halfW, py + TILE_SIZE)
          .stroke({ width: 2, color: railCol, alpha });
        g.moveTo(cx + halfW, py)
          .lineTo(cx + halfW, py + TILE_SIZE)
          .stroke({ width: 2, color: railCol, alpha });
      } else {
        g.moveTo(px, cy - halfW)
          .lineTo(px + TILE_SIZE, cy - halfW)
          .stroke({ width: 2, color: railCol, alpha });
        g.moveTo(px, cy + halfW)
          .lineTo(px + TILE_SIZE, cy + halfW)
          .stroke({ width: 2, color: railCol, alpha });
      }

      if (isMk2) {
        const v = DIR_VECTORS[outDir];
        this.drawArrow(g, cx - v.dx * 7, cy - v.dy * 7, outDir, 7, accentCol, alpha);
        this.drawArrow(g, cx + v.dx * 7, cy + v.dy * 7, outDir, 7, accentCol, alpha);
      } else {
        this.drawArrow(g, cx, cy, outDir, 8.5, accentCol, alpha);
      }
      return;
    }

    const { cornerX, cornerY, radius, startAngle, delta } = getBeltCurveGeometry(
      tx,
      ty,
      inSide,
      outDir
    );

    const rInner = radius - halfW;
    const rOuter = radius + halfW;
    const steps = 12;

    const outerPts: number[] = [];
    const innerPts: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const a = startAngle + (delta * i) / steps;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      outerPts.push(cornerX + cos * rOuter, cornerY + sin * rOuter);
      innerPts.push(cornerX + cos * rInner, cornerY + sin * rInner);
    }

    const polyPts: number[] = [...outerPts];
    for (let i = steps; i >= 0; i--) {
      polyPts.push(innerPts[i * 2], innerPts[i * 2 + 1]);
    }
    g.poly(polyPts).fill({ color: fillCol, alpha });

    g.moveTo(outerPts[0], outerPts[1]);
    for (let i = 1; i <= steps; i++) {
      g.lineTo(outerPts[i * 2], outerPts[i * 2 + 1]);
    }
    g.stroke({ width: 2, color: railCol, alpha });

    g.moveTo(innerPts[0], innerPts[1]);
    for (let i = 1; i <= steps; i++) {
      g.lineTo(innerPts[i * 2], innerPts[i * 2 + 1]);
    }
    g.stroke({ width: 2, color: railCol, alpha });

    const drawCurveArrow = (t: number, size: number) => {
      const angle = startAngle + delta * t;
      const ax = cornerX + Math.cos(angle) * radius;
      const ay = cornerY + Math.sin(angle) * radius;
      const tangent = angle + (delta > 0 ? Math.PI / 2 : -Math.PI / 2);
      this.drawArrowAtAngle(g, ax, ay, tangent, size, accentCol, alpha);
    };

    if (isMk2) {
      drawCurveArrow(0.32, 6.8);
      drawCurveArrow(0.68, 6.8);
    } else {
      drawCurveArrow(0.5, 8.5);
    }
  }

  private drawBuildingShape(
    g: Graphics,
    type: BuildingType,
    tx: number,
    ty: number,
    dir: Direction,
    alpha: number,
    tintOverride?: number
  ) {
    const def = BUILDING_DEFS[type];
    const px = tx * TILE_SIZE;
    const py = ty * TILE_SIZE;
    const cx = px + TILE_SIZE / 2;
    const cy = py + TILE_SIZE / 2;
    const fillCol = tintOverride ?? def.color;
    const accentCol = tintOverride ?? def.accent;

    if (isBeltType(type)) {
      this.drawBelt(g, type, tx, ty, dir, fillCol, accentCol, alpha);
      return;
    }

    if (type === 'pole') {
      g.circle(cx, cy, 13)
        .fill({ color: fillCol, alpha })
        .stroke({ width: 2.2, color: accentCol, alpha });
      g.circle(cx, cy, 5.5).fill({ color: accentCol, alpha });
      return;
    }

    const pad = type === 'hub' || type === 'manufacturer' || type === 'nuclear_gen' ? 2 : 5;
    g.roundRect(px + pad, py + pad, TILE_SIZE - pad * 2, TILE_SIZE - pad * 2, 6)
      .fill({ color: fillCol, alpha })
      .stroke({ width: 2, color: accentCol, alpha });

    if (type === 'hub') {
      g.roundRect(px + 11, py + 11, TILE_SIZE - 22, TILE_SIZE - 22, 3).fill({
        color: 0x18181b,
        alpha,
      });
      g.circle(cx, cy, 5).fill({ color: 0xfef08a, alpha });
    } else if (isMinerType(type)) {
      const v = DIR_VECTORS[dir];
      const bx = cx + v.dx * (TILE_SIZE / 2 - 4);
      const by = cy + v.dy * (TILE_SIZE / 2 - 4);
      const isVert = dir === 0 || dir === 2;
      g.rect(
        bx - (isVert ? 8 : 4),
        by - (isVert ? 4 : 8),
        isVert ? 16 : 8,
        isVert ? 8 : 16
      ).fill({ color: 0x18181b, alpha });

      g.circle(cx, cy, 10).fill({ color: 0x18181b, alpha: alpha * 0.88 });
      if (type === 'miner_mk2') {
        g.circle(cx, cy, 7.5).stroke({ width: 1.8, color: accentCol, alpha });
        g.circle(cx, cy, 3.5).fill({ color: 0xffffff, alpha });
      } else {
        g.circle(cx, cy, 4).fill({ color: accentCol, alpha });
      }
    } else if (type === 'coal_gen') {
      g.circle(cx - 7, cy - 5, 5.5)
        .fill({ color: 0x18181b, alpha })
        .stroke({ width: 1.5, color: accentCol, alpha });
      g.circle(cx + 7, cy - 5, 5.5)
        .fill({ color: 0x18181b, alpha })
        .stroke({ width: 1.5, color: accentCol, alpha });
      g.roundRect(cx - 10, cy + 4, 20, 7, 2).fill({ color: accentCol, alpha: alpha * 0.9 });
    } else if (type === 'nuclear_gen') {
      g.circle(cx, cy, 13)
        .fill({ color: 0x052e16, alpha })
        .stroke({ width: 2, color: accentCol, alpha });
      g.circle(cx, cy, 6).fill({ color: 0x86efac, alpha });
      g.circle(cx, cy, 2.5).fill({ color: 0x052e16, alpha });
    } else if (type === 'foundry' || type === 'assembler' || type === 'manufacturer') {
      g.roundRect(px + 9, py + 9, TILE_SIZE - 18, TILE_SIZE - 18, 4).fill({
        color: 0x09090b,
        alpha: alpha * 0.32,
      });
      this.drawArrow(g, cx, cy, dir, 10.5, accentCol, alpha);

      const dotCount = type === 'manufacturer' ? 3 : 2;
      for (let i = 0; i < dotCount; i++) {
        const dx = (i - (dotCount - 1) / 2) * 7;
        g.circle(cx + dx, py + 9.5, 2).fill({ color: accentCol, alpha });
      }
    } else {
      this.drawArrow(g, cx, cy, dir, 11, accentCol, alpha);
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
    this.drawArrowAtAngle(g, cx, cy, angle, size, color, alpha);
  }

  private drawArrowAtAngle(
    g: Graphics,
    cx: number,
    cy: number,
    angle: number,
    size: number,
    color: number,
    alpha: number
  ) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const rot = (x: number, y: number): [number, number] => [
      cx + x * cos - y * sin,
      cy + x * sin + y * cos,
    ];

    const [tx, ty] = rot(size, 0);
    const [lx, ly] = rot(-size * 0.55, -size * 0.65);
    const [rx, ry] = rot(-size * 0.55, size * 0.65);

    g.poly([tx, ty, lx, ly, rx, ry]).fill({ color, alpha });
  }
}