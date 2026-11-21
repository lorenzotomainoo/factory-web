import { Application, Container } from 'pixi.js';
import {
  BUILDING_DEFS,
  HOTBAR_BUILDINGS,
  type Direction,
} from '../engine/types';
import { simulation, useGameStore, world } from '../store/useGameStore';
import { BeltRenderer } from './BeltRenderer';
import { GridRenderer, TILE_SIZE } from './GridRenderer';

export class PixiApp {
  private app = new Application();
  private worldContainer = new Container();
  private gridRenderer: GridRenderer | null = null;
  private beltRenderer: BeltRenderer | null = null;
  private container: HTMLElement;

  private destroyed = false;
  private initialized = false;

  // Stato input camera e mouse
  private keys = new Set<string>();
  private isPanning = false;
  private isPainting = false;
  private panMoved = false;
  private lastPointer = { x: 0, y: 0 };
  private lastBeltTile: { x: number; y: number } | null = null;
  private hudAccumMs = 0;
  private elapsedSec = 0;
  private unsubscribeStore: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    void this.init();
  }

  private async init() {
    await this.app.init({
      background: '#0b0d12',
      resizeTo: this.container,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }

    this.initialized = true;
    this.container.appendChild(this.app.canvas);

    this.gridRenderer = new GridRenderer(world);
    this.beltRenderer = new BeltRenderer(world);

    this.worldContainer.addChild(this.gridRenderer.root);
    this.worldContainer.addChild(this.beltRenderer.root);
    this.app.stage.addChild(this.worldContainer);

    this.centerCamera();
    this.bindEvents();

    this.unsubscribeStore = useGameStore.subscribe((state, prev) => {
      if (!this.gridRenderer) return;
      if (state.worldVersion !== prev.worldVersion) {
        this.gridRenderer.drawBuildings();
      }
      if (
        state.hoveredTile !== prev.hoveredTile ||
        state.selectedBuilding !== prev.selectedBuilding ||
        state.rotation !== prev.rotation ||
        state.dismantleMode !== prev.dismantleMode ||
        state.wireMode !== prev.wireMode ||
        state.wireStartId !== prev.wireStartId ||
        state.worldVersion !== prev.worldVersion
      ) {
        this.gridRenderer.drawGhost(
          state.hoveredTile,
          state.selectedBuilding,
          state.rotation,
          state.dismantleMode,
          state.wireMode,
          state.wireStartId
        );
      }
    });

    this.app.ticker.add((ticker) => {
      const speed = 10 * ticker.deltaTime;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
        this.worldContainer.y += speed;
      }
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
        this.worldContainer.y -= speed;
      }
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
        this.worldContainer.x += speed;
      }
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
        this.worldContainer.x -= speed;
      }

      const dtSec = ticker.deltaMS / 1000;
      this.elapsedSec += dtSec;

      const state = useGameStore.getState();
      if (!state.paused) {
        simulation.step(dtSec);
      }

      this.beltRenderer?.render(this.elapsedSec);

      this.hudAccumMs += ticker.deltaMS;
      if (this.hudAccumMs >= 200) {
        this.hudAccumMs = 0;
        this.gridRenderer?.drawWires();
        state.syncHud();
      }
    });
  }

  centerCamera() {
    const centerPx = (world.size * TILE_SIZE) / 2;
    const scale = 1.15;
    this.worldContainer.scale.set(scale);
    this.worldContainer.x = this.app.screen.width / 2 - centerPx * scale;
    this.worldContainer.y = this.app.screen.height / 2 - centerPx * scale;
  }

  private screenToTile(clientX: number, clientY: number) {
    const rect = this.app.canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;

    const wx = (sx - this.worldContainer.x) / this.worldContainer.scale.x;
    const wy = (sy - this.worldContainer.y) / this.worldContainer.scale.y;

    return {
      x: Math.floor(wx / TILE_SIZE),
      y: Math.floor(wy / TILE_SIZE),
    };
  }

  private handleWireClick(x: number, y: number) {
    const state = useGameStore.getState();
    const target = world.getBuilding(x, y);

    if (!target || BUILDING_DEFS[target.type].maxConnections === 0) {
      state.setWireStartId(null);
      return;
    }

    if (!state.wireStartId) {
      state.setWireStartId(target.id);
      return;
    }

    if (state.wireStartId === target.id) {
      state.setWireStartId(null);
      return;
    }

    if (world.hasWireBetween(state.wireStartId, target.id)) {
      world.removeWireBetween(state.wireStartId, target.id);
      state.setWireStartId(null);
      state.notifyWorldChanged();
      return;
    }

    if (world.addWire(state.wireStartId, target.id)) {
      state.setWireStartId(null);
      state.notifyWorldChanged();
    } else {
      state.setWireStartId(target.id);
    }
  }

  /** Trascinamento intelligente dei nastri: ruota e curva automaticamente a 90° */
  private stepBeltDrag(targetX: number, targetY: number) {
    if (!this.lastBeltTile) return;

    let cx = this.lastBeltTile.x;
    let cy = this.lastBeltTile.y;
    let changed = false;
    let steps = 0;

    while ((cx !== targetX || cy !== targetY) && steps < 32) {
      steps++;
      const dx = targetX - cx;
      const dy = targetY - cy;

      const prevBelt = world.getBuilding(cx, cy);
      const continueHorizontal =
        prevBelt?.type === 'belt'
          ? prevBelt.dir === 1 || prevBelt.dir === 3
          : Math.abs(dx) >= Math.abs(dy);

      let sx = 0;
      let sy = 0;
      if (dx !== 0 && dy !== 0) {
        if (continueHorizontal) sx = Math.sign(dx);
        else sy = Math.sign(dy);
      } else if (dx !== 0) {
        sx = Math.sign(dx);
      } else {
        sy = Math.sign(dy);
      }

      const stepDir: Direction =
        sx === 1 ? 1 : sx === -1 ? 3 : sy === 1 ? 2 : 0;
      const nx = cx + sx;
      const ny = cy + sy;

      if (world.canPlace('belt', nx, ny)) {
        if (prevBelt?.type === 'belt') {
          prevBelt.dir = stepDir;
        }
        world.placeBuilding('belt', nx, ny, stepDir);
        useGameStore.getState().setRotation(stepDir);
        cx = nx;
        cy = ny;
        changed = true;
      } else {
        // Se trascini dentro una macchina o un altro nastro, aggancia l'uscita automaticamente
        const target = world.getBuilding(nx, ny);
        const opposite = ((stepDir + 2) % 4) as Direction;
        const isFeedingBack =
          target?.type === 'belt' && target.dir === opposite;

        if (
          target &&
          !isFeedingBack &&
          prevBelt?.type === 'belt' &&
          (target.type === 'belt' ||
            target.type === 'smelter' ||
            target.type === 'constructor' ||
            target.type === 'splitter' ||
            target.type === 'merger' ||
            target.type === 'hub')
        ) {
          prevBelt.dir = stepDir;
          useGameStore.getState().setRotation(stepDir);
          changed = true;
        }
        break;
      }
    }

    this.lastBeltTile = { x: cx, y: cy };
    if (changed) {
      useGameStore.getState().notifyWorldChanged();
    }
  }

  private applyToolAt(x: number, y: number, isClick: boolean) {
    const state = useGameStore.getState();

    if (state.wireMode) {
      if (isClick) this.handleWireClick(x, y);
      return;
    }

    if (state.dismantleMode) {
      if (world.removeBuilding(x, y)) {
        if (
          state.inspectedTile &&
          state.inspectedTile.x === x &&
          state.inspectedTile.y === y
        ) {
          state.setInspectedTile(null);
        }
        state.notifyWorldChanged();
      }
      return;
    }

    if (state.selectedBuilding === 'belt') {
      if (world.placeBuilding('belt', x, y, state.rotation)) {
        this.lastBeltTile = { x, y };
        state.notifyWorldChanged();
        return;
      }

      const existing = world.getBuilding(x, y);
      if (existing?.type === 'belt') {
        this.lastBeltTile = { x, y };
        return;
      }

      if (isClick && existing) {
        state.setInspectedTile({ x, y });
      }
      return;
    }

    if (state.selectedBuilding) {
      if (world.placeBuilding(state.selectedBuilding, x, y, state.rotation)) {
        state.notifyWorldChanged();
        return;
      }

      if (isClick) {
        const existing = world.getBuilding(x, y);
        if (existing && existing.type !== 'belt') {
          state.setInspectedTile({ x, y });
        }
      }
      return;
    }

    if (isClick) {
      const existing = world.getBuilding(x, y);
      state.setInspectedTile(existing ? { x, y } : null);
    }
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button === 1 || e.button === 2) {
      this.isPanning = true;
      this.panMoved = false;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button === 0) {
      this.isPainting = true;
      this.lastBeltTile = null;
      const tile = this.screenToTile(e.clientX, e.clientY);
      this.applyToolAt(tile.x, tile.y, true);
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.isPanning) {
      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.panMoved = true;

      this.worldContainer.x += dx;
      this.worldContainer.y += dy;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      return;
    }

    const tile = this.screenToTile(e.clientX, e.clientY);
    const prev = useGameStore.getState().hoveredTile;

    if (!prev || prev.x !== tile.x || prev.y !== tile.y) {
      useGameStore.getState().setHoveredTile(tile);
      if (this.isPainting) {
        const state = useGameStore.getState();
        if (
          state.selectedBuilding === 'belt' &&
          !state.dismantleMode &&
          !state.wireMode &&
          this.lastBeltTile
        ) {
          this.stepBeltDrag(tile.x, tile.y);
        } else {
          this.applyToolAt(tile.x, tile.y, false);
        }
      }
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.button === 2 && !this.panMoved) {
      const state = useGameStore.getState();
      if (state.wireMode && state.wireStartId) {
        state.setWireStartId(null);
      } else {
        state.clearTool();
      }
    }
    this.isPanning = false;
    this.isPainting = false;
    this.lastBeltTile = null;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = this.app.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const oldScale = this.worldContainer.scale.x;
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const newScale = Math.min(2.6, Math.max(0.35, oldScale * factor));

    const wx = (mx - this.worldContainer.x) / oldScale;
    const wy = (my - this.worldContainer.y) / oldScale;

    this.worldContainer.scale.set(newScale);
    this.worldContainer.x = mx - wx * newScale;
    this.worldContainer.y = my - wy * newScale;
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);

    const state = useGameStore.getState();

    if (e.code === 'KeyR') {
      state.rotate();
    } else if (e.code === 'KeyX') {
      state.toggleDismantle();
    } else if (e.code === 'Escape') {
      state.clearTool();
      state.setInspectedTile(null);
    } else if (e.code === 'KeyC') {
      this.centerCamera();
    } else if (e.code === 'Space') {
      e.preventDefault();
      state.togglePause();
    } else if (e.key === '9') {
      state.toggleWireMode();
    } else if (e.key >= '1' && e.key <= String(HOTBAR_BUILDINGS.length)) {
      const idx = Number(e.key) - 1;
      state.selectBuilding(HOTBAR_BUILDINGS[idx]);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private bindEvents() {
    const canvas = this.app.canvas;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  destroy() {
    this.destroyed = true;
    this.unsubscribeStore?.();

    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    if (this.initialized) {
      const canvas = this.app.canvas;
      canvas.removeEventListener('pointerdown', this.onPointerDown);
      canvas.removeEventListener('wheel', this.onWheel);
      canvas.removeEventListener('contextmenu', this.onContextMenu);
      this.app.destroy(true);
    }
  }
}