import { useState } from "react";
import { useApp, taskReceived } from "../store";
import { keyLabel, modelById } from "../data/models";
import { fmtBytes, fmtDuration, fmtPct, timeAgo } from "../lib/format";
import { Icon } from "../components/icons";
import { EmptyState, SegmentBar, StatusBadge, taskPct } from "../components/ui";
import type { DownloadTask } from "../types";

function TaskCard({ task }: { task: DownloadTask }) {
  const { state, dispatch } = useApp();
  const [confirming, setConfirming] = useState(false);
  const m = modelById(task.modelId);
  const received = taskReceived(task);
  const pct = taskPct(task);
  const retries = task.segments.reduce((a, s) => a + s.retries, 0);
  const loaded = state.loaded.some((l) => l.key === `${task.modelId}:${task.quant}`);

  const cancel = () => {
    if (!confirming) {
      setConfirming(true);
      window.setTimeout(() => setConfirming(false), 2600);
      return;
    }
    dispatch({ type: "CANCEL_TASK", id: task.id });
  };

  return (
    <div className={`panel p-5 view-in ${task.status === "error" ? "!border-danger/40" : ""}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `linear-gradient(135deg, hsl(${m?.hue ?? 30} 80% 58% / .25), hsl(${m?.hue ?? 30} 80% 40% / .25))`, color: `hsl(${m?.hue ?? 30} 85% 65%)` }}
          >
            <Icon name={task.status === "done" ? "check" : "download"} size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-bold text-[14.5px] truncate">{m?.name ?? task.modelId}</h3>
            <p className="font-mono text-[11.5px] text-mute mt-0.5">
              {task.quant} · {task.segments.length} connexion{task.segments.length > 1 ? "s" : ""} · ajouté {timeAgo(task.createdAt)}
            </p>
          </div>
        </div>
        <StatusBadge status={task.status} />
      </div>

      {task.status === "error" && task.error && (
        <div className="mt-3 flex items-start gap-2.5 text-[12.5px] text-danger bg-danger/8 border border-danger/30 rounded-lg px-3.5 py-2.5">
          <Icon name="alert" size={15} className="shrink-0 mt-0.5" />
          <span>{task.error} <span className="text-dim">({fmtBytes(received)} déjà reçus, rien n'est perdu.)</span></span>
        </div>
      )}

      <div className="mt-4">
        {task.status === "verifying" ? (
          <div className="h-[12px] rounded-md bg-bg0/70 border border-line overflow-hidden">
            <div className="h-full bg-gradient-to-r from-teal/70 to-teal transition-all duration-200" style={{ width: `${task.verify}%` }} />
          </div>
        ) : (
          <SegmentBar task={task} tall />
        )}
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-4">
          <span className="font-mono text-[22px] font-bold text-ink tabular-nums">{fmtPct(pct)}</span>
          <span className="font-mono text-[12px] text-dim tabular-nums">
            {fmtBytes(received)} / {fmtBytes(task.size)}
          </span>
          {task.status === "downloading" && task.speed > 0 && (
            <span className="font-mono text-[12px] text-ember2 tabular-nums flex items-center gap-1.5">
              <Icon name="net" size={13} /> {fmtBytes(task.speed)}/s · reste {fmtDuration(task.eta)}
            </span>
          )}
          {task.status === "verifying" && (
            <span className="font-mono text-[12px] text-teal flex items-center gap-1.5">
              <Icon name="shield" size={13} className="spin-slow" /> contrôle d'intégrité SHA256… {Math.round(task.verify)} %
            </span>
          )}
          {retries > 0 && task.status !== "done" && (
            <span className="chip !text-warn !border-warn/40" title="Segments repris automatiquement">
              <Icon name="refresh" size={11} /> {retries} reprise{retries > 1 ? "s" : ""} auto
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {task.status === "downloading" && (
            <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: "PAUSE_TASK", id: task.id })}>
              <Icon name="pause" size={13} /> Pause
            </button>
          )}
          {task.status === "paused" && (
            <button className="btn btn-teal btn-sm" onClick={() => dispatch({ type: "RESUME_TASK", id: task.id })}>
              <Icon name="play" size={13} /> Reprendre
            </button>
          )}
          {task.status === "queued" && (
            <span className="chip"><Icon name="clock" size={11} /> en attente d'un emplacement</span>
          )}
          {task.status === "error" && (
            <button className="btn btn-ember btn-sm" onClick={() => dispatch({ type: "RETRY_TASK", id: task.id })}>
              <Icon name="refresh" size={13} /> Relancer les segments
            </button>
          )}
          {task.status === "done" && !loaded && (
            <button className="btn btn-ember btn-sm" onClick={() => dispatch({ type: "LOAD_MODEL", key: `${task.modelId}:${task.quant}` })}>
              <Icon name="bolt" size={13} /> Charger en mémoire
            </button>
          )}
          {task.status === "done" && loaded && (
            <span className="chip !text-ok !border-ok/40"><Icon name="bolt" size={11} /> en mémoire</span>
          )}
          {(task.status === "done" || task.status === "error" || task.status === "paused" || task.status === "queued") && (
            <button
              className={`btn btn-sm ${confirming ? "btn-danger" : "btn-ghost"}`}
              onClick={cancel}
              title={task.status === "done" ? "Retirer de la liste" : "Annuler"}
            >
              <Icon name="trash" size={13} />
              {confirming ? "Confirmer ?" : task.status === "done" ? "Retirer" : "Annuler"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DownloadsView() {
  const { state, dispatch } = useApp();
  const tasks = state.tasks;
  const active = tasks.filter((t) => t.status === "downloading");
  const totalSpeed = active.reduce((a, t) => a + t.speed, 0);
  const totalReceived = tasks.reduce((a, t) => a + taskReceived(t), 0);
  const doneCount = tasks.filter((t) => t.status === "done").length;

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon="download"
        title="Aucun téléchargement en cours"
        desc="Parcourez le catalogue et lancez votre premier téléchargement multi-parties : chaque segment reprend exactement là où il s'est arrêté, même après un redémarrage."
      >
        <button className="btn btn-ember" onClick={() => dispatch({ type: "NAVIGATE", view: "catalog" })}>
          <Icon name="grid" size={15} /> Ouvrir le catalogue
        </button>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-[22px] tracking-tight">Téléchargements</h2>
          <p className="text-dim text-[13px] mt-1">File d'attente locale · chaque fichier est découpé en parties indépendantes et reprenables</p>
        </div>
        {doneCount > 0 && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => tasks.filter((t) => t.status === "done").forEach((t) => dispatch({ type: "CANCEL_TASK", id: t.id }))}
          >
            <Icon name="trash" size={13} /> Nettoyer les terminés
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="panel p-4">
          <div className="mono-label mb-1.5">Transferts actifs</div>
          <div className="font-mono text-xl font-bold">{active.length}<span className="text-mute text-[13px] font-medium"> / {state.settings.maxParallel} emplacements</span></div>
        </div>
        <div className="panel p-4">
          <div className="mono-label mb-1.5">Débit total</div>
          <div className="font-mono text-xl font-bold text-ember2 tabular-nums">{totalSpeed > 0 ? `${fmtBytes(totalSpeed)}/s` : "—"}</div>
        </div>
        <div className="panel p-4">
          <div className="mono-label mb-1.5">Volume reçu</div>
          <div className="font-mono text-xl font-bold text-teal tabular-nums">{fmtBytes(totalReceived)}</div>
        </div>
        <div className="panel p-4">
          <div className="mono-label mb-1.5">Terminés</div>
          <div className="font-mono text-xl font-bold text-ok tabular-nums">{doneCount}<span className="text-mute text-[13px] font-medium"> · vérifiés SHA256</span></div>
        </div>
      </div>

      <div className="space-y-3.5">
        {tasks.map((t) => <TaskCard key={t.id} task={t} />)}
      </div>

      <p className="text-[11.5px] text-mute flex items-center gap-2">
        <Icon name="shield" size={13} className="text-teal" />
        Astuce : fermez l'application en plein téléchargement — à la réouverture, chaque partie reprend au bit près ({keyLabel(`${tasks[0].modelId}:${tasks[0].quant}`)} inclus). C'est la reprise sans coupure.
      </p>
    </div>
  );
}
