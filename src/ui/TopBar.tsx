import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Factory,
  Lock,
  MapPin,
  Pause,
  Play,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { HUB_MILESTONES, ITEM_META } from '../engine/recipes';
import {
  BUILDING_DEFS,
  PURITY_RATE,
  RESOURCE_META,
  TERRAIN_META,
  type ItemType,
} from '../engine/types';
import { useGameStore, world } from '../store/useGameStore';

export function TopBar() {
  const hoveredTile = useGameStore((s) => s.hoveredTile);
  const powerStats = useGameStore((s) => s.powerStats);
  const paused = useGameStore((s) => s.paused);
  const togglePause = useGameStore((s) => s.togglePause);
  const factoryItemsPerMin = useGameStore((s) => s.factoryItemsPerMin);
  const hubItemsPerMin = useGameStore((s) => s.hubItemsPerMin);
  const itemRates = useGameStore((s) => s.itemRates);
  const currentMilestoneIndex = useGameStore((s) => s.currentMilestoneIndex);
  const completeMilestone = useGameStore((s) => s.completeMilestone);
  // Aggiornamento live 5 volte al secondo
  useGameStore((s) => s.hudTick);

  const [showRateMenu, setShowRateMenu] = useState(false);
  const [showGoalMenu, setShowGoalMenu] = useState(false);

  const validTile =
    hoveredTile && world.inBounds(hoveredTile.x, hoveredTile.y)
      ? hoveredTile
      : null;

  const terrain = validTile ? world.getTerrain(validTile.x, validTile.y) : null;
  const terrainMeta = terrain ? TERRAIN_META[terrain] : null;
  const node = validTile ? world.getNode(validTile.x, validTile.y) : undefined;
  const building = validTile
    ? world.getBuilding(validTile.x, validTile.y)
    : undefined;
  const buildingDef = building ? BUILDING_DEFS[building.type] : undefined;

  // Calcolo percentuale carico elettrico
  const loadPct =
    powerStats.producedMW > 0
      ? Math.min(100, Math.round((powerStats.consumedMW / powerStats.producedMW) * 100))
      : powerStats.consumedMW > 0
        ? 100
        : 0;

  // Breakdown item/min ordinato dal più veloce
  const rateEntries = (
    Object.entries(itemRates) as [ItemType, number][]
  )
    .filter(([, rate]) => rate > 0)
    .sort((a, b) => b[1] - a[1]);

  // Calcolo avanzamento Obiettivo attivo
  const milestone = HUB_MILESTONES[currentMilestoneIndex];
  let milestoneReady = false;
  let milestonePct = 100;

  if (milestone) {
    let totalChecks = milestone.items.length;
    let progressSum = 0;
    let allMet = true;

    for (const req of milestone.items) {
      const have = world.hubInventory[req.item] ?? 0;
      progressSum += Math.min(1, have / req.count);
      if (have < req.count) allMet = false;
    }

    if (milestone.minPowerMW) {
      totalChecks += 1;
      progressSum += Math.min(1, powerStats.producedMW / milestone.minPowerMW);
      if (powerStats.producedMW < milestone.minPowerMW) allMet = false;
    }

    if (milestone.minItemsPerMin) {
      totalChecks += 1;
      const bestRate = Math.max(factoryItemsPerMin, hubItemsPerMin);
      progressSum += Math.min(1, bestRate / milestone.minItemsPerMin);
      if (bestRate < milestone.minItemsPerMin) allMet = false;
    }

    milestoneReady = allMet;
    milestonePct =
      totalChecks > 0 ? Math.round((progressSum / totalChecks) * 100) : 0;
  }

  return (
    <div className="pointer-events-none fixed top-0 left-0 right-0 z-20 flex flex-wrap items-start justify-between gap-2 p-3 lg:grid lg:grid-cols-[1fr_auto_1fr]">
      {/* SINISTRA: Brand + Energia + Item/min + Pausa */}
      <div className="pointer-events-auto flex items-center gap-2.5 justify-self-start rounded-xl border border-zinc-800 bg-zinc-950/92 px-3 py-2 shadow-xl backdrop-blur">
        <div className="flex items-center gap-2">
          <Factory className="h-5 w-5 text-amber-400" />
          <span className="hidden text-sm font-bold tracking-wider text-amber-400 xl:inline">
            FACTORY WEB
          </span>
        </div>

        <div className="h-6 w-px bg-zinc-800" />

        {/* Statistica Energia (Prodotta / Consumata + barra carico) */}
        <div
          className={`flex flex-col gap-1 rounded-lg px-2.5 py-1 ${
            powerStats.fuseBlown
              ? 'animate-pulse bg-red-500/20 text-red-400'
              : powerStats.producedMW > 0
                ? 'bg-zinc-900/90 text-emerald-300'
                : 'bg-zinc-900/90 text-zinc-400'
          }`}
          title="Energia consumata / prodotta sulle reti collegate"
        >
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold tabular-nums">
            {powerStats.fuseBlown ? (
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            ) : (
              <Zap className="h-3.5 w-3.5 text-amber-400" />
            )}
            <span>
              {powerStats.consumedMW} / {powerStats.producedMW} MW
            </span>
            {powerStats.fuseBlown && (
              <span className="rounded bg-red-500/30 px-1 font-sans text-[10px] font-bold text-red-200">
                FUSE
              </span>
            )}
          </div>
          <div className="h-1 w-28 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full transition-all duration-300 ${
                powerStats.fuseBlown
                  ? 'bg-red-500'
                  : loadPct >= 80
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
              }`}
              style={{ width: `${loadPct}%` }}
            />
          </div>
        </div>

        {/* Statistica Item/min con dropdown dettagliato */}
        <div
          className="relative"
          onMouseEnter={() => setShowRateMenu(true)}
          onMouseLeave={() => setShowRateMenu(false)}
        >
          <div className="flex min-w-[92px] cursor-default flex-col gap-0.5 rounded-lg bg-zinc-900/90 px-2.5 py-1 transition hover:bg-zinc-800/90">
            <div className="flex items-center gap-1.5 font-mono text-xs font-semibold tabular-nums text-sky-300">
              <Activity className="h-3.5 w-3.5 text-sky-400" />
              <span>{factoryItemsPerMin}/min</span>
            </div>
            <div className="font-mono text-[10px] tabular-nums text-zinc-400">
              HUB: {hubItemsPerMin}/min
            </div>
          </div>

          {showRateMenu && (
            <div className="absolute top-full left-0 z-30 w-64 pt-2">
              <div className="space-y-2.5 rounded-xl border border-zinc-700/90 bg-zinc-950/96 p-3 shadow-2xl backdrop-blur-xl">
                <div className="border-b border-zinc-800 pb-2 text-xs font-bold text-sky-300">
                  Flusso Produzione Live
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="rounded bg-zinc-900 px-2 py-1.5">
                    <div className="text-[10px] text-zinc-500">Fabbrica</div>
                    <div className="font-mono font-bold tabular-nums text-sky-300">
                      {factoryItemsPerMin}/min
                    </div>
                  </div>
                  <div className="rounded bg-zinc-900 px-2 py-1.5">
                    <div className="text-[10px] text-zinc-500">Ingresso HUB</div>
                    <div className="font-mono font-bold tabular-nums text-amber-300">
                      {hubItemsPerMin}/min
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Per Risorsa (Attive)
                  </div>
                  {rateEntries.length === 0 ? (
                    <div className="rounded bg-zinc-900/60 px-2 py-1.5 text-[11px] text-zinc-500">
                      Nessuna macchina in produzione.
                    </div>
                  ) : (
                    <div className="max-h-40 space-y-1 overflow-y-auto pr-0.5">
                      {rateEntries.map(([item, rate]) => {
                        const meta = ITEM_META[item];
                        return (
                          <div
                            key={item}
                            className="flex items-center justify-between rounded bg-zinc-900 px-2 py-1 text-[11px]"
                          >
                            <span className="flex items-center gap-1.5 text-zinc-200">
                              <span
                                className="h-2 w-2 rounded-sm"
                                style={{ backgroundColor: meta.hex }}
                              />
                              {meta.name}
                            </span>
                            <span className="font-mono font-semibold tabular-nums text-emerald-400">
                              +{rate}/min
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pausa */}
        <button
          onClick={togglePause}
          title="Pausa / Riprendi (Spazio)"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
            paused
              ? 'border-amber-400/60 bg-amber-500/20 text-amber-300'
              : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:text-white'
          }`}
        >
          {paused ? (
            <Play className="h-4 w-4 fill-current" />
          ) : (
            <Pause className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* CENTRO: Tracker Obiettivo HUB (ancorato al centro) */}
      <div
        className="pointer-events-auto relative justify-self-center"
        onMouseEnter={() => setShowGoalMenu(true)}
        onMouseLeave={() => setShowGoalMenu(false)}
      >
        {milestone ? (
          <div
            className={`relative overflow-hidden rounded-xl border bg-zinc-950/94 px-3.5 py-2 shadow-xl backdrop-blur transition ${
              milestoneReady
                ? 'border-emerald-400/80 shadow-emerald-500/15'
                : 'border-zinc-800'
            }`}
          >
            <div className="flex flex-wrap items-center gap-3">
              {/* Titolo obiettivo */}
              <div className="flex items-center gap-2">
                <Target
                  className={`h-4 w-4 shrink-0 ${
                    milestoneReady ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                />
                <div className="leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                      {milestone.tier}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {milestone.title}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pillole requisiti compatte */}
              <div className="flex flex-wrap items-center gap-1.5">
                {milestone.minPowerMW && (
                  <span
                    className={`flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
                      powerStats.producedMW >= milestone.minPowerMW
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-300'
                    }`}
                  >
                    <Zap className="h-3 w-3" />
                    {powerStats.producedMW}/{milestone.minPowerMW} MW
                  </span>
                )}

                {milestone.minItemsPerMin && (
                  <span
                    className={`flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
                      Math.max(factoryItemsPerMin, hubItemsPerMin) >=
                      milestone.minItemsPerMin
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-300'
                    }`}
                  >
                    <Activity className="h-3 w-3" />
                    {Math.max(factoryItemsPerMin, hubItemsPerMin)}/
                    {milestone.minItemsPerMin} /m
                  </span>
                )}

                {milestone.items.map((req) => {
                  const meta = ITEM_META[req.item];
                  const have = world.hubInventory[req.item] ?? 0;
                  const done = have >= req.count;
                  return (
                    <span
                      key={req.item}
                      className={`flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
                        done
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-200'
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-sm"
                        style={{ backgroundColor: meta.hex }}
                      />
                      <span>
                        {Math.min(have, req.count)}/{req.count}
                      </span>
                      <span className="font-sans text-[10px] text-zinc-400">
                        {meta.shortName}
                      </span>
                    </span>
                  );
                })}
              </div>

              {/* Tasto Completa se pronto */}
              {milestoneReady ? (
                <button
                  onClick={() => completeMilestone()}
                  className="flex items-center gap-1 rounded-lg bg-emerald-400 px-2.5 py-1 text-xs font-bold text-zinc-950 shadow transition hover:bg-emerald-300 active:scale-95"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Completa</span>
                </button>
              ) : (
                <span className="font-mono text-[11px] font-semibold tabular-nums text-zinc-400">
                  {milestonePct}%
                </span>
              )}
            </div>

            {/* Barra di avanzamento sottile sul fondo della card */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-800">
              <div
                className={`h-full transition-all duration-300 ${
                  milestoneReady ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
                style={{ width: `${milestonePct}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-amber-400/50 bg-zinc-950/94 px-4 py-2.5 text-xs font-bold text-amber-300 shadow-xl backdrop-blur">
            <Trophy className="h-4 w-4 text-amber-400" />
            <span>TUTTI GLI OBIETTIVI FICSIT COMPLETATI!</span>
          </div>
        )}

        {/* Dettaglio espanso dell'obiettivo al passaggio del mouse */}
        {milestone && showGoalMenu && (
          <div className="absolute top-full left-1/2 z-30 w-80 -translate-x-1/2 pt-2">
            <div className="space-y-3 rounded-xl border border-zinc-700/90 bg-zinc-950/96 p-3.5 shadow-2xl backdrop-blur-xl">
              <div className="border-b border-zinc-800 pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-amber-400">
                    {milestone.tier} ({currentMilestoneIndex + 1}/
                    {HUB_MILESTONES.length})
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-zinc-400">
                    {milestonePct}%
                  </span>
                </div>
                <div className="mt-0.5 text-xs font-bold text-white">
                  {milestone.title}
                </div>
                <p className="mt-1 text-[11px] leading-snug text-zinc-400">
                  {milestone.description}
                </p>
              </div>

              <div className="space-y-2">
                {milestone.minPowerMW && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-300">Potenza Rete</span>
                      <span className="font-mono tabular-nums text-zinc-200">
                        {powerStats.producedMW} / {milestone.minPowerMW} MW
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-emerald-400 transition-all"
                        style={{
                          width: `${Math.min(100, (powerStats.producedMW / milestone.minPowerMW) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {milestone.minItemsPerMin && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-300">Ritmo Produzione</span>
                      <span className="font-mono tabular-nums text-zinc-200">
                        {Math.max(factoryItemsPerMin, hubItemsPerMin)} /{' '}
                        {milestone.minItemsPerMin} item/min
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-sky-400 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            (Math.max(factoryItemsPerMin, hubItemsPerMin) /
                              milestone.minItemsPerMin) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {milestone.items.map((req) => {
                  const meta = ITEM_META[req.item];
                  const have = world.hubInventory[req.item] ?? 0;
                  const pct = Math.min(100, (have / req.count) * 100);
                  return (
                    <div key={req.item} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 text-zinc-200">
                          <span
                            className="h-2 w-2 rounded-sm"
                            style={{ backgroundColor: meta.hex }}
                          />
                          {meta.name} (HUB)
                        </span>
                        <span className="font-mono tabular-nums text-zinc-300">
                          {have} / {req.count}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={`h-full transition-all ${
                            pct >= 100 ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-[10px] text-zinc-500">
                Consegna i materiali con un nastro dentro l&apos;HUB centrale.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DESTRA: Telemetria Cursore con larghezza bloccata + riga secondaria per vene/edifici */}
      <div className="pointer-events-none flex flex-col items-end gap-1.5 justify-self-end">
        <div className="pointer-events-auto flex w-[284px] items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/92 px-3 py-2 text-xs shadow-xl backdrop-blur">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          <span className="w-[82px] shrink-0 font-mono tabular-nums text-zinc-300">
            {validTile ? `X:${validTile.x} Y:${validTile.y}` : 'X:-- Y:--'}
          </span>

          <div
            title={
              terrainMeta
                ? terrainMeta.buildable
                  ? terrainMeta.name
                  : `${terrainMeta.name} (non edificabile)`
                : undefined
            }
            className="flex min-w-0 flex-1 items-center justify-between gap-1.5 rounded bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-200"
          >
            {terrainMeta ? (
              <>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/20"
                    style={{ backgroundColor: terrainMeta.hex }}
                  />
                  <span className="truncate">{terrainMeta.name}</span>
                </span>
                {!terrainMeta.buildable && (
                  <Lock className="h-3 w-3 shrink-0 text-red-400" />
                )}
              </>
            ) : (
              <span className="text-zinc-500">Fuori mappa</span>
            )}
          </div>
        </div>

        {(node || (building && buildingDef)) && (
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-zinc-800/90 bg-zinc-950/90 px-2.5 py-1 text-[11px] shadow-lg backdrop-blur">
            {node && (
              <span
                className="rounded px-2 py-0.5 font-semibold text-zinc-950"
                style={{ backgroundColor: RESOURCE_META[node.type].hex }}
              >
                {RESOURCE_META[node.type].name} · {PURITY_RATE[node.purity]}/min
              </span>
            )}

            {building && buildingDef && (
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-amber-300">
                {buildingDef.name}
                {buildingDef.maxConnections > 0
                  ? ` (${world.getConnectionCount(building.id)}/${buildingDef.maxConnections})`
                  : ''}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}