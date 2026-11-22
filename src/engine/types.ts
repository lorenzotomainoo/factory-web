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

export type ResourceType =
  | 'iron'
  | 'copper'
  | 'limestone'
  | 'coal'
  | 'caterium'
  | 'quartz'
  | 'sulfur'
  | 'bauxite'
  | 'uranium';

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
  caterium: { name: 'Caterium', color: 0xeab308, hex: '#facc15' },
  quartz: { name: 'Quarzo', color: 0xf472b6, hex: '#f472b6' },
  sulfur: { name: 'Zolfo', color: 0xded82a, hex: '#fde047' },
  bauxite: { name: 'Bauxite', color: 0xe11d48, hex: '#fb7185' },
  uranium: { name: 'Uranio', color: 0x22c55e, hex: '#4ade80' },
};

export type ItemType =
  // Minerali grezzi (9)
  | 'iron_ore'
  | 'copper_ore'
  | 'limestone'
  | 'coal'
  | 'caterium_ore'
  | 'raw_quartz'
  | 'sulfur'
  | 'bauxite'
  | 'uranium_ore'
  // Lingotti e composti fusi (6)
  | 'iron_ingot'
  | 'copper_ingot'
  | 'caterium_ingot'
  | 'steel_ingot'
  | 'aluminum_ingot'
  | 'sulfuric_compound'
  // Componenti Constructor (12)
  | 'iron_plate'
  | 'iron_rod'
  | 'screw'
  | 'wire'
  | 'cable'
  | 'concrete'
  | 'steel_beam'
  | 'steel_pipe'
  | 'quickwire'
  | 'quartz_crystal'
  | 'silica'
  | 'aluminum_sheet'
  // Componenti Assembler - 2 ingressi (9)
  | 'reinforced_plate'
  | 'rotor'
  | 'modular_frame'
  | 'stator'
  | 'encased_beam'
  | 'circuit_board'
  | 'ai_limiter'
  | 'motor'
  | 'heat_sink'
  // Componenti Manufacturer - 3 ingressi (10)
  | 'heavy_frame'
  | 'computer'
  | 'radio_unit'
  | 'battery'
  | 'supercomputer'
  | 'turbo_motor'
  | 'uranium_rod'
  | 'cooling_module'
  | 'fused_frame'
  | 'control_core';

export interface ItemMeta {
  id: ItemType;
  name: string;
  shortName: string;
  badge: string; // Sigla 2 caratteri per Alt-Mode
  color: number;
  hex: string;
}

export type BuildingType =
  | 'miner'
  | 'miner_mk2'
  | 'belt'
  | 'belt_mk2'
  | 'smelter'
  | 'foundry'
  | 'constructor'
  | 'assembler'
  | 'manufacturer'
  | 'splitter'
  | 'merger'
  | 'generator'
  | 'coal_gen'
  | 'nuclear_gen'
  | 'pole'
  | 'hub';

export type CraftingBuildingType =
  | 'smelter'
  | 'foundry'
  | 'constructor'
  | 'assembler'
  | 'manufacturer';

export type BuildingCategory =
  | 'extraction'
  | 'logistics'
  | 'production'
  | 'power'
  | 'special';

export interface BuildingCost {
  item: ItemType;
  count: number;
}

export const WIRE_COST: BuildingCost[] = [{ item: 'cable', count: 1 }];

// Kit minimo assoluto per partire da zero senza softlock:
// 1 Miner + 1 Smelter + 1 Constructor + 1 Generatore + 1 Palo + 4 Cavi + 10 Nastri
export const STARTER_INVENTORY: Partial<Record<ItemType, number>> = {
  iron_plate: 41,
  iron_rod: 21,
  wire: 36,
  cable: 8,
  concrete: 11,
};

export interface BuildingDef {
  type: BuildingType;
  name: string;
  shortName: string;
  description: string;
  category: BuildingCategory;
  unlockTier: number; // Disponibile quando currentMilestoneIndex >= unlockTier
  color: number;
  accent: number;
  powerMW: number; // positivo = consuma, negativo = produce
  maxConnections: number;
  cost: BuildingCost[];
  requiresNode?: boolean;
  beltSpeed?: number; // item/min per nastri
  minerMultiplier?: number; // moltiplicatore estrazione per miner
  shortcut?: string;
}

