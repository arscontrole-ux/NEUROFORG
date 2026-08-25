export type View = "chat" | "catalog" | "downloads" | "server" | "system";

export type SegStatus = "pending" | "active" | "done" | "error";
export type TaskStatus = "queued" | "downloading" | "paused" | "verifying" | "done" | "error";
export type EventKind = "info" | "ok" | "warn" | "err";

export interface Segment {
  id: number;
  size: number; // octets
  received: number; // octets
  status: SegStatus;
  speed: number; // octets/s
  retries: number;
  cooldown: number; // s avant réactivation
}

export interface DownloadTask {
  id: string;
  modelId: string;
  quant: string;
  size: number;
  segments: Segment[];
  status: TaskStatus;
  speed: number; // octets/s
  eta: number; // s
  createdAt: number;
  verify: number; // 0..100
  error: string | null;
}

export interface OwnedModel {
  modelId: string;
  quant: string;
  size: number;
  addedAt: number;
}

export interface LoadedRef {
  key: string; // modelId:quant
  loadedAt: number;
}

export interface ModelDef {
  id: string;
  name: string;
  org: string;
  params: number; // milliards de paramètres
  arch: string;
  context: string;
  tps: number; // tokens/s indicatifs
  tags: string[];
  desc: string;
  hue: number;
}

export interface Settings {
  maxParallel: number;
  defaultSegments: number;
  autoRetry: boolean;
  vramTotalGB: number;
  downloadDir: string;
}

export interface ServerLogEntry {
  id: string;
  time: number;
  method: string;
  path: string;
  status: number;
  ms: number;
  tokens: number;
}

export interface ServerState {
  running: boolean;
  port: number;
  modelKey: string | null;
  apiKey: string;
  logs: ServerLogEntry[];
  logTimer: number;
}

export interface LogEvent {
  id: string;
  time: number;
  text: string;
  kind: EventKind;
}

export interface Toast {
  id: string;
  kind: "ok" | "err" | "info";
  text: string;
}

export interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  stats?: { tokens: number; tps: number; ms: number; stopped?: boolean };
  time: number;
}

export interface AppState {
  view: View;
  settings: Settings;
  owned: OwnedModel[];
  tasks: DownloadTask[];
  loaded: LoadedRef[];
  loading: { key: string; progress: number } | null;
  server: ServerState;
  toasts: Toast[];
  activity: { generating: boolean; modelKey: string | null };
  events: LogEvent[];
}

export type Action =
  | { type: "NAVIGATE"; view: View }
  | { type: "TICK"; dt: number; now: number }
  | { type: "START_DOWNLOAD"; modelId: string; quant: string; parts: number }
  | { type: "PAUSE_TASK"; id: string }
  | { type: "RESUME_TASK"; id: string }
  | { type: "RETRY_TASK"; id: string }
  | { type: "CANCEL_TASK"; id: string }
  | { type: "SET_SETTINGS"; settings: Partial<Settings> }
  | { type: "LOAD_MODEL"; key: string }
  | { type: "UNLOAD_MODEL"; key: string }
  | { type: "SERVER_START" }
  | { type: "SERVER_STOP" }
  | { type: "SERVER_SET_MODEL"; key: string | null }
  | { type: "SERVER_REGEN_KEY" }
  | { type: "CLEAR_SERVER_LOG" }
  | { type: "CLEAR_EVENTS" }
  | { type: "SET_ACTIVITY"; generating: boolean; modelKey: string | null }
  | { type: "PUSH_TOAST"; kind: Toast["kind"]; text: string }
  | { type: "DISMISS_TOAST"; id: string };
