import {
  BUILDING_DEFS,
  CRAFTING_BUILDING_TYPES,
  DIR_VECTORS,
  isBeltType,
  isMinerType,
  MAX_WIRE_DISTANCE,
  STARTER_INVENTORY,
  TERRAIN_META,
  WIRE_COST,
  type BeltSlot,
  type Building,
  type BuildingCost,
  type BuildingType,
  type Direction,
  type ItemType,
  type PowerStats,
  type PowerWire,
  type Purity,
  type ResourceNode,
  type ResourceType,
  type TerrainType,
} from './types';
import {
  getDefaultRecipe,
  getRecipesForBuilding,
  ITEM_META,
  RECIPES,
  RESOURCE_TO_ITEM,
} from './recipes';

const BELT_REPLACEABLE_TYPES = new Set<BuildingType>([
  'smelter',
  'foundry',
  'constructor',
  'assembler',
  'manufacturer',
  'splitter',
  'merger',
]);

export interface WorldSaveData {
  size: number;
  seed: number;
  buildings: Building[];
  wires: PowerWire[];
  hubInventory: Partial<Record<ItemType, number>>;
  totalDeliveredToHub: number;
}

function hash2D(ix: number, iy: number, seed: number): number {
  let n =
    Math.imul(ix, 374761393) +
    Math.imul(iy, 668265263) +
    Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smoothstep(x - ix);
  const fy = smoothstep(y - iy);

  const v00 = hash2D(ix, iy, seed);
  const v10 = hash2D(ix + 1, iy, seed);
  const v01 = hash2D(ix, iy + 1, seed);
  const v11 = hash2D(ix + 1, iy + 1, seed);

  const top = v00 + (v10 - v00) * fx;
  const bottom = v01 + (v11 - v01) * fx;
  return top + (bottom - top) * fy;
}

function fbm(x: number, y: number, octaves: number, seed: number): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;

  for (let i = 0; i < octaves; i++) {
    value += valueNoise(x * freq, y * freq, seed + i * 97) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.02;
  }

  return value / norm;
}

export function classifyTerrain(elev: number, moist: number): TerrainType {
  if (elev < 0.27) return 'deep_water';
  if (elev < 0.34) return 'water';
  if (elev < 0.375) return 'beach';
  if (elev > 0.77) return 'snow';
  if (elev > 0.68) return 'mountain';
  if (elev > 0.59) return 'highland';

  if (moist < 0.37) return 'desert';
  if (moist < 0.45) return 'savanna';
  if (moist > 0.62) return 'forest';
  return 'plains';
}

export class World {
  readonly size: number;
  readonly seed: number;
  readonly elevation: Float32Array;
  readonly moisture: Float32Array;
  readonly terrain: TerrainType[];
  readonly nodes: Map<string, ResourceNode> = new Map();
  readonly buildings: Map<string, Building> = new Map();
  wires: PowerWire[] = [];
  readonly hubInventory: Partial<Record<ItemType, number>> = {};
  totalDeliveredToHub = 0;
  powerStats: PowerStats = { producedMW: 0, consumedMW: 0, fuseBlown: false };
  private nextId = 1;
  private nextWireId = 1;

  constructor(size = 256, seed = 4207) {
    this.size = size;
    this.seed = seed;
    this.elevation = new Float32Array(size * size);
    this.moisture = new Float32Array(size * size);
    this.terrain = new Array<TerrainType>(size * size);

    this.generateTerrain();
    this.generateStarterMap();
  }

  static key(x: number, y: number): string {
    return `${x},${y}`;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.size && y < this.size;
  }

  getTerrain(x: number, y: number): TerrainType {
    if (!this.inBounds(x, y)) return 'deep_water';
    return this.terrain[y * this.size + x];
  }

  isBuildableTerrain(x: number, y: number): boolean {
    return TERRAIN_META[this.getTerrain(x, y)].buildable;
  }

  getNode(x: number, y: number): ResourceNode | undefined {
    return this.nodes.get(World.key(x, y));
  }

  getBuilding(x: number, y: number): Building | undefined {
    return this.buildings.get(World.key(x, y));
  }

  getBuildingById(id: string): Building | undefined {
    for (const b of this.buildings.values()) {
      if (b.id === id) return b;
    }
    return undefined;
  }

  getNeighbor(x: number, y: number, dir: Direction): Building | undefined {
    const v = DIR_VECTORS[dir];
    return this.getBuilding(x + v.dx, y + v.dy);
  }

