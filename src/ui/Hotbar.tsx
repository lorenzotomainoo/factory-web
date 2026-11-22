import { useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Atom,
  ChevronsRight,
  Cog,
  Cpu,
  Factory,
  Flame,
  Gauge,
  GitFork,
  GitMerge,
  Layers,
  Link2,
  Package,
  Pickaxe,
  RadioTower,
  RotateCw,
  Trash2,
  Zap,
} from 'lucide-react';
import { getRecipesForBuilding, ITEM_META } from '../engine/recipes';
import {
  BUILDING_DEFS,
  CRAFTING_BUILDING_TYPES,
  HOTBAR_BUILDINGS,
  isBeltType,
  isMinerType,
  MAX_WIRE_DISTANCE,
  PURITY_RATE,
  WIRE_COST,
  type BuildingCost,
  type BuildingType,
  type ItemType,
  type Purity,
} from '../engine/types';
import { useGameStore, world } from '../store/useGameStore';

type HoverableSlot = BuildingType | 'wire';

const ICONS: Partial<Record<BuildingType, ReactNode>> = {
  miner: <Pickaxe className="h-4 w-4" />,
  miner_mk2: <Pickaxe className="h-4 w-4 text-sky-300" />,
  belt: <ArrowRight className="h-4 w-4" />,
  belt_mk2: <ChevronsRight className="h-4 w-4 text-sky-300" />,
  smelter: <Flame className="h-4 w-4" />,
  foundry: <Flame className="h-4 w-4 text-red-300" />,
  constructor: <Cog className="h-4 w-4" />,
  assembler: <Layers className="h-4 w-4 text-indigo-300" />,
  manufacturer: <Cpu className="h-4 w-4 text-purple-300" />,
  splitter: <GitFork className="h-4 w-4" />,
  merger: <GitMerge className="h-4 w-4" />,
  generator: <Zap className="h-4 w-4" />,
  coal_gen: <Factory className="h-4 w-4 text-teal-300" />,
  nuclear_gen: <Atom className="h-4 w-4 text-lime-300" />,
  pole: <RadioTower className="h-4 w-4" />,
};

const DIR_LABELS = ['N', 'E', 'S', 'O'];

const PURITY_OPTIONS: { id: Purity; label: string; accent: string }[] = [
  { id: 'impure', label: 'Impura', accent: 'text-zinc-300 border-zinc-500' },
  { id: 'normal', label: 'Normale', accent: 'text-sky-300 border-sky-400' },
  { id: 'pure', label: 'Pura', accent: 'text-amber-300 border-amber-400' },
];

const BASE_STOCK_ITEMS: ItemType[] = [
  'iron_plate',
  'iron_rod',
  'wire',
  'cable',
  'concrete',
];

const ADVANCED_STOCK_ITEMS: ItemType[] = [
  'reinforced_plate',
  'steel_beam',
  'steel_pipe',
  'rotor',
  'modular_frame',
  'motor',
  'circuit_board',
  'heavy_frame',
  'supercomputer',
];

