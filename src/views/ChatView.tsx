import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useApp } from "../store";
import { keyLabel, modelById, sizeBytes, splitKey, vramBytes } from "../data/models";
import { generateReply, estimateTokens } from "../lib/replies";
import { Icon } from "../components/icons";
import { EmptyState, CopyBtn } from "../components/ui";
import type { ChatMsg } from "../types";
import { fmtBytes, uid } from "../lib/format";

const CHAT_KEY = "nf_chat_v2";
const CHAT_PARAMS_KEY = "nf_chat_params_v1";

/* ——— rendu markdown allégé ——— */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) out.push(<span key={`${keyBase}-${i++}`}>{text.slice(last, m.index)}</span>);
    const tok = m[0];
    if (tok.startsWith("`")) {
      out.push(
        <code key={`${keyBase}-${i++}`} className="font-mono text-[12px] bg-bg0/80 border border-line rounded px-1.5 py-0.5 text-ember2">
          {tok.slice(1, -1)}
        </code>
      );
    } else {
      out.push(<strong key={`${keyBase}-${i++}`} className="font-semibold text-ink">{tok.slice(2, -2)}</strong>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(<span key={`${keyBase}-${i++}`}>{text.slice(last)}</span>);
  return out;
}

function Rich({ text }: { text: string }) {
  const blocks = text.split("```");
  return (
    <div className="space-y-2.5 text-[13.5px] leading-[1.75] text-[#c9d1e3]">
      {blocks.map((block, bi) => {
        if (bi % 2 === 1) {
          const nl = block.indexOf("\n");
          const lang = nl > -1 ? block.slice(0, nl).trim() : "";
          const code = nl > -1 ? block.slice(nl + 1).replace(/\n$/, "") : block;
          return (
            <div key={bi} className="rounded-lg overflow-hidden border border-line">
              <div className="flex items-center justify-between px-3 py-1.5 bg-bg0/80 border-b border-line">
                <span className="font-mono text-[10.5px] uppercase tracking-widest text-mute">{lang || "code"}</span>
                <CopyBtn text={code} label="" className="!p-1 !border-0 !bg-transparent text-mute hover:!text-ink" />
              </div>
              <pre className="code-block !rounded-none !border-0">{code}</pre>
            </div>
          );
        }
        return block.trim().split("\n").map((line, li) => {
          const k = `${bi}-${li}`;
          if (!line.trim()) return null;
          if (line.startsWith("> ")) {
            return <blockquote key={k} className="border-l-2 border-teal/60 pl-3 text-dim italic">{inline(line.slice(2), k)}</blockquote>;
          }
          if (/^[-•] /.test(line)) {
            return (
              <div key={k} className="flex gap-2.5">
                <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-ember shrink-0" />
                <span>{inline(line.replace(/^[-•] /, ""), k)}</span>
              </div>
            );
          }
          const num = line.match(/^(\d+)\. /);
          if (num) {
            return (
              <div key={k} className="flex gap-2.5">
                <span className="font-mono text-[11.5px] font-bold text-ember2 mt-[3px] shrink-0">{num[1]}.</span>
                <span>{inline(line.replace(/^\d+\. /, ""), k)}</span>
              </div>
            );
          }
          return <p key={k}>{inline(line, k)}</p>;
        });
      })}
    </div>
  );
}

/* ——— curseur de réglage ——— */
function ParamSlider({
  label, value, min, max, step, display, onChange, hint,
}: {
  label: string; value: number; min: number; max: number; step: number;
  display: string; onChange: (v: number) => void; hint?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="mono-label">{label}</span>
        <span className="font-mono text-[12px] font-semibold text-ember2 tabular-nums">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full" style={{ "--pct": `${pct}%` } as CSSProperties}
      />
      {hint && <p className="text-[11px] text-mute mt-1">{hint}</p>}
    </div>
  );
}

const SUGGESTIONS = [
  "Raconte une blague de dev",
  "Écris un poème sur les GPUs",
  "Explique le téléchargement multi-parties",
  "Une fonction Python propre",
];

export function ChatView() {
  const { state, dispatch } = useApp();
  const loadedKeys = state.loaded.map((l) => l.key);

  const [modelKey, setModelKey] = useState<string>("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [params, setParams] = useState(() => {
    try {
      const raw = localStorage.getItem(CHAT_PARAMS_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { temperature: 0.7, topP: 0.9, maxTokens: 2048, systemPrompt: "Tu es un assistant local, précis et chaleureux. Réponds en français." };
  });
  const [confirmClear, setConfirmClear] = useState(false);

  const timerRef = useRef(0);
  const draftRef = useRef("");
  const startRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* chargement / sauvegarde de la conversation */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setMessages(data.messages ?? []);
        if (data.modelKey) setModelKey(data.modelKey);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(CHAT_KEY, JSON.stringify({ messages, modelKey })); } catch { /* ignore */ }
  }, [messages, modelKey]);

  useEffect(() => {
    try { localStorage.setItem(CHAT_PARAMS_KEY, JSON.stringify(params)); } catch { /* ignore */ }
  }, [params]);

  /* modèle sélectionné : doit rester chargé */
  useEffect(() => {
    if (loadedKeys.length === 0) { setModelKey(""); return; }
    if (!modelKey || !loadedKeys.includes(modelKey)) setModelKey(loadedKeys[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedKeys.join(",")]);

  /* autoscroll */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, draft]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const finish = (text: string, stopped: boolean) => {
    window.clearTimeout(timerRef.current);
    if (!stopped || text.trim().length > 0) {
      const ms = performance.now() - startRef.current;
      const tokens = estimateTokens(text);
      const msg: ChatMsg = {
        id: uid(), role: "assistant", content: text, model: modelKey,
        stats: { tokens, tps: ms > 0 ? Math.round(tokens / (ms / 1000)) : 0, ms: Math.round(ms), stopped },
        time: Date.now(),
      };
      setMessages((m) => [...m, msg]);
    }
    setDraft("");
    draftRef.current = "";
    setStreaming(false);
    dispatch({ type: "SET_ACTIVITY", generating: false, modelKey: null });
  };

  const startStream = (reply: string) => {
    setStreaming(true);
    setDraft("");
    draftRef.current = "";
    startRef.current = performance.now();
    dispatch({ type: "SET_ACTIVITY", generating: true, modelKey });
    const words = reply.split(/(\s+)/).filter((t) => t.length > 0);
    let idx = 0;
    const m = modelKey ? modelById(splitKey(modelKey).modelId) : undefined;
    const tps = (m?.tps ?? 40) * (0.8 + Math.random() * 0.4);
    const step = () => {
      idx += 2 + Math.floor(Math.random() * 3);
      const slice = words.slice(0, idx).join("");
      draftRef.current = slice;
      setDraft(slice);
      if (idx >= words.length) { finish(slice, false); return; }
      const delay = Math.min(85, Math.max(13, (1000 / tps) * (1.6 + Math.random() * 2.2)));
      timerRef.current = window.setTimeout(step, delay);
    };
    timerRef.current = window.setTimeout(step, 320 + Math.random() * 400);
  };

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || streaming || !modelKey) return;
    setMessages((m) => [...m, { id: uid(), role: "user", content: text, time: Date.now() }]);
    setInput("");
    startStream(generateReply(text, { temperature: params.temperature, systemPrompt: params.systemPrompt }));
  };

  const regenerate = () => {
    if (streaming || !modelKey) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((m) => (m[m.length - 1]?.role === "assistant" ? m.slice(0, -1) : m));
    startStream(generateReply(lastUser.content, { temperature: params.temperature, systemPrompt: params.systemPrompt }));
  };

  const clearChat = () => {
    if (!confirmClear) { setConfirmClear(true); window.setTimeout(() => setConfirmClear(false), 2600); return; }
    setMessages([]);
    setConfirmClear(false);
  };

  /* ——— aucun modèle chargé ——— */
  if (loadedKeys.length === 0) {
    const quickDl = () => {
      dispatch({ type: "START_DOWNLOAD", modelId: "phi-3.5-mini", quant: "Q4_K_M", parts: 4 });
      dispatch({ type: "NAVIGATE", view: "downloads" });
    };
    return (
      <EmptyState
        icon="bolt"
        title={state.owned.length === 0 ? "Aucun modèle sur votre machine" : "Aucun modèle chargé en mémoire"}
        desc={
          state.owned.length === 0
            ? "Pour discuter, il faut d'abord un modèle local. Téléchargez Phi-3.5 Mini (2,1 Go) en 4 parties reprenables — c'est le plus rapide pour tester l'inférence locale."
            : "Votre bibliothèque contient des modèles, mais aucun n'est chargé en mémoire GPU. Chargez-en un ci-dessous ou depuis l'onglet Système."
        }
      >
        {state.owned.length === 0 ? (
          <>
            <button className="btn btn-ember" onClick={quickDl}>
              <Icon name="download" size={15} /> Télécharger Phi-3.5 Mini · 4 parties
            </button>
            <button className="btn btn-ghost" onClick={() => dispatch({ type: "NAVIGATE", view: "catalog" })}>
              <Icon name="grid" size={15} /> Explorer le catalogue
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-2 w-full max-w-sm">
            {state.owned.map((o) => (
              <button
                key={`${o.modelId}:${o.quant}`}
                className="btn btn-ghost w-full !justify-between"
                onClick={() => dispatch({ type: "LOAD_MODEL", key: `${o.modelId}:${o.quant}` })}
                disabled={state.loading !== null}
              >
                <span className="flex items-center gap-2"><Icon name="bolt" size={14} className="text-ember" /> {keyLabel(`${o.modelId}:${o.quant}`)}</span>
                <span className="font-mono text-[11px] text-mute">{fmtBytes(o.size)}</span>
              </button>
            ))}
          </div>
        )}
      </EmptyState>
    );
  }

  const activeModel = modelKey ? modelById(splitKey(modelKey).modelId) : undefined;

  return (
    <div className="h-full flex gap-4 min-h-0">
      {/* ——— colonne conversation ——— */}
      <div className="flex-1 flex flex-col min-w-0 panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line bg-bg1/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <select
                className="input !w-auto !py-2 !pr-8 appearance-none cursor-pointer font-semibold text-[13px]"
                value={modelKey}
                onChange={(e) => setModelKey(e.target.value)}
              >
                {loadedKeys.map((k) => <option key={k} value={k}>{keyLabel(k)}</option>)}
              </select>
              <Icon name="gauge" size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
            </div>
            {state.loading && (
              <span className="chip !text-warn !border-warn/40">
                <Icon name="refresh" size={11} className="spin-slow" />
                chargement {Math.round(state.loading.progress)} %
              </span>
            )}
            {streaming && (
              <span className="chip !text-ember2 !border-ember/40">
                <span className="w-1.5 h-1.5 rounded-full bg-ember animate-pulse" />
                génération en cours
              </span>
            )}
          </div>
          <button className={`btn btn-ghost btn-sm ${confirmClear ? "!text-danger !border-danger/40" : ""}`} onClick={clearChat} disabled={messages.length === 0}>
            <Icon name="trash" size={13} />
            {confirmClear ? "Confirmer ?" : "Nouvelle conversation"}
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {messages.length === 0 && !streaming && (
            <div className="h-full flex flex-col items-center justify-center text-center fade-in">
              <div className="w-14 h-14 rounded-2xl border border-line bg-bg2 flex items-center justify-center text-ember mb-4">
                <Icon name="sparkle" size={26} />
              </div>
              <h3 className="font-display font-bold text-[17px] mb-1.5">
                {activeModel ? activeModel.name : "Prêt"} <span className="text-mute font-mono text-[12px] font-medium">· 100 % local</span>
              </h3>
              <p className="text-dim text-[13px] max-w-md leading-relaxed mb-6">
                Chaque token est généré sur votre machine. Rien ne transite par Internet — testez, demandez, expérimentez.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="chip hover:!text-ember2 hover:!border-ember/40 cursor-pointer transition-colors !py-2 !px-3.5" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end msg-in">
                <div className="max-w-[78%] rounded-xl rounded-br-sm px-4 py-3 text-[13.5px] leading-relaxed font-medium text-[#221204] bg-gradient-to-b from-ember2 to-ember shadow-[0_8px_24px_-10px_rgba(255,122,41,.5)] whitespace-pre-wrap">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex gap-3 msg-in">
                <div className="w-8 h-8 rounded-lg bg-bg2 border border-line flex items-center justify-center text-teal shrink-0 mt-0.5">
                  <Icon name="logo" size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-[11px] font-semibold text-dim">{m.model ? keyLabel(m.model) : "assistant"}</span>
                    <CopyBtn text={m.content} label="" className="!p-1 !border-0 !bg-transparent text-mute hover:!text-ink opacity-60 hover:opacity-100" />
                  </div>
                  <Rich text={m.content} />
                  {m.stats && (
                    <p className="font-mono text-[10.5px] text-mute mt-2 flex items-center gap-3 flex-wrap">
                      <span>{m.stats.tokens} tokens</span>
                      <span className="text-teal">{m.stats.tps} tok/s</span>
                      <span>{(m.stats.ms / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} s</span>
                      {m.stats.stopped && <span className="text-warn">■ arrêtée</span>}
                    </p>
                  )}
                  {m === messages[messages.length - 1] && !streaming && (
                    <button className="btn btn-ghost btn-sm mt-2.5" onClick={regenerate}>
                      <Icon name="refresh" size={13} /> Régénérer
                    </button>
                  )}
                </div>
              </div>
            )
          )}

          {streaming && (
            <div className="flex gap-3 msg-in">
              <div className="w-8 h-8 rounded-lg bg-bg2 border border-line flex items-center justify-center text-teal shrink-0 mt-0.5">
                <Icon name="logo" size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-[11px] font-semibold text-dim">{modelKey ? keyLabel(modelKey) : ""}</span>
                  <span className="font-mono text-[10.5px] text-ember2">{estimateTokens(draft)} tokens</span>
                </div>
                {draft ? <Rich text={draft} /> : (
                  <span className="inline-flex items-center gap-2 text-dim text-[13px]">
                    <Icon name="refresh" size={14} className="spin-slow text-ember" /> le modèle réfléchit…
                  </span>
                )}
                <span className="cursor-blink inline-block w-2 h-4 bg-ember ml-0.5 align-text-bottom" />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-line p-3.5 bg-bg1/60">
          <div className="flex items-end gap-2.5">
            <textarea
              className="input flex-1 !py-2.5 resize-none leading-relaxed"
              rows={1}
              style={{ maxHeight: 140, height: "auto" }}
              placeholder={modelKey ? "Écrivez votre message… (Entrée pour envoyer)" : "Chargez un modèle pour commencer"}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(140, e.target.scrollHeight)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
            />
            {streaming ? (
              <button className="btn btn-danger" onClick={() => finish(draftRef.current, true)} title="Arrêter la génération">
                <Icon name="stop" size={15} /> Arrêter
              </button>
            ) : (
              <button className="btn btn-ember" onClick={() => send()} disabled={!input.trim()}>
                <Icon name="send" size={15} /> Envoyer
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <p className="font-mono text-[10.5px] text-mute">
              {activeModel ? `${activeModel.name} · ctx ${activeModel.context} · ~${activeModel.tps} tok/s · aucune donnée envoyée en ligne` : ""}
            </p>
            <p className="font-mono text-[10.5px] text-mute">{input.length > 0 ? `${input.length} car.` : ""}</p>
          </div>
        </div>
      </div>

      {/* ——— panneau paramètres ——— */}
      <aside className="hidden xl:flex w-[290px] shrink-0 flex-col gap-4 min-h-0">
        <div className="panel p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-[13.5px] flex items-center gap-2"><Icon name="sliders" size={15} className="text-ember" /> Paramètres</span>
            <button
              className="font-mono text-[10.5px] text-mute hover:text-ink transition-colors"
              onClick={() => setParams((p: typeof params) => ({ ...p, temperature: 0.7, topP: 0.9, maxTokens: 2048 }))}
            >
              réinitialiser
            </button>
          </div>
          <ParamSlider
            label="Température" value={params.temperature} min={0} max={2} step={0.1}
            display={params.temperature.toLocaleString("fr-FR", { minimumFractionDigits: 1 })}
            onChange={(v) => setParams((p: typeof params) => ({ ...p, temperature: v }))}
            hint="Bas = précis et prévisible · haut = créatif"
          />
          <ParamSlider
            label="Top-p" value={params.topP} min={0.1} max={1} step={0.05}
            display={params.topP.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
            onChange={(v) => setParams((p: typeof params) => ({ ...p, topP: v }))}
          />
          <ParamSlider
            label="Tokens max" value={params.maxTokens} min={256} max={8192} step={256}
            display={params.maxTokens.toLocaleString("fr-FR")}
            onChange={(v) => setParams((p: typeof params) => ({ ...p, maxTokens: v }))}
          />
          <div>
            <span className="mono-label block mb-1.5">Prompt système</span>
            <textarea
              className="input resize-none leading-relaxed"
              rows={4}
              value={params.systemPrompt}
              onChange={(e) => setParams((p: typeof params) => ({ ...p, systemPrompt: e.target.value }))}
            />
          </div>
        </div>

        {activeModel && (
          <div className="panel p-4">
            <span className="mono-label block mb-3">Modèle actif</span>
            <div className="space-y-2.5 text-[12.5px]">
              <div className="flex justify-between"><span className="text-mute">Nom</span><span className="font-semibold text-right">{activeModel.name}</span></div>
              <div className="flex justify-between"><span className="text-mute">Quantification</span><span className="font-mono text-ember2">{modelKey ? splitKey(modelKey).quant : "—"}</span></div>
              <div className="flex justify-between"><span className="text-mute">Poids en mémoire</span><span className="font-mono">{modelKey ? fmtBytes(vramBytes(activeModel, splitKey(modelKey).quant)) : "—"}</span></div>
              <div className="flex justify-between"><span className="text-mute">Taille disque</span><span className="font-mono">{modelKey ? fmtBytes(sizeBytes(activeModel, splitKey(modelKey).quant)) : "—"}</span></div>
              <div className="flex justify-between"><span className="text-mute">Contexte</span><span className="font-mono">{activeModel.context}</span></div>
              <div className="flex justify-between"><span className="text-mute">Messages</span><span className="font-mono">{messages.length}</span></div>
            </div>
          </div>
        )}

        <div className="panel p-4 flex items-start gap-3 border-teal/25">
          <Icon name="shield" size={16} className="text-teal shrink-0 mt-0.5" />
          <p className="text-[11.5px] text-dim leading-relaxed">
            <span className="text-teal font-semibold">Confidentialité totale.</span> L'inférence s'exécute sur votre GPU — vos prompts ne quittent jamais cette machine.
          </p>
        </div>
      </aside>
    </div>
  );
}
