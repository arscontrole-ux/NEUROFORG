import { useEffect, useRef, useState } from "react";
import { useApp } from "../store";
import { keyLabel, splitKey } from "../data/models";
import { Icon } from "../components/icons";
import { CopyBtn, EmptyState } from "../components/ui";
import { fmtClock } from "../lib/format";

type SnippetTab = "curl" | "python" | "js";

export function ServerView() {
  const { state, dispatch } = useApp();
  const { server } = state;
  const [tab, setTab] = useState<SnippetTab>("curl");
  const logRef = useRef<HTMLDivElement>(null);

  const loadedKeys = state.loaded.map((l) => l.key);
  const model = server.modelKey ? splitKey(server.modelKey).modelId : "mon-modele";

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [server.logs.length]);

  if (loadedKeys.length === 0) {
    return (
      <EmptyState
        icon="server"
        title="Serveur sans modèle"
        desc="Le serveur local expose un modèle chargé en mémoire via une API compatible OpenAI. Chargez d'abord un modèle depuis le chat ou l'onglet Système."
      >
        <button className="btn btn-ember" onClick={() => dispatch({ type: "NAVIGATE", view: "system" })}>
          <Icon name="gauge" size={15} /> Gérer la mémoire
        </button>
        <button className="btn btn-ghost" onClick={() => dispatch({ type: "NAVIGATE", view: "catalog" })}>
          <Icon name="grid" size={15} /> Catalogue
        </button>
      </EmptyState>
    );
  }

  const base = `http://localhost:${server.port}`;
  const snippets: Record<SnippetTab, string> = {
    curl: `curl ${base}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${server.apiKey}" \\
  -d '{
    "model": "${model}",
    "messages": [{"role": "user", "content": "Bonjour !"}],
    "temperature": 0.7
  }'`,
    python: `from openai import OpenAI

client = OpenAI(
    base_url="${base}/v1",
    api_key="${server.apiKey}",  # clé locale, jamais envoyée en ligne
)

resp = client.chat.completions.create(
    model="${model}",
    messages=[{"role": "user", "content": "Bonjour !"}],
)
print(resp.choices[0].message.content)`,
    js: `const res = await fetch("${base}/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${server.apiKey}",
  },
  body: JSON.stringify({
    model: "${model}",
    messages: [{ role: "user", content: "Bonjour !" }],
  }),
});

const data = await res.json();
console.log(data.choices[0].message.content);`,
  };

  const endpoints = [
    { method: "POST", path: "/v1/chat/completions", desc: "Conversation — streaming SSE supporté" },
    { method: "POST", path: "/v1/completions", desc: "Complétion de texte brute" },
    { method: "GET", path: "/v1/models", desc: "Liste des modèles exposés" },
    { method: "GET", path: "/v1/health", desc: "État du serveur et télémétrie" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-[22px] tracking-tight">Serveur local</h2>
          <p className="text-dim text-[13px] mt-1">API compatible OpenAI, hébergée sur votre machine — branchez vos apps, scripts et agents</p>
        </div>
        <div className="flex gap-2">
          <span className="chip"><Icon name="shield" size={12} /> Compatible OpenAI</span>
          <span className="chip"><Icon name="net" size={12} /> CORS activé</span>
          <span className="chip !text-ok !border-ok/40"><Icon name="cpu" size={12} /> 100 % local</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* panneau de contrôle */}
        <div className={`panel p-5 lg:col-span-2 space-y-4 ${server.running ? "panel-glow" : ""}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${server.running ? "bg-ok pulse-dot" : "bg-line2"}`} />
              <span className="font-display font-bold text-[15px]">{server.running ? "En écoute" : "Arrêté"}</span>
            </div>
            <span className="font-mono text-[12px] text-dim">{base}</span>
          </div>

          <div>
            <span className="mono-label block mb-1.5">Modèle exposé</span>
            <select
              className="input cursor-pointer font-semibold text-[13px]"
              value={server.modelKey ?? ""}
              onChange={(e) => dispatch({ type: "SERVER_SET_MODEL", key: e.target.value || null })}
            >
              <option value="" disabled>Choisir un modèle chargé…</option>
              {loadedKeys.map((k) => <option key={k} value={k}>{keyLabel(k)}</option>)}
            </select>
          </div>

          <div>
            <span className="mono-label block mb-1.5">Clé API (locale)</span>
            <div className="flex gap-2">
              <code className="input !py-2 font-mono text-[11.5px] text-teal truncate select-all">{server.apiKey}</code>
              <button className="btn btn-ghost btn-sm shrink-0" onClick={() => dispatch({ type: "SERVER_REGEN_KEY" })} title="Régénérer la clé">
                <Icon name="refresh" size={13} />
              </button>
              <CopyBtn text={server.apiKey} label="" className="btn btn-ghost btn-sm shrink-0" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="font-mono text-[11px] text-mute">port {server.port} · 127.0.0.1 uniquement</span>
            {server.running ? (
              <button className="btn btn-danger btn-sm" onClick={() => dispatch({ type: "SERVER_STOP" })}>
                <Icon name="stop" size={13} /> Arrêter le serveur
              </button>
            ) : (
              <button className="btn btn-ember btn-sm" onClick={() => dispatch({ type: "SERVER_START" })} disabled={!server.modelKey}>
                <Icon name="play" size={13} /> Démarrer le serveur
              </button>
            )}
          </div>

          <div className="border-t border-line pt-4">
            <span className="mono-label block mb-2.5">Points d'accès</span>
            <div className="space-y-1.5">
              {endpoints.map((e) => (
                <div key={e.path} className="flex items-center gap-2.5 py-1 group">
                  <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${e.method === "GET" ? "text-teal bg-teal/10" : "text-ember2 bg-ember/10"}`}>{e.method}</span>
                  <code className="font-mono text-[12px] text-ink">{e.path}</code>
                  <span className="text-[11px] text-mute ml-auto hidden sm:block">{e.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* extraits + journal */}
        <div className="lg:col-span-3 space-y-4">
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3 pb-0">
              <div className="flex gap-1">
                {([["curl", "cURL"], ["python", "Python"], ["js", "JavaScript"]] as [SnippetTab, string][]).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`px-3.5 py-2 rounded-t-lg font-mono text-[12px] font-semibold transition-colors ${
                      tab === id ? "text-ember2 bg-bg0/70 border border-b-0 border-line" : "text-mute hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <CopyBtn text={snippets[tab]} className="btn btn-ghost btn-sm mb-1" />
            </div>
            <div className="p-3">
              <pre className="code-block !rounded-b-lg">{snippets[tab]}</pre>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-line bg-bg1/60">
              <span className="font-display font-bold text-[13px] flex items-center gap-2">
                <Icon name="terminal" size={15} className="text-teal" /> Journal des requêtes
                {server.running && <span className="chip !text-ok !border-ok/40 !py-0.5">live</span>}
              </span>
              <button className="font-mono text-[10.5px] text-mute hover:text-ink transition-colors" onClick={() => dispatch({ type: "CLEAR_SERVER_LOG" })}>
                vider
              </button>
            </div>
            <div ref={logRef} className="h-[240px] overflow-y-auto p-3 font-mono text-[11.5px] leading-[1.9] bg-[#0a0c11]">
              {!server.running && server.logs.length === 0 && (
                <p className="text-mute pt-6 text-center">— serveur arrêté, aucune requête —</p>
              )}
              {server.logs.length === 0 && server.running && (
                <p className="text-mute pt-6 text-center">en attente de requêtes sur {base}…</p>
              )}
              {server.logs.map((l) => (
                <div key={l.id} className="flex gap-3 whitespace-nowrap fade-in">
                  <span className="text-mute shrink-0">{fmtClock(l.time)}</span>
                  <span className={l.method === "GET" ? "text-teal shrink-0 w-10" : "text-ember2 shrink-0 w-10"}>{l.method}</span>
                  <span className="text-dim">{l.path}</span>
                  <span className="text-ok ml-auto shrink-0">{l.status}</span>
                  <span className="text-mute shrink-0 w-16 text-right">{l.ms} ms</span>
                  {l.tokens > 0 && <span className="text-warn shrink-0 w-20 text-right">{l.tokens} tok</span>}
                </div>
              ))}
              {server.running && (
                <div className="flex items-center gap-2 text-mute">
                  <span className="text-teal">▸</span>
                  <span className="cursor-blink inline-block w-2 h-3.5 bg-teal/80" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
