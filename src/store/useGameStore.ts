import { create } from 'zustand';
import { evaluatePowerGrid } from '../engine/PowerGrid';
import {
  HUB_MILESTONES,
  RECIPES,
  RESOURCE_TO_ITEM,
} from '../engine/recipes';
import { Simulation } from '../engine/Simulation';
import {
  BUILDING_DEFS,
  CRAFTING_BUILDING_TYPES,
  isMinerType,
  PURITY_RATE,
  type BuildingType,
  type Direction,
  type ItemType,
  type PowerStats,
} from '../engine/types';
import { World, type WorldSaveData } from '../engine/World';

export const SAVE_STORAGE_KEY = 'factory-web-save-v1';

interface GameSavePayload {
  version: 1;
  savedAt: number;
  currentMilestoneIndex: number;
  world: WorldSaveData;
}

export interface CameraViewport {
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
}

export const world = new World(256);
export const simulation = new Simulation(world);

function loadInitialSave(): {
  hasSavedGame: boolean;
  lastSavedAt: number | null;
  currentMilestoneIndex: number;
} {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) {
      return { hasSavedGame: false, lastSavedAt: null, currentMilestoneIndex: 0 };
    }

    const parsed = JSON.parse(raw) as GameSavePayload;
    if (parsed?.version !== 1 || !parsed.world) {
      return { hasSavedGame: false, lastSavedAt: null, currentMilestoneIndex: 0 };
    }

    const ok = world.loadState(parsed.world);
    if (!ok) {
      return { hasSavedGame: false, lastSavedAt: null, currentMilestoneIndex: 0 };
    }

    const milestoneIdx = Math.max(
      0,
      Math.min(
        HUB_MILESTONES.length,
        typeof parsed.currentMilestoneIndex === 'number'
          ? parsed.currentMilestoneIndex
          : 0
      )
    );

    return {
      hasSavedGame: true,
      lastSavedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
      currentMilestoneIndex: milestoneIdx,
    };
  } catch {
    return { hasSavedGame: false, lastSavedAt: null, currentMilestoneIndex: 0 };
  }
}

const initialSave = loadInitialSave();

let lastTotalDelivered = world.totalDeliveredToHub;
const hubDeliveryEvents: { time: number; count: number }[] = [];
const RATE_WINDOW_MS = 30_000;
let saveToastTimer: number | null = null;
let cameraTargetSeq = 0;

function computeProductionMetrics(paused: boolean): {
  factoryItemsPerMin: number;
  hubItemsPerMin: number;
  itemRates: Partial<Record<ItemType, number>>;
} {
  const itemRates: Partial<Record<ItemType, number>> = {};
  let factoryItemsPerMin = 0;

  if (!paused) {
    for (const b of world.buildings.values()) {
      if (!b.powered || b.fuseBlown) continue;

      if (isMinerType(b.type)) {
        const node = world.getNode(b.x, b.y);
        if (!node) continue;
        const item = RESOURCE_TO_ITEM[node.type];
        const outCount = b.outputBuffer?.[item] ?? 0;
        if (outCount < 50) {
          const mult = BUILDING_DEFS[b.type].minerMultiplier ?? 1;
          const rate = PURITY_RATE[node.purity] * mult;
          factoryItemsPerMin += rate;
          itemRates[item] = (itemRates[item] ?? 0) + rate;
        }
      } else if (CRAFTING_BUILDING_TYPES.has(b.type)) {
        if (!b.recipeId) continue;
        const recipe = RECIPES[b.recipeId];
        if (!recipe) continue;

        const hasAllInputs = recipe.inputs.every(
          (req) => (b.inputBuffer?.[req.item] ?? 0) >= req.count
        );
        const outCount = b.outputBuffer?.[recipe.output.item] ?? 0;
        const hasSpace = outCount + recipe.output.count <= 50;

        if ((b.progress ?? 0) > 0 || (hasAllInputs && hasSpace)) {
          const rate = Math.round((recipe.output.count / recipe.durationSec) * 60);
          factoryItemsPerMin += rate;
          itemRates[recipe.output.item] =
            (itemRates[recipe.output.item] ?? 0) + rate;
        }
      }
    }
  }

  const now = performance.now();
  const currDelivered = world.totalDeliveredToHub;
  if (currDelivered > lastTotalDelivered) {
    hubDeliveryEvents.push({
      time: now,
      count: currDelivered - lastTotalDelivered,
    });
    lastTotalDelivered = currDelivered;
  }

  while (
    hubDeliveryEvents.length > 0 &&
    now - hubDeliveryEvents[0].time > RATE_WINDOW_MS
  ) {
    hubDeliveryEvents.shift();
  }

  let deliveredWindow = 0;
  for (const ev of hubDeliveryEvents) {
    deliveredWindow += ev.count;
  }

  const spanSec =
    hubDeliveryEvents.length > 1
      ? Math.min(30, Math.max(8, (now - hubDeliveryEvents[0].time) / 1000))
      : 15;
  const hubItemsPerMin =
    deliveredWindow > 0 ? Math.round((deliveredWindow / spanSec) * 60) : 0;

  return {
    factoryItemsPerMin: Math.round(factoryItemsPerMin),
    hubItemsPerMin,
    itemRates,
  };
}

