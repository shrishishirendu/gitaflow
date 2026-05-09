import { useEffect, useState } from 'react';
import { ChevronLeft, ArrowRight, Compass, Pause, RotateCcw } from 'lucide-react';
import { fetchJourneys, startJourney, resumeJourney } from '../api/client';
import { C } from '../lib/colors';

export default function JourneysView({ onBack, onOpenDay }) {
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetchJourneys()
      .then((d) => setJourneys(d.journeys || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleStartOrResume(j) {
    setBusy(true);
    setErr(null);
    try {
      if (j.progress?.state === 'paused') {
        await resumeJourney(j.progress.id);
        onOpenDay(j.progress.id, j.progress.current_day);
      } else if (j.progress?.state === 'active') {
        onOpenDay(j.progress.id, j.progress.current_day);
      } else {
        const started = await startJourney(j.slug);
        onOpenDay(started.progress_id, 1);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-6 pt-6 pb-32 fade-up">
      <button
        onClick={onBack}
        className="flex items-center gap-1 mb-8 font-body text-[13px]"
        style={{ color: C.inkSoft }}
      >
        <ChevronLeft size={16} />
        <span>Home</span>
      </button>

      <div className="flex items-center gap-2 mb-2" style={{ color: C.gold }}>
        <Compass size={14} />
        <span className="font-body text-[10px] tracking-[0.22em]">JOURNEYS</span>
      </div>
      <h1
        className="font-display text-[28px] leading-[1.1] mb-2"
        style={{ color: C.ink, fontWeight: 400 }}
      >
        Walk through a teaching.
      </h1>
      <p
        className="font-display italic text-[16px] mb-8"
        style={{ color: C.inkMute, fontWeight: 350 }}
      >
        Seven small days. Returns to the same theme from different angles.
      </p>

      {loading && (
        <p className="font-body text-[13px]" style={{ color: C.inkMute }}>
          Loading…
        </p>
      )}

      {err && (
        <p className="font-body text-[12px] mb-4" style={{ color: C.rust }}>
          {err}
        </p>
      )}

      {!loading && journeys.length === 0 && (
        <p className="font-body text-[13px]" style={{ color: C.inkMute }}>
          No journeys available yet.
        </p>
      )}

      <div className="space-y-4">
        {journeys.map((j) => {
          const status =
            j.progress?.state === 'active'    ? 'IN PROGRESS'
          : j.progress?.state === 'paused'    ? 'PAUSED'
          : j.progress?.state === 'completed' ? 'COMPLETED'
                                              : null;
          return (
            <div
              key={j.slug}
              className="rounded-md p-5"
              style={{
                background: C.paper,
                border: `1px solid rgba(31,24,20,0.10)`,
              }}
            >
              {status && (
                <div
                  className="font-body text-[10px] tracking-[0.2em] mb-2"
                  style={{ color: status === 'COMPLETED' ? C.sage : C.gold }}
                >
                  {status}
                  {j.progress?.days_completed > 0 && status !== 'COMPLETED' && (
                    <span style={{ color: C.inkMute }}>
                      {' '}· {j.progress.days_completed}/{j.duration_days} days
                    </span>
                  )}
                </div>
              )}
              <h3
                className="font-display text-[22px] leading-tight mb-1"
                style={{ color: C.ink, fontWeight: 400 }}
              >
                {j.title}
              </h3>
              <p
                className="font-display italic text-[14px] mb-3"
                style={{ color: C.inkMute, fontWeight: 350 }}
              >
                {j.subtitle}
              </p>
              <p
                className="font-body text-[13.5px] leading-[1.55] mb-4"
                style={{ color: C.inkSoft }}
              >
                {j.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="font-body text-[11px]" style={{ color: C.inkMute }}>
                  {j.duration_days} days · ~{j.estimated_minutes_per_day} min/day
                </span>
                <button
                  onClick={() => handleStartOrResume(j)}
                  disabled={busy}
                  className="rounded-md px-4 py-2 flex items-center gap-1.5 font-body text-[12px] disabled:opacity-50"
                  style={{ background: C.ink, color: C.paper }}
                >
                  {j.progress?.state === 'paused'
                    ? <><RotateCcw size={12} /> Resume</>
                  : j.progress?.state === 'active'
                    ? <>Continue <ArrowRight size={12} /></>
                  : j.progress?.state === 'completed'
                    ? <>Revisit <ArrowRight size={12} /></>
                    : <>Begin <ArrowRight size={12} /></>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
