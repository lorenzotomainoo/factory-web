import {
  AlertTriangle,
  ArrowRight,
  Package,
  X,
  Zap,
} from 'lucide-react';
import {
  getRecipesForBuilding,
  ITEM_META,
  RECIPES,
} from '../engine/recipes';
import {
  BUILDING_DEFS,
  PURITY_RATE,
  RESOURCE_META,
  type ItemType,
} from '../engine/types';
import { useGameStore, world } from '../store/useGameStore';

export function Inspector() {
  const inspectedTile = useGameStore((s) => s.inspectedTile);
  const setInspectedTile = useGameStore((s) => s.setInspectedTile);
  const setBuildingRecipe = useGameStore((s) => s.setBuildingRecipe);
  // Aggiornamento live 5 volte al secondo per progress bar e buffer
  useGameStore((s) => s.hudTick);
  useGameStore((s) => s.worldVersion);

  if (!inspectedTile) return null;

  const building = world.getBuilding(inspectedTile.x, inspectedTile.y);
  if (!building) return null;

  const def = BUILDING_DEFS[building.type];
  const node = world.getNode(building.x, building.y);
  const isCrafter = building.type === 'smelter' || building.type === 'constructor';
  const availableRecipes = isCrafter ? getRecipesForBuilding(building.type) : [];
  const activeRecipe = building.recipeId ? RECIPES[building.recipeId] : undefined;

  const connUsed = world.getConnectionCount(building.id);
  const progressPct = Math.round(Math.min(1, Math.max(0, building.progress ?? 0)) * 100);

  const hubEntries = Object.entries(world.hubInventory).filter(
    ([, count]) => (count ?? 0) > 0
  ) as [ItemType, number][];

  const renderBuffer = (
    title: string,
    buf?: Partial<Record<ItemType, number>>
  ) => {
    const entries = Object.entries(buf ?? {}).filter(
      ([, count]) => (count ?? 0) > 0
    ) as [ItemType, number][];

    return (
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          {title}
        </div>
        {entries.length === 0 ? (
          <div className="rounded border border-zinc-800/80 bg-zinc-900/50 px-2.5 py-2 text-xs text-zinc-500">
            Vuoto
          </div>
        ) : (
          <div className="space-y-1">
            {entries.map(([item, count]) => {
              const meta = ITEM_META[item];
              return (
                <div
                  key={item}
                  className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: meta.hex }}
                    />
                    <span className="text-zinc-200">{meta.name}</span>
                  </div>
                  <span className="font-mono font-semibold text-amber-300">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed top-16 right-3 z-20 w-80 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/95 p-4 text-zinc-100 shadow-2xl backdrop-blur">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-zinc-800 pb-3">
        <div>
          <h2 className="text-sm font-bold tracking-wide text-amber-400">
            {def.name}
          </h2>
          <p className="font-mono text-[11px] text-zinc-500">
            X:{building.x} Y:{building.y}
          </p>
        </div>
        <button
          onClick={() => setInspectedTile(null)}
          className="rounded p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          title="Chiudi (Esc)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 space-y-4">
        {/* Stato Elettrico & Cavi */}
        {def.maxConnections > 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-2.5 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Stato rete</span>
              {building.fuseBlown ? (
                <span className="flex items-center gap-1 font-semibold text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Fuse Blown
                </span>
              ) : building.powered ? (
                <span className="flex items-center gap-1 font-semibold text-emerald-400">
                  <Zap className="h-3.5 w-3.5" />
                  Alimentato
                </span>
              ) : (
                <span className="font-semibold text-zinc-500">
                  Senza corrente
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Potenza</span>
              <span className="font-mono text-zinc-200">
                {def.powerMW > 0
                  ? `-${def.powerMW} MW`
                  : def.powerMW < 0
                    ? `+${-def.powerMW} MW`
                    : '0 MW'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Cavi collegati</span>
              <span className="font-mono text-zinc-200">
                {connUsed} / {def.maxConnections}
              </span>
            </div>
          </div>
        )}

        {/* Dettagli Miner */}
        {building.type === 'miner' && node && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-xs">
              <span className="text-zinc-400">Giacimento</span>
              <span
                className="rounded px-2 py-0.5 font-semibold text-zinc-950"
                style={{ backgroundColor: RESOURCE_META[node.type].hex }}
              >
                {RESOURCE_META[node.type].name} · {PURITY_RATE[node.purity]}/min
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Estrazione</span>
                <span className="font-mono">{progressPct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-amber-400 transition-all duration-150"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {renderBuffer('Buffer Uscita', building.outputBuffer)}
          </div>
        )}

        {/* Dettagli Smelter & Constructor */}
        {isCrafter && (
          <div className="space-y-3">
            {/* Selezione Ricetta */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Seleziona Ricetta
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {availableRecipes.map((r) => {
                  const selected = r.id === building.recipeId;
                  const inMeta = ITEM_META[r.input.item];
                  const outMeta = ITEM_META[r.output.item];
                  const outPerMin = Math.round((r.output.count / r.durationSec) * 60);

                  return (
                    <button
                      key={r.id}
                      onClick={() => setBuildingRecipe(building.x, building.y, r.id)}
                      className={`flex flex-col gap-1 rounded-lg border px-2.5 py-2 text-left transition ${
                        selected
                          ? 'border-amber-400 bg-amber-500/15'
                          : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className={selected ? 'text-amber-300' : 'text-zinc-200'}>
                          {r.name}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-400">
                          {outPerMin}/min
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                        <span
                          className="h-2 w-2 rounded-sm"
                          style={{ backgroundColor: inMeta.hex }}
                        />
                        <span>
                          {r.input.count}x {inMeta.shortName}
                        </span>
                        <ArrowRight className="h-3 w-3 text-zinc-500" />
                        <span
                          className="h-2 w-2 rounded-sm"
                          style={{ backgroundColor: outMeta.hex }}
                        />
                        <span>
                          {r.output.count}x {outMeta.shortName}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Barra di lavorazione */}
            {activeRecipe && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>Produzione ({activeRecipe.durationSec}s)</span>
                  <span className="font-mono">{progressPct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-150"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {renderBuffer('Ingresso', building.inputBuffer)}
            {renderBuffer('Uscita', building.outputBuffer)}
          </div>
        )}

        {/* Inventario FICSIT HUB */}
        {building.type === 'hub' && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              <Package className="h-3.5 w-3.5 text-amber-400" />
              <span>Risorse Consegnate all&apos;HUB</span>
            </div>

            {hubEntries.length === 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-500">
                Nessun oggetto consegnato. Collega un nastro direttamente all&apos;HUB per accumulare risorse.
              </div>
            ) : (
              <div className="space-y-1.5">
                {hubEntries.map(([item, count]) => {
                  const meta = ITEM_META[item];
                  return (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-sm"
                          style={{ backgroundColor: meta.hex }}
                        />
                        <span className="font-medium text-zinc-200">
                          {meta.name}
                        </span>
                      </div>
                      <span className="font-mono text-sm font-bold text-amber-400">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Splitter / Merger */}
        {(building.type === 'splitter' || building.type === 'merger') && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-2.5 text-xs text-zinc-400">
            {building.beltSlot ? (
              <div className="flex items-center justify-between">
                <span>In transito:</span>
                <span className="font-semibold text-zinc-100">
                  {ITEM_META[building.beltSlot.item].name}
                </span>
              </div>
            ) : (
              <span>Nessun oggetto in transito.</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}