interface GameStore {
  selectedBuilding: BuildingType | null;
  rotation: Direction;
  dismantleMode: boolean;
  wireMode: boolean;
  wireStartId: string | null;
  hoveredTile: { x: number; y: number } | null;
  inspectedTile: { x: number; y: number } | null;
  paused: boolean;
  showAltIcons: boolean;

  // Camera & Minimappa
  cameraViewport: CameraViewport;
  cameraTarget: { x: number; y: number; seq: number } | null;

  worldVersion: number;
  hudTick: number;
  buildingCount: number;
  powerStats: PowerStats;

  // Statistiche produzione & Obiettivi HUB
  factoryItemsPerMin: number;
  hubItemsPerMin: number;
  itemRates: Partial<Record<ItemType, number>>;
  currentMilestoneIndex: number;

  // Stato Salvataggio
  hasSavedGame: boolean;
  lastSavedAt: number | null;
  saveToast: string | null;

  selectBuilding: (type: BuildingType | null) => void;
  pickBuilding: (type: BuildingType, dir: Direction) => void;
  rotate: () => void;
  setRotation: (dir: Direction) => void;
  toggleDismantle: () => void;
  toggleWireMode: () => void;
  setWireStartId: (id: string | null) => void;
  clearTool: () => void;
  togglePause: () => void;
  toggleAltIcons: () => void;
  setHoveredTile: (tile: { x: number; y: number } | null) => void;
  setInspectedTile: (tile: { x: number; y: number } | null) => void;
  setBuildingRecipe: (x: number, y: number, recipeId: string) => void;
  setCameraViewport: (vp: CameraViewport) => void;
  panCameraTo: (x: number, y: number) => void;
  completeMilestone: () => boolean;
  saveGame: (isAuto?: boolean, customToast?: string) => boolean;
  clearSavedGame: () => void;
  notifyWorldChanged: () => void;
  syncHud: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  selectedBuilding: null,
  rotation: 1,
  dismantleMode: false,
  wireMode: false,
  wireStartId: null,
  hoveredTile: null,
  inspectedTile: null,
  paused: false,
  showAltIcons: true,

  cameraViewport: { x: 112, y: 118, w: 32, h: 20, scale: 1.15 },
  cameraTarget: null,

  worldVersion: 0,
  hudTick: 0,
  buildingCount: world.buildings.size,
  powerStats: evaluatePowerGrid(world),

  factoryItemsPerMin: 0,
  hubItemsPerMin: 0,
  itemRates: {},
  currentMilestoneIndex: initialSave.currentMilestoneIndex,

  hasSavedGame: initialSave.hasSavedGame,
  lastSavedAt: initialSave.lastSavedAt,
  saveToast: null,

  selectBuilding: (type) =>
    set((state) => {
      if (
        type !== null &&
        state.currentMilestoneIndex < BUILDING_DEFS[type].unlockTier
      ) {
        return state;
      }

      const isAlreadySelected =
        type !== null &&
        state.selectedBuilding === type &&
        !state.dismantleMode &&
        !state.wireMode;

      return {
        selectedBuilding: isAlreadySelected ? null : type,
        dismantleMode: false,
        wireMode: false,
        wireStartId: null,
      };
    }),

  pickBuilding: (type, dir) =>
    set((state) => {
      if (state.currentMilestoneIndex < BUILDING_DEFS[type].unlockTier) {
        return state;
      }
      return {
        selectedBuilding: type,
        rotation: dir,
        dismantleMode: false,
        wireMode: false,
        wireStartId: null,
      };
    }),

