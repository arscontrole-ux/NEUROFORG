import { useEffect, useState } from "react";
import { AppProvider, useApp } from "./store";
import { Icon } from "./components/icons";
import type { IconName } from "./components/icons";
import { Modal, ToastHost } from "./components/ui";
import { ChatView } from "./views/ChatView";
import { CatalogView } from "./views/CatalogView";
import { DownloadsView } from "./views/DownloadsView";
import { ServerView } from "./views/ServerView";
import { SystemView } from "./views/SystemView";
import { useInstall } from "./hooks/useInstall";
import type { InstallInfo } from "./hooks/useInstall";
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

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

function TopBar({ info, onInstallHelp }: { info: InstallInfo; onInstallHelp: () => void }) {
  const { state, dispatch } = useApp();
  const online = useOnline();
  const activeDl = state.tasks.filter((t) => t.status === "downloading");
  const totalSpeed = activeDl.reduce((a, t) => a + t.speed, 0);
  const gpu = Math.round(clamp(6 + (state.activity.generating ? 66 : 0) + (state.loading ? 32 : 0) + Math.min(activeDl.length * 7, 21), 0, 97));
  const meta = TITLES[state.view];

  const doInstall = async () => {
    const res = await info.install();
    if (res === "unavailable") onInstallHelp();
    else if (res === "accepted") dispatch({ type: "PUSH_TOAST", kind: "ok", text: "NEUROFORGE est installée — retrouvez-la dans vos applications." });
  };

  return (
    <header className="h-14 shrink-0 border-b border-line bg-bg1/70 backdrop-blur-sm flex items-center justify-between px-5 gap-4 relative z-10">
      <div className="min-w-0">
        <h1 className="font-display font-bold text-[15px] leading-tight truncate">{meta.title}</h1>
        <p className="font-mono text-[10.5px] text-mute truncate">{meta.sub}</p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        {!online && (
          <span className="chip !text-warn !border-warn/40" title="Pas de réseau — l'application fonctionne hors-ligne grâce au cache local">
            <Icon name="net" size={12} /> hors-ligne
          </span>
        )}
        {info.installed ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-lg border border-ok/40 bg-ok/10 text-ok px-2.5 py-1.5 text-[12.5px] font-semibold shrink-0"
            title="NEUROFORGE tourne en mode application"
          >
            <Icon name="check" size={13} /> <span className="hidden sm:inline">Installée</span>
          </span>
        ) : (
          <button
            className="btn btn-ember btn-sm install-glow shrink-0"
            onClick={doInstall}
            disabled={info.prompting}
            title="Installer NEUROFORGE comme application — bouton toujours disponible"
          >
            <Icon name={info.prompting ? "refresh" : "download"} size={14} className={info.prompting ? "spin-slow" : ""} />
            <span>{info.prompting ? "Installation…" : "Installer"}</span>
          </button>
        )}
        {(activeDl.length > 0 || totalSpeed > 0) && (
          <button className="chip hover:!border-ember/50 hover:!text-ember2 cursor-pointer transition-colors" onClick={() => dispatch({ type: "NAVIGATE", view: "downloads" })} title="Voir les téléchargements">
            <Icon name="download" size={12} />
            {activeDl.length} · {fmtBytes(totalSpeed)}/s
          </button>
        )}
        <span className={`chip hidden md:inline-flex ${gpu > 60 ? "!text-ember2 !border-ember/40" : ""}`} title="Utilisation GPU estimée">
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

function SidePanel({ info, onInstallHelp }: { info: InstallInfo; onInstallHelp: () => void }) {
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

      {/* icône d'installation — visible dans le rail compact (mobile) */}
      <div className="p-2.5 lg:hidden border-t border-line">
        <button
          onClick={onInstallHelp}
          className={`w-full py-2.5 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
            info.installed
              ? "border-ok/35 bg-ok/10 text-ok"
              : "border-ember/40 bg-ember/10 text-ember2 install-glow"
          }`}
          title={info.installed ? "Application installée" : "Installer NEUROFORGE"}
        >
          <Icon name={info.installed ? "check" : "download"} size={17} />
        </button>
      </div>

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

        <button
          onClick={onInstallHelp}
          className={`w-full mt-2.5 flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-[12px] font-semibold transition-all duration-150 cursor-pointer ${
            info.installed
              ? "border-ok/30 bg-ok/8 text-ok"
              : "border-ember/30 bg-ember/8 text-ember2 hover:bg-ember/15 hover:border-ember/50"
          }`}
          title={info.installed ? "NEUROFORGE est installée comme application" : "Installer NEUROFORGE comme application"}
        >
          <Icon name={info.installed ? "check" : "download"} size={15} className="shrink-0" />
          <span className="flex-1 text-left">{info.installed ? "Application installée" : "Installer l'application"}</span>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${info.installed ? "bg-ok pulse-dot" : "bg-ember"}`} />
        </button>
        <p className="font-mono text-[9.5px] text-mute text-center mt-3 tracking-wider">v0.9.4 · moteur GGUF simulé</p>
      </div>
    </aside>
  );
}

/* ——— bannière d'installation (fermable, mémorisée) ——— */
function InstallBanner({ info, onInstallHelp }: { info: InstallInfo; onInstallHelp: () => void }) {
  const { dispatch } = useApp();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("nf_install_dismissed") === "1");

  if (info.installed || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem("nf_install_dismissed", "1");
    setDismissed(true);
  };

  const primary = async () => {
    if (info.canInstall) {
      const res = await info.install();
      if (res === "unavailable") onInstallHelp();
      else if (res === "accepted") dispatch({ type: "PUSH_TOAST", kind: "ok", text: "NEUROFORGE est installée — retrouvez-la dans vos applications." });
    } else {
      onInstallHelp();
    }
  };

  return (
    <div className="shrink-0 px-4 pt-4 relative z-10">
      <div className="panel panel-glow px-4 py-3.5 flex items-center gap-4 view-in max-w-[1240px]">
        <span className="w-10 h-10 rounded-lg bg-ember/15 border border-ember/35 flex items-center justify-center text-ember shrink-0">
          <Icon name="download" size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold leading-snug">
            Installez NEUROFORGE comme une application
          </p>
          <p className="text-[12px] text-dim leading-snug mt-0.5 truncate">
            Lancement en un clic depuis le bureau · plein écran · disponible hors-ligne — vos modèles restent sur votre machine.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="btn btn-ember btn-sm" onClick={primary} disabled={info.prompting}>
            <Icon name={info.prompting ? "refresh" : "bolt"} size={13} className={info.prompting ? "spin-slow" : ""} />
            {info.prompting ? "Installation…" : info.canInstall ? "Installer" : "Comment faire ?"}
          </button>
          <button className="btn btn-ghost btn-sm !px-2.5" onClick={dismiss} title="Ne plus afficher">
            <Icon name="x" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ——— fenêtre d'aide à l'installation ——— */
interface GuideStep {
  platform: string;
  icon: IconName;
  match: boolean;
  steps: string[];
}

function InstallModal({ open, onClose, info }: { open: boolean; onClose: () => void; info: InstallInfo }) {
  const { dispatch } = useApp();
  const isWindows = /Windows/i.test(navigator.userAgent);
  const isEdge = /Edg\//i.test(navigator.userAgent);

  const rawGuides: GuideStep[] = [
    {
      platform: info.isIOS ? "iPhone / iPad — Safari (votre appareil)" : "iPhone / iPad — Safari",
      icon: "smartphone",
      match: info.isIOS,
      steps: [
        "Ouvrez NEUROFORGE dans Safari",
        "Touchez le bouton Partager (carré avec flèche)",
        "Choisissez « Sur l'écran d'accueil » puis « Ajouter »",
      ],
    },
    {
      platform: info.isAndroid ? "Android — Chrome (votre appareil)" : "Android — Chrome",
      icon: "smartphone",
      match: info.isAndroid,
      steps: [
        "Ouvrez le menu ⋮ en haut à droite",
        "Touchez « Installer l'application » (ou « Ajouter à l'écran d'accueil »)",
        "Confirmez avec « Installer »",
      ],
    },
    {
      platform: info.isMac ? "macOS — Safari ou Chrome (votre appareil)" : "macOS — Safari ou Chrome",
      icon: "monitor",
      match: info.isMac,
      steps: [
        "Safari : menu Partager → « Ajouter au Dock »",
        "Chrome : icône d'installation à droite de la barre d'adresse",
        "L'app apparaîtra dans le Dock et Launchpad",
      ],
    },
    {
      platform: isWindows
        ? `Windows — ${isEdge ? "Edge" : "Chrome"} (votre appareil)`
        : `Windows / Linux — ${isEdge ? "Edge" : "Chrome"}`,
      icon: "monitor",
      match: isWindows,
      steps: [
        "Cliquez sur l'icône d'installation à droite de la barre d'adresse",
        `Ou menu ${isEdge ? "« … »" : "⋮"} → « Installer NEUROFORGE… »`,
        "L'app s'ajoute au menu Démarrer et à la barre des tâches",
      ],
    },
  ];
  const guides = [...rawGuides].sort((a, b) => Number(b.match) - Number(a.match));

  const doInstall = async () => {
    const res = await info.install();
    if (res === "accepted") {
      dispatch({ type: "PUSH_TOAST", kind: "ok", text: "NEUROFORGE est installée — retrouvez-la dans vos applications." });
      onClose();
    } else if (res === "unavailable") {
      dispatch({ type: "PUSH_TOAST", kind: "info", text: "Votre navigateur ne propose pas l'installation directe — suivez le guide ci-dessous." });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Installer NEUROFORGE" width={580}>
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <img src="/icons/icon.svg" alt="Icône NEUROFORGE" className="w-16 h-16 rounded-2xl border border-line shrink-0" />
          <div>
            <p className="text-[13.5px] leading-relaxed text-dim">
              Installez le studio comme une <span className="text-ink font-semibold">véritable application</span> : fenêtre dédiée en plein écran,
              lancement instantané depuis le bureau, et fonctionnement <span className="text-ink font-semibold">hors-ligne</span> grâce au cache local.
              Vos modèles ne quittent jamais votre machine.
            </p>
          </div>
        </div>

        {info.installed ? (
          <div className="p-4 rounded-lg border border-ok/35 bg-ok/8 flex items-center gap-3">
            <Icon name="check" size={18} className="text-ok shrink-0" />
            <p className="text-[13px] text-ok font-semibold">
              NEUROFORGE est déjà installée — vous l'utilisez en ce moment en mode application.
            </p>
          </div>
        ) : info.canInstall ? (
          <button className="btn btn-ember w-full !py-3" onClick={doInstall} disabled={info.prompting}>
            <Icon name={info.prompting ? "refresh" : "download"} size={16} className={info.prompting ? "spin-slow" : ""} />
            {info.prompting ? "Installation en cours…" : "Installer maintenant"}
          </button>
        ) : (
          <div className="p-3.5 rounded-lg border border-warn/35 bg-warn/8 flex items-start gap-3">
            <Icon name="info" size={16} className="text-warn shrink-0 mt-0.5" />
            <p className="text-[12.5px] text-dim leading-relaxed">
              Votre navigateur ne propose pas l'installation en un clic — suivez les étapes correspondant à votre appareil ci-dessous.
            </p>
          </div>
        )}

        <div className="space-y-2.5">
          {guides.map((g) => (
            <div
              key={g.platform}
              className={`p-3.5 rounded-lg border transition-colors ${g.match ? "border-ember/40 bg-ember/6" : "border-line bg-bg1"}`}
            >
              <p className="flex items-center gap-2 text-[12.5px] font-semibold mb-2">
                <Icon name={g.icon} size={15} className={g.match ? "text-ember" : "text-mute"} />
                {g.platform}
                {g.match && <span className="chip !text-ember2 !border-ember/40 !text-[9.5px]">détecté</span>}
              </p>
              <ol className="space-y-1">
                {g.steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[12.5px] text-dim leading-relaxed">
                    <span className={`font-mono text-[10px] font-bold mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 ${g.match ? "bg-ember/20 text-ember2" : "bg-white/5 text-mute"}`}>
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function Shell() {
  const { state } = useApp();
  const installInfo = useInstall();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="app-bg h-screen flex overflow-hidden text-ink">
      <SidePanel info={installInfo} onInstallHelp={() => setHelpOpen(true)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar info={installInfo} onInstallHelp={() => setHelpOpen(true)} />
        <InstallBanner info={installInfo} onInstallHelp={() => setHelpOpen(true)} />
        <main className="flex-1 min-h-0 relative z-10 flex flex-col">
          {state.view === "chat" ? (
            <div key="chat" className="flex-1 min-h-0 p-4 view-in"><ChatView /></div>
          ) : (
            <div key={state.view} className="flex-1 min-h-0 overflow-y-auto">
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
      <InstallModal open={helpOpen} onClose={() => setHelpOpen(false)} info={installInfo} />
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