  // --- Salvataggio & Caricamento ---

  serialize(): WorldSaveData {
    return {
      size: this.size,
      seed: this.seed,
      buildings: Array.from(this.buildings.values()).map((b) => ({
        ...b,
        inputBuffer: b.inputBuffer ? { ...b.inputBuffer } : undefined,
        outputBuffer: b.outputBuffer ? { ...b.outputBuffer } : undefined,
        beltSlot: b.beltSlot ? { ...b.beltSlot } : null,
      })),
      wires: this.wires.map((w) => ({ ...w })),
      hubInventory: { ...this.hubInventory },
      totalDeliveredToHub: this.totalDeliveredToHub,
    };
  }

  loadState(data: WorldSaveData): boolean {
    if (!data || !Array.isArray(data.buildings) || !Array.isArray(data.wires)) {
      return false;
    }
    if (data.size !== this.size || data.seed !== this.seed) {
      return false;
    }

    this.buildings.clear();
    let maxBuildingNum = 0;

    for (const b of data.buildings) {
      if (!this.inBounds(b.x, b.y) || !BUILDING_DEFS[b.type]) continue;

      this.buildings.set(World.key(b.x, b.y), {
        ...b,
        inputBuffer: b.inputBuffer ? { ...b.inputBuffer } : {},
        outputBuffer: b.outputBuffer ? { ...b.outputBuffer } : {},
        beltSlot: b.beltSlot ? { ...b.beltSlot } : null,
        progress: b.progress ?? 0,
        rrIndex: b.rrIndex ?? 0,
        powered: false,
        fuseBlown: false,
      });

      const match = /^b_(\d+)$/.exec(b.id);
      if (match) {
        maxBuildingNum = Math.max(maxBuildingNum, Number(match[1]));
      }
    }

    const c = Math.floor(this.size / 2);
    if (!this.getBuilding(c, c)) {
      this.buildings.set(World.key(c, c), {
        id: 'hub_main',
        type: 'hub',
        x: c,
        y: c,
        dir: 1,
      });
    }

    let maxWireNum = 0;
    this.wires = data.wires
      .filter(
        (w) =>
          Boolean(this.getBuildingById(w.fromId)) &&
          Boolean(this.getBuildingById(w.toId))
      )
      .map((w) => {
        const match = /^w_(\d+)$/.exec(w.id);
        if (match) {
          maxWireNum = Math.max(maxWireNum, Number(match[1]));
        }
        return { ...w };
      });

    for (const key of Object.keys(this.hubInventory) as ItemType[]) {
      delete this.hubInventory[key];
    }
    if (data.hubInventory) {
      for (const [item, count] of Object.entries(data.hubInventory)) {
        if (typeof count === 'number' && count > 0) {
          this.hubInventory[item as ItemType] = count;
        }
      }
    }

    this.totalDeliveredToHub =
      typeof data.totalDeliveredToHub === 'number'
        ? data.totalDeliveredToHub
        : 0;
    this.nextId = maxBuildingNum + 1;
    this.nextWireId = maxWireNum + 1;
    return true;
  }

  // --- Economia Risorse (Costi & Rimborsi 100%) ---

  getItemCount(item: ItemType): number {
    return this.hubInventory[item] ?? 0;
  }

  canAfford(cost: BuildingCost[]): boolean {
    for (const c of cost) {
      if (this.getItemCount(c.item) < c.count) return false;
    }
    return true;
  }

  private canAffordWithRefund(
    cost: BuildingCost[],
    refund: BuildingCost[]
  ): boolean {
    const refundMap = new Map<ItemType, number>();
    for (const r of refund) {
      refundMap.set(r.item, (refundMap.get(r.item) ?? 0) + r.count);
    }
    for (const c of cost) {
      const available =
        this.getItemCount(c.item) + (refundMap.get(c.item) ?? 0);
      if (available < c.count) return false;
    }
    return true;
  }

  private addInventory(item: ItemType, count: number) {
    if (count <= 0) return;
    this.hubInventory[item] = (this.hubInventory[item] ?? 0) + count;
  }

  spendCost(cost: BuildingCost[]): boolean {
    if (!this.canAfford(cost)) return false;
    for (const c of cost) {
      const next = this.getItemCount(c.item) - c.count;
      if (next <= 0) delete this.hubInventory[c.item];
      else this.hubInventory[c.item] = next;
    }
    return true;
  }