  rotate: () =>
    set((state) => ({
      rotation: ((state.rotation + 1) % 4) as Direction,
    })),

  setRotation: (dir) => set({ rotation: dir }),

  toggleDismantle: () =>
    set((state) => ({
      dismantleMode: !state.dismantleMode,
      wireMode: false,
      wireStartId: null,
      selectedBuilding: !state.dismantleMode ? null : state.selectedBuilding,
      inspectedTile: null,
    })),

  toggleWireMode: () =>
    set((state) => ({
      wireMode: !state.wireMode,
      wireStartId: null,
      dismantleMode: false,
      selectedBuilding: !state.wireMode ? null : state.selectedBuilding,
    })),

  setWireStartId: (id) => set({ wireStartId: id }),

  clearTool: () =>
    set({
      selectedBuilding: null,
      dismantleMode: false,
      wireMode: false,
      wireStartId: null,
    }),

  togglePause: () => set((state) => ({ paused: !state.paused })),

  toggleAltIcons: () => set((state) => ({ showAltIcons: !state.showAltIcons })),

  setHoveredTile: (tile) => set({ hoveredTile: tile }),

  setInspectedTile: (tile) => set({ inspectedTile: tile }),

  setBuildingRecipe: (x, y, recipeId) => {
    if (world.setRecipe(x, y, recipeId)) {
      set((state) => ({
        worldVersion: state.worldVersion + 1,
        hudTick: state.hudTick + 1,
      }));
    }
  },

  setCameraViewport: (vp) => set({ cameraViewport: vp }),

  panCameraTo: (x, y) =>
    set({
      cameraTarget: {
        x: Math.max(0, Math.min(world.size - 1, x)),
        y: Math.max(0, Math.min(world.size - 1, y)),
        seq: ++cameraTargetSeq,
      },
    }),

  completeMilestone: () => {
    const state = get();
    const milestone = HUB_MILESTONES[state.currentMilestoneIndex];
    if (!milestone) return false;

    if (
      milestone.minPowerMW &&
      world.powerStats.producedMW < milestone.minPowerMW
    ) {
      return false;
    }

    if (
      milestone.minItemsPerMin &&
      Math.max(state.factoryItemsPerMin, state.hubItemsPerMin) <
        milestone.minItemsPerMin
    ) {
      return false;
    }

    if (!world.spendCost(milestone.items)) {
      return false;
    }

    set((s) => ({
      currentMilestoneIndex: s.currentMilestoneIndex + 1,
      hudTick: s.hudTick + 1,
      worldVersion: s.worldVersion + 1,
    }));

    const unlockMsg =
      milestone.unlocks && milestone.unlocks.length > 0
        ? `${milestone.tier} completato · Sbloccato: ${milestone.unlocks.join(', ')}`
        : `${milestone.tier} completato!`;

    get().saveGame(true, unlockMsg);
    return true;
  },

  saveGame: (isAuto = false, customToast?: string) => {
    try {
      const now = Date.now();
      const payload: GameSavePayload = {
        version: 1,
        savedAt: now,
        currentMilestoneIndex: get().currentMilestoneIndex,
        world: world.serialize(),
      };
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));

      if (saveToastTimer !== null) {
        window.clearTimeout(saveToastTimer);
      }

      set({
        hasSavedGame: true,
        lastSavedAt: now,
        saveToast:
          customToast ?? (isAuto ? 'Autosave completato' : 'Partita salvata'),
      });

      saveToastTimer = window.setTimeout(() => {
        set({ saveToast: null });
        saveToastTimer = null;
      }, customToast ? 4200 : 2800);

      return true;
    } catch {
      return false;
    }
  },

  clearSavedGame: () => {
    try {
      localStorage.removeItem(SAVE_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
    set({
      hasSavedGame: false,
      lastSavedAt: null,
      saveToast: null,
    });
  },

  notifyWorldChanged: () =>
    set((state) => ({
      worldVersion: state.worldVersion + 1,
      buildingCount: world.buildings.size,
      powerStats: evaluatePowerGrid(world),
    })),

  syncHud: () =>
    set((state) => {
      const metrics = computeProductionMetrics(state.paused);
      return {
        hudTick: state.hudTick + 1,
        powerStats: world.powerStats,
        ...metrics,
      };
    }),
}));