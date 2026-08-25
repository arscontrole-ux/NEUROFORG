import { useMemo, useState } from "react";
import { MODELS, QUANTS, sizeBytes, vramBytes } from "../data/models";
import type { ModelDef } from "../types";
import { useApp } from "../store";
import { Icon } from "../components/icons";
import { Modal, SegmentsPreview } from "../components/ui";
import { fmtBytes, fmtDuration } from "../lib/format";

const PARTS_CHOICES = [1, 2, 4, 6, 8, 12];

function DownloadModal({ model, onClose }: { model: ModelDef; onClose: () => void }) {
  const { state, dispatch } = useApp();
  const [quant, setQuant] = useState("Q4_K_M");
  const [parts, setParts] = useState(state.settings.defaultSegments);

  const size = sizeBytes(model, quant);
  const vram = vramBytes(model, quant);
  const eta = size / (parts * 26e6);
  const alreadyOwned = state.owned.some((o) => o.modelId === model.id && o.quant === quant);

  const start = () => {
    dispatch({ type: "START_DOWNLOAD", modelId: model.id, quant, parts });
    dispatch({ type: "NAVIGATE", view: "downloads" });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`Télécharger ${model.name}`} width={600}>
      <div className="space-y-5">
        <div>
          <span className="mono-label block mb-2">Quantification (GGUF)</span>
          <div className="space-y-2">
            {QUANTS.map((q) => {
              const qSize = sizeBytes(model, q.id);
              const active = quant === q.id;
              return (
                <button
                  key={q.id}
                  onClick={() => setQuant(q.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-left transition-all duration-150 ${
                    active ? "border-ember/60 bg-ember/8 shadow-[0_0_0_1px_rgba(255,122,41,.25)]" : "border-line bg-bg1 hover:border-line2"
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${active ? "border-ember" : "border-line2"}`}>
                    {active && <span className="w-2 h-2 rounded-full bg-ember" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="font-mono text-[13px] font-semibold text-ink">{q.id}</span>
                    <span className="block text-[11.5px] text-mute truncate">{q.note}</span>
                  </span>
                  <span className="font-mono text-[13px] font-semibold text-dim shrink-0">{fmtBytes(qSize)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="mono-label">Découpage multi-connexions</span>
            <span className="chip !text-ember2 !border-ember/40">
              <Icon name="layers" size={12} />
              {parts} partie{parts > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex gap-2 mb-3">
            {PARTS_CHOICES.map((n) => (
              <button
                key={n}
                onClick={() => setParts(n)}
                className={`flex-1 py-2 rounded-lg border font-mono text-[13px] font-semibold transition-all duration-150 ${
                  parts === n ? "border-ember/60 bg-ember/10 text-ember2" : "border-line bg-bg1 text-dim hover:border-line2 hover:text-ink"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <SegmentsPreview parts={parts} />
          <p className="text-[11.5px] text-mute mt-2.5 leading-relaxed">
            Le fichier est découpé en {parts} plage{parts > 1 ? "s" : ""} de {fmtBytes(size / parts)} téléchargées en parallèle.
            Chaque partie reprend exactement où elle s'est arrêtée : <span className="text-teal">aucune coupure, même si vous fermez l'application</span>.
            {state.settings.autoRetry && (
              <span className="inline-flex items-center gap-1 ml-1 text-ok"><Icon name="shield" size={11} /> reprise auto des segments active</span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="panel !rounded-lg p-3 text-center">
            <div className="mono-label mb-1">Taille</div>
            <div className="font-mono text-[15px] font-bold text-ink">{fmtBytes(size)}</div>
          </div>
          <div className="panel !rounded-lg p-3 text-center">
            <div className="mono-label mb-1">VRAM requise</div>
            <div className="font-mono text-[15px] font-bold text-ink">{fmtBytes(vram)}</div>
          </div>
          <div className="panel !rounded-lg p-3 text-center">
            <div className="mono-label mb-1">Durée estimée</div>
            <div className="font-mono text-[15px] font-bold text-teal">{fmtDuration(eta)}</div>
          </div>
        </div>

        <button className="btn btn-ember w-full !py-3" onClick={start} disabled={alreadyOwned}>
          <Icon name="download" size={16} />
          {alreadyOwned ? "Déjà dans la bibliothèque" : `Télécharger en ${parts} partie${parts > 1 ? "s" : ""}`}
        </button>
      </div>
    </Modal>
  );
}

export function CatalogView() {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("tous");
  const [modal, setModal] = useState<ModelDef | null>(null);

  const allTags = useMemo(() => Array.from(new Set(MODELS.flatMap((m) => m.tags))).sort(), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MODELS.filter((m) => {
      if (tag !== "tous" && !m.tags.includes(tag)) return false;
      if (q && !`${m.name} ${m.org} ${m.arch} ${m.tags.join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, tag]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-[22px] tracking-tight">Catalogue de modèles</h2>
          <p className="text-dim text-[13px] mt-1">
            {MODELS.length} modèles GGUF disponibles · téléchargement local multi-parties, reprise sans coupure
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <input
              className="input !pl-9 !w-60"
              placeholder="Rechercher un modèle…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["tous", ...allTags].map((t) => (
          <button
            key={t}
            onClick={() => setTag(t)}
            className={`chip transition-all duration-150 cursor-pointer ${
              tag === t ? "!text-ember2 !border-ember/50 !bg-ember/10" : "hover:!text-ink hover:!border-line2"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="panel py-14 text-center">
          <p className="text-dim text-[13.5px]">Aucun modèle ne correspond à « {search} ».</p>
          <button className="btn btn-ghost btn-sm mt-4" onClick={() => { setSearch(""); setTag("tous"); }}>
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((m) => {
            const owned = state.owned.filter((o) => o.modelId === m.id);
            const q4 = sizeBytes(m, "Q4_K_M");
            return (
              <article
                key={m.id}
                className="panel p-5 flex flex-col gap-3.5 transition-all duration-200 hover:border-line2 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-18px_rgba(0,0,0,.7)] group"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-display font-extrabold text-[15px] text-black/80 shrink-0"
                    style={{ background: `linear-gradient(135deg, hsl(${m.hue} 85% 62%), hsl(${m.hue} 75% 42%))` }}
                  >
                    {m.org.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-[15px] truncate">{m.name}</h3>
                      {owned.length > 0 && (
                        <span className="chip !text-ok !border-ok/40 !bg-ok/10">
                          <Icon name="check" size={11} /> acquis
                        </span>
                      )}
                    </div>
                    <p className="text-mute text-[12px] font-mono mt-0.5">
                      {m.org} · {m.arch} · {m.params.toLocaleString("fr-FR")} MdP · ctx {m.context}
                    </p>
                  </div>
                </div>

                <p className="text-dim text-[13px] leading-relaxed">{m.desc}</p>

                <div className="flex flex-wrap gap-1.5">
                  {m.tags.map((t) => <span key={t} className="chip">{t}</span>)}
                </div>

                <div className="mt-auto flex items-center justify-between pt-2 border-t border-line/70">
                  <div className="flex items-center gap-4 font-mono text-[12px] text-dim">
                    <span className="flex items-center gap-1.5" title="Taille en Q4_K_M">
                      <Icon name="box" size={13} className="text-mute" /> {fmtBytes(q4)}
                    </span>
                    <span className="flex items-center gap-1.5" title="Vitesse d'inférence indicative">
                      <Icon name="bolt" size={13} className="text-mute" /> ~{m.tps} tok/s
                    </span>
                  </div>
                  <button className="btn btn-ember btn-sm" onClick={() => setModal(m)}>
                    <Icon name="download" size={14} />
                    Télécharger
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modal && <DownloadModal model={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