  refundCost(cost: BuildingCost[], multiplier = 1) {
    if (multiplier <= 0) return;
    for (const c of cost) {
      this.addInventory(c.item, c.count * multiplier);
    }
  }

  /** Sostituzione di un nastro con un macchinario/splitter/merger o upgrade Nastro Mk.1 <-> Mk.2 */
  canReplaceBelt(type: BuildingType, x: number, y: number): boolean {
    const existing = this.getBuilding(x, y);
    if (!existing || !isBeltType(existing.type)) return false;
    if (BELT_REPLACEABLE_TYPES.has(type)) return true;
    if (isBeltType(type) && existing.type !== type) return true;
    return false;
  }

  /** Upgrade/downgrade sul posto di un Miner Mk.1 <-> Mk.2 mantenendo i cavi */
  canUpgradeMiner(type: BuildingType, x: number, y: number): boolean {
    const existing = this.getBuilding(x, y);
    if (!existing) return false;
    return isMinerType(existing.type) && isMinerType(type) && existing.type !== type;
  }

  canUpgradeInPlace(type: BuildingType, x: number, y: number): boolean {
    return this.canReplaceBelt(type, x, y) || this.canUpgradeMiner(type, x, y);
  }

  getPlacementDirection(
    type: BuildingType,
    x: number,
    y: number,
    fallbackDir: Direction
  ): Direction {
    if (this.canUpgradeInPlace(type, x, y)) {
      const existing = this.getBuilding(x, y);
      if (existing) return existing.dir;
    }
    return fallbackDir;
  }

  getPlacementError(type: BuildingType, x: number, y: number): string | null {
    if (!this.inBounds(x, y)) return 'Fuori mappa';

    const terrain = this.getTerrain(x, y);
    if (!TERRAIN_META[terrain].buildable) {
      return `${TERRAIN_META[terrain].name}: non edificabile`;
    }

    const def = BUILDING_DEFS[type];
    const hasNode = Boolean(this.getNode(x, y));

    if (def.requiresNode && !hasNode) {
      return 'Va posizionato su una vena di minerale';
    }
    if (!def.requiresNode && hasNode) {
      return 'Non costruibile sopra una vena';
    }

    const existing = this.getBuilding(x, y);
    const upgrading = Boolean(existing && this.canUpgradeInPlace(type, x, y));
    if (existing && !upgrading) {
      return 'Cella occupata';
    }

    const refundMap = new Map<ItemType, number>();
    if (upgrading && existing) {
      for (const r of BUILDING_DEFS[existing.type].cost) {
        refundMap.set(r.item, (refundMap.get(r.item) ?? 0) + r.count);
      }
    }

    const missing: string[] = [];
    for (const c of def.cost) {
      const available =
        this.getItemCount(c.item) + (refundMap.get(c.item) ?? 0);
      if (available < c.count) {
        missing.push(`${c.count - available} ${ITEM_META[c.item].shortName}`);
      }
    }

    if (missing.length > 0) {
      return `Mancano: ${missing.join(', ')}`;
    }

    return null;
  }

  canPlace(type: BuildingType, x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    if (!this.isBuildableTerrain(x, y)) return false;

    const def = BUILDING_DEFS[type];
    const hasNode = Boolean(this.getNode(x, y));
    if (def.requiresNode ? !hasNode : hasNode) return false;

    const existing = this.getBuilding(x, y);
    if (existing) {
      if (!this.canUpgradeInPlace(type, x, y)) return false;
      return this.canAffordWithRefund(def.cost, BUILDING_DEFS[existing.type].cost);
    }

    return this.canAfford(def.cost);
  }

  rotateBuilding(x: number, y: number): boolean {
    const b = this.getBuilding(x, y);
    if (!b || b.type === 'hub' || b.type === 'pole') return false;
    b.dir = ((b.dir + 1) % 4) as Direction;
    return true;
  }

