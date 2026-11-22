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
  RESOURCE_TO_ITEM,
} from '../engine/recipes';
import {
  BUILDING_DEFS,
  CRAFTING_BUILDING_TYPES,
  isMinerType,
  PURITY_RATE,
  RESOURCE_META,
  type ItemType,
} from '../engine/types';
import { useGameStore, world } from '../store/useGameStore';

export function Inspector() {
  const inspectedTile = useGameStore((s) => s.inspectedTile);
  const setInspectedTile = useGameStore((s) => s.setInspectedTile);
  const setBuildingRecipe = useGameStore((s) => s.setBuildingRecipe);
  useGameStore((s) => s.hudTick);
  useGameStore((s) => s.worldVersion);

  if (!inspectedTile) return null;

  const building = world.getBuilding(inspectedTile.x, inspectedTile.y);
  if (!building) return null;

  const def = BUILDING_DEFS[building.type];
  const isCrafter = CRAFTING_BUILDING_TYPES.has(building.type);
  const isMiner = isMinerType(building.type);
  const isGenerator = def.powerMW < 0;
  const isHub = building.type === 'hub';

  const recipes = isCrafter ? getRecipesForBuilding(building.type) : [];
  const activeRecipe = building.recipeId ? RECIPES[building.recipeId] : undefined;
  const node = isMiner ? world.getNode(building.x, building.y) : undefined;

  const hubEntries = isHub
    ? (Object.entries(world.hubInventory) as [ItemType, number][])
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed top-20 right-4 z-20 w-80 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/94 shadow-2xl backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/70 px-3.5 py-2.5">
        <div>
          <div className="text-xs font-bold text-amber-300">{def.name}</div>
          <div className="font-mono text-[10px] text-zinc-500">
            X:{building.x} Y:{building.y}
            {def.maxConnections > 0
              ? ` · Cavi ${world.getConnectionCount(building.id)}/${def.maxConnections}`
              : ''}
          </div>
        </div>
        <button
          onClick={() => setInspectedTile(null)}
          className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[70vh] space-y-3 overflow-y-auto p-3.5 text-xs">
        {/* Stato Elettrico */}
        {def.powerMW !== 0 && (
          <div
            className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-[11px] ${
              building.fuseBlown
                ? 'border-red-500/50 bg-red-500/15 text-red-300'
                : building.powered
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
            }`}
          >
            <span className="flex items-center gap-1.5 font-semibold">
              {building.fuseBlown ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              {building.fuseBlown
                ? 'Fusibile Saltato'
                : building.powered
                  ? isGenerator
                    ? 'Generatore Attivo'
                    : 'Alimentato'
                  : 'Senza Corrente (Usa tasto 9)'}
            </span>
            <span className="font-mono font-bold">
              {def.powerMW < 0 ? `+${-def.powerMW} MW` : `-${def.powerMW} MW`}
            </span>
          </div>
        )}

        {/* Dettaglio Miner */}
        {isMiner && node && (
          <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/70 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Giacimento</span>
              <span
                className="rounded px-2 py-0.5 text-[11px] font-bold text-zinc-950"
                style={{ backgroundColor: RESOURCE_META[node.type].hex }}
              >
                {RESOURCE_META[node.type].name} ({node.purity})
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Estrazione</span>
              <span className="font-mono font-bold text-amber-300">
                {PURITY_RATE[node.purity] * (def.minerMultiplier ?? 1)} item/min
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Buffer uscita</span>
              <span className="font-mono text-zinc-200">
                {building.outputBuffer?.[RESOURCE_TO_ITEM[node.type]] ?? 0} / 50
              </span>
            </div>
          </div>
        )}

        {/* Dettaglio Macchine di Crafting (1, 2 o 3 ingressi) */}
        {isCrafter && activeRecipe && (
          <>
            <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/70 p-2.5">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                <span>Produzione Attiva</span>
                <span className="font-mono text-emerald-400">
                  {Math.round(
                    (activeRecipe.output.count / activeRecipe.durationSec) * 60
                  )}
                  /min
                </span>
              </div>

              {/* Barra progresso ciclo */}
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-sky-400 transition-all duration-150"
                  style={{
                    width: `${Math.min(100, Math.round((building.progress ?? 0) * 100))}%`,
                  }}
                />
              </div>

              {/* Buffer Ingressi */}
              <div className="space-y-1 pt-1">
                <div className="text-[10px] text-zinc-500">Ingressi</div>
                {activeRecipe.inputs.map((req) => {
                  const meta = ITEM_META[req.item];
                  const have = building.inputBuffer?.[req.item] ?? 0;
                  const ready = have >= req.count;
                  return (
                    <div
                      key={req.item}
                      className="flex items-center justify-between rounded bg-zinc-950/70 px-2 py-1 text-[11px]"
                    >
                      <span className="flex items-center gap-1.5 text-zinc-200">
                        <span
                          className="h-2 w-2 rounded-sm"
                          style={{ backgroundColor: meta.hex }}
                        />
                        {meta.name}
                      </span>
                      <span
                        className={`font-mono font-semibold ${
                          ready ? 'text-emerald-400' : 'text-amber-300'
                        }`}
                      >
                        {have} / {req.count}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Buffer Uscita */}
              <div className="space-y-1 pt-0.5">
                <div className="text-[10px] text-zinc-500">Uscita</div>
                {(() => {
                  const outMeta = ITEM_META[activeRecipe.output.item];
                  const outHave =
                    building.outputBuffer?.[activeRecipe.output.item] ?? 0;
                  return (
                    <div className="flex items-center justify-between rounded bg-zinc-950/70 px-2 py-1 text-[11px]">
                      <span className="flex items-center gap-1.5 font-medium text-white">
                        <span
                          className="h-2 w-2 rounded-sm"
                          style={{ backgroundColor: outMeta.hex }}
                        />
                        {outMeta.name}
                      </span>
                      <span className="font-mono text-zinc-300">
                        {outHave} / 50
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Selettore Ricetta */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Seleziona Ricetta ({recipes.length})
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto pr-0.5">
                {recipes.map((r) => {
                  const selected = r.id === building.recipeId;
                  const outMeta = ITEM_META[r.output.item];
                  const rate = Math.round((r.output.count / r.durationSec) * 60);
                  return (
                    <button
                      key={r.id}
                      onClick={() =>
                        setBuildingRecipe(building.x, building.y, r.id)
                      }
                      className={`w-full rounded-lg border px-2.5 py-1.5 text-left transition ${
                        selected
                          ? 'border-amber-400/80 bg-amber-500/15'
                          : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
                          <span
                            className="h-2 w-2 rounded-sm"
                            style={{ backgroundColor: outMeta.hex }}
                          />
                          {r.name}
                        </span>
                        <span className="font-mono text-[10px] text-emerald-400">
                          {rate}/min
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-zinc-400">
                        <span>
                          {r.inputs
                            .map(
                              (i) => `${i.count} ${ITEM_META[i.item].shortName}`
                            )
                            .join(' + ')}
                        </span>
                        <ArrowRight className="h-2.5 w-2.5 text-zinc-600" />
                        <span className="text-zinc-200">
                          {r.output.count} {outMeta.shortName}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Inventario completo dell'HUB */}
        {isHub && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              <Package className="h-3.5 w-3.5 text-amber-400" />
              <span>Deposito Risorse HUB ({hubEntries.length})</span>
            </div>

            {hubEntries.length === 0 ? (
              <div className="rounded-lg bg-zinc-900/60 p-3 text-center text-zinc-500">
                Nessun materiale nell&apos;HUB.
              </div>
            ) : (
              <div className="max-h-72 space-y-1 overflow-y-auto pr-0.5">
                {hubEntries.map(([item, count]) => {
                  const meta = ITEM_META[item];
                  return (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-lg bg-zinc-900/80 px-2.5 py-1.5 text-[11px]"
                    >
                      <span className="flex items-center gap-2 text-zinc-200">
                        <span
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{ backgroundColor: meta.hex }}
                        />
                        {meta.name}
                      </span>
                      <span className="font-mono font-bold tabular-nums text-amber-300">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}