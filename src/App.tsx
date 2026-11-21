import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Menu, Save } from 'lucide-react';
import { PixiApp } from './renderer/PixiApp';
import { useGameStore } from './store/useGameStore';
import { Hotbar } from './ui/Hotbar';
import { Inspector } from './ui/Inspector';
import { MainMenu } from './ui/MainMenu';
import { TopBar } from './ui/TopBar';

const AUTOSAVE_INTERVAL_MS = 2 * 60 * 1000; // 2 minuti

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [showMenu, setShowMenu] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  const saveGame = useGameStore((s) => s.saveGame);
  const clearSavedGame = useGameStore((s) => s.clearSavedGame);
  const saveToast = useGameStore((s) => s.saveToast);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const pixi = new PixiApp(el);
    return () => {
      pixi.destroy();
    };
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

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-950">
      <div ref={mountRef} className="h-full w-full" />

      {!showMenu && (
        <>
          <TopBar />
          <Inspector />
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
        </>
      )}

      {/* Notifica toast di salvataggio / autosave */}
      {saveToast && (
        <div className="pointer-events-none fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-zinc-950/95 px-3.5 py-2 text-xs font-semibold text-emerald-300 shadow-2xl backdrop-blur">
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