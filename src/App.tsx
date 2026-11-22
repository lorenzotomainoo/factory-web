import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Menu, Save } from 'lucide-react';
import { PixiApp } from './renderer/PixiApp';
import { useGameStore, world } from './store/useGameStore';
import { Hotbar } from './ui/Hotbar';
import { Inspector } from './ui/Inspector';
import { MainMenu } from './ui/MainMenu';
import { Minimap } from './ui/Minimap';
import { TopBar } from './ui/TopBar';

const AUTOSAVE_INTERVAL_MS = 2 * 60 * 1000; // 2 minuti

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const pointerPosRef = useRef({ x: -999, y: -999 });
  const [overCanvas, setOverCanvas] = useState(false);
  const [showMenu, setShowMenu] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  const saveGame = useGameStore((s) => s.saveGame);
  const clearSavedGame = useGameStore((s) => s.clearSavedGame);
  const saveToast = useGameStore((s) => s.saveToast);

  // Stato per il tooltip di errore vicino al cursore
  const hoveredTile = useGameStore((s) => s.hoveredTile);
  const selectedBuilding = useGameStore((s) => s.selectedBuilding);
  const dismantleMode = useGameStore((s) => s.dismantleMode);
  const wireMode = useGameStore((s) => s.wireMode);
  const wireStartId = useGameStore((s) => s.wireStartId);
  useGameStore((s) => s.worldVersion);
  useGameStore((s) => s.hudTick);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const pixi = new PixiApp(el);
    return () => {
      pixi.destroy();
    };
  }, []);

  // Traccia la posizione del cursore a 60 FPS senza causare re-render React
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      const isCanvas = Boolean(target && mountRef.current?.contains(target));
      setOverCanvas(isCanvas);

      const x = Math.min(e.clientX + 18, window.innerWidth - 230);
      const y = Math.min(e.clientY + 18, window.innerHeight - 44);
      pointerPosRef.current = { x, y };

      if (tooltipRef.current) {
        tooltipRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  // Autosave automatico ogni 2 minuti mentre sei in partita
  useEffect(() => {
    if (showMenu) return;

    const id = window.setInterval(() => {
      saveGame(true);
    }, AUTOSAVE_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [showMenu, saveGame]);

  // Scorciatoia Ctrl + S per salvare subito in qualsiasi momento
  useEffect(() => {
    if (showMenu) return;

    const handleSaveShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        saveGame(false);
      }
    };

    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, [showMenu, saveGame]);

  // Blocca i tasti del gioco mentre il menù è aperto (Esc riprende se già avviato)
  useEffect(() => {
    if (!showMenu) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && hasStarted) {
        setShowMenu(false);
      }
      e.stopImmediatePropagation();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [showMenu, hasStarted]);

  const handlePlay = () => {
    setHasStarted(true);
    setShowMenu(false);
  };

  const handleRestart = () => {
    clearSavedGame();
    window.location.reload();
  };

  // Calcola l'eventuale motivo di errore del ghost rosso sulla cella puntata
  let cursorError: string | null = null;
  if (!showMenu && overCanvas && hoveredTile) {
    if (wireMode) {
      cursorError = world.getWireError(wireStartId, hoveredTile.x, hoveredTile.y);
    } else if (selectedBuilding && !dismantleMode) {
      cursorError = world.getPlacementError(
        selectedBuilding,
        hoveredTile.x,
        hoveredTile.y
      );
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-950">
      <div ref={mountRef} className="h-full w-full" />

      {!showMenu && (
        <>
          <TopBar />
          <Inspector />
          <Minimap />
          <Hotbar />

          {/* Pulsanti rapidi Menù + Salva in basso a sinistra */}
          <div className="fixed bottom-4 left-4 z-10 flex items-center gap-2">
            <button
              onClick={() => setShowMenu(true)}
              title="Apri Menù"
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/90 px-3.5 py-2.5 text-xs font-semibold text-zinc-300 shadow-xl backdrop-blur transition hover:border-amber-400/60 hover:text-amber-300"
            >
              <Menu className="h-4 w-4" />
              <span>Menù</span>
            </button>

            <button
              onClick={() => saveGame(false)}
              title="Salva partita (Ctrl + S) — Autosave attivo ogni 2 min"
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/90 px-3.5 py-2.5 text-xs font-semibold text-zinc-300 shadow-xl backdrop-blur transition hover:border-emerald-400/60 hover:text-emerald-300"
            >
              <Save className="h-4 w-4" />
              <span>Salva</span>
            </button>
          </div>

          {/* Tooltip vicino al cursore quando il piazzamento o il cavo è bloccato */}
          {cursorError && (
            <div
              ref={tooltipRef}
              style={{
                transform: `translate3d(${pointerPosRef.current.x}px, ${pointerPosRef.current.y}px, 0)`,
              }}
              className="pointer-events-none fixed top-0 left-0 z-40 flex items-center gap-1.5 rounded-lg border border-red-500/60 bg-zinc-950/95 px-2.5 py-1 text-[11px] font-semibold text-red-300 shadow-2xl backdrop-blur"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
              <span className="whitespace-nowrap">{cursorError}</span>
            </div>
          )}
        </>
      )}

      {/* Notifica toast di salvataggio / autosave */}
      {saveToast && (
        <div className="pointer-events-none fixed top-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-emerald-500/40 bg-zinc-950/95 px-3.5 py-2 text-xs font-semibold text-emerald-300 shadow-2xl backdrop-blur">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{saveToast}</span>
        </div>
      )}

      {showMenu && (
        <MainMenu
          hasStarted={hasStarted}
          onPlay={handlePlay}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}