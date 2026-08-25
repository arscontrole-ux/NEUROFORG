import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { DownloadTask, TaskStatus, Toast } from "../types";
import { Icon } from "./icons";
import type { IconName } from "./icons";
import { useApp } from "../store";
import { taskReceived } from "../store";
import { fmtPct } from "../lib/format";

/* ——— Modale ——— */
export function Modal({
  open, onClose, title, children, width = 560,
}: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[3px] fade-in" onClick={onClose} />
      <div className="relative panel modal-in max-h-[88vh] overflow-y-auto w-full" style={{ maxWidth: width }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="font-display font-bold text-[15px]">{title}</h3>
          <button className="text-mute hover:text-ink transition-colors focus-ring rounded" onClick={onClose} aria-label="Fermer">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ——— Interrupteur ——— */
export function Toggle({
  checked, onChange, label, hint,
}: {
  checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full gap-4 py-2 group focus-ring rounded"
    >
      <span className="text-left">
        <span className="block text-[13.5px] font-semibold text-ink">{label}</span>
        {hint && <span className="block text-[12px] text-mute mt-0.5">{hint}</span>}
      </span>
      <span
        className={`relative shrink-0 w-10 h-[22px] rounded-full transition-colors duration-200 ${
          checked ? "bg-ember" : "bg-line"
        } group-hover:brightness-110`}
      >
        <span
          className={`absolute top-[3px] w-4 h-4 rounded-full bg-bg0 transition-all duration-200 ${
            checked ? "left-[21px]" : "left-[3px]"
          }`}
        />
      </span>
    </button>
  );
}

/* ——— Champ ——— */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mono-label block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

/* ——— Jauge ——— */
export function Meter({
  label, display, value, color = "var(--color-ember)", icon,
}: {
  label: string; display: string; value: number; color?: string; icon?: IconName;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-2 mono-label">
          {icon && <Icon name={icon} size={14} className="text-dim" />}
          {label}
        </span>
        <span className="font-mono text-[13px] font-semibold text-ink">{display}</span>
      </div>
      <div className="h-2 rounded-full bg-bg0/70 border border-line overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 65%, white 10%))` }}
        />
      </div>
    </div>
  );
}

/* ——— Barre multi-segments ——— */
export function SegmentBar({ task, tall = false }: { task: DownloadTask; tall?: boolean }) {
  return (
    <div className="seg-track" style={{ height: tall ? 12 : 10 }}>
      {task.segments.map((s) => {
        const pct = s.size > 0 ? (s.received / s.size) * 100 : 0;
        const cls =
          s.status === "done" ? "seg-fill-done" : s.status === "error" ? "seg-fill-err" : s.status === "active" ? "seg-fill-active" : "";
        return (
          <div key={s.id} className="seg-cell" title={`Segment ${s.id + 1} — ${fmtPct(pct)}`}>
            <div className={`seg-fill ${cls}`} style={{ width: `${pct}%` }} />
          </div>
        );
      })}
    </div>
  );
}

/* ——— Aperçu du découpage (modale) ——— */
export function SegmentsPreview({ parts }: { parts: number }) {
  return (
    <div className="flex gap-[3px] h-8">
      {Array.from({ length: parts }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-[4px] border border-line2/70 bg-gradient-to-b from-bg3 to-bg2 fade-in flex items-end justify-center overflow-hidden"
          style={{ animationDelay: `${i * 30}ms` }}
        >
          <div className="w-full seg-fill-active" style={{ height: `${20 + ((i * 37) % 60)}%`, opacity: 0.85 }} />
        </div>
      ))}
    </div>
  );
}

/* ——— Badge de statut ——— */
const STATUS_META: Record<TaskStatus, { label: string; cls: string }> = {
  queued: { label: "En file", cls: "text-dim border-line bg-bg2" },
  downloading: { label: "En cours", cls: "text-ember2 border-ember/40 bg-ember/10" },
  paused: { label: "En pause", cls: "text-warn border-warn/40 bg-warn/10" },
  verifying: { label: "Vérification SHA256", cls: "text-teal border-teal/40 bg-teal/10" },
  done: { label: "Terminé", cls: "text-ok border-ok/40 bg-ok/10" },
  error: { label: "Erreur", cls: "text-danger border-danger/40 bg-danger/10" },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold px-2.5 py-1 rounded-full border ${m.cls}`}>
      {status === "downloading" && <span className="w-1.5 h-1.5 rounded-full bg-ember animate-pulse" />}
      {status === "verifying" && <Icon name="shield" size={11} />}
      {status === "done" && <Icon name="check" size={11} />}
      {status === "error" && <Icon name="alert" size={11} />}
      {m.label}
    </span>
  );
}

/* ——— État vide ——— */
export function EmptyState({
  icon, title, desc, children,
}: {
  icon: IconName; title: string; desc: string; children?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center justify-center text-center py-16 px-6 fade-in">
      <div className="w-14 h-14 rounded-2xl border border-line bg-bg2 flex items-center justify-center text-ember mb-4">
        <Icon name={icon} size={26} />
      </div>
      <h3 className="font-display font-bold text-lg mb-1.5">{title}</h3>
      <p className="text-dim text-[13.5px] max-w-md leading-relaxed mb-5">{desc}</p>
      {children && <div className="flex flex-wrap gap-3 justify-center">{children}</div>}
    </div>
  );
}

/* ——— Bouton copier ——— */
export function CopyBtn({ text, label = "Copier", className = "btn btn-ghost btn-sm" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button className={`${className} ${copied ? "!text-ok !border-ok/40" : ""}`} onClick={doCopy}>
      <Icon name={copied ? "check" : "copy"} size={14} />
      {copied ? "Copié !" : label}
    </button>
  );
}

/* ——— Toasts ——— */
function ToastItem({ t }: { t: Toast }) {
  const { dispatch } = useApp();
  useEffect(() => {
    const timer = window.setTimeout(() => dispatch({ type: "DISMISS_TOAST", id: t.id }), 4200);
    return () => window.clearTimeout(timer);
  }, [t.id, dispatch]);

  const meta = {
    ok: { icon: "check" as IconName, cls: "border-ok/40 text-ok" },
    err: { icon: "alert" as IconName, cls: "border-danger/40 text-danger" },
    info: { icon: "info" as IconName, cls: "border-teal/40 text-teal" },
  }[t.kind];

  return (
    <div className={`toast-in panel flex items-start gap-3 px-4 py-3 w-[340px] shadow-2xl shadow-black/50 border ${meta.cls.split(" ")[0]}`}>
      <Icon name={meta.icon} size={16} className={`${meta.cls.split(" ")[1]} mt-0.5 shrink-0`} />
      <p className="text-[13px] leading-snug text-ink flex-1">{t.text}</p>
      <button className="text-mute hover:text-ink transition-colors shrink-0" onClick={() => dispatch({ type: "DISMISS_TOAST", id: t.id })} aria-label="Fermer">
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

export function ToastHost() {
  const { state } = useApp();
  return (
    <div className="fixed top-4 right-4 z-[70] flex flex-col gap-2.5">
      {state.toasts.map((t) => <ToastItem key={t.id} t={t} />)}
    </div>
  );
}

/* ——— Progression globale d'une tâche ——— */
export function taskPct(t: DownloadTask): number {
  return t.size > 0 ? (taskReceived(t) / t.size) * 100 : 0;
}
