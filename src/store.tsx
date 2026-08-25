import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import type { Dispatch, ReactNode } from "react";
import type {
  Action, AppState, DownloadTask, EventKind, LogEvent, OwnedModel, Segment, Toast,
} from "./types";
import { keyLabel, modelById, sizeBytes, splitKey, vramBytes } from "./data/models";
import { clamp, randomHex, splitIntoSegments, uid } from "./lib/format";

const GiB = 1024 ** 3;

const K = {
  settings: "nf_settings_v1",
  owned: "nf_owned_v1",
  tasks: "nf_tasks_v1",
  loaded: "nf_loaded_v1",
  server: "nf_server_v1",
  events: "nf_events_v1",
};

function baseState(): AppState {
  return {
    view: "chat",
    settings: {
      maxParallel: 2,
      defaultSegments: 6,
      autoRetry: true,
      vramTotalGB: 24,
      downloadDir: "~/Neuroforge/modeles",
    },
    owned: [],
    tasks: [],
    loaded: [],
    loading: null,
    server: {
      running: false,
      port: 1234,
      modelKey: null,
      apiKey: `nf-${randomHex(28)}`,
      logs: [],
      logTimer: 2,
    },
    toasts: [],
    activity: { generating: false, modelKey: null },
    events: [],
  };
}

function loadState(): AppState {
  const s = baseState();
  try {
    const settings = localStorage.getItem(K.settings);
    if (settings) s.settings = { ...s.settings, ...JSON.parse(settings) };
    const owned = localStorage.getItem(K.owned);
    if (owned) s.owned = JSON.parse(owned);
    const tasks = localStorage.getItem(K.tasks);
    if (tasks) s.tasks = JSON.parse(tasks);
    const loaded = localStorage.getItem(K.loaded);
    if (loaded) s.loaded = JSON.parse(loaded);
    const server = localStorage.getItem(K.server);
    if (server) s.server = { ...s.server, ...JSON.parse(server), logTimer: 2 };
    const events = localStorage.getItem(K.events);
    if (events) s.events = JSON.parse(events);
    // Les téléchargements "en cours" reprennent tels quels : sans coupure, même après rechargement.
  } catch {
    /* stockage corrompu → état neuf */
  }
  return s;
}

function ev(events: LogEvent[], text: string, kind: EventKind = "info"): LogEvent[] {
  return [{ id: uid(), time: Date.now(), text, kind }, ...events].slice(0, 80);
}

function toast(toasts: Toast[], kind: Toast["kind"], text: string): Toast[] {
  return [...toasts, { id: uid(), kind, text }].slice(-4);
}

export function taskReceived(t: DownloadTask): number {
  return t.segments.reduce((a, s) => a + s.received, 0);
}

function tickTask(t: DownloadTask, dt: number, autoRetry: boolean): DownloadTask {
  if (t.status !== "downloading" && t.status !== "verifying") return t;
  const s: DownloadTask = { ...t, segments: t.segments.map((x) => ({ ...x })) };

  if (s.status === "verifying") {
    s.verify = Math.min(100, s.verify + dt * 42);
    if (s.verify >= 100) s.status = "done";
    return s;
  }

  let speed = 0;
  let allDone = true;
  for (const seg of s.segments) {
    if (seg.status === "done") continue;
    allDone = false;
    if (seg.status === "pending") {
      seg.cooldown -= dt;
      if (seg.cooldown <= 0) {
        seg.status = "active";
        seg.speed = (14 + Math.random() * 22) * 1e6;
      }
      continue;
    }
    if (seg.status === "error") continue;
    // segment actif : vitesse en marche aléatoire, progression, panne simulée
    seg.speed = clamp(seg.speed + (Math.random() - 0.5) * 16e6, 9e6, 64e6);
    seg.received = Math.min(seg.size, seg.received + seg.speed * dt);
    speed += seg.speed;
    if (seg.received >= seg.size) {
      seg.status = "done";
      seg.speed = 0;
      continue;
    }
    const pFail = (autoRetry ? 0.0045 : 0.0012) * dt * 5;
    if (Math.random() < pFail) {
      if (autoRetry) {
        seg.retries += 1;
        seg.status = "pending";
        seg.cooldown = 0.6 + Math.random() * 0.9;
        seg.speed = 0;
      } else {
        seg.status = "error";
        s.status = "error";
        s.error = `Segment ${seg.id + 1} interrompu (coupure réseau simulée) — relancez pour reprendre sans tout retélécharger.`;
      }
    }
  }

  s.speed = speed;
  const remaining = s.segments.reduce((a, x) => a + (x.size - x.received), 0);
  s.eta = speed > 0 ? remaining / speed : 0;
  if (allDone) {
    s.status = "verifying";
    s.verify = 0;
    s.speed = 0;
  }
  return s;
}

