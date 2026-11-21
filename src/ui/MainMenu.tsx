import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Clock,
  Cpu,
  Factory,
  Keyboard,
  Play,
  RotateCcw,
  Save,
  Zap,
} from 'lucide-react';
import { useGameStore, world } from '../store/useGameStore';

interface MainMenuProps {
  hasStarted: boolean;
  onPlay: () => void;
  onRestart: () => void;
}

const TELEMETRY_MESSAGES = [
  'SCANSIONE SETTORI: 256x256 BIOMI E GIACIMENTI ATTIVI',
  'SISTEMA ENERGETICO: CABLAGGIO MANUALE E PALI MK.1',
  'LOGISTICA: NASTRI CON CURVATURA AUTOMATICA A 90°',
  'MEMORIA LOCALE: AUTOSAVE AUTOMATICO OGNI 2 MINUTI',
];

const CONTROLS_LIST = [
  { key: '1 – 8', desc: 'Seleziona edifici (Miner, Nastro, Smelter, Palo...)' },
  { key: '9', desc: 'Strumento Cavo Elettrico (clicca 2 edifici)' },
  { key: 'Trascina', desc: 'Stendi nastri con curve automatiche' },
  { key: 'R', desc: 'Ruota direzione edificio' },
  { key: 'X', desc: 'Modalità Smantella (rimborso 100%)' },
  { key: 'WASD / Dx', desc: 'Muovi camera · Rotella per Zoom · C per centrare' },
  { key: 'Click', desc: 'Clicca una macchina o l’HUB per ricette e buffer' },
  { key: 'Ctrl + S', desc: 'Salva manualmente (autosave ogni 2 min)' },
  { key: 'Spazio', desc: 'Metti in pausa / riprendi simulazione' },
];

function formatSavedTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MainMenu({ hasStarted, onPlay, onRestart }: MainMenuProps) {
  const [tab, setTab] = useState<'home' | 'controls'>('home');
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const [msgIndex, setMsgIndex] = useState(0);

  const buildingCount = useGameStore((s) => s.buildingCount);
  const powerStats = useGameStore((s) => s.powerStats);
  const hasSavedGame = useGameStore((s) => s.hasSavedGame);
  const lastSavedAt = useGameStore((s) => s.lastSavedAt);
  const saveGame = useGameStore((s) => s.saveGame);
  useGameStore((s) => s.hudTick);

  const hasExistingFactory = hasStarted || hasSavedGame;

  const totalHubItems = Object.values(world.hubInventory).reduce(
    (sum, n) => sum + (n ?? 0),
    0
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % TELEMETRY_MESSAGES.length);
    }, 3400);
    return () => window.clearInterval(id);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouse({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const primaryLabel = hasStarted
    ? 'RIPRENDI FABBRICA'
    : hasSavedGame
      ? 'CONTINUA PARTITA SALVATA'
      : 'AVVIA NUOVA FABBRICA';

  return (
    <div
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-30 flex items-center justify-center overflow-hidden bg-zinc-950/75 p-4 backdrop-blur-[3px]"
    >
      <style>{`
        @keyframes fw-belt-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(28px); }
        }
        @keyframes fw-item-flow {
          0% { left: -6%; opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { left: 104%; opacity: 0; }
        }
        @keyframes fw-scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}</style>

      {/* Spotlight dinamico */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(520px circle at ${mouse.x}% ${mouse.y}%, rgba(245, 158, 11, 0.14), transparent 65%)`,
        }}
      />

      {/* Linea di scansione verticale */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-transparent via-amber-400/[0.06] to-transparent"
        style={{ animation: 'fw-scanline 7s linear infinite' }}
      />

      {/* Card principale */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-950/92 shadow-[0_0_80px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        {/* Barra superiore */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/60 px-5 py-2.5 text-[11px] font-mono">
          <div className="flex items-center gap-2 text-amber-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span>FICSIT // AUTOMATION SUITE</span>
          </div>
          <span className="text-zinc-500">
            {lastSavedAt
              ? `SALVATO ${formatSavedTime(lastSavedAt)}`
              : 'SETTORE ALPHA-07'}
          </span>
        </div>

        <div className="p-6 sm:p-7">
          {/* Header Logo */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/15 shadow-inner">
              <Factory className="h-8 w-8 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">
                FACTORY <span className="text-amber-400">WEB</span>
              </h1>
              <p className="mt-0.5 text-xs text-zinc-400">
                Estrai, cabla, automatizza e scala la tua linea industriale.
              </p>
            </div>
          </div>

          {/* Telemetria rotante */}
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/70 px-3 py-2 font-mono text-[11px] text-zinc-300">
            <Cpu className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span className="truncate">{TELEMETRY_MESSAGES[msgIndex]}</span>
          </div>

          {tab === 'home' ? (
            <div className="mt-6 space-y-5">
              {/* Statistiche fabbrica se esiste una sessione o un salvataggio */}
              {hasExistingFactory && (
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                      Edifici
                    </div>
                    <div className="mt-0.5 font-mono text-base font-bold text-white">
                      {buildingCount}
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                      Rete MW
                    </div>
                    <div
                      className={`mt-0.5 flex items-center gap-1 font-mono text-base font-bold ${
                        powerStats.fuseBlown
                          ? 'text-red-400'
                          : powerStats.producedMW > 0
                            ? 'text-emerald-400'
                            : 'text-zinc-400'
                      }`}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {powerStats.consumedMW}/{powerStats.producedMW}
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                      HUB Items
                    </div>
                    <div className="mt-0.5 font-mono text-base font-bold text-amber-400">
                      {totalHubItems}
                    </div>
                  </div>
                </div>
              )}

              {/* Pulsanti Azione */}
              <div className="space-y-2.5">
                <button
                  onClick={onPlay}
                  className="group flex w-full items-center justify-between rounded-xl bg-amber-400 px-5 py-3.5 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300 active:scale-[0.99]"
                >
                  <span className="flex items-center gap-2.5">
                    <Play className="h-4 w-4 fill-current" />
                    {primaryLabel}
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>

                {hasStarted && (
                  <button
                    onClick={() => saveGame(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-300 transition hover:border-emerald-400/60 hover:bg-emerald-500/20"
                  >
                    <Save className="h-4 w-4" />
                    <span>Salva Partita Ora</span>
                    {lastSavedAt && (
                      <span className="ml-1 flex items-center gap-1 font-mono text-[10px] text-emerald-400/80">
                        <Clock className="h-3 w-3" />
                        {formatSavedTime(lastSavedAt)}
                      </span>
                    )}
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setTab('controls')}
                    className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
                  >
                    <BookOpen className="h-4 w-4 text-amber-400" />
                    Comandi &amp; Guida
                  </button>

                  {hasExistingFactory ? (
                    <button
                      onClick={onRestart}
                      className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Nuova Partita
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800/70 bg-zinc-900/40 px-4 py-2.5 text-xs text-zinc-500">
                      <Zap className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Autosave 2 min</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <Keyboard className="h-4 w-4" />
                  <span>Controlli Rapidi</span>
                </div>
                <button
                  onClick={() => setTab('home')}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
                >
                  Indietro
                </button>
              </div>

              <div className="grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto pr-1">
                {CONTROLS_LIST.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/70 px-3 py-2 text-xs"
                  >
                    <span className="shrink-0 rounded bg-zinc-800 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-300">
                      {item.key}
                    </span>
                    <span className="text-right text-zinc-300">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mini linea di produzione animata */}
        <div className="relative h-14 overflow-hidden border-t border-zinc-800/90 bg-zinc-900/90">
          <div
            className="absolute inset-y-3 -left-7 right-0 flex items-center gap-4 opacity-40"
            style={{ animation: 'fw-belt-scroll 0.9s linear infinite' }}
          >
            {Array.from({ length: 28 }).map((_, i) => (
              <div
                key={i}
                className="h-3 w-3 shrink-0 rotate-45 border-t-2 border-r-2 border-amber-400"
              />
            ))}
          </div>

          {[
            { delay: '0s', color: '#94a3b8', label: 'Fe' },
            { delay: '-1.2s', color: '#fb923c', label: 'Cu' },
            { delay: '-2.4s', color: '#e2e8f0', label: 'Pl' },
            { delay: '-3.6s', color: '#facc15', label: 'Cb' },
          ].map((item) => (
            <div
              key={item.label}
              className="absolute top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md border border-zinc-950 font-mono text-[10px] font-bold text-zinc-950 shadow-md"
              style={{
                backgroundColor: item.color,
                animation: `fw-item-flow 4.8s linear ${item.delay} infinite`,
              }}
            >
              {item.label}
            </div>
          ))}

          <div className="pointer-events-none absolute inset-0 flex items-center justify-around px-8">
            <div className="rounded border border-amber-400/50 bg-zinc-950/95 px-2.5 py-1 font-mono text-[10px] font-bold text-amber-300 shadow">
              MINER
            </div>
            <div className="rounded border border-orange-500/50 bg-zinc-950/95 px-2.5 py-1 font-mono text-[10px] font-bold text-orange-300 shadow">
              SMELTER
            </div>
            <div className="rounded border border-blue-500/50 bg-zinc-950/95 px-2.5 py-1 font-mono text-[10px] font-bold text-blue-300 shadow">
              CONSTRUCTOR
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}