export type Direction = 0 | 1 | 2 | 3; // 0: Nord, 1: Est, 2: Sud, 3: Ovest

export const DIR_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  0: { dx: 0, dy: -1 },
  1: { dx: 1, dy: 0 },
  2: { dx: 0, dy: 1 },
  3: { dx: -1, dy: 0 },
};

export const MAX_WIRE_DISTANCE = 10; // Distanza massima in celle per un singolo cavo

export type TerrainType =
  | 'deep_water'
  | 'water'
  | 'beach'
  | 'desert'
  | 'savanna'
  | 'plains'
  | 'forest'
  | 'highland'
  | 'mountain'
  | 'snow';

export interface TerrainMeta {
  id: TerrainType;
  name: string;
  buildable: boolean;
  hex: string;
}

export const TERRAIN_META: Record<TerrainType, TerrainMeta> = {
  deep_water: {
    id: 'deep_water',
    name: 'Acque Profonde',
    buildable: false,
    hex: '#0e3a5c',
  },
  water: {
    id: 'water',
    name: 'Lago',
    buildable: false,
    hex: '#1c638c',
  },
  beach: {
    id: 'beach',
    name: 'Riva Sabbiosa',
    buildable: true,
    hex: '#d6c18b',
  },
  desert: {
    id: 'desert',
    name: 'Deserto',
    buildable: true,
    hex: '#d4a359',
  },
  savanna: {
    id: 'savanna',
    name: 'Steppa',
    buildable: true,
    hex: '#9c9e52',
  },
  plains: {
    id: 'plains',
    name: 'Pianura',
    buildable: true,
    hex: '#558448',
  },
  forest: {
    id: 'forest',
    name: 'Foresta',
    buildable: true,
    hex: '#315933',
  },
  highland: {
    id: 'highland',
    name: 'Altopiano Roccioso',
    buildable: true,
    hex: '#6d6b65',
  },
  mountain: {
    id: 'mountain',
    name: 'Montagna',
    buildable: false,
    hex: '#525257',
  },
  snow: {
    id: 'snow',
    name: 'Vetta Innevata',
    buildable: false,
    hex: '#d4dce6',
  },
};

export type ResourceType = 'iron' | 'copper' | 'limestone' | 'coal';
export type Purity = 'impure' | 'normal' | 'pure';

export const PURITY_RATE: Record<Purity, number> = {
  impure: 30,
  normal: 60,
  pure: 120,
};

export const RESOURCE_META: Record<
  ResourceType,
  { name: string; color: number; hex: string }
> = {
  iron: { name: 'Ferro', color: 0x94a3b8, hex: '#94a3b8' },
  copper: { name: 'Rame', color: 0xea580c, hex: '#ea580c' },
  limestone: { name: 'Calcare', color: 0xd6d3d1, hex: '#d6d3d1' },
  coal: { name: 'Carbone', color: 0x334155, hex: '#64748b' },
};

export type ItemType =
  | 'iron_ore'
  | 'copper_ore'
  | 'limestone'
  | 'coal'
  | 'iron_ingot'
  | 'copper_ingot'
  | 'iron_plate'
  | 'iron_rod'
  | 'screw'
  | 'wire'
  | 'cable'
  | 'concrete';

export interface ItemMeta {
  id: ItemType;
  name: string;
  shortName: string;
  color: number;
  hex: string;
}

export type BuildingType =
  | 'miner'
  | 'belt'
  | 'smelter'
  | 'constructor'
  | 'splitter'
  | 'merger'
  | 'generator'
  | 'pole'
  | 'hub';

export interface BuildingCost {
  item: ItemType;
  count: number;
}

export const WIRE_COST: BuildingCost[] = [{ item: 'cable', count: 1 }];

// Kit iniziale nell'HUB: sufficiente per avviare la prima linea completa (Generatore + Miner + Smelter + Constructor + Pali/Nastri)
export const STARTER_INVENTORY: Partial<Record<ItemType, number>> = {
  iron_plate: 100,
  iron_rod: 50,
  wire: 80,
  cable: 40,
  concrete: 40,
};

export interface BuildingDef {
  type: BuildingType;
  name: string;
  shortName: string;
  description: string;
  color: number;
  accent: number;
  powerMW: number; // positivo = consuma, negativo = produce
  maxConnections: number; // max fili elettrici collegabili
  cost: BuildingCost[];
  requiresNode?: boolean;
  shortcut?: string;
}