  placeBuilding(
    type: BuildingType,
    x: number,
    y: number,
    dir: Direction
  ): Building | null {
    if (!this.canPlace(type, x, y)) return null;

    const existing = this.getBuilding(x, y);
    const upgradingMiner = Boolean(existing && this.canUpgradeMiner(type, x, y));
    const replacingBelt = Boolean(existing && this.canReplaceBelt(type, x, y));
    const upgrading = upgradingMiner || replacingBelt;

    if (upgrading && existing) {
      this.refundCost(BUILDING_DEFS[existing.type].cost);
    }

    if (!this.spendCost(BUILDING_DEFS[type].cost)) {
      if (upgrading && existing) {
        this.spendCost(BUILDING_DEFS[existing.type].cost);
      }
      return null;
    }

    // Upgrade Miner Mk.1 <-> Mk.2: preserva ID (cavi collegati), direzione e buffer
    if (upgradingMiner && existing) {
      existing.type = type;
      return existing;
    }

    const finalDir = replacingBelt && existing ? existing.dir : dir;
    const autoRecipeId =
      replacingBelt && existing
        ? this.detectAutoRecipe(type, x, y, existing)
        : undefined;
    const recipeId = autoRecipeId ?? getDefaultRecipe(type);

    const inputBuffer: Partial<Record<ItemType, number>> = {};
    let beltSlot: BeltSlot | null = null;

    if (replacingBelt && existing?.beltSlot) {
      const carried = existing.beltSlot;
      if (isBeltType(type) || type === 'splitter' || type === 'merger') {
        beltSlot = { ...carried };
      } else if (
        recipeId &&
        RECIPES[recipeId]?.inputs.some((inp) => inp.item === carried.item)
      ) {
        inputBuffer[carried.item] = 1;
      } else {
        this.addInventory(carried.item, 1);
      }
    }

    const building: Building = {
      id: `b_${this.nextId++}`,
      type,
      x,
      y,
      dir: finalDir,
      recipeId,
      progress: 0,
      inputBuffer,
      outputBuffer: {},
      beltSlot,
      rrIndex: 0,
      powered: false,
      fuseBlown: false,
    };

    this.buildings.set(World.key(x, y), building);
    return building;
  }

  private detectAutoRecipe(
    type: BuildingType,
    x: number,
    y: number,
    existing: Building
  ): string | undefined {
    if (!CRAFTING_BUILDING_TYPES.has(type)) return undefined;

    const recipes = getRecipesForBuilding(type);
    const candidateItems: ItemType[] = [];

    if (existing.beltSlot) {
      candidateItems.push(existing.beltSlot.item);
    }

    for (const d of [0, 1, 2, 3] as Direction[]) {
      const nb = this.getNeighbor(x, y, d);
      if (!nb) continue;

      const dirToCenter = ((d + 2) % 4) as Direction;
      const pointsHere =
        nb.type === 'splitter'
          ? dirToCenter !== (((nb.dir + 2) % 4) as Direction)
          : nb.dir === dirToCenter;

      if (!pointsHere) continue;

      if (nb.beltSlot) {
        candidateItems.push(nb.beltSlot.item);
      } else if (isMinerType(nb.type)) {
        const node = this.getNode(nb.x, nb.y);
        if (node) candidateItems.push(RESOURCE_TO_ITEM[node.type]);
      } else if (nb.recipeId && RECIPES[nb.recipeId]) {
        candidateItems.push(RECIPES[nb.recipeId].output.item);
      }
    }

    for (const item of candidateItems) {
      const match = recipes.find((r) =>
        r.inputs.some((inp) => inp.item === item)
      );
      if (match) return match.id;
    }

    return undefined;
  }

  removeBuilding(x: number, y: number): boolean {
    const existing = this.getBuilding(x, y);
    if (!existing || existing.type === 'hub') return false;

    this.refundCost(BUILDING_DEFS[existing.type].cost);

    const beforeWires = this.wires.length;
    this.wires = this.wires.filter(
      (w) => w.fromId !== existing.id && w.toId !== existing.id
    );
    const removedWires = beforeWires - this.wires.length;
    if (removedWires > 0) {
      this.refundCost(WIRE_COST, removedWires);
    }

    if (existing.inputBuffer) {
      for (const [item, count] of Object.entries(existing.inputBuffer)) {
        if (count && count > 0) this.addInventory(item as ItemType, count);
      }
    }
    if (existing.outputBuffer) {
      for (const [item, count] of Object.entries(existing.outputBuffer)) {
        if (count && count > 0) this.addInventory(item as ItemType, count);
      }
    }
    if (existing.beltSlot) {
      this.addInventory(existing.beltSlot.item, 1);
    }

    return this.buildings.delete(World.key(x, y));
  }

  // --- Gestione Cavi Elettrici ---

