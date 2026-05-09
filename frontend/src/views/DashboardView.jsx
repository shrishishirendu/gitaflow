import { useEffect, useState } from 'react';
import {
  ChevronLeft, ArrowRight, BookOpen, Sparkles, TrendingUp,
} from 'lucide-react';
import { fetchDashboard } from '../api/client';
import { C } from '../lib/colors';

/**
 * The Karma Dashboard — a quiet mirror of the user's practice across time.
 *
 * Two distinct render paths:
 *   1. Sparse state (< 5 reflections) — warm, teaching message + cadence dots
 *   2. Full state — noticing, cadence, patterns, top verses, AI insight
 *
 * Designed deliberately AGAINST gamification:
 *   - No streak counts (we count *days returned* if anything, not "streaks")
 *   - No badges, achievements, or progress bars
 *   - No comparisons to other users
 *   - No "you're behind!" framing
 */
export default function DashboardView({ onBack, onOpenLens }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-6 pt-6 pb-32">
        <BackButton onBack={onBack} />
        <p className="font-body text-[13px] mt-8" style={{ color: C.inkMute }}>
          Loading…
        </p>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="px-6 pt-6 pb-32">
        <BackButton onBack={onBack} />
        <p className="font-body text-[13px] mt-8" style={{ color: C.rust }}>
          {err || 'Could not load dashboard.'}
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 pt-6 pb-32 fade-up">
      <BackButton onBack={onBack} />

      <div className="flex items-center gap-2 mt-6 mb-2" style={{ color: C.gold }}>
        <TrendingUp size={14} />
        <span className="font-body text-[10px] tracking-[0.22em]">
          KARMA DASHBOARD
        </span>
      </div>
      <h1
        className="font-display text-[28px] leading-[1.1] mb-2"
        style={{ color: C.ink, fontWeight: 400 }}
      >
        Your practice, mirrored.
      </h1>

      {data.enough_data
        ? <FullDashboard data={data} />
        : <SparseDashboard data={data} onOpenLens={onOpenLens} />}
    </div>
  );
}