export const BUILDING_DEFS: Record<BuildingType, BuildingDef> = {
  miner: {
    type: 'miner',
    name: 'Miner Mk.1',
    shortName: 'Miner',
    description: 'Estrae minerali grezzi da qualsiasi giacimento.',
    color: 0xd97706,
    accent: 0xfef08a,
    powerMW: 5,
    maxConnections: 1,
    cost: [
      { item: 'iron_plate', count: 10 },
      { item: 'concrete', count: 10 },
    ],
    requiresNode: true,
    shortcut: '1',
  },
  belt: {
    type: 'belt',
    name: 'Nastro Mk.1',
    shortName: 'Nastro',
    description: 'Trasporta oggetti tra macchine con curve automatiche.',
    color: 0x3f3f46,
    accent: 0xf59e0b,
    powerMW: 0,
    maxConnections: 0,
    cost: [{ item: 'iron_plate', count: 1 }],
    shortcut: '2',
  },
  smelter: {
    type: 'smelter',
    name: 'Smelter',
    shortName: 'Smelter',
    description: 'Fonde i minerali grezzi in lingotti puri.',
    color: 0xc2410c,
    accent: 0xfb923c,
    powerMW: 4,
    maxConnections: 1,
    cost: [
      { item: 'iron_rod', count: 5 },
      { item: 'wire', count: 8 },
    ],
    shortcut: '3',
  },
  constructor: {
    type: 'constructor',
    name: 'Constructor',
    shortName: 'Constr.',
    description: 'Trasforma lingotti e materiali base in componenti.',
    color: 0x2563eb,
    accent: 0x93c5fd,
    powerMW: 4,
    maxConnections: 1,
    cost: [
      { item: 'iron_plate', count: 6 },
      { item: 'cable', count: 4 },
    ],
    shortcut: '4',
  },
  splitter: {
    type: 'splitter',
    name: 'Splitter',
    shortName: 'Splitter',
    description: 'Divide 1 nastro in ingresso fino a 3 uscite alternate.',
    color: 0x52525b,
    accent: 0x38bdf8,
    powerMW: 0,
    maxConnections: 0,
    cost: [
      { item: 'iron_plate', count: 2 },
      { item: 'cable', count: 2 },
    ],
    shortcut: '5',
  },
  merger: {
    type: 'merger',
    name: 'Merger',
    shortName: 'Merger',
    description: 'Unisce fino a 3 nastri in ingresso in 1 sola uscita.',
    color: 0x52525b,
    accent: 0x4ade80,
    powerMW: 0,
    maxConnections: 0,
    cost: [
      { item: 'iron_plate', count: 2 },
      { item: 'iron_rod', count: 2 },
    ],
    shortcut: '6',
  },
  generator: {
    type: 'generator',
    name: 'Biomass Burner',
    shortName: 'Generat.',
    description: 'Genera energia elettrica per alimentare la rete.',
    color: 0x15803d,
    accent: 0x86efac,
    powerMW: -30,
    maxConnections: 2,
    cost: [
      { item: 'iron_plate', count: 15 },
      { item: 'iron_rod', count: 15 },
      { item: 'wire', count: 25 },
    ],
    shortcut: '7',
  },
  pole: {
    type: 'pole',
    name: 'Palo Elettrico Mk.1',
    shortName: 'Palo',
    description: 'Estende e dirama la rete elettrica fino a 4 cavi.',
    color: 0x27272a,
    accent: 0xfacc15,
    powerMW: 0,
    maxConnections: 4,
    cost: [
      { item: 'wire', count: 3 },
      { item: 'iron_rod', count: 1 },
      { item: 'concrete', count: 1 },
    ],
    shortcut: '8',
  },
  hub: {
    type: 'hub',
    name: 'FICSIT HUB',
    shortName: 'HUB',
    description: 'Centro di comando e deposito principale delle risorse.',
    color: 0xf59e0b,
    accent: 0xffffff,
    powerMW: 0,
    maxConnections: 0,
    cost: [],
  },
};

export const HOTBAR_BUILDINGS: BuildingType[] = [
  'miner',
  'belt',
  'smelter',
  'constructor',
  'splitter',
  'merger',
  'generator',
  'pole',
];

export interface Recipe {
  id: string;
  name: string;
  building: 'smelter' | 'constructor';
  input: { item: ItemType; count: number };
  output: { item: ItemType; count: number };
  durationSec: number;
}

export interface BeltSlot {
  item: ItemType;
  progress: number;
}

export interface PowerWire {
  id: string;
  fromId: string;
  toId: string;
}

export interface ResourceNode {
  x: number;
  y: number;
  type: ResourceType;
  purity: Purity;
}

export interface Building {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  dir: Direction;
  // Stato runtime della simulazione
  recipeId?: string;
  progress?: number;
  inputBuffer?: Partial<Record<ItemType, number>>;
  outputBuffer?: Partial<Record<ItemType, number>>;
  beltSlot?: BeltSlot | null;
  rrIndex?: number;
  // Stato elettrico sulla propria rete collegata
  powered?: boolean;
  fuseBlown?: boolean;
}

export interface PowerStats {
  producedMW: number;
  consumedMW: number;
  fuseBlown: boolean;
}