export const BUILDING_DEFS: Record<BuildingType, BuildingDef> = {
  miner: {
    type: 'miner',
    name: 'Miner Mk.1',
    shortName: 'Miner 1',
    description: 'Estrae minerali grezzi da qualsiasi giacimento.',
    category: 'extraction',
    unlockTier: 0,
    color: 0xd97706,
    accent: 0xfef08a,
    powerMW: 5,
    maxConnections: 1,
    minerMultiplier: 1,
    cost: [
      { item: 'iron_plate', count: 10 },
      { item: 'concrete', count: 10 },
    ],
    requiresNode: true,
    shortcut: '1',
  },
  miner_mk2: {
    type: 'miner_mk2',
    name: 'Miner Mk.2',
    shortName: 'Miner 2',
    description: 'Raddoppia la velocità di estrazione (2×). Aggiorna un Miner Mk.1 sul posto.',
    category: 'extraction',
    unlockTier: 5,
    color: 0x0284c7,
    accent: 0x7dd3fc,
    powerMW: 12,
    maxConnections: 1,
    minerMultiplier: 2,
    cost: [
      { item: 'steel_beam', count: 10 },
      { item: 'steel_pipe', count: 10 },
      { item: 'rotor', count: 5 },
      { item: 'concrete', count: 10 },
    ],
    requiresNode: true,
  },
  belt: {
    type: 'belt',
    name: 'Nastro Mk.1',
    shortName: 'Nastro 1',
    description: 'Trasporta fino a 60 item/min con curve automatiche.',
    category: 'logistics',
    unlockTier: 0,
    color: 0x3f3f46,
    accent: 0xf59e0b,
    powerMW: 0,
    maxConnections: 0,
    beltSpeed: 60,
    cost: [{ item: 'iron_plate', count: 1 }],
    shortcut: '2',
  },
  belt_mk2: {
    type: 'belt_mk2',
    name: 'Nastro Mk.2',
    shortName: 'Nastro 2',
    description: 'Alta velocità: 120 item/min. Sostituisce i Nastri Mk.1 sul posto.',
    category: 'logistics',
    unlockTier: 5,
    color: 0x1e3a5f,
    accent: 0x38bdf8,
    powerMW: 0,
    maxConnections: 0,
    beltSpeed: 120,
    cost: [{ item: 'steel_beam', count: 1 }],
  },
  smelter: {
    type: 'smelter',
    name: 'Smelter',
    shortName: 'Smelter',
    description: 'Fonde minerali grezzi singoli in lingotti puri (1 ingresso).',
    category: 'production',
    unlockTier: 0,
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
  foundry: {
    type: 'foundry',
    name: 'Fonderia',
    shortName: 'Fonderia',
    description: 'Combina 2 minerali in leghe avanzate: Acciaio, Alluminio e Zolfo.',
    category: 'production',
    unlockTier: 4,
    color: 0x991b1b,
    accent: 0xfca5a5,
    powerMW: 16,
    maxConnections: 1,
    cost: [
      { item: 'reinforced_plate', count: 8 },
      { item: 'concrete', count: 10 },
      { item: 'cable', count: 8 },
    ],
  },
  constructor: {
    type: 'constructor',
    name: 'Constructor',
    shortName: 'Constr.',
    description: 'Trasforma un singolo materiale base in componenti (1 ingresso).',
    category: 'production',
    unlockTier: 0,
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
  assembler: {
    type: 'assembler',
    name: 'Assembler',
    shortName: 'Assembl.',
    description: 'Assembla 2 componenti diversi in parti meccaniche ed elettroniche.',
    category: 'production',
    unlockTier: 3,
    color: 0x4f46e5,
    accent: 0xc7d2fe,
    powerMW: 10,
    maxConnections: 1,
    cost: [
      { item: 'iron_plate', count: 10 },
      { item: 'iron_rod', count: 10 },
      { item: 'cable', count: 10 },
    ],
  },
  manufacturer: {
    type: 'manufacturer',
    name: 'Manufacturer',
    shortName: 'Manuf.',
    description: 'Macchinario industriale a 3 ingressi per componenti high-tech ed endgame.',
    category: 'production',
    unlockTier: 8,
    color: 0x7e22ce,
    accent: 0xe9d5ff,
    powerMW: 25,
    maxConnections: 1,
    cost: [
      { item: 'motor', count: 10 },
      { item: 'circuit_board', count: 10 },
      { item: 'modular_frame', count: 10 },
      { item: 'cable', count: 20 },
    ],
  },
  splitter: {
    type: 'splitter',
    name: 'Splitter',
    shortName: 'Splitter',
    description: 'Divide 1 nastro in ingresso fino a 3 uscite alternate.',
    category: 'logistics',
    unlockTier: 2,
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
    category: 'logistics',
    unlockTier: 2,
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
    shortName: 'Biomassa',
    description: 'Generatore iniziale: produce 30 MW stabili.',
    category: 'power',
    unlockTier: 0,
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
  coal_gen: {
    type: 'coal_gen',
    name: 'Centrale Carbone',
    shortName: 'Carbone',
    description: 'Centrale termoelettrica industriale: produce 75 MW.',
    category: 'power',
    unlockTier: 4,
    color: 0x0f766e,
    accent: 0x5eead4,
    powerMW: -75,
    maxConnections: 2,
    cost: [
      { item: 'reinforced_plate', count: 10 },
      { item: 'concrete', count: 20 },
      { item: 'cable', count: 15 },
    ],
  },
  nuclear_gen: {
    type: 'nuclear_gen',
    name: 'Reattore Nucleare',
    shortName: 'Nucleare',
    description: 'Centrale a fissione endgame: genera ben 250 MW con 3 attacchi.',
    category: 'power',
    unlockTier: 11,
    color: 0x16a34a,
    accent: 0xbef264,
    powerMW: -250,
    maxConnections: 3,
    cost: [
      { item: 'heavy_frame', count: 15 },
      { item: 'supercomputer', count: 10 },
      { item: 'concrete', count: 25 },
      { item: 'cable', count: 30 },
    ],
  },
  pole: {
    type: 'pole',
    name: 'Palo Elettrico Mk.1',
    shortName: 'Palo',
    description: 'Estende e dirama la rete elettrica fino a 4 cavi.',
    category: 'power',
    unlockTier: 0,
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
    category: 'special',
    unlockTier: 0,
    color: 0xf59e0b,
    accent: 0xffffff,
    powerMW: 0,
    maxConnections: 0,
    cost: [],
  },
};

export const HOTBAR_BUILDINGS: BuildingType[] = [
  'miner',
  'miner_mk2',
  'belt',
  'belt_mk2',
  'smelter',
  'foundry',
  'constructor',
  'assembler',
  'manufacturer',
  'splitter',
  'merger',
  'generator',
  'coal_gen',
  'nuclear_gen',
  'pole',
];

export const CRAFTING_BUILDING_TYPES = new Set<BuildingType>([
  'smelter',
  'foundry',
  'constructor',
  'assembler',
  'manufacturer',
]);

export function isBeltType(type: BuildingType): boolean {
  return type === 'belt' || type === 'belt_mk2';
}

export function isMinerType(type: BuildingType): boolean {
  return type === 'miner' || type === 'miner_mk2';
}

export interface RecipeIngredient {
  item: ItemType;
  count: number;
}

export interface Recipe {
  id: string;
  name: string;
  building: CraftingBuildingType;
  inputs: RecipeIngredient[];
  output: RecipeIngredient;
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
  recipeId?: string;
  progress?: number;
  inputBuffer?: Partial<Record<ItemType, number>>;
  outputBuffer?: Partial<Record<ItemType, number>>;
  beltSlot?: BeltSlot | null;
  rrIndex?: number;
  powered?: boolean;
  fuseBlown?: boolean;
}

export interface PowerStats {
  producedMW: number;
  consumedMW: number;
  fuseBlown: boolean;
}