function BackButton({ onBack }) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-1 font-body text-[13px]"
      style={{ color: C.inkSoft }}
    >
      <ChevronLeft size={16} />
      <span>Home</span>
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────
// SPARSE STATE — < 5 reflections. Warm, teaching, not a wall.
// ────────────────────────────────────────────────────────────────────────
function SparseDashboard({ data, onOpenLens }) {
  return (
    <>
      <p
        className="font-display italic text-[16px] leading-[1.5] mb-8"
        style={{ color: C.inkMute, fontWeight: 350 }}
      >
        {data.total_reflections === 0
          ? "Your dashboard becomes a mirror after a few reflections. It's quiet here for now — that's exactly right."
          : `Your dashboard becomes a mirror after ${data.threshold} reflections. You have ${data.total_reflections}${data.remaining > 0 ? ` — ${data.remaining} more and patterns will start to surface.` : '.'}`}
      </p>

      {/* Cadence dots — even sparse users see their practice take shape */}
      {data.cadence && data.cadence.some(d => d.has_reflection || d.has_journey_day || d.has_checkin) && (
        <CadenceGrid cadence={data.cadence} />
      )}

      <button
        onClick={() => onOpenLens('')}
        className="w-full mt-8 rounded-md py-4 px-5 flex items-center justify-between transition active:scale-[0.99]"
        style={{ background: C.ink, color: C.paper }}
      >
        <div className="text-left">
          <div className="font-body text-[10px] tracking-[0.22em] opacity-70 mb-1">
            CONTINUE
          </div>
          <div className="font-display text-[17px]" style={{ fontWeight: 400 }}>
            Reflect on a situation
          </div>
        </div>
        <ArrowRight size={18} />
      </button>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────
// FULL DASHBOARD — ≥ 5 reflections. The mirror is real.
// ────────────────────────────────────────────────────────────────────────
function FullDashboard({ data }) {
  return (
    <>
      <p
        className="font-body text-[13px] mb-8"
        style={{ color: C.inkMute }}
      >
        {data.total_reflections} reflections so far.
      </p>

      {/* AI noticing — the centerpiece */}
      {data.insight && (
        <div
          className="mb-10 rounded-md p-6"
          style={{
            background: C.ink,
            color: C.paper,
          }}
        >
          <div className="flex items-center gap-2 mb-3 opacity-70">
            <Sparkles size={12} />
            <span className="font-body text-[10px] tracking-[0.22em]">
              A NOTICING
            </span>
          </div>
          <p
            className="font-display text-[18px] leading-[1.45] italic"
            style={{ fontWeight: 350 }}
          >
            {data.insight}
          </p>
        </div>
      )}

      {/* Cadence — last 30 days */}
      <Section title="LAST 30 DAYS">
        <CadenceGrid cadence={data.cadence} />
        <CadenceLegend />
      </Section>

      {/* Top patterns */}
      {data.top_patterns?.length > 0 && (
        <Section title="WHAT KEEPS COMING UP">
          <div className="space-y-2">
            {data.top_patterns.map(({ pattern, count }) => (
              <div
                key={pattern}
                className="flex items-center justify-between py-2 border-b"
                style={{ borderColor: 'rgba(31,24,20,0.06)' }}
              >
                <span className="font-display text-[15px]" style={{ color: C.ink }}>
                  {pattern.replace(/_/g, ' ')}
                </span>
                <span className="font-body text-[12px]" style={{ color: C.inkMute }}>
                  {count}× this month
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Top emotions — quieter, just a one-liner summary */}
      {data.top_emotions?.length > 0 && (
        <Section title="EMOTIONAL WEATHER">
          <p
            className="font-display text-[15px] leading-[1.5]"
            style={{ color: C.inkSoft, fontWeight: 350 }}
          >
            {data.top_emotions.map((e, i) => (
              <span key={e.emotion}>
                <span style={{ fontStyle: 'italic' }}>{e.emotion}</span>
                {i < data.top_emotions.length - 1 ? (i === data.top_emotions.length - 2 ? ', and ' : ', ') : ''}
              </span>
            ))}
            {' '}have been the texture of these reflections.
          </p>
        </Section>
      )}

      {/* Top verses — the ones you keep meeting */}
      {data.top_verses?.length > 0 && (
        <Section title="VERSES YOU'VE BEEN MEETING">
          <div className="space-y-3">
            {data.top_verses.slice(0, 3).map((v) => (
              <div
                key={v.verse_id}
                className="rounded-md p-4"
                style={{
                  background: C.paper,
                  border: '1px solid rgba(31,24,20,0.08)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5" style={{ color: C.gold }}>
                    <BookOpen size={12} />
                    <span className="font-body text-[10px] tracking-[0.2em]">
                      BG {v.chapter}.{v.verse}
                    </span>
                  </div>
                  <span className="font-body text-[11px]" style={{ color: C.inkMute }}>
                    appeared {v.count}×
                  </span>
                </div>
                <p
                  className="font-display italic text-[14px] leading-[1.5]"
                  style={{ color: C.inkSoft, fontWeight: 350 }}
                >
                  "{v.translation}"
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Shared atoms
// ────────────────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="mb-10">
      <div
        className="font-body text-[10px] tracking-[0.22em] mb-4"
        style={{ color: C.inkMute }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

/** A 30-cell grid showing the last 30 days. Each cell:
 *  - sage if reflection that day
 *  - gold if journey day completed
 *  - faint dot if check-in only
 *  - empty otherwise
 *  Uses union of types — most prominent wins for color. */
function CadenceGrid({ cadence }) {
  return (
    <div className="grid grid-cols-10 gap-1.5 mb-3">
      {cadence.map((d, i) => {
        let bg = 'rgba(31,24,20,0.06)'; // empty day
        if (d.has_reflection)        bg = C.sage;
        else if (d.has_journey_day)  bg = C.gold;
        else if (d.has_checkin)      bg = 'rgba(31,24,20,0.18)';
        return (
          <div
            key={i}
            title={d.date}
            className="aspect-square rounded-sm"
            style={{ background: bg }}
          />
        );
      })}
    </div>
  );
}

function CadenceLegend() {
  return (
    <div className="flex items-center gap-4 mt-3 font-body text-[11px]" style={{ color: C.inkMute }}>
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: C.sage }} />
        <span>reflection</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: C.gold }} />
        <span>journey day</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(31,24,20,0.18)' }} />
        <span>check-in</span>
      </div>
    </div>
  );
}