  getConnectionCount(buildingId: string): number {
    let count = 0;
    for (const w of this.wires) {
      if (w.fromId === buildingId || w.toId === buildingId) count++;
    }
    return count;
  }

  hasWireBetween(idA: string, idB: string): boolean {
    return this.wires.some(
      (w) =>
        (w.fromId === idA && w.toId === idB) ||
        (w.fromId === idB && w.toId === idA)
    );
  }

  getWireError(fromId: string | null, x: number, y: number): string | null {
    if (!this.inBounds(x, y)) return null;
    const target = this.getBuilding(x, y);

    if (!fromId) {
      if (!target) return null;
      const maxT = BUILDING_DEFS[target.type].maxConnections;
      if (maxT === 0) return 'Questo edificio non usa cavi';
      if (this.getConnectionCount(target.id) >= maxT) {
        return `Attacchi pieni (${maxT}/${maxT})`;
      }
      if (!this.canAfford(WIRE_COST)) return 'Manca: 1 Cable';
      return null;
    }

    const start = this.getBuildingById(fromId);
    if (!start) return null;

    const dist = Math.hypot(x - start.x, y - start.y);
    if (dist > MAX_WIRE_DISTANCE) {
      return `Cavo troppo lungo (max ${MAX_WIRE_DISTANCE} celle)`;
    }

    if (!target || target.id === fromId) return null;
    if (this.hasWireBetween(fromId, target.id)) return null;

    const maxT = BUILDING_DEFS[target.type].maxConnections;
    if (maxT === 0) return 'Questo edificio non accetta cavi';

    const maxS = BUILDING_DEFS[start.type].maxConnections;
    if (this.getConnectionCount(fromId) >= maxS) {
      return `Origine piena (${maxS}/${maxS})`;
    }
    if (this.getConnectionCount(target.id) >= maxT) {
      return `Attacchi pieni (${maxT}/${maxT})`;
    }
    if (!this.canAfford(WIRE_COST)) return 'Manca: 1 Cable';

    return null;
  }

  canConnect(idA: string, idB: string): boolean {
    if (idA === idB) return false;
    if (!this.canAfford(WIRE_COST)) return false;

    const a = this.getBuildingById(idA);
    const b = this.getBuildingById(idB);
    if (!a || !b) return false;

    const maxA = BUILDING_DEFS[a.type].maxConnections;
    const maxB = BUILDING_DEFS[b.type].maxConnections;
    if (maxA === 0 || maxB === 0) return false;

    if (this.hasWireBetween(idA, idB)) return false;
    if (this.getConnectionCount(idA) >= maxA) return false;
    if (this.getConnectionCount(idB) >= maxB) return false;

    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    return dist <= MAX_WIRE_DISTANCE;
  }

  addWire(idA: string, idB: string): PowerWire | null {
    if (!this.canConnect(idA, idB)) return null;
    if (!this.spendCost(WIRE_COST)) return null;

    const wire: PowerWire = {
      id: `w_${this.nextWireId++}`,
      fromId: idA,
      toId: idB,
    };
    this.wires.push(wire);
    return wire;
  }

  removeWireBetween(idA: string, idB: string): boolean {
    const before = this.wires.length;
    this.wires = this.wires.filter(
      (w) =>
        !(
          (w.fromId === idA && w.toId === idB) ||
          (w.fromId === idB && w.toId === idA)
        )
    );
    const removed = before - this.wires.length;
    if (removed > 0) {
      this.refundCost(WIRE_COST, removed);
      return true;
    }
    return false;
  }

  setRecipe(x: number, y: number, recipeId: string): boolean {
    const b = this.getBuilding(x, y);
    if (!b || !CRAFTING_BUILDING_TYPES.has(b.type)) return false;
    if (b.recipeId === recipeId) return false;

    // Restituisce all'HUB eventuali materiali nei buffer prima di cambiare ricetta
    if (b.inputBuffer) {
      for (const [item, count] of Object.entries(b.inputBuffer)) {
        if (count && count > 0) this.addInventory(item as ItemType, count);
      }
    }
    if (b.outputBuffer) {
      for (const [item, count] of Object.entries(b.outputBuffer)) {
        if (count && count > 0) this.addInventory(item as ItemType, count);
      }
    }

    b.recipeId = recipeId;
    b.progress = 0;
    b.inputBuffer = {};
    b.outputBuffer = {};
    return true;
  }

  addToHub(item: ItemType, count = 1) {
    this.addInventory(item, count);
    this.totalDeliveredToHub += count;
  }

