import { useEffect, useRef, useState } from 'react';
import { Crosshair, Map as MapIcon, Minimize2 } from 'lucide-react';
import { RESOURCE_META, TERRAIN_META } from '../engine/types';
import { useGameStore, world } from '../store/useGameStore';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function createBaseTerrainCanvas(): HTMLCanvasElement {
  const size = world.size;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const img = ctx.createImageData(size, size);
  const data = img.data;

  // Cache RGB dei biomi
  const terrainRgb = new Map<string, [number, number, number]>();
  for (const [key, meta] of Object.entries(TERRAIN_META)) {
    terrainRgb.set(key, hexToRgb(meta.hex));
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const biome = world.terrain[idx];
      const rgb = terrainRgb.get(biome) ?? [30, 30, 30];

      // Leggera ombreggiatura in base alla quota per leggere subito montagne e laghi
      const elev = world.elevation[idx];
      const shade = elev < 0.34 ? 0.72 + elev * 0.8 : 0.78 + elev * 0.36;

      const p = idx * 4;
      data[p] = Math.min(255, Math.round(rgb[0] * shade));
      data[p + 1] = Math.min(255, Math.round(rgb[1] * shade));
      data[p + 2] = Math.min(255, Math.round(rgb[2] * shade));
      data[p + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);

  // Disegna i giacimenti di minerali sopra la mappa base
  for (const node of world.nodes.values()) {
    ctx.fillStyle = '#09090b';
    ctx.fillRect(node.x - 1, node.y - 1, 3, 3);
    ctx.fillStyle = RESOURCE_META[node.type].hex;
    ctx.fillRect(node.x, node.y, 2, 2);
  }

  return canvas;
}

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseTerrainRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef(false);
  const [collapsed, setCollapsed] = useState(false);

  const cameraViewport = useGameStore((s) => s.cameraViewport);
  const worldVersion = useGameStore((s) => s.worldVersion);
  const panCameraTo = useGameStore((s) => s.panCameraTo);

  // Tasto rapido M per aprire/chiudere la minimappa
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') {
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Ridisegna layer dinamico (edifici + rettangolo camera) sopra il terreno cachato
  useEffect(() => {
    if (collapsed) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!baseTerrainRef.current) {
      baseTerrainRef.current = createBaseTerrainCanvas();
    }

    const size = world.size;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(baseTerrainRef.current, 0, 0);

    // 1. Edifici piazzati dal giocatore
    for (const b of world.buildings.values()) {
      if (b.type === 'hub') continue;

      if (b.type === 'belt') {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(b.x, b.y, 2, 2);
      } else if (b.type === 'generator') {
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(b.x - 1, b.y - 1, 3, 3);
      } else if (b.type === 'pole') {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(b.x, b.y, 2, 2);
      } else {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(b.x - 1, b.y - 1, 3, 3);
      }
    }

    // 2. HUB centrale ben visibile
    const hub = Math.floor(size / 2);
    ctx.fillStyle = '#09090b';
    ctx.fillRect(hub - 3, hub - 3, 7, 7);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(hub - 2, hub - 2, 5, 5);

    // 3. Rettangolo della visuale camera corrente
    const vx = cameraViewport.x;
    const vy = cameraViewport.y;
    const vw = Math.max(5, cameraViewport.w);
    const vh = Math.max(5, cameraViewport.h);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(vx, vy, vw, vh);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(vx, vy, vw, vh);
  }, [cameraViewport, worldVersion, collapsed]);

  const navigateFromPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    panCameraTo(nx * world.size, ny * world.size);
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        title="Apri Minimappa (M)"
        className="fixed bottom-16 left-4 z-10 flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/92 px-3 py-2 text-xs font-semibold text-zinc-300 shadow-xl backdrop-blur transition hover:border-amber-400/60 hover:text-amber-300"
      >
        <MapIcon className="h-4 w-4 text-amber-400" />
        <span>Mappa</span>
      </button>
    );
  }

  const zoomPct = Math.round(cameraViewport.scale * 100);

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed bottom-16 left-4 z-10 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/94 shadow-2xl backdrop-blur"
    >
      {/* Header Minimappa */}
      <div className="flex items-center justify-between border-b border-zinc-800/90 px-2.5 py-1.5 text-[10px]">
        <div className="flex items-center gap-1.5 font-mono font-bold text-zinc-300">
          <MapIcon className="h-3.5 w-3.5 text-amber-400" />
          <span>MAPPA</span>
          <span className="text-zinc-500">{zoomPct}%</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => panCameraTo(world.size / 2, world.size / 2)}
            title="Centra sull'HUB (C)"
            className="rounded p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-amber-300"
          >
            <Crosshair className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setCollapsed(true)}
            title="Riduci minimappa (M)"
            className="rounded p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas Interattivo */}
      <canvas
        ref={canvasRef}
        width={world.size}
        height={world.size}
        onPointerDown={(e) => {
          e.stopPropagation();
          draggingRef.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          navigateFromPointer(e);
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current) return;
          navigateFromPointer(e);
        }}
        onPointerUp={(e) => {
          draggingRef.current = false;
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        }}
        className="block h-44 w-44 cursor-crosshair select-none"
      />
    </div>
  );
}