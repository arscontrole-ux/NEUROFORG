import { useEffect, useState } from "react";
import { AppProvider, useApp } from "./store";
import { Icon } from "./components/icons";
import type { IconName } from "./components/icons";
import { ToastHost } from "./components/ui";
import { ChatView } from "./views/ChatView";
import { CatalogView } from "./views/CatalogView";
import { DownloadsView } from "./views/DownloadsView";
import { ServerView } from "./views/ServerView";
import { SystemView } from "./views/SystemView";
import type { View } from "./types";
import { clamp, fmtBytes } from "./lib/format";
import { keyLabel, modelById, splitKey, vramBytes } from "./data/models";

const GiB = 1024 ** 3;

const NAV: { view: View; label: string; icon: IconName }[] = [
  { view: "chat", label: "Chat local", icon: "chat" },
  { view: "catalog", label: "Catalogue", icon: "grid" },
  { view: "downloads", label: "Téléchargements", icon: "download" },
  { view: "server", label: "Serveur local", icon: "server" },
  { view: "system", label: "Système", icon: "gauge" },
];

const TITLES: Record<View, { title: string; sub: string }> = {
  chat: { title: "Chat local", sub: "Inférence sur votre GPU — zéro cloud" },
  catalog: { title: "Catalogue", sub: "Modèles GGUF prêts à télécharger" },
  downloads: { title: "Téléchargements", sub: "Multi-parties · reprise sans coupure" },
  server: { title: "Serveur local", sub: "API compatible OpenAI sur 127.0.0.1" },
  system: { title: "Système", sub: "Télémétrie, mémoire & réglages" },
};

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(iv);
  }, []);
  return <span className="font-mono text-[12px] text-dim tabular-nums">{now.toLocaleTimeString("fr-FR")}</span>;
}