function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case "NAVIGATE":
      return { ...state, view: a.view };

    case "PUSH_TOAST":
      return { ...state, toasts: toast(state.toasts, a.kind, a.text) };

    case "DISMISS_TOAST":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== a.id) };

    case "SET_SETTINGS":
      return { ...state, settings: { ...state.settings, ...a.settings } };

    case "SET_ACTIVITY":
      return { ...state, activity: { generating: a.generating, modelKey: a.modelKey } };

    case "CLEAR_EVENTS":
      return { ...state, events: [] };

    case "START_DOWNLOAD": {
      const m = modelById(a.modelId);
      if (!m) return state;
      const size = sizeBytes(m, a.quant);
      if (state.owned.some((o) => o.modelId === a.modelId && o.quant === a.quant)) {
        return { ...state, toasts: toast(state.toasts, "info", `${m.name} (${a.quant}) est déjà dans votre bibliothèque.`) };
      }
      if (state.tasks.some((t) => t.modelId === a.modelId && t.quant === a.quant && t.status !== "done")) {
        return { ...state, toasts: toast(state.toasts, "info", `Téléchargement déjà en cours pour ${m.name} (${a.quant}).`) };
      }
      const sizes = splitIntoSegments(size, a.parts);
      const segments: Segment[] = sizes.map((sz, i) => ({
        id: i, size: sz, received: 0, status: "pending", speed: 0, retries: 0, cooldown: 0.15 + i * 0.12,
      }));
      const task: DownloadTask = {
        id: uid(), modelId: a.modelId, quant: a.quant, size, segments,
        status: "queued", speed: 0, eta: 0, createdAt: Date.now(), verify: 0, error: null,
      };
      return {
        ...state,
        tasks: [task, ...state.tasks],
        toasts: toast(state.toasts, "ok", `${m.name} ajouté — ${a.parts} connexion${a.parts > 1 ? "s" : ""} parallèle${a.parts > 1 ? "s" : ""}.`),
        events: ev(state.events, `Téléchargement lancé : ${m.name} (${a.quant}) en ${a.parts} parties`, "info"),
      };
    }

    case "PAUSE_TASK": {
      const tasks = state.tasks.map((t) =>
        t.id !== a.id
          ? t
          : {
              ...t,
              status: "paused" as const,
              speed: 0,
              segments: t.segments.map((s) =>
                s.status === "active" ? { ...s, status: "pending" as const, cooldown: 0.2, speed: 0 } : s
              ),
            }
      );
      return { ...state, tasks, events: ev(state.events, "Téléchargement mis en pause", "warn") };
    }

    case "RESUME_TASK": {
      const active = state.tasks.filter((t) => t.status === "downloading").length;
      const status = active < state.settings.maxParallel ? ("downloading" as const) : ("queued" as const);
      const tasks = state.tasks.map((t) => (t.id === a.id ? { ...t, status, error: null } : t));
      return {
        ...state,
        tasks,
        toasts: status === "queued" ? toast(state.toasts, "info", "Repris — en file d'attente (limite de téléchargements parallèles atteinte).") : state.toasts,
        events: ev(state.events, "Reprise du téléchargement — sans coupure", "ok"),
      };
    }

    case "RETRY_TASK": {
      const tasks = state.tasks.map((t) =>
        t.id !== a.id
          ? t
          : {
              ...t,
              status: "downloading" as const,
              error: null,
              segments: t.segments.map((s) =>
                s.status === "error" ? { ...s, status: "pending" as const, cooldown: 0.2 } : s
              ),
            }
      );
      return { ...state, tasks, events: ev(state.events, "Segments en erreur relancés", "warn") };
    }

    case "CANCEL_TASK": {
      const t = state.tasks.find((x) => x.id === a.id);
      const m = t ? modelById(t.modelId) : undefined;
      return {
        ...state,
        tasks: state.tasks.filter((x) => x.id !== a.id),
        events: ev(state.events, `Téléchargement annulé : ${m ? m.name : "modèle inconnu"}`, "err"),
      };
    }

    case "LOAD_MODEL": {
      if (state.loading) {
        return { ...state, toasts: toast(state.toasts, "info", "Un modèle est déjà en cours de chargement en mémoire.") };
      }
      if (state.loaded.some((l) => l.key === a.key)) {
        return { ...state, toasts: toast(state.toasts, "info", `${keyLabel(a.key)} est déjà chargé.`) };
      }
      const { modelId, quant } = splitKey(a.key);
      const m = modelById(modelId);
      const own = state.owned.find((o) => o.modelId === modelId && o.quant === quant);
      if (!m || !own) {
        return { ...state, toasts: toast(state.toasts, "err", "Téléchargez d'abord ce modèle depuis le catalogue.") };
      }
      const used = state.loaded.reduce((acc, l) => {
        const s = splitKey(l.key);
        const lm = modelById(s.modelId);
        return acc + (lm ? vramBytes(lm, s.quant) : 0);
      }, 0);
      const need = used + vramBytes(m, quant);
      if (need > state.settings.vramTotalGB * GiB) {
        return {
          ...state,
          toasts: toast(state.toasts, "err", `VRAM insuffisante : ${((need / GiB)).toFixed(1)} Go requis pour ${(state.settings.vramTotalGB).toLocaleString("fr-FR")} Go disponibles. Déchargez un modèle.`),
        };
      }
      return {
        ...state,
        loading: { key: a.key, progress: 0 },
        events: ev(state.events, `Chargement en mémoire : ${keyLabel(a.key)}`, "info"),
      };
    }

    case "UNLOAD_MODEL": {
      const server = state.server.modelKey === a.key ? { ...state.server, modelKey: null } : state.server;
      return {
        ...state,
        loaded: state.loaded.filter((l) => l.key !== a.key),
        server,
        toasts: toast(state.toasts, "info", `${keyLabel(a.key)} déchargé de la mémoire.`),
        events: ev(state.events, `Modèle déchargé : ${keyLabel(a.key)}`, "warn"),
      };
    }

    case "SERVER_START": {
      if (!state.server.modelKey) {
        return { ...state, toasts: toast(state.toasts, "err", "Sélectionnez d'abord un modèle chargé pour le serveur.") };
      }
      return {
        ...state,
        server: { ...state.server, running: true, logTimer: 1.2 },
        toasts: toast(state.toasts, "ok", `Serveur démarré sur http://localhost:${state.server.port}`),
        events: ev(state.events, `Serveur local démarré (port ${state.server.port})`, "ok"),
      };
    }

    case "SERVER_STOP":
      return {
        ...state,
        server: { ...state.server, running: false },
        toasts: toast(state.toasts, "info", "Serveur local arrêté."),
        events: ev(state.events, "Serveur local arrêté", "warn"),
      };

    case "SERVER_SET_MODEL":
      return { ...state, server: { ...state.server, modelKey: a.key } };

    case "SERVER_REGEN_KEY":
      return {
        ...state,
        server: { ...state.server, apiKey: `nf-${randomHex(28)}` },
        toasts: toast(state.toasts, "ok", "Nouvelle clé API générée."),
      };

    case "CLEAR_SERVER_LOG":
      return { ...state, server: { ...state.server, logs: [] } };

    case "TICK": {
      let { loading, server, toasts, events, owned, loaded } = state;
      let tasks = state.tasks.map((t) => tickTask(t, a.dt, state.settings.autoRetry));

      // promotions file d'attente → actif
      let active = tasks.filter((t) => t.status === "downloading").length;
      if (active < state.settings.maxParallel) {
        tasks = tasks.map((t) => {
          if (t.status === "queued" && active < state.settings.maxParallel) {
            active += 1;
            return { ...t, status: "downloading" as const };
          }
          return t;
        });
      }

      // téléchargements terminés → bibliothèque
      for (let i = 0; i < tasks.length; i++) {
        const nt = tasks[i];
        const ot = state.tasks[i];
        if (ot && nt.status === "done" && ot.status !== "done") {
          const m = modelById(nt.modelId);
          const entry: OwnedModel = { modelId: nt.modelId, quant: nt.quant, size: nt.size, addedAt: a.now };
          owned = [...owned, entry];
          toasts = toast(toasts, "ok", `${m ? m.name : "Modèle"} (${nt.quant}) téléchargé — SHA256 vérifié, ajouté à la bibliothèque.`);
          events = ev(events, `Intégrité SHA256 validée : ${m ? m.name : nt.modelId} (${nt.quant})`, "ok");
        }
      }

      // chargement modèle en mémoire
      if (loading) {
        const progress = loading.progress + a.dt * 40;
        if (progress >= 100) {
          loaded = [...state.loaded, { key: loading.key, loadedAt: a.now }];
          toasts = toast(toasts, "ok", `${keyLabel(loading.key)} chargé en mémoire — prêt pour l'inférence.`);
          events = ev(events, `Modèle prêt : ${keyLabel(loading.key)}`, "ok");
          loading = null;
          return { ...state, tasks, owned, loading, loaded, toasts, events };
        }
        loading = { ...loading, progress };
      }

      // journal de requêtes du serveur local
      if (server.running) {
        let logTimer = server.logTimer - a.dt;
        if (logTimer <= 0) {
          logTimer = 2.2 + Math.random() * 5.5;
          const roll = Math.random();
          const entry = {
            id: uid(),
            time: a.now,
            method: roll < 0.12 ? "GET" : "POST",
            path: roll < 0.12 ? "/v1/models" : roll < 0.85 ? "/v1/chat/completions" : "/v1/completions",
            status: 200,
            ms: Math.round(40 + Math.random() * 1600),
            tokens: roll < 0.12 ? 0 : Math.round(24 + Math.random() * 420),
          };
          server = { ...server, logTimer, logs: [...server.logs, entry].slice(-40) };
        } else {
          server = { ...server, logTimer };
        }
      }

      return { ...state, tasks, owned, loading, loaded, server, toasts, events };
    }

    default:
      return state;
  }
}

interface Ctx {
  state: AppState;
  dispatch: Dispatch<Action>;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const persistAt = useRef(0);

  // boucle de simulation (téléchargements, chargements, journal serveur)
  useEffect(() => {
    let last = performance.now();
    const iv = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.5, (now - last) / 1000);
      last = now;
      dispatch({ type: "TICK", dt, now: Date.now() });
    }, 200);
    return () => window.clearInterval(iv);
  }, []);

  // persistance throttlée — permet la reprise des téléchargements après rechargement
  useEffect(() => {
    const now = Date.now();
    if (now - persistAt.current < 800) return;
    persistAt.current = now;
    try {
      localStorage.setItem(K.settings, JSON.stringify(state.settings));
      localStorage.setItem(K.owned, JSON.stringify(state.owned));
      localStorage.setItem(K.tasks, JSON.stringify(state.tasks));
      localStorage.setItem(K.loaded, JSON.stringify(state.loaded));
      localStorage.setItem(K.server, JSON.stringify({ ...state.server, logs: state.server.logs.slice(-20) }));
      localStorage.setItem(K.events, JSON.stringify(state.events.slice(0, 40)));
    } catch {
      /* quota dépassé : on ignore */
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp doit être utilisé dans <AppProvider>");
  return ctx;
}