export function Hotbar() {
  const selectedBuilding = useGameStore((s) => s.selectedBuilding);
  const dismantleMode = useGameStore((s) => s.dismantleMode);
  const wireMode = useGameStore((s) => s.wireMode);
  const rotation = useGameStore((s) => s.rotation);
  const currentMilestoneIndex = useGameStore((s) => s.currentMilestoneIndex);
  const selectBuilding = useGameStore((s) => s.selectBuilding);
  const rotate = useGameStore((s) => s.rotate);
  const toggleDismantle = useGameStore((s) => s.toggleDismantle);
  const toggleWireMode = useGameStore((s) => s.toggleWireMode);

  // Aggiorna scorte e costi disponibili in tempo reale
  useGameStore((s) => s.worldVersion);
  useGameStore((s) => s.hudTick);

  const [hoveredSlot, setHoveredSlot] = useState<HoverableSlot | null>(null);
  const [minerPurity, setMinerPurity] = useState<Purity>('normal');

  const unlockedBuildings = HOTBAR_BUILDINGS.filter(
    (type) => currentMilestoneIndex >= BUILDING_DEFS[type].unlockTier
  );

  // Mostra le 5 risorse base + eventuali materiali avanzati già prodotti nell'HUB
  const stockItems: ItemType[] = [
    ...BASE_STOCK_ITEMS,
    ...ADVANCED_STOCK_ITEMS.filter((item) => world.getItemCount(item) > 0).slice(
      0,
      3
    ),
  ];

  const renderCostBadges = (cost: BuildingCost[]) => (
    <div className="flex flex-wrap gap-1.5">
      {cost.map((c) => {
        const meta = ITEM_META[c.item];
        const have = world.getItemCount(c.item);
        const ok = have >= c.count;
        return (
          <div
            key={c.item}
            className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] ${
              ok
                ? 'border-emerald-500/35 bg-zinc-900 text-zinc-200'
                : 'border-red-500/45 bg-red-950/35 text-red-200'
            }`}
          >
            <span
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: meta.hex }}
            />
            <span>{meta.shortName}</span>
            <span
              className={`font-mono font-semibold ${
                ok ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {have}/{c.count}
            </span>
          </div>
        );
      })}
    </div>
  );

  const renderPopupContent = (slot: HoverableSlot) => {
    if (slot === 'wire') {
      const affordable = world.canAfford(WIRE_COST);
      return (
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-2 border-b border-zinc-800 pb-2">
            <div>
              <div className="text-xs font-bold text-yellow-300">
                Cavo Elettrico
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">
                Collega generatori, pali e macchine. Riclicca due edifici per
                scollegarli (rimborso 100%).
              </p>
            </div>
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
              9
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              <span>Costo per tratta</span>
              {!affordable && (
                <span className="text-red-400">Risorse insufficienti</span>
              )}
            </div>
            {renderCostBadges(WIRE_COST)}
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="rounded bg-zinc-900/90 px-2 py-1.5">
              <div className="text-[10px] text-zinc-500">Energia</div>
              <div className="font-mono font-semibold text-zinc-300">0 MW</div>
            </div>
            <div className="rounded bg-zinc-900/90 px-2 py-1.5">
              <div className="text-[10px] text-zinc-500">Portata max</div>
              <div className="font-mono font-semibold text-yellow-300">
                {MAX_WIRE_DISTANCE} celle
              </div>
            </div>
          </div>
        </div>
      );
    }

    const def = BUILDING_DEFS[slot];
    const affordable = world.canAfford(def.cost);
    const recipes = CRAFTING_BUILDING_TYPES.has(slot)
      ? getRecipesForBuilding(slot)
      : [];
    const minerMult = def.minerMultiplier ?? 1;
    const minerRate = PURITY_RATE[minerPurity] * minerMult;
    const minerCycleSec = (60 / minerRate).toFixed(2);
    const beltSpeed = def.beltSpeed ?? 60;

    return (
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2 border-b border-zinc-800 pb-2">
          <div>
            <div className="text-xs font-bold text-amber-300">{def.name}</div>
            <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">
              {def.description}
            </p>
          </div>
          {def.shortcut && (
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
              {def.shortcut}
            </span>
          )}
        </div>

        {/* Costo materiali live */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <span>Costo (hai / serve)</span>
            {!affordable && (
              <span className="text-red-400">Mancano materiali</span>
            )}
          </div>
          {renderCostBadges(def.cost)}
        </div>

        {/* Energia & Portata/Attacchi */}
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <div className="rounded bg-zinc-900/90 px-2 py-1.5">
            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
              <Zap className="h-3 w-3 text-amber-400" />
              <span>Energia</span>
            </div>
            <div
              className={`mt-0.5 font-mono font-semibold ${
                def.powerMW < 0
                  ? 'text-emerald-400'
                  : def.powerMW > 0
                    ? 'text-orange-400'
                    : 'text-zinc-300'
              }`}
            >
              {def.powerMW < 0
                ? `+${-def.powerMW} MW`
                : def.powerMW > 0
                  ? `-${def.powerMW} MW`
                  : '0 MW'}
            </div>
          </div>

          <div className="rounded bg-zinc-900/90 px-2 py-1.5">
            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
              <Gauge className="h-3 w-3 text-sky-400" />
              <span>{def.maxConnections > 0 ? 'Attacchi cavo' : 'Portata'}</span>
            </div>
            <div className="mt-0.5 font-mono font-semibold text-zinc-200">
              {def.maxConnections > 0
                ? `Max ${def.maxConnections}`
                : `${beltSpeed} item/min`}
            </div>
          </div>
        </div>

        {/* Produzione Miner Mk.1 / Mk.2 */}
        {isMinerType(slot) && (
          <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/75 p-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold uppercase tracking-wider text-zinc-400">
                Purezza vena ({minerMult}×)
              </span>
              <span className="font-mono text-zinc-500">
                Ciclo: {minerCycleSec}s
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {PURITY_OPTIONS.map((opt) => {
                const active = minerPurity === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMinerPurity(opt.id);
                    }}
                    className={`rounded border px-1.5 py-1 text-[10px] font-semibold transition ${
                      active
                        ? `${opt.accent} bg-zinc-800`
                        : 'border-zinc-800 bg-zinc-950/70 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-0.5 text-xs">
              <span className="text-zinc-400">Estrazione</span>
              <span className="font-mono font-bold text-amber-300">
                {minerRate} item/min
              </span>
            </div>
          </div>
        )}

        {/* Ricette multi-ingresso */}
        {recipes.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Ricette ({recipes.length})
            </div>
            <div className="max-h-36 space-y-1 overflow-y-auto pr-0.5">
              {recipes.map((r) => {
                const outMeta = ITEM_META[r.output.item];
                const rate = Math.round((r.output.count / r.durationSec) * 60);
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded bg-zinc-900/80 px-2 py-1 text-[10px]"
                  >
                    <span className="flex flex-wrap items-center gap-1 text-zinc-300">
                      <span>
                        {r.inputs
                          .map((i) => `${i.count} ${ITEM_META[i.item].shortName}`)
                          .join(' + ')}
                      </span>
                      <ArrowRight className="h-2.5 w-2.5 shrink-0 text-zinc-500" />
                      <span className="font-medium text-white">
                        {r.output.count} {outMeta.shortName}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono font-semibold text-emerald-400">
                      {rate}/m
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isBeltType(slot) && slot === 'belt_mk2' && (
          <div className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-2.5 py-1.5 text-[11px] text-sky-300">
            Trascina direttamente sui Nastri Mk.1 per aggiornarli al volo.
          </div>
        )}

        {def.powerMW < 0 && (
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-300">
            Genera <span className="font-mono font-bold">{-def.powerMW} MW</span>{' '}
            con <span className="font-mono font-bold">{def.maxConnections}</span>{' '}
            attacchi cavo.
          </div>
        )}

        {slot === 'pole' && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/75 px-2.5 py-1.5 text-[11px] text-zinc-300">
            Raggio massimo cavi:{' '}
            <span className="font-mono font-semibold text-yellow-300">
              {MAX_WIRE_DISTANCE} celle
            </span>
          </div>
        )}
      </div>
    );
  };

  const wireAffordable = world.canAfford(WIRE_COST);

  return (
    <>
      {/* Hotbar Centrale (mostra gli edifici sbloccati dal Tier corrente) */}
      <div className="pointer-events-none fixed bottom-4 left-0 right-0 z-10 flex justify-center px-4">
        <style>{`
          @keyframes fw-popup-rise {
            0% {
              opacity: 0;
              transform: translate(-50%, 10px) scale(0.97);
            }
            100% {
              opacity: 1;
              transform: translate(-50%, 0) scale(1);
            }
          }
        `}</style>

        <div className="pointer-events-auto flex max-w-[calc(100vw-24rem)] flex-wrap items-center justify-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950/92 p-1.5 shadow-2xl backdrop-blur">
          {unlockedBuildings.map((type) => {
            const def = BUILDING_DEFS[type];
            const active =
              selectedBuilding === type && !dismantleMode && !wireMode;
            const isHovered = hoveredSlot === type;
            const affordable = world.canAfford(def.cost);

            return (
              <div
                key={type}
                className="relative"
                onMouseEnter={() => setHoveredSlot(type)}
                onMouseLeave={() =>
                  setHoveredSlot((curr) => (curr === type ? null : curr))
                }
              >
                {isHovered && (
                  <div
                    className="absolute bottom-full left-1/2 z-30 w-72 pb-3"
                    style={{ animation: 'fw-popup-rise 150ms ease-out forwards' }}
                  >
                    <div className="relative rounded-xl border border-zinc-700/90 bg-zinc-950/96 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl">
                      {renderPopupContent(type)}
                      <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-r border-b border-zinc-700/90 bg-zinc-950" />
                    </div>
                  </div>
                )}

                <button
                  onClick={() => selectBuilding(type)}
                  className={`relative flex h-13 w-13 flex-col items-center justify-center rounded-lg border transition ${
                    active
                      ? affordable
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : 'border-red-500/80 bg-red-500/15 text-red-300'
                      : affordable
                        ? 'border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-600 hover:text-white'
                        : 'border-zinc-800/80 bg-zinc-900/45 text-zinc-500 hover:border-red-500/50 hover:text-zinc-300'
                  }`}
                >
                  {def.shortcut && (
                    <span className="absolute top-0.5 left-1 font-mono text-[9px] text-zinc-500">
                      {def.shortcut}
                    </span>
                  )}
                  {!affordable && (
                    <span
                      className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500"
                      title="Risorse insufficienti"
                    />
                  )}
                  {ICONS[type]}
                  <span className="mt-0.5 max-w-full truncate px-0.5 text-[9.5px] font-medium">
                    {def.shortName}
                  </span>
                </button>
              </div>
            );
          })}

          {/* Strumento Cavo Elettrico (9) */}
          <div
            className="relative"
            onMouseEnter={() => setHoveredSlot('wire')}
            onMouseLeave={() =>
              setHoveredSlot((curr) => (curr === 'wire' ? null : curr))
            }
          >
            {hoveredSlot === 'wire' && (
              <div
                className="absolute bottom-full left-1/2 z-30 w-72 pb-3"
                style={{ animation: 'fw-popup-rise 150ms ease-out forwards' }}
              >
                <div className="relative rounded-xl border border-zinc-700/90 bg-zinc-950/96 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl">
                  {renderPopupContent('wire')}
                  <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-r border-b border-zinc-700/90 bg-zinc-950" />
                </div>
              </div>
            )}

            <button
              onClick={toggleWireMode}
              className={`relative flex h-13 w-13 flex-col items-center justify-center rounded-lg border transition ${
                wireMode
                  ? wireAffordable
                    ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300'
                    : 'border-red-500/80 bg-red-500/15 text-red-300'
                  : wireAffordable
                    ? 'border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-600 hover:text-white'
                    : 'border-zinc-800/80 bg-zinc-900/45 text-zinc-500 hover:border-red-500/50 hover:text-zinc-300'
              }`}
            >
              <span className="absolute top-0.5 left-1 font-mono text-[9px] text-zinc-500">
                9
              </span>
              {!wireAffordable && (
                <span
                  className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500"
                  title="Cavi esauriti"
                />
              )}
              <Link2 className="h-4 w-4" />
              <span className="mt-0.5 text-[9.5px] font-medium">Cavo</span>
            </button>
          </div>

          <div className="mx-0.5 h-9 w-px bg-zinc-800" />

          {/* Pulsante Ruota */}
          <button
            onClick={rotate}
            title="Ruota edificio (R)"
            className="relative flex h-13 w-12 flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-300 transition hover:border-zinc-600 hover:text-white"
          >
            <span className="absolute top-0.5 left-1 font-mono text-[9px] text-zinc-500">
              R
            </span>
            <RotateCw className="h-4 w-4" />
            <span className="mt-0.5 font-mono text-[10px] text-amber-400">
              {DIR_LABELS[rotation]}
            </span>
          </button>

          {/* Pulsante Smantella */}
          <button
            onClick={toggleDismantle}
            title="Modalità Smantella (X) — Rimborsa il 100% dei materiali"
            className={`relative flex h-13 w-13 flex-col items-center justify-center rounded-lg border transition ${
              dismantleMode
                ? 'border-red-500 bg-red-500/20 text-red-400'
                : 'border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-600 hover:text-white'
            }`}
          >
            <span className="absolute top-0.5 left-1 font-mono text-[9px] text-zinc-500">
              X
            </span>
            <Trash2 className="h-4 w-4" />
            <span className="mt-0.5 text-[9.5px] font-medium">Smant.</span>
          </button>
        </div>
      </div>

      {/* Pannello Scorte Costruzione (in basso a destra) */}
      <div
        className="fixed bottom-4 right-4 z-10 hidden items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/92 px-3 py-2 shadow-2xl backdrop-blur xl:flex"
        title="Materiali disponibili nell'HUB (smantellare rimborsa il 100%)"
      >
        <Package className="h-4 w-4 shrink-0 text-amber-400" />
        <div className="flex items-center gap-1.5">
          {stockItems.map((item) => {
            const meta = ITEM_META[item];
            const count = world.getItemCount(item);
            return (
              <div
                key={item}
                title={meta.name}
                className={`flex min-w-[44px] flex-col items-center rounded-md border px-1.5 py-1 ${
                  count === 0
                    ? 'border-red-500/40 bg-red-950/25'
                    : 'border-zinc-800 bg-zinc-900/80'
                }`}
              >
                <div className="flex items-center gap-1 text-[9px] text-zinc-400">
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{ backgroundColor: meta.hex }}
                  />
                  <span>{meta.shortName}</span>
                </div>
                <span
                  className={`font-mono text-xs font-bold tabular-nums ${
                    count === 0 ? 'text-red-400' : 'text-zinc-100'
                  }`}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}