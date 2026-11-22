import type {
  BuildingType,
  ItemMeta,
  ItemType,
  Recipe,
  ResourceType,
} from './types';

export const RESOURCE_TO_ITEM: Record<ResourceType, ItemType> = {
  iron: 'iron_ore',
  copper: 'copper_ore',
  limestone: 'limestone',
  coal: 'coal',
  caterium: 'caterium_ore',
  quartz: 'raw_quartz',
  sulfur: 'sulfur',
  bauxite: 'bauxite',
  uranium: 'uranium_ore',
};

export const ITEM_META: Record<ItemType, ItemMeta> = {
  // --- Minerali grezzi ---
  iron_ore: {
    id: 'iron_ore',
    name: 'Ferro Grezzo',
    shortName: 'Fe Ore',
    badge: 'Fe',
    color: 0x94a3b8,
    hex: '#94a3b8',
  },
  copper_ore: {
    id: 'copper_ore',
    name: 'Rame Grezzo',
    shortName: 'Cu Ore',
    badge: 'Cu',
    color: 0xea580c,
    hex: '#ea580c',
  },
  limestone: {
    id: 'limestone',
    name: 'Calcare',
    shortName: 'Calc.',
    badge: 'Ca',
    color: 0xd6d3d1,
    hex: '#d6d3d1',
  },
  coal: {
    id: 'coal',
    name: 'Carbone',
    shortName: 'Carb.',
    badge: 'Co',
    color: 0x475569,
    hex: '#64748b',
  },
  caterium_ore: {
    id: 'caterium_ore',
    name: 'Caterium Grezzo',
    shortName: 'Cat.Ore',
    badge: 'Ct',
    color: 0xeab308,
    hex: '#facc15',
  },
  raw_quartz: {
    id: 'raw_quartz',
    name: 'Quarzo Grezzo',
    shortName: 'Qz Ore',
    badge: 'Qz',
    color: 0xf472b6,
    hex: '#f472b6',
  },
  sulfur: {
    id: 'sulfur',
    name: 'Zolfo',
    shortName: 'Zolfo',
    badge: 'Su',
    color: 0xded82a,
    hex: '#fde047',
  },
  bauxite: {
    id: 'bauxite',
    name: 'Bauxite',
    shortName: 'Baux.',
    badge: 'Bx',
    color: 0xe11d48,
    hex: '#fb7185',
  },
  uranium_ore: {
    id: 'uranium_ore',
    name: 'Uranio Grezzo',
    shortName: 'Ur Ore',
    badge: 'Ur',
    color: 0x22c55e,
    hex: '#4ade80',
  },

  // --- Lingotti e composti fusi ---
  iron_ingot: {
    id: 'iron_ingot',
    name: 'Lingotto di Ferro',
    shortName: 'Fe Ing',
    badge: 'Fe',
    color: 0xcbd5e1,
    hex: '#cbd5e1',
  },
  copper_ingot: {
    id: 'copper_ingot',
    name: 'Lingotto di Rame',
    shortName: 'Cu Ing',
    badge: 'Cu',
    color: 0xfb923c,
    hex: '#fb923c',
  },
  caterium_ingot: {
    id: 'caterium_ingot',
    name: 'Lingotto Caterium',
    shortName: 'Cat.Ing',
    badge: 'Ci',
    color: 0xfde047,
    hex: '#fde047',
  },
  steel_ingot: {
    id: 'steel_ingot',
    name: 'Lingotto Acciaio',
    shortName: 'Acciaio',
    badge: 'St',
    color: 0x64748b,
    hex: '#94a3b8',
  },
  aluminum_ingot: {
    id: 'aluminum_ingot',
    name: 'Lingotto Alluminio',
    shortName: 'Al Ing',
    badge: 'Al',
    color: 0xe2e8f0,
    hex: '#f1f5f9',
  },
  sulfuric_compound: {
    id: 'sulfuric_compound',
    name: 'Composto Solforico',
    shortName: 'Solfor.',
    badge: 'Sf',
    color: 0xcbd821,
    hex: '#d9f99d',
  },

  // --- Componenti Constructor ---
  iron_plate: {
    id: 'iron_plate',
    name: 'Piastra di Ferro',
    shortName: 'Plate',
    badge: 'Pl',
    color: 0xe2e8f0,
    hex: '#e2e8f0',
  },
  iron_rod: {
    id: 'iron_rod',
    name: 'Barra di Ferro',
    shortName: 'Rod',
    badge: 'Rd',
    color: 0x60a5fa,
    hex: '#60a5fa',
  },
  screw: {
    id: 'screw',
    name: 'Viti',
    shortName: 'Screw',
    badge: 'Sc',
    color: 0x38bdf8,
    hex: '#38bdf8',
  },
  wire: {
    id: 'wire',
    name: 'Filo di Rame',
    shortName: 'Wire',
    badge: 'Wr',
    color: 0xf97316,
    hex: '#f97316',
  },
  cable: {
    id: 'cable',
    name: 'Cavo Elettrico',
    shortName: 'Cable',
    badge: 'Cb',
    color: 0xfacc15,
    hex: '#facc15',
  },
  concrete: {
    id: 'concrete',
    name: 'Cemento',
    shortName: 'Cem.',
    badge: 'Cm',
    color: 0xa8a29e,
    hex: '#a8a29e',
  },
  steel_beam: {
    id: 'steel_beam',
    name: 'Trave d’Acciaio',
    shortName: 'Trave',
    badge: 'Sb',
    color: 0x475569,
    hex: '#94a3b8',
  },
  steel_pipe: {
    id: 'steel_pipe',
    name: 'Tubo d’Acciaio',
    shortName: 'Tubo',
    badge: 'Sp',
    color: 0x94a3b8,
    hex: '#cbd5e1',
  },
  quickwire: {
    id: 'quickwire',
    name: 'Quickwire',
    shortName: 'Q.Wire',
    badge: 'Qw',
    color: 0xfbbf24,
    hex: '#fcd34d',
  },
  quartz_crystal: {
    id: 'quartz_crystal',
    name: 'Cristallo Quarzo',
    shortName: 'Crist.',
    badge: 'Qc',
    color: 0xf9a8d4,
    hex: '#f9a8d4',
  },
  silica: {
    id: 'silica',
    name: 'Silicio',
    shortName: 'Silicio',
    badge: 'Si',
    color: 0xfce7f3,
    hex: '#fbcfe8',
  },
  aluminum_sheet: {
    id: 'aluminum_sheet',
    name: 'Lamiera Alluminio',
    shortName: 'Lam.Al',
    badge: 'As',
    color: 0xbae6fd,
    hex: '#bae6fd',
  },

  // --- Componenti Assembler ---
  reinforced_plate: {
    id: 'reinforced_plate',
    name: 'Piastra Rinforzata',
    shortName: 'R.Plate',
    badge: 'Rp',
    color: 0x93c5fd,
    hex: '#93c5fd',
  },
  rotor: {
    id: 'rotor',
    name: 'Rotore',
    shortName: 'Rotore',
    badge: 'Rt',
    color: 0x38bdf8,
    hex: '#38bdf8',
  },
  modular_frame: {
    id: 'modular_frame',
    name: 'Frame Modulare',
    shortName: 'Frame',
    badge: 'Mf',
    color: 0x818cf8,
    hex: '#818cf8',
  },
  stator: {
    id: 'stator',
    name: 'Statore',
    shortName: 'Stat.',
    badge: 'Sr',
    color: 0xfb923c,
    hex: '#fb923c',
  },
  encased_beam: {
    id: 'encased_beam',
    name: 'Cemento Armato',
    shortName: 'C.Arm.',
    badge: 'Eb',
    color: 0xd6d3d1,
    hex: '#e7e5e4',
  },
  circuit_board: {
    id: 'circuit_board',
    name: 'Scheda Elettronica',
    shortName: 'Scheda',
    badge: 'Pc',
    color: 0x10b981,
    hex: '#34d399',
  },
  ai_limiter: {
    id: 'ai_limiter',
    name: 'Limitatore AI',
    shortName: 'AI Lim',
    badge: 'Ai',
    color: 0xf59e0b,
    hex: '#fbbf24',
  },
  motor: {
    id: 'motor',
    name: 'Motore',
    shortName: 'Motore',
    badge: 'Mt',
    color: 0x0ea5e9,
    hex: '#38bdf8',
  },
  heat_sink: {
    id: 'heat_sink',
    name: 'Dissipatore',
    shortName: 'Dissip.',
    badge: 'Hs',
    color: 0x2dd4bf,
    hex: '#5eead4',
  },

  // --- Componenti Manufacturer ---
  heavy_frame: {
    id: 'heavy_frame',
    name: 'Frame Pesante',
    shortName: 'H.Frame',
    badge: 'Hf',
    color: 0x6366f1,
    hex: '#a5b4fc',
  },
  computer: {
    id: 'computer',
    name: 'Computer',
    shortName: 'Comp.',
    badge: 'Cp',
    color: 0x06b6d4,
    hex: '#22d3ee',
  },
  radio_unit: {
    id: 'radio_unit',
    name: 'Unità Radio',
    shortName: 'Radio',
    badge: 'Ru',
    color: 0xec4899,
    hex: '#f472b6',
  },
  battery: {
    id: 'battery',
    name: 'Batteria',
    shortName: 'Batt.',
    badge: 'Bt',
    color: 0x84cc16,
    hex: '#a3e635',
  },
  supercomputer: {
    id: 'supercomputer',
    name: 'Supercomputer',
    shortName: 'SuperC',
    badge: 'Su',
    color: 0xa855f7,
    hex: '#c084fc',
  },
  turbo_motor: {
    id: 'turbo_motor',
    name: 'Motore Turbo',
    shortName: 'TurboM',
    badge: 'Tm',
    color: 0xf43f5e,
    hex: '#fb7185',
  },
  uranium_rod: {
    id: 'uranium_rod',
    name: 'Barra di Uranio',
    shortName: 'Ur.Rod',
    badge: 'Ur',
    color: 0x22c55e,
    hex: '#4ade80',
  },
  cooling_module: {
    id: 'cooling_module',
    name: 'Modulo Raffredd.',
    shortName: 'Raffr.',
    badge: 'Cl',
    color: 0x38bdf8,
    hex: '#7dd3fc',
  },
  fused_frame: {
    id: 'fused_frame',
    name: 'Frame Fuso',
    shortName: 'F.Frame',
    badge: 'Ff',
    color: 0xd946ef,
    hex: '#e879f9',
  },
  control_core: {
    id: 'control_core',
    name: 'Nucleo Controllo',
    shortName: 'Nucleo',
    badge: 'Nc',
    color: 0xfacc15,
    hex: '#fef08a',
  },
};

