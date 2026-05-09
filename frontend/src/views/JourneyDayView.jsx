import { useEffect, useState } from 'react';
import { ChevronLeft, ArrowRight, Lock, Check, Sparkles } from 'lucide-react';
import { fetchJourneyDay, completeJourneyDay } from '../api/client';
import { C } from '../lib/colors';

/**
 * Per-day journey screen. Layout:
 *   - Back button
 *   - Day kicker + title
 *   - (if locked) lock notice with "Continue anyway" override
 *   - (if threading) callback to previous response
 *   - Framing line (italic)
 *   - Verse card (compact)
 *   - Context paragraph
 *   - Reflection prompt + textarea
 *   - "Mark complete" button
 *   - (if karma_lens_entry) "Bring this to Karma Lens →" secondary link
 *   - Journey map at bottom (visible arc)
 */
export default function JourneyDayView({
  progressId,
  dayNumber,
  onBack,
  onOpenLens,
  onJourneyChanged,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [overrideLock, setOverrideLock] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    setLoading(true);
    setData(null);
    setResponse('');
    setOverrideLock(false);
    setJustCompleted(false);
    fetchJourneyDay(progressId, dayNumber)
      .then((d) => {
        setData(d);
        if (d.my_response) setResponse(d.my_response);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [progressId, dayNumber]);

  async function handleComplete() {
    setSaving(true);
    try {
      const r = await completeJourneyDay(progressId, dayNumber, response.trim() || null);
      setJustCompleted(true);
      onJourneyChanged?.();
      // Refresh local state to reflect completion
      const fresh = await fetchJourneyDay(progressId, dayNumber);
      setData(fresh);
      if (r.journey_just_finished) {
        // Could show a special completion screen — for now, keep simple
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  function navigateToDay(n) {
    // Just update the dayNumber via parent — easier than re-fetching here
    onBack(); // pop back to home, parent will reroute on map tap from home
    // Actually — better: use onJourneyChanged + a new prop. For simplicity,
    // we'll rely on the parent passing a re-open function via key.
  }

  if (loading) {
    return (
      <div className="px-6 pt-6 pb-32 fade-up">
        <button
          onClick={onBack}
          className="flex items-center gap-1 mb-8 font-body text-[13px]"
          style={{ color: C.inkSoft }}
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>
        <p className="font-body text-[13px]" style={{ color: C.inkMute }}>
          Loading…
        </p>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="px-6 pt-6 pb-32">
        <button onClick={onBack} className="font-body text-[13px]" style={{ color: C.inkSoft }}>
          <ChevronLeft size={16} className="inline" /> Back
        </button>
        <p className="font-body text-[13px] mt-4" style={{ color: C.rust }}>
          {err || 'Journey day could not be loaded.'}
        </p>
      </div>
    );
  }

  const { day, journey, thread, completed, is_unlocked } = data;
  const isLockedAndNotOverridden = !is_unlocked && !overrideLock && !completed;

  return (
    <div className="px-6 pt-6 pb-32 fade-up">
      <button
        onClick={onBack}
        className="flex items-center gap-1 mb-6 font-body text-[13px]"
        style={{ color: C.inkSoft }}
      >
        <ChevronLeft size={16} />
        <span>Home</span>
      </button>

      {/* Kicker */}
      <div className="font-body text-[10px] tracking-[0.22em] mb-2" style={{ color: C.gold }}>
        {day.kicker}
      </div>

      {/* Day title */}
      <h1
        className="font-display text-[30px] leading-[1.1] mb-4"
        style={{ color: C.ink, fontWeight: 400 }}
      >
        {day.title}
      </h1>

      {/* Lock notice — appears only if naturally locked AND user hasn't overridden */}
      {isLockedAndNotOverridden && (
        <div
          className="rounded-md p-4 mb-6 flex items-start gap-3"
          style={{
            background: C.parchment2,
            border: `1px solid ${C.gold}55`,
          }}
        >
          <Lock size={14} style={{ color: C.gold, marginTop: 2 }} />
          <div className="flex-1">
            <p className="font-display italic text-[14.5px] leading-[1.5]" style={{ color: C.inkSoft }}>
              Day {dayNumber} unlocks at sunrise. Sit with yesterday for a day.
            </p>
            <button
              onClick={() => setOverrideLock(true)}
              className="font-body text-[12px] mt-2 underline"
              style={{ color: C.inkMute }}
            >
              Continue anyway →
            </button>
          </div>
        </div>
      )}

      {/* Threading: yesterday's words as a soft callback */}
      {thread && thread.length > 0 && !isLockedAndNotOverridden && (
        <div className="mb-6 pl-4" style={{ borderLeft: `2px solid ${C.gold}` }}>
          <div className="font-body text-[10px] tracking-[0.2em] mb-2" style={{ color: C.gold }}>
            {thread.length === 1 ? `DAY ${thread[0].day_number} · YOU WROTE` : 'EARLIER YOU WROTE'}
          </div>
          {thread.slice(-2).map((t) => (
            <p
              key={t.day_number}
              className="font-display italic text-[15px] leading-[1.45] mb-1"
              style={{ color: C.inkSoft, fontWeight: 350 }}
            >
              "{t.response}"
            </p>
          ))}
        </div>
      )}

      {/* Framing line */}
      {!isLockedAndNotOverridden && (
        <p
          className="font-display text-[18px] leading-[1.4] mb-6 italic"
          style={{ color: C.ink, fontWeight: 350 }}
        >
          {day.framing}
        </p>
      )}

      {/* Verse — compact card */}
      {!isLockedAndNotOverridden && day.verse && (
        <div
          className="rounded-md p-5 mb-6 relative overflow-hidden"
          style={{
            background: `linear-gradient(180deg, ${C.paper} 0%, ${C.parchment2} 100%)`,
            border: `1px solid ${C.gold}55`,
          }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: C.gold }} />
          <div className="font-body text-[10px] tracking-[0.22em] mb-2" style={{ color: C.gold }}>
            BG {day.verse.chapter}.{day.verse.verse}
          </div>
          {day.verse.sanskrit && (
            <p className="font-display text-[14px] leading-[1.6] mb-2" style={{ color: C.ink }}>
              {day.verse.sanskrit}
            </p>
          )}
          {day.verse.translation && (
            <p
              className="font-display italic text-[15px] leading-[1.5]"
              style={{ color: C.inkSoft, fontWeight: 350 }}
            >
              "{day.verse.translation}"
            </p>
          )}
        </div>
      )}

      {/* Context paragraph */}
      {!isLockedAndNotOverridden && (
        <p
          className="font-body text-[14px] leading-[1.6] mb-8"
          style={{ color: C.ink }}
        >
          {day.context}
        </p>
      )}

      {/* Prompt + textarea */}
      {!isLockedAndNotOverridden && (
        <>
          <div className="mb-4">
            <p
              className="font-display text-[16px] mb-3"
              style={{ color: C.ink, fontWeight: 400 }}
            >
              {day.prompt_label}
            </p>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder={day.prompt_placeholder}
              rows={4}
              maxLength={4000}
              className="w-full rounded-md p-3 font-body text-[14px] outline-none resize-none"
              style={{
                background: C.paper,
                color: C.ink,
                border: `1px solid ${C.gold}55`,
              }}
            />
          </div>

          <button
            onClick={handleComplete}
            disabled={saving}
            className="w-full rounded-md py-4 px-5 flex items-center justify-between font-body text-[14px] mb-3 disabled:opacity-50"
            style={{ background: C.ink, color: C.paper }}
          >
            <span>
              {completed ? 'Save changes' : `Mark Day ${dayNumber} complete`}
            </span>
            {completed ? <Check size={16} /> : <ArrowRight size={16} />}
          </button>

          {(justCompleted || completed) && (
            <p
              className="font-body italic text-[12px] mb-3 text-center"
              style={{ color: C.sage }}
            >
              ✓ saved
            </p>
          )}

          {/* Optional: bring this to Karma Lens */}
          {day.karma_lens_entry && (
            <button
              onClick={() => onOpenLens(day.karma_lens_prompt || `Reflecting on Day ${dayNumber} of ${journey.title}: `)}
              className="w-full rounded-md py-3 px-5 flex items-center justify-center gap-2 font-body text-[13px] mb-3"
              style={{
                background: 'transparent',
                color: C.saffron,
                border: `1px solid ${C.saffron}55`,
              }}
            >
              <Sparkles size={13} />
              <span>Bring this to Karma Lens</span>
            </button>
          )}
        </>
      )}

      {/* Journey map — always visible at bottom */}
      <div className="mt-12 pt-6" style={{ borderTop: '1px solid rgba(31,24,20,0.10)' }}>
        <div className="font-body text-[10px] tracking-[0.22em] mb-4" style={{ color: C.inkMute }}>
          {journey.title.toUpperCase()} · 7 DAYS
        </div>
        <div className="space-y-1.5">
          {journey.days.map((d) => (
            <div
              key={d.day_number}
              className="flex items-center gap-3 py-1.5"
              style={{
                opacity: d.is_current ? 1 : (d.completed ? 0.85 : 0.5),
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium"
                style={{
                  background: d.completed ? C.sage : (d.is_current ? C.ink : 'transparent'),
                  color: (d.completed || d.is_current) ? C.paper : C.inkMute,
                  border: !d.completed && !d.is_current ? `1px solid ${C.inkMute}55` : 'none',
                }}
              >
                {d.completed ? <Check size={10} /> : d.day_number}
              </div>
              <span
                className="font-body text-[13px]"
                style={{
                  color: d.is_current ? C.ink : C.inkSoft,
                  fontWeight: d.is_current ? 500 : 400,
                }}
              >
                Day {d.day_number} · {d.title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
