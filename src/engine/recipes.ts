import type { BuildingType, ItemMeta, ItemType, Recipe, ResourceType } from './types';

export const RESOURCE_TO_ITEM: Record<ResourceType, ItemType> = {
  iron: 'iron_ore',
  copper: 'copper_ore',
  limestone: 'limestone',
  coal: 'coal',
};

export const ITEM_META: Record<ItemType, ItemMeta> = {
  iron_ore: {
    id: 'iron_ore',
    name: 'Ferro Grezzo',
    shortName: 'Fe Ore',
    color: 0x94a3b8,
    hex: '#94a3b8',
  },
  copper_ore: {
    id: 'copper_ore',
    name: 'Rame Grezzo',
    shortName: 'Cu Ore',
    color: 0xea580c,
    hex: '#ea580c',
  },
  limestone: {
    id: 'limestone',
    name: 'Calcare',
    shortName: 'Calc.',
    color: 0xd6d3d1,
    hex: '#d6d3d1',
  },
  coal: {
    id: 'coal',
    name: 'Carbone',
    shortName: 'Carb.',
    color: 0x475569,
    hex: '#64748b',
  },
  iron_ingot: {
    id: 'iron_ingot',
    name: 'Lingotto di Ferro',
    shortName: 'Fe Ing',
    color: 0xcbd5e1,
    hex: '#cbd5e1',
  },
  copper_ingot: {
    id: 'copper_ingot',
    name: 'Lingotto di Rame',
    shortName: 'Cu Ing',
    color: 0xfb923c,
    hex: '#fb923c',
  },
  iron_plate: {
    id: 'iron_plate',
    name: 'Piastra di Ferro',
    shortName: 'Plate',
    color: 0xe2e8f0,
    hex: '#e2e8f0',
  },
  iron_rod: {
    id: 'iron_rod',
    name: 'Barra di Ferro',
    shortName: 'Rod',
    color: 0x60a5fa,
    hex: '#60a5fa',
  },
  screw: {
    id: 'screw',
    name: 'Viti',
    shortName: 'Screw',
    color: 0x38bdf8,
    hex: '#38bdf8',
  },
  wire: {
    id: 'wire',
    name: 'Filo di Rame',
    shortName: 'Wire',
    color: 0xf97316,
    hex: '#f97316',
  },
  cable: {
    id: 'cable',
    name: 'Cavo Elettrico',
    shortName: 'Cable',
    color: 0xfacc15,
    hex: '#facc15',
  },
  concrete: {
    id: 'concrete',
    name: 'Cemento',
    shortName: 'Cem.',
    color: 0xa8a29e,
    hex: '#a8a29e',
  },
};

export const RECIPES: Record<string, Recipe> = {
  // Smelter
  iron_ingot: {
    id: 'iron_ingot',
    name: 'Lingotto di Ferro',
    building: 'smelter',
    input: { item: 'iron_ore', count: 1 },
    output: { item: 'iron_ingot', count: 1 },
    durationSec: 2, // 30/min
  },
  copper_ingot: {
    id: 'copper_ingot',
    name: 'Lingotto di Rame',
    building: 'smelter',
    input: { item: 'copper_ore', count: 1 },
    output: { item: 'copper_ingot', count: 1 },
    durationSec: 2, // 30/min
  },

  // Constructor
  iron_plate: {
    id: 'iron_plate',
    name: 'Piastra di Ferro',
    building: 'constructor',
    input: { item: 'iron_ingot', count: 3 },
    output: { item: 'iron_plate', count: 2 },
    durationSec: 6, // 20/min
  },
  iron_rod: {
    id: 'iron_rod',
    name: 'Barra di Ferro',
    building: 'constructor',
    input: { item: 'iron_ingot', count: 1 },
    output: { item: 'iron_rod', count: 1 },
    durationSec: 4, // 15/min
  },
  screw: {
    id: 'screw',
    name: 'Viti',
    building: 'constructor',
    input: { item: 'iron_rod', count: 1 },
    output: { item: 'screw', count: 4 },
    durationSec: 6, // 40/min
  },
  wire: {
    id: 'wire',
    name: 'Filo di Rame',
    building: 'constructor',
    input: { item: 'copper_ingot', count: 1 },
    output: { item: 'wire', count: 2 },
    durationSec: 4, // 30/min
  },
  cable: {
    id: 'cable',
    name: 'Cavo Elettrico',
    building: 'constructor',
    input: { item: 'wire', count: 2 },
    output: { item: 'cable', count: 1 },
    durationSec: 2, // 30/min
  },
  concrete: {
    id: 'concrete',
    name: 'Cemento',
    building: 'constructor',
    input: { item: 'limestone', count: 3 },
    output: { item: 'concrete', count: 1 },
    durationSec: 4, // 15/min
  },
};

export function getRecipesForBuilding(type: BuildingType): Recipe[] {
  return Object.values(RECIPES).filter((r) => r.building === type);
}

export function getDefaultRecipe(type: BuildingType): string | undefined {
  return getRecipesForBuilding(type)[0]?.id;
}

// --- Obiettivi / Milestone HUB ---

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
}

export const HUB_MILESTONES: Milestone[] = [
  {
    id: 'm_0',
    tier: 'TIER 0',
    title: 'Avvio Rete Elettrica',
    description: 'Genera almeno 30 MW, cabla un Miner e invia Ferro Grezzo all’HUB.',
    minPowerMW: 30,
    items: [{ item: 'iron_ore', count: 20 }],
  },
  {
    id: 'm_1',
    tier: 'TIER 1',
    title: 'Metallurgia Base',
    description: 'Fondi ferro e rame negli Smelter e consegna i lingotti all’HUB.',
    items: [
      { item: 'iron_ingot', count: 30 },
      { item: 'copper_ingot', count: 20 },
    ],
  },
  {
    id: 'm_2',
    tier: 'TIER 2',
    title: 'Linee di Assemblaggio',
    description: 'Avvia i Constructor per produrre piastre, barre e cemento.',
    items: [
      { item: 'iron_plate', count: 40 },
      { item: 'iron_rod', count: 30 },
      { item: 'concrete', count: 20 },
    ],
  },
  {
    id: 'm_3',
    tier: 'TIER 3',
    title: 'Infrastruttura Elettrica',
    description: 'Automatizza fili, cavi elettrici e viti in serie.',
    minPowerMW: 60,
    items: [
      { item: 'wire', count: 80 },
      { item: 'cable', count: 30 },
      { item: 'screw', count: 60 },
    ],
  },
  {
    id: 'm_4',
    tier: 'TIER 4',
    title: 'Espansione Industriale',
    description: 'Scala la rete e raggiungi una produzione sostenuta.',
    minPowerMW: 90,
    minItemsPerMin: 120,
    items: [
      { item: 'iron_plate', count: 100 },
      { item: 'cable', count: 60 },
      { item: 'concrete', count: 80 },
    ],
  },
  {
    id: 'm_5',
    tier: 'TIER 5',
    title: 'Progetto FICSIT Fase 1',
    description: 'Completa la prima grande fornitura orbitale della colonia.',
    minPowerMW: 150,
    minItemsPerMin: 200,
    items: [
      { item: 'screw', count: 200 },
      { item: 'iron_plate', count: 150 },
      { item: 'cable', count: 100 },
      { item: 'concrete', count: 120 },
    ],
  },
];