export const RECIPES: Record<string, Recipe> = {
  // === SMELTER (1 ingresso) ===
  iron_ingot: {
    id: 'iron_ingot',
    name: 'Lingotto di Ferro',
    building: 'smelter',
    inputs: [{ item: 'iron_ore', count: 1 }],
    output: { item: 'iron_ingot', count: 1 },
    durationSec: 2, // 30/min
  },
  copper_ingot: {
    id: 'copper_ingot',
    name: 'Lingotto di Rame',
    building: 'smelter',
    inputs: [{ item: 'copper_ore', count: 1 }],
    output: { item: 'copper_ingot', count: 1 },
    durationSec: 2, // 30/min
  },
  caterium_ingot: {
    id: 'caterium_ingot',
    name: 'Lingotto Caterium',
    building: 'smelter',
    inputs: [{ item: 'caterium_ore', count: 3 }],
    output: { item: 'caterium_ingot', count: 1 },
    durationSec: 4, // 15/min
  },

  // === FONDERIA (2 ingressi) ===
  steel_ingot: {
    id: 'steel_ingot',
    name: 'Lingotto d’Acciaio',
    building: 'foundry',
    inputs: [
      { item: 'iron_ore', count: 3 },
      { item: 'coal', count: 3 },
    ],
    output: { item: 'steel_ingot', count: 3 },
    durationSec: 4, // 45/min
  },
  aluminum_ingot: {
    id: 'aluminum_ingot',
    name: 'Lingotto d’Alluminio',
    building: 'foundry',
    inputs: [
      { item: 'bauxite', count: 2 },
      { item: 'silica', count: 1 },
    ],
    output: { item: 'aluminum_ingot', count: 2 },
    durationSec: 4, // 30/min
  },
  sulfuric_compound: {
    id: 'sulfuric_compound',
    name: 'Composto Solforico',
    building: 'foundry',
    inputs: [
      { item: 'sulfur', count: 2 },
      { item: 'coal', count: 1 },
    ],
    output: { item: 'sulfuric_compound', count: 2 },
    durationSec: 4, // 30/min
  },

  // === CONSTRUCTOR (1 ingresso) ===
  iron_plate: {
    id: 'iron_plate',
    name: 'Piastra di Ferro',
    building: 'constructor',
    inputs: [{ item: 'iron_ingot', count: 3 }],
    output: { item: 'iron_plate', count: 2 },
    durationSec: 6, // 20/min
  },
  iron_rod: {
    id: 'iron_rod',
    name: 'Barra di Ferro',
    building: 'constructor',
    inputs: [{ item: 'iron_ingot', count: 1 }],
    output: { item: 'iron_rod', count: 1 },
    durationSec: 4, // 15/min
  },
  screw: {
    id: 'screw',
    name: 'Viti',
    building: 'constructor',
    inputs: [{ item: 'iron_rod', count: 1 }],
    output: { item: 'screw', count: 4 },
    durationSec: 6, // 40/min
  },
  wire: {
    id: 'wire',
    name: 'Filo di Rame',
    building: 'constructor',
    inputs: [{ item: 'copper_ingot', count: 1 }],
    output: { item: 'wire', count: 2 },
    durationSec: 4, // 30/min
  },
  cable: {
    id: 'cable',
    name: 'Cavo Elettrico',
    building: 'constructor',
    inputs: [{ item: 'wire', count: 2 }],
    output: { item: 'cable', count: 1 },
    durationSec: 2, // 30/min
  },
  concrete: {
    id: 'concrete',
    name: 'Cemento',
    building: 'constructor',
    inputs: [{ item: 'limestone', count: 3 }],
    output: { item: 'concrete', count: 1 },
    durationSec: 4, // 15/min
  },
  steel_beam: {
    id: 'steel_beam',
    name: 'Trave d’Acciaio',
    building: 'constructor',
    inputs: [{ item: 'steel_ingot', count: 4 }],
    output: { item: 'steel_beam', count: 1 },
    durationSec: 4, // 15/min
  },
  steel_pipe: {
    id: 'steel_pipe',
    name: 'Tubo d’Acciaio',
    building: 'constructor',
    inputs: [{ item: 'steel_ingot', count: 3 }],
    output: { item: 'steel_pipe', count: 2 },
    durationSec: 6, // 20/min
  },
  quickwire: {
    id: 'quickwire',
    name: 'Quickwire',
    building: 'constructor',
    inputs: [{ item: 'caterium_ingot', count: 1 }],
    output: { item: 'quickwire', count: 5 },
    durationSec: 5, // 60/min
  },
  quartz_crystal: {
    id: 'quartz_crystal',
    name: 'Cristallo di Quarzo',
    building: 'constructor',
    inputs: [{ item: 'raw_quartz', count: 3 }],
    output: { item: 'quartz_crystal', count: 2 },
    durationSec: 6, // 20/min
  },
  silica: {
    id: 'silica',
    name: 'Silicio',
    building: 'constructor',
    inputs: [{ item: 'raw_quartz', count: 3 }],
    output: { item: 'silica', count: 4 },
    durationSec: 6, // 40/min
  },
  aluminum_sheet: {
    id: 'aluminum_sheet',
    name: 'Lamiera d’Alluminio',
    building: 'constructor',
    inputs: [{ item: 'aluminum_ingot', count: 3 }],
    output: { item: 'aluminum_sheet', count: 2 },
    durationSec: 4, // 30/min
  },

  // === ASSEMBLER (2 ingressi) ===
  reinforced_plate: {
    id: 'reinforced_plate',
    name: 'Piastra Rinforzata',
    building: 'assembler',
    inputs: [
      { item: 'iron_plate', count: 3 },
      { item: 'screw', count: 6 },
    ],
    output: { item: 'reinforced_plate', count: 1 },
    durationSec: 6, // 10/min
  },
  rotor: {
    id: 'rotor',
    name: 'Rotore',
    building: 'assembler',
    inputs: [
      { item: 'iron_rod', count: 2 },
      { item: 'screw', count: 6 },
    ],
    output: { item: 'rotor', count: 1 },
    durationSec: 6, // 10/min
  },
  modular_frame: {
    id: 'modular_frame',
    name: 'Frame Modulare',
    building: 'assembler',
    inputs: [
      { item: 'reinforced_plate', count: 2 },
      { item: 'iron_rod', count: 4 },
    ],
    output: { item: 'modular_frame', count: 1 },
    durationSec: 6, // 10/min
  },
  stator: {
    id: 'stator',
    name: 'Statore',
    building: 'assembler',
    inputs: [
      { item: 'steel_pipe', count: 2 },
      { item: 'wire', count: 6 },
    ],
    output: { item: 'stator', count: 1 },
    durationSec: 6, // 10/min
  },
  encased_beam: {
    id: 'encased_beam',
    name: 'Cemento Armato',
    building: 'assembler',
    inputs: [
      { item: 'steel_beam', count: 2 },
      { item: 'concrete', count: 3 },
    ],
    output: { item: 'encased_beam', count: 1 },
    durationSec: 6, // 10/min
  },
  circuit_board: {
    id: 'circuit_board',
    name: 'Scheda Elettronica',
    building: 'assembler',
    inputs: [
      { item: 'wire', count: 4 },
      { item: 'silica', count: 2 },
    ],
    output: { item: 'circuit_board', count: 1 },
    durationSec: 6, // 10/min
  },
  ai_limiter: {
    id: 'ai_limiter',
    name: 'Limitatore AI',
    building: 'assembler',
    inputs: [
      { item: 'quickwire', count: 4 },
      { item: 'copper_ingot', count: 2 },
    ],
    output: { item: 'ai_limiter', count: 1 },
    durationSec: 6, // 10/min
  },
  motor: {
    id: 'motor',
    name: 'Motore',
    building: 'assembler',
    inputs: [
      { item: 'rotor', count: 2 },
      { item: 'stator', count: 2 },
    ],
    output: { item: 'motor', count: 1 },
    durationSec: 6, // 10/min
  },
  heat_sink: {
    id: 'heat_sink',
    name: 'Dissipatore',
    building: 'assembler',
    inputs: [
      { item: 'aluminum_sheet', count: 3 },
      { item: 'wire', count: 4 },
    ],
    output: { item: 'heat_sink', count: 1 },
    durationSec: 6, // 10/min
  },

  // === MANUFACTURER (3 ingressi) ===
  heavy_frame: {
    id: 'heavy_frame',
    name: 'Frame Pesante',
    building: 'manufacturer',
    inputs: [
      { item: 'modular_frame', count: 2 },
      { item: 'encased_beam', count: 4 },
      { item: 'screw', count: 12 },
    ],
    output: { item: 'heavy_frame', count: 1 },
    durationSec: 10, // 6/min
  },
  computer: {
    id: 'computer',
    name: 'Computer',
    building: 'manufacturer',
    inputs: [
      { item: 'circuit_board', count: 2 },
      { item: 'cable', count: 4 },
      { item: 'screw', count: 8 },
    ],
    output: { item: 'computer', count: 1 },
    durationSec: 10, // 6/min
  },
  radio_unit: {
    id: 'radio_unit',
    name: 'Unità Radio',
    building: 'manufacturer',
    inputs: [
      { item: 'aluminum_sheet', count: 2 },
      { item: 'quartz_crystal', count: 2 },
      { item: 'computer', count: 1 },
    ],
    output: { item: 'radio_unit', count: 1 },
    durationSec: 10, // 6/min
  },
  battery: {
    id: 'battery',
    name: 'Batteria',
    building: 'manufacturer',
    inputs: [
      { item: 'aluminum_sheet', count: 2 },
      { item: 'sulfuric_compound', count: 2 },
      { item: 'wire', count: 4 },
    ],
    output: { item: 'battery', count: 2 },
    durationSec: 10, // 12/min
  },
  supercomputer: {
    id: 'supercomputer',
    name: 'Supercomputer',
    building: 'manufacturer',
    inputs: [
      { item: 'computer', count: 1 },
      { item: 'ai_limiter', count: 2 },
      { item: 'quickwire', count: 4 },
    ],
    output: { item: 'supercomputer', count: 1 },
    durationSec: 12, // 5/min
  },
  turbo_motor: {
    id: 'turbo_motor',
    name: 'Motore Turbo',
    building: 'manufacturer',
    inputs: [
      { item: 'motor', count: 2 },
      { item: 'radio_unit', count: 1 },
      { item: 'heat_sink', count: 2 },
    ],
    output: { item: 'turbo_motor', count: 1 },
    durationSec: 12, // 5/min
  },
  uranium_rod: {
    id: 'uranium_rod',
    name: 'Barra di Uranio',
    building: 'manufacturer',
    inputs: [
      { item: 'uranium_ore', count: 4 },
      { item: 'encased_beam', count: 2 },
      { item: 'sulfuric_compound', count: 2 },
    ],
    output: { item: 'uranium_rod', count: 1 },
    durationSec: 12, // 5/min
  },
  cooling_module: {
    id: 'cooling_module',
    name: 'Modulo Raffreddamento',
    building: 'manufacturer',
    inputs: [
      { item: 'heat_sink', count: 2 },
      { item: 'aluminum_sheet', count: 2 },
      { item: 'silica', count: 2 },
    ],
    output: { item: 'cooling_module', count: 1 },
    durationSec: 10, // 6/min
  },
  fused_frame: {
    id: 'fused_frame',
    name: 'Frame Fuso',
    building: 'manufacturer',
    inputs: [
      { item: 'heavy_frame', count: 1 },
      { item: 'aluminum_sheet', count: 4 },
      { item: 'sulfuric_compound', count: 2 },
    ],
    output: { item: 'fused_frame', count: 1 },
    durationSec: 12, // 5/min
  },
  control_core: {
    id: 'control_core',
    name: 'Nucleo di Controllo',
    building: 'manufacturer',
    inputs: [
      { item: 'supercomputer', count: 1 },
      { item: 'cooling_module', count: 1 },
      { item: 'uranium_rod', count: 1 },
    ],
    output: { item: 'control_core', count: 1 },
    durationSec: 15, // 4/min
  },
};