  private generateTerrain() {
    const c = Math.floor(this.size / 2);

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const baseElev = fbm(x * 0.017, y * 0.017, 5, this.seed);
        const ridgeRaw = fbm(
          x * 0.025 + 11.3,
          y * 0.025 - 7.1,
          3,
          this.seed + 311
        );
        const ridge = 1 - Math.abs(ridgeRaw * 2 - 1);
        let elev = baseElev * 0.72 + ridge * ridge * 0.34;

        const moistBase = fbm(
          x * 0.012 + 40.5,
          y * 0.012 + 19.2,
          4,
          this.seed + 733
        );
        const regionalBias = ((c - x) / this.size) * 0.14;
        let moist = Math.min(1, Math.max(0, moistBase + regionalBias));

        const distHub = Math.hypot(x - c, y - c);
        if (distHub < 22) {
          const blend = smoothstep(Math.max(0, 1 - distHub / 22));
          elev = elev * (1 - blend) + 0.45 * blend;
          moist = moist * (1 - blend) + 0.52 * blend;
        }

        if (this.size >= 128) {
          const edgeDist = Math.min(x, y, this.size - 1 - x, this.size - 1 - y);
          if (edgeDist < 10) {
            const edgeFactor = smoothstep(edgeDist / 10);
            elev *= 0.35 + 0.65 * edgeFactor;
          }
        }

        const idx = y * this.size + x;
        this.elevation[idx] = elev;
        this.moisture[idx] = moist;
        this.terrain[idx] = classifyTerrain(elev, moist);
      }
    }
  }

  private addNode(x: number, y: number, type: ResourceType, purity: Purity): boolean {
    if (!this.inBounds(x, y)) return false;
    if (!this.isBuildableTerrain(x, y)) return false;
    if (this.getBuilding(x, y) || this.getNode(x, y)) return false;
    this.nodes.set(World.key(x, y), { x, y, type, purity });
    return true;
  }

  /** Piazza una vena garantita sulla prima cella edificabile libera attorno a (tx, ty) */
  private addGuaranteedNodeNear(
    tx: number,
    ty: number,
    type: ResourceType,
    purity: Purity
  ) {
    for (let r = 0; r <= 12; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          if (this.addNode(tx + dx, ty + dy, type, purity)) return;
        }
      }
    }
  }

  private pickBiomeResource(
    biome: TerrainType,
    distHub: number,
    roll: number
  ): ResourceType {
    // Anello vicino (20–30 celle): materiali base + carbone
    if (distHub < 30) {
      if (roll < 0.35) return 'iron';
      if (roll < 0.62) return 'copper';
      if (roll < 0.82) return 'limestone';
      return 'coal';
    }

    // Anello medio (30–56 celle): entrano Caterium, Quarzo e Zolfo
    if (distHub < 56) {
      if (biome === 'desert' || biome === 'savanna') {
        if (roll < 0.24) return 'copper';
        if (roll < 0.48) return 'caterium';
        if (roll < 0.68) return 'sulfur';
        if (roll < 0.84) return 'iron';
        return 'limestone';
      }
      if (biome === 'highland') {
        if (roll < 0.30) return 'coal';
        if (roll < 0.54) return 'iron';
        if (roll < 0.76) return 'quartz';
        return 'sulfur';
      }
      if (biome === 'forest') {
        if (roll < 0.28) return 'coal';
        if (roll < 0.52) return 'quartz';
        if (roll < 0.76) return 'iron';
        return 'copper';
      }
      if (roll < 0.24) return 'iron';
      if (roll < 0.44) return 'copper';
      if (roll < 0.60) return 'limestone';
      if (roll < 0.76) return 'coal';
      if (roll < 0.88) return 'caterium';
      return 'quartz';
    }

    // Anello esterno (>56 celle): tutte le 9 risorse, inclusi Bauxite e Uranio
    if (biome === 'highland') {
      if (roll < 0.22) return 'uranium';
      if (roll < 0.44) return 'bauxite';
      if (roll < 0.64) return 'coal';
      if (roll < 0.82) return 'quartz';
      return 'sulfur';
    }
    if (biome === 'desert' || biome === 'savanna') {
      if (roll < 0.26) return 'caterium';
      if (roll < 0.48) return 'sulfur';
      if (roll < 0.66) return 'bauxite';
      if (roll < 0.82) return 'copper';
      return 'iron';
    }
    if (biome === 'forest') {
      if (roll < 0.26) return 'bauxite';
      if (roll < 0.46) return 'coal';
      if (roll < 0.64) return 'quartz';
      if (roll < 0.76) return 'uranium';
      if (roll < 0.88) return 'iron';
      return 'copper';
    }
    if (biome === 'beach') {
      if (roll < 0.32) return 'bauxite';
      if (roll < 0.58) return 'limestone';
      if (roll < 0.80) return 'caterium';
      return 'copper';
    }

    if (roll < 0.20) return 'iron';
    if (roll < 0.36) return 'copper';
    if (roll < 0.50) return 'limestone';
    if (roll < 0.64) return 'coal';
    if (roll < 0.76) return 'caterium';
    if (roll < 0.86) return 'quartz';
    if (roll < 0.94) return 'bauxite';
    return 'sulfur';
  }

  private generateStarterMap() {
    const c = Math.floor(this.size / 2);

    for (const [item, count] of Object.entries(STARTER_INVENTORY)) {
      if (count && count > 0) {
        this.hubInventory[item as ItemType] = count;
      }
    }

    // HUB centrale
    this.buildings.set(World.key(c, c), {
      id: 'hub_main',
      type: 'hub',
      x: c,
      y: c,
      dir: 1,
    });

    // Giacimenti starter vicini all'HUB (Tier 0–3)
    this.addNode(c - 6, c - 2, 'iron', 'pure');
    this.addNode(c - 6, c + 1, 'iron', 'normal');
    this.addNode(c - 8, c + 3, 'iron', 'impure');

    this.addNode(c + 6, c - 3, 'copper', 'normal');
    this.addNode(c + 8, c - 1, 'copper', 'pure');

    this.addNode(c - 2, c + 7, 'limestone', 'normal');
    this.addNode(c + 1, c + 8, 'limestone', 'pure');

    // Giacimenti garantiti a distanza crescente per la progressione Tier 4 → Tier 12
    this.addGuaranteedNodeNear(c - 16, c - 14, 'coal', 'normal');
    this.addGuaranteedNodeNear(c + 18, c + 14, 'coal', 'pure');
    this.addGuaranteedNodeNear(c + 26, c - 18, 'caterium', 'normal');
    this.addGuaranteedNodeNear(c - 26, c + 20, 'quartz', 'normal');
    this.addGuaranteedNodeNear(c + 34, c + 26, 'sulfur', 'normal');
    this.addGuaranteedNodeNear(c - 38, c - 28, 'bauxite', 'pure');
    this.addGuaranteedNodeNear(c + 48, c - 38, 'uranium', 'normal');

    // Generazione procedurale bilanciata su tutta la 256×256
    const step = 16;
    for (let gy = 14; gy < this.size - 14; gy += step) {
      for (let gx = 14; gx < this.size - 14; gx += step) {
        const jx = gx + Math.floor(hash2D(gx, gy, this.seed + 19) * 10 - 5);
        const jy = gy + Math.floor(hash2D(gx, gy, this.seed + 53) * 10 - 5);

        const distHub = Math.hypot(jx - c, jy - c);
        if (distHub < 15) continue;
        if (!this.isBuildableTerrain(jx, jy)) continue;

        const chance = hash2D(jx, jy, this.seed + 101);
        if (chance > 0.42) continue;

        const biome = this.getTerrain(jx, jy);
        const roll = hash2D(jx, jy, this.seed + 211);
        const resType = this.pickBiomeResource(biome, distHub, roll);

        const purityRoll =
          hash2D(jx, jy, this.seed + 307) + Math.min(0.25, distHub / 320);
        const purity: Purity =
          purityRoll > 0.76 ? 'pure' : purityRoll > 0.36 ? 'normal' : 'impure';

        this.addNode(jx, jy, resType, purity);

        // Cluster da 2 vene (tranne l'Uranio che resta più raro)
        if (resType !== 'uranium' && hash2D(jx, jy, this.seed + 409) < 0.5) {
          const ox = hash2D(jx, jy, this.seed + 503) < 0.5 ? 2 : -2;
          const oy = hash2D(jx, jy, this.seed + 601) < 0.5 ? 2 : -1;
          const secondPurity: Purity = purity === 'pure' ? 'normal' : purity;
          this.addNode(jx + ox, jy + oy, resType, secondPurity);
        }
      }
    }
  }
}