function TopBar() {
  const { state, dispatch } = useApp();
  const activeDl = state.tasks.filter((t) => t.status === "downloading");
  const totalSpeed = activeDl.reduce((a, t) => a + t.speed, 0);
  const gpu = Math.round(clamp(6 + (state.activity.generating ? 66 : 0) + (state.loading ? 32 : 0) + Math.min(activeDl.length * 7, 21), 0, 97));
  const meta = TITLES[state.view];

  return (
    <header className="h-14 shrink-0 border-b border-line bg-bg1/70 backdrop-blur-sm flex items-center justify-between px-5 gap-4 relative z-10">
      <div className="min-w-0">
        <h1 className="font-display font-bold text-[15px] leading-tight truncate">{meta.title}</h1>
        <p className="font-mono text-[10.5px] text-mute truncate">{meta.sub}</p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        {(activeDl.length > 0 || totalSpeed > 0) && (
          <button className="chip hover:!border-ember/50 hover:!text-ember2 cursor-pointer transition-colors" onClick={() => dispatch({ type: "NAVIGATE", view: "downloads" })} title="Voir les téléchargements">
            <Icon name="download" size={12} />
            {activeDl.length} · {fmtBytes(totalSpeed)}/s
          </button>
        )}
        <span className={`chip ${gpu > 60 ? "!text-ember2 !border-ember/40" : ""}`} title="Utilisation GPU estimée">
          <Icon name="cpu" size={12} /> GPU {gpu} %
        </span>
        <button
          className={`chip cursor-pointer transition-colors ${state.server.running ? "!text-ok !border-ok/40" : "hover:!border-line2 hover:!text-ink"}`}
          onClick={() => dispatch({ type: "NAVIGATE", view: "server" })}
          title="Serveur local"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${state.server.running ? "bg-ok pulse-dot" : "bg-mute"}`} />
          :{state.server.port}
        </button>
        <Clock />
      </div>
    </header>
  );
}

function SidePanel() {
  const { state, dispatch } = useApp();
  const vramUsed = state.loaded.reduce((acc, l) => {
    const { modelId, quant } = splitKey(l.key);
    const m = modelById(modelId);
    return acc + (m ? vramBytes(m, quant) : 0);
  }, 0);
  const vramPct = clamp((vramUsed / (state.settings.vramTotalGB * GiB)) * 100, 0, 100);
  const dlCount = state.tasks.filter((t) => t.status !== "done").length;

  return (
    <aside className="w-16 lg:w-[230px] shrink-0 border-r border-line bg-bg1/80 backdrop-blur-sm flex flex-col relative z-10">
      <div className="flex items-center gap-3 px-3 lg:px-5 h-14 border-b border-line">
        <span className="text-ember"><Icon name="logo" size={26} /></span>
        <div className="hidden lg:block leading-none">
          <p className="font-display font-extrabold text-[15px] tracking-wide">NEUROFORGE</p>
          <p className="font-mono text-[9.5px] text-mute tracking-[0.18em] mt-1">STUDIO IA · LOCAL</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-2 lg:px-3 space-y-1">
        {NAV.map((n) => {
          const active = state.view === n.view;
          return (
            <button
              key={n.view}
              onClick={() => dispatch({ type: "NAVIGATE", view: n.view })}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-semibold transition-all duration-150 group relative ${
                active ? "bg-ember/12 text-ember2" : "text-dim hover:text-ink hover:bg-white/4"
              }`}
              title={n.label}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-ember" />}
              <Icon name={n.icon} size={17} className={`shrink-0 ${active ? "" : "text-mute group-hover:text-dim"}`} />
              <span className="hidden lg:block flex-1 text-left">{n.label}</span>
              {n.view === "downloads" && dlCount > 0 && (
                <span className="hidden lg:flex font-mono text-[10px] font-bold bg-ember/20 text-ember2 px-1.5 py-0.5 rounded-md">{dlCount}</span>
              )}
              {n.view === "server" && state.server.running && (
                <span className="hidden lg:block w-1.5 h-1.5 rounded-full bg-ok pulse-dot" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 hidden lg:block">
        <div className="panel !rounded-lg p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="mono-label">VRAM</span>
            <span className="font-mono text-[10.5px] text-dim">{Math.round(vramPct)} %</span>
          </div>
          <div className="h-1.5 rounded-full bg-bg0/80 border border-line overflow-hidden mb-2.5">
            <div className="h-full bg-gradient-to-r from-teal/80 to-teal transition-all duration-700" style={{ width: `${vramPct}%` }} />
          </div>
          {state.loaded.length > 0 ? (
            <div className="space-y-1">
              {state.loaded.map((l) => (
                <p key={l.key} className="font-mono text-[10px] text-mute truncate flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-teal shrink-0" /> {keyLabel(l.key)}
                </p>
              ))}
            </div>
          ) : (
            <p className="font-mono text-[10px] text-mute">Aucun modèle en mémoire</p>
          )}
          {state.loading && (
            <p className="font-mono text-[10px] text-warn mt-1.5 flex items-center gap-1.5">
              <Icon name="refresh" size={10} className="spin-slow" /> chargement {Math.round(state.loading.progress)} %
            </p>
          )}
        </div>
        <p className="font-mono text-[9.5px] text-mute text-center mt-3 tracking-wider">v0.9.4 · moteur GGUF simulé</p>
      </div>
    </aside>
  );
}

function Shell() {
  const { state } = useApp();
  return (
    <div className="app-bg h-screen flex overflow-hidden text-ink">
      <SidePanel />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 min-h-0 relative z-10">
          {state.view === "chat" ? (
            <div key="chat" className="h-full p-4 view-in"><ChatView /></div>
          ) : (
            <div key={state.view} className="h-full overflow-y-auto">
              <div className="p-5 lg:p-6 max-w-[1240px] view-in">
                {state.view === "catalog" && <CatalogView />}
                {state.view === "downloads" && <DownloadsView />}
                {state.view === "server" && <ServerView />}
                {state.view === "system" && <SystemView />}
              </div>
            </div>
          )}
        </main>
      </div>
      <ToastHost />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