export function getRecipesForBuilding(type: BuildingType): Recipe[] {
  return Object.values(RECIPES).filter((r) => r.building === type);
}

export function getDefaultRecipe(type: BuildingType): string | undefined {
  return getRecipesForBuilding(type)[0]?.id;
}

// --- Progressione completa: 13 Tier dell'HUB (TIER 0 → TIER 12) ---

export interface MilestoneItemReq {
  item: ItemType;
  count: number;
}

export interface Milestone {
  id: string;
  tier: string;
  title: string;
  description: string;
  minPowerMW?: number;
  minItemsPerMin?: number;
  items: MilestoneItemReq[];
  unlocks?: string[];
}

export const HUB_MILESTONES: Milestone[] = [
  {
    id: 'm_0',
    tier: 'TIER 0',
    title: 'Avvio Rete Elettrica',
    description:
      'Piazza Generatore, Palo e Miner, cablali e consegna il primo Ferro Grezzo all’HUB.',
    minPowerMW: 30,
    items: [{ item: 'iron_ore', count: 20 }],
  },
  {
    id: 'm_1',
    tier: 'TIER 1',
    title: 'Metallurgia Base',
    description: 'Fondi ferro e rame negli Smelter per avviare la raffinazione.',
    minPowerMW: 30,
    items: [
      { item: 'iron_ingot', count: 40 },
      { item: 'copper_ingot', count: 30 },
    ],
    unlocks: ['Splitter', 'Merger'],
  },
  {
    id: 'm_2',
    tier: 'TIER 2',
    title: 'Componenti Base',
    description:
      'Automatizza piastre, barre, cemento e fili nei Constructor per sostenere la crescita.',
    minPowerMW: 45,
    minItemsPerMin: 60,
    items: [
      { item: 'iron_plate', count: 60 },
      { item: 'iron_rod', count: 50 },
      { item: 'concrete', count: 40 },
      { item: 'wire', count: 60 },
    ],
    unlocks: ['Assembler (2 ingressi)'],
  },
  {
    id: 'm_3',
    tier: 'TIER 3',
    title: 'Assemblaggio Rinforzato',
    description:
      'Usa l’Assembler per produrre Piastre Rinforzate e scala la produzione di cavi e viti.',
    minPowerMW: 60,
    minItemsPerMin: 90,
    items: [
      { item: 'reinforced_plate', count: 40 },
      { item: 'cable', count: 50 },
      { item: 'screw', count: 100 },
    ],
    unlocks: ['Fonderia (2 ingressi)', 'Centrale a Carbone (+75 MW)'],
  },
  {
    id: 'm_4',
    tier: 'TIER 4',
    title: 'Era dell’Acciaio',
    description:
      'Porta il Carbone in Fonderia con il Ferro per produrre Acciaio, Travi, Tubi e Rotori.',
    minPowerMW: 120,
    minItemsPerMin: 140,
    items: [
      { item: 'steel_beam', count: 60 },
      { item: 'steel_pipe', count: 60 },
      { item: 'rotor', count: 40 },
    ],
    unlocks: ['Nastro Mk.2 (120/min)', 'Miner Mk.2 (2× estrazione)'],
  },
  {
    id: 'm_5',
    tier: 'TIER 5',
    title: 'Ingegneria Pesante',
    description:
      'Potenzia le linee con Mk.2 e assembla Frame Modulari, Statori e Cemento Armato.',
    minPowerMW: 180,
    minItemsPerMin: 200,
    items: [
      { item: 'modular_frame', count: 35 },
      { item: 'stator', count: 40 },
      { item: 'encased_beam', count: 50 },
    ],
    unlocks: ['Spedizioni Caterium & Quarzo'],
  },
  {
    id: 'm_6',
    tier: 'TIER 6',
    title: 'Microelettronica',
    description:
      'Esplora la mappa per estrarre Caterium e Quarzo e produrre Quickwire, Silicio e Schede.',
    minPowerMW: 240,
    minItemsPerMin: 280,
    items: [
      { item: 'quickwire', count: 150 },
      { item: 'silica', count: 60 },
      { item: 'circuit_board', count: 40 },
    ],
  },
  {
    id: 'm_7',
    tier: 'TIER 7',
    title: 'Motorizzazione Industriale',
    description:
      'Combina Rotori e Statori nei Motori e produci Limitatori AI e Cristalli di Quarzo.',
    minPowerMW: 320,
    minItemsPerMin: 360,
    items: [
      { item: 'motor', count: 40 },
      { item: 'ai_limiter', count: 50 },
      { item: 'quartz_crystal', count: 60 },
    ],
    unlocks: ['Manufacturer (3 ingressi)'],
  },
  {
    id: 'm_8',
    tier: 'TIER 8',
    title: 'Calcolo & Chimica',
    description:
      'Attiva i Manufacturer a 3 ingressi per Computer e Frame Pesanti, e lavora lo Zolfo in Fonderia.',
    minPowerMW: 420,
    minItemsPerMin: 450,
    items: [
      { item: 'computer', count: 30 },
      { item: 'sulfuric_compound', count: 50 },
      { item: 'heavy_frame', count: 35 },
    ],
    unlocks: ['Raffinazione Bauxite (Alluminio)'],
  },
  {
    id: 'm_9',
    tier: 'TIER 9',
    title: 'Metallurgia Leggera',
    description:
      'Estrai la Bauxite, fondi l’Alluminio con il Silicio e costruisci Dissipatori e Unità Radio.',
    minPowerMW: 550,
    minItemsPerMin: 550,
    items: [
      { item: 'aluminum_sheet', count: 100 },
      { item: 'heat_sink', count: 50 },
      { item: 'radio_unit', count: 40 },
    ],
  },
  {
    id: 'm_10',
    tier: 'TIER 10',
    title: 'Stoccaggio & Potenza',
    description:
      'Automatizza Batterie, Supercomputer e Motori Turbo per accedere al nucleare.',
    minPowerMW: 750,
    minItemsPerMin: 700,
    items: [
      { item: 'battery', count: 60 },
      { item: 'supercomputer', count: 35 },
      { item: 'turbo_motor', count: 30 },
    ],
    unlocks: ['Reattore Nucleare (+250 MW)'],
  },
  {
    id: 'm_11',
    tier: 'TIER 11',
    title: 'Energia Nucleare',
    description:
      'Sfrutta l’Uranio dagli altopiani per produrre Barre di Uranio, Frame Fusi e Moduli di Raffreddamento.',
    minPowerMW: 1000,
    minItemsPerMin: 850,
    items: [
      { item: 'uranium_rod', count: 25 },
      { item: 'fused_frame', count: 45 },
      { item: 'cooling_module', count: 40 },
    ],
  },
  {
    id: 'm_12',
    tier: 'TIER 12',
    title: 'Progetto FICSIT: Fase Finale',
    description:
      'Completa la fornitura orbitale definitiva con Motori Turbo, Supercomputer, Frame Fusi e Nuclei di Controllo.',
    minPowerMW: 1500,
    minItemsPerMin: 1100,
    items: [
      { item: 'turbo_motor', count: 40 },
      { item: 'supercomputer', count: 30 },
      { item: 'fused_frame', count: 40 },
      { item: 'control_core', count: 25 },
    ],
    unlocks: ['Completamento Colonia'],
  },
];