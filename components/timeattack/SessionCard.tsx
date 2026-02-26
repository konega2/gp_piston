import { useEffect, useState } from 'react';
import { getSessionTimeRange, TimeAttackSession } from '@/data/timeAttackSessions';
import { usePilots } from '@/context/PilotsContext';

type SessionCardProps = {
  session: TimeAttackSession;
  onClose: (sessionId: string) => void;
  onUpdateStartTime: (sessionId: string, startTime: string) => { ok: boolean; reason?: 'not-found' | 'invalid-time' };
  onUpdateDuration: (sessionId: string, duration: number) => { ok: boolean; reason?: 'not-found' | 'invalid-duration' };
};

export function SessionCard({ session, onClose, onUpdateStartTime, onUpdateDuration }: SessionCardProps) {
  const { pilots } = usePilots();
  const assignedCount = session.assignedPilots.length;
  const occupancyPercent = Math.min((assignedCount / session.maxCapacity) * 100, 100);
  const isClosed = session.status === 'closed';
  const timeRange = getSessionTimeRange(session.startTime, session.duration);
  const [editableStartTime, setEditableStartTime] = useState(session.startTime);
  const [editableDuration, setEditableDuration] = useState(String(session.duration));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showAssignedPilots, setShowAssignedPilots] = useState(false);

  const assignedPilotList = session.assignedPilots.map((pilotId) => {
    const pilot = pilots.find((entry) => entry.id === pilotId);
    if (!pilot) {
      return {
        id: pilotId,
        label: pilotId
      };
    }

    return {
      id: pilotId,
      label: `#${String(pilot.numeroPiloto).padStart(2, '0')} · ${pilot.nombre} ${pilot.apellidos}`
    };
  });

  useEffect(() => {
    setEditableStartTime(session.startTime);
  }, [session.startTime]);

  useEffect(() => {
    setEditableDuration(String(session.duration));
  }, [session.duration]);

  const handleSaveTime = () => {
    const result = onUpdateStartTime(session.id, editableStartTime);
    if (!result.ok) {
      setFeedback('Hora inválida. Usa formato HH:mm.');
      return;
    }

    setFeedback('Hora guardada');
  };

  const handleSaveDuration = () => {
    const parsedDuration = Number(editableDuration);
    const result = onUpdateDuration(session.id, parsedDuration);
    if (!result.ok) {
      setFeedback('Duración inválida. Debe ser un número mayor a 0.');
      return;
    }

    setFeedback('Duración guardada');
  };

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border p-5 shadow-panel-deep backdrop-blur-xl transition-all duration-200 ${
        isClosed
          ? 'border-gp-racingRed/40 bg-[rgba(34,18,22,0.72)]'
          : 'border-gp-telemetryBlue/30 bg-[rgba(17,24,38,0.72)] hover:-translate-y-0.5 hover:border-gp-telemetryBlue/45'
      }`}
    >
      <span className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l border-t border-gp-telemetryBlue/45" />
      <span className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r border-t border-gp-racingRed/45" />
      <span className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 border-b border-l border-gp-racingRed/45" />
      <span className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 border-b border-r border-gp-telemetryBlue/45" />

      <div className="relative z-10 space-y-4">
        <div className="space-y-1">
          <h2 className="text-4xl font-semibold uppercase tracking-[0.14em] text-white">{session.name}</h2>
          <p className="text-base font-semibold uppercase tracking-[0.12em] text-cyan-200">{timeRange}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-gp-textSoft">Capacidad</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {assignedCount} <span className="text-gp-textSoft">/ {session.maxCapacity} pilotos</span>
          </p>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-300 ${isClosed ? 'bg-gp-racingRed/70' : 'bg-gp-telemetryBlue/70'}`}
            style={{ width: `${occupancyPercent}%` }}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.13em] text-gp-textSoft">Hora de inicio</label>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={editableStartTime}
              onChange={(event) => {
                setEditableStartTime(event.target.value);
                setFeedback(null);
              }}
              className="w-full rounded-lg border border-white/20 bg-[rgba(17,24,38,0.75)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-gp-telemetryBlue/55"
            />
            <button
              type="button"
              onClick={handleSaveTime}
              className="rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-cyan-200 transition-all duration-200 hover:bg-gp-telemetryBlue/20 hover:text-white"
            >
              Guardar
            </button>
          </div>
          {feedback ? <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">{feedback}</p> : null}
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.13em] text-gp-textSoft">Duración (minutos)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={editableDuration}
              onChange={(event) => {
                setEditableDuration(event.target.value);
                setFeedback(null);
              }}
              className="w-full rounded-lg border border-white/20 bg-[rgba(17,24,38,0.75)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-gp-telemetryBlue/55"
            />
            <button
              type="button"
              onClick={handleSaveDuration}
              className="rounded-lg border border-gp-telemetryBlue/45 bg-gp-telemetryBlue/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-cyan-200 transition-all duration-200 hover:bg-gp-telemetryBlue/20 hover:text-white"
            >
              Guardar
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowAssignedPilots((current) => !current)}
            className="w-full rounded-lg border border-gp-telemetryBlue/35 bg-gp-telemetryBlue/10 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.13em] text-cyan-200 transition-all duration-200 hover:bg-gp-telemetryBlue/20 hover:text-white"
          >
            {showAssignedPilots ? 'Ocultar pilotos asignados' : `Ver pilotos asignados (${assignedCount})`}
          </button>

          {showAssignedPilots ? (
            <div className="max-h-36 space-y-1 overflow-auto rounded-lg border border-white/10 bg-black/20 p-2">
              {assignedPilotList.length === 0 ? (
                <p className="text-[11px] uppercase tracking-[0.12em] text-gp-textSoft">No hay pilotos asignados.</p>
              ) : (
                assignedPilotList.map((pilot) => (
                  <p key={pilot.id} className="text-xs uppercase tracking-[0.12em] text-white">
                    {pilot.label}
                  </p>
                ))
              )}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
              isClosed
                ? 'border-gp-racingRed/55 bg-gp-racingRed/15 text-red-200'
                : 'border-gp-telemetryBlue/55 bg-gp-telemetryBlue/15 text-cyan-200'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isClosed ? 'bg-gp-racingRed' : 'bg-gp-telemetryBlue'}`} />
            {isClosed ? 'Cerrada' : 'Pendiente'}
          </span>

          <button
            type="button"
            onClick={() => onClose(session.id)}
            disabled={isClosed}
            className="rounded-lg border border-gp-racingRed/45 bg-gp-racingRed/[0.1] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-red-200 transition-all duration-200 hover:bg-gp-racingRed/[0.2] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </article>
  );
}
