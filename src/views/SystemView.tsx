import { useState } from "react";
import { useApp, taskReceived } from "../store";
import { keyLabel, modelById, splitKey, vramBytes } from "../data/models";
import { Icon } from "../components/icons";
import { Meter, Toggle } from "../components/ui";
import { clamp, fmtBytes } from "../lib/format";

const GiB = 1024 ** 3;

export function SystemView() {
  const { state, dispatch } = useApp();
  const [draft, setDraft] = useState(state.settings);
  const [dirty, setDirty] = useState(false);

  const activeDl = state.tasks.filter((t) => t.status === "downloading").length;
  const netSpeed = state.tasks.reduce((a, t) => a + t.speed, 0);

  const vramUsed = state.loaded.reduce((acc, l) => {
    const { modelId, quant } = splitKey(l.key);
    const m = modelById(modelId);
    return acc + (m ? vramBytes(m, quant) : 0);
  }, 0);
  const vramTotal = state.settings.vramTotalGB * GiB;

  const gpuTarget = clamp(6 + (state.activity.generating ? 66 : 0) + (state.loading ? 32 : 0) + Math.min(activeDl * 7, 21), 0, 97);
  const ramUsed = 4.6 + state.loaded.length * 1.2 + (state.activity.generating ? 2.6 : 0) + activeDl * 0.4;

  const update = (patch: Partial<typeof draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };

  const save = () => {
    dispatch({ type: "SET_SETTINGS", settings: draft });
    dispatch({ type: "PUSH_TOAST", kind: "ok", text: "Paramètres enregistrés — appliqués immédiatement." });
    setDirty(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-extrabold text-[22px] tracking-tight">Système & paramètres</h2>
        <p className="text-dim text-[13px] mt-1">Télémétrie de votre machine, bibliothèque de modèles et réglages du studio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Meter
          label="GPU" icon="cpu"
          display={`${Math.round(gpuTarget)} %`}
          value={gpuTarget}
          color={gpuTarget > 75 ? "var(--color-danger)" : "var(--color-ember)"}
        />
        <Meter
          label="VRAM" icon="memory"
          display={`${fmtBytes(vramUsed)} / ${state.settings.vramTotalGB} Go`}
          value={(vramUsed / vramTotal) * 100}
          color="var(--color-teal)"
        />
        <Meter
          label="RAM système" icon="gauge"
          display={`${ramUsed.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} / 32 Go`}
          value={(ramUsed / 32) * 100}
          color="var(--color-warn)"
        />
        <Meter
          label="Réseau" icon="net"
          display={netSpeed > 0 ? `${fmtBytes(netSpeed)}/s` : "repos"}
          value={Math.min(100, (netSpeed / 260e6) * 100)}
          color="var(--color-ok)"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* bibliothèque + mémoire */}
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-display font-bold text-[15px] flex items-center gap-2">
              <Icon name="box" size={17} className="text-ember" /> Mémoire & bibliothèque
            </span>
            <span className="chip">{state.owned.length} modèle{state.owned.length > 1 ? "s" : ""} · {state.loaded.length} chargé{state.loaded.length > 1 ? "s" : ""}</span>
          </div>

          {state.loading && (
            <div className="mb-4 p-3 rounded-lg border border-warn/35 bg-warn/8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12.5px] font-semibold text-warn flex items-center gap-2">
                  <Icon name="refresh" size={13} className="spin-slow" /> Chargement de {keyLabel(state.loading.key)}…
                </span>
                <span className="font-mono text-[12px] text-warn">{Math.round(state.loading.progress)} %</span>
              </div>
              <div className="h-1.5 rounded-full bg-bg0/70 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-warn to-ember2 transition-all duration-200" style={{ width: `${state.loading.progress}%` }} />
              </div>
            </div>
          )}

          {state.owned.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-dim text-[13px] mb-4">Votre bibliothèque est vide. Téléchargez un premier modèle.</p>
              <button className="btn btn-ember btn-sm" onClick={() => dispatch({ type: "NAVIGATE", view: "catalog" })}>
                <Icon name="grid" size={14} /> Ouvrir le catalogue
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {state.owned.map((o) => {
                const key = `${o.modelId}:${o.quant}`;
                const isLoaded = state.loaded.some((l) => l.key === key);
                const m = modelById(o.modelId);
                return (
                  <div key={key} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border transition-colors ${isLoaded ? "border-ok/35 bg-ok/6" : "border-line bg-bg1"}`}>
                    <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 font-display font-bold text-[11px]"
                      style={{ background: `hsl(${m?.hue ?? 30} 80% 55% / .2)`, color: `hsl(${m?.hue ?? 30} 85% 65%)` }}>
                      {m?.org.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold truncate">{keyLabel(key)}</p>
                      <p className="font-mono text-[10.5px] text-mute">
                        {fmtBytes(o.size)} sur disque{isLoaded && m ? ` · ${fmtBytes(vramBytes(m, o.quant))} VRAM` : ""}
                      </p>
                    </div>
                    {isLoaded ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: "UNLOAD_MODEL", key })}>
                        Décharger
                      </button>
                    ) : (
                      <button className="btn btn-ember btn-sm" onClick={() => dispatch({ type: "LOAD_MODEL", key })} disabled={state.loading !== null}>
                        <Icon name="bolt" size={13} /> Charger
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-line flex items-center justify-between">
            <span className="font-mono text-[11.5px] text-mute">
              VRAM : <span className="text-ink font-semibold">{fmtBytes(vramUsed)}</span> / {state.settings.vramTotalGB} Go
            </span>
            <span className="font-mono text-[11.5px] text-mute">
              Disque : <span className="text-ink font-semibold">{fmtBytes(state.owned.reduce((a, o) => a + o.size, 0) + state.tasks.reduce((a, t) => a + taskReceived(t), 0))}</span> utilisés
            </span>
          </div>
        </div>

        {/* paramètres */}
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-display font-bold text-[15px] flex items-center gap-2">
              <Icon name="sliders" size={17} className="text-ember" /> Réglages du studio
            </span>
            {dirty && <span className="chip !text-warn !border-warn/40">modifications non sauvegardées</span>}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mono-label block mb-1.5">Téléchargements parallèles</span>
                <select className="input cursor-pointer" value={draft.maxParallel} onChange={(e) => update({ maxParallel: parseInt(e.target.value) })}>
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} fichier{n > 1 ? "s" : ""}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mono-label block mb-1.5">Parties par défaut</span>
                <select className="input cursor-pointer" value={draft.defaultSegments} onChange={(e) => update({ defaultSegments: parseInt(e.target.value) })}>
                  {[1, 2, 4, 6, 8, 12].map((n) => <option key={n} value={n}>{n} partie{n > 1 ? "s" : ""}</option>)}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mono-label block mb-1.5">VRAM GPU totale</span>
              <select className="input cursor-pointer" value={draft.vramTotalGB} onChange={(e) => update({ vramTotalGB: parseInt(e.target.value) })}>
                {[8, 12, 16, 24, 48].map((n) => <option key={n} value={n}>{n} Go</option>)}
              </select>
            </label>

            <label className="block">
              <span className="mono-label block mb-1.5">Dossier de téléchargement</span>
              <div className="relative">
                <Icon name="folder" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
                <input className="input !pl-9 font-mono text-[12.5px]" value={draft.downloadDir} onChange={(e) => update({ downloadDir: e.target.value })} />
              </div>
            </label>

            <div className="border-t border-line pt-2">
              <Toggle
                checked={draft.autoRetry}
                onChange={(v) => update({ autoRetry: v })}
                label="Reprise automatique des segments"
                hint="Si une connexion coupe, le segment repart tout seul — le téléchargement ne s'arrête jamais."
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="font-mono text-[10.5px] text-mute">Les réglages sont conservés sur cette machine.</p>
              <button className="btn btn-ember btn-sm" onClick={save} disabled={!dirty}>
                <Icon name="check" size={14} /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* journal d'événements */}
      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-line">
          <span className="font-display font-bold text-[15px] flex items-center gap-2">
            <Icon name="terminal" size={16} className="text-teal" /> Journal du studio
          </span>
          <button className="font-mono text-[10.5px] text-mute hover:text-ink transition-colors" onClick={() => dispatch({ type: "CLEAR_EVENTS" })}>
            vider
          </button>
        </div>
        <div className="max-h-[260px] overflow-y-auto divide-y divide-line/50">
          {state.events.length === 0 ? (
            <p className="text-mute text-[12.5px] py-8 text-center">Aucun événement pour le moment — téléchargez ou chargez un modèle.</p>
          ) : (
            state.events.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-5 py-2 fade-in">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  e.kind === "ok" ? "bg-ok" : e.kind === "err" ? "bg-danger" : e.kind === "warn" ? "bg-warn" : "bg-teal"
                }`} />
                <span className="text-[12.5px] text-dim flex-1">{e.text}</span>
                <span className="font-mono text-[10.5px] text-mute shrink-0">
                  {new Date(e.time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
