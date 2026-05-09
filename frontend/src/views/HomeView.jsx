import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, Bookmark, Cloud, CloudOff, Feather, PenLine, X, Compass, TrendingUp, BookOpen,
} from 'lucide-react';
import {
  fetchReflectionCount,
  fetchTodayCheckin,
  saveCheckin,
  fetchHomeInsight,
  fetchActiveJourney,
} from '../api/client';
import { C } from '../lib/colors';

// Three broad arrival categories. Each chip carries its own subtle tint so
// the screen has visual texture rather than five matching outlines. Below
// the chips, a "Or name it yourself" link expands a single text input —
// the inclusion escape hatch.
const ARRIVAL_CHIPS = [
  {
    value: 'lifting',
    label: 'Lifting',
    description: 'open · grateful · hopeful',
    tint: '#EDE7D6',          // warm cream-gold (joy)
    activeTint: '#C49A4D',
  },
  {
    value: 'steady',
    label: 'Steady',
    description: 'settled · clear · here',
    tint: '#E4E5DD',          // sage neutral
    activeTint: '#6E7A65',
  },
  {
    value: 'weighing',
    label: 'Weighing',
    description: 'heavy · stuck · tender',
    tint: '#E8DDD6',          // warm taupe (rest, not sad)
    activeTint: '#8E5C42',
  },
];

export default function HomeView({
  onOpenLens, onOpenJournal, onOpenJourneys, onOpenJourneyDay, onOpenDashboard, onOpenExplorer,
  reflectionCount, dailyVerse, journeyTick = 0,
}) {
  // Persistence indicator
  const [backendCount, setBackendCount] = useState(null);
  const [syncStatus, setSyncStatus] = useState('checking');

  // Arrival check-in
  const [todayEmotion, setTodayEmotion] = useState(null);
  const [savingCheckin, setSavingCheckin] = useState(false);
  const [showFreeText, setShowFreeText] = useState(false);
  const [freeText, setFreeText] = useState('');
  const freeTextRef = useRef(null);

  // Continuity strip
  const [insight, setInsight] = useState(null);

  // Active journey
  const [activeJourney, setActiveJourney] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetchReflectionCount()
      .then((d) => { if (!cancelled) { setBackendCount(d.count); setSyncStatus('synced'); } })
      .catch(() => { if (!cancelled) setSyncStatus('offline'); });

    fetchTodayCheckin()
      .then((d) => { if (!cancelled) setTodayEmotion(d.emotion); })
      .catch(() => {});

    fetchHomeInsight()
      .then((d) => { if (!cancelled) setInsight(d); })
      .catch(() => {});

    fetchActiveJourney()
      .then((d) => { if (!cancelled) setActiveJourney(d.active); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [journeyTick]);

  async function handleCheckin(emotion) {
    if (savingCheckin || todayEmotion === emotion) return;
    setSavingCheckin(true);
    setTodayEmotion(emotion);
    try {
      await saveCheckin(emotion);
    } catch {
      setTodayEmotion(null);
    } finally {
      setSavingCheckin(false);
    }
  }

  async function handleFreeTextSubmit() {
    const word = freeText.trim();
    if (!word || word.length > 40 || savingCheckin) return;
    setSavingCheckin(true);
    setTodayEmotion(word.toLowerCase());
    try {
      await saveCheckin(word.toLowerCase());
      setShowFreeText(false);
      setFreeText('');
    } catch {
      // revert
      setTodayEmotion(null);
    } finally {
      setSavingCheckin(false);
    }
  }

  function openFreeText() {
    setShowFreeText(true);
    setTimeout(() => freeTextRef.current?.focus(), 50);
  }

  // Did the user use a custom (non-chip) word? If so, show it as a tag below
  // the chips so they know it registered.
  const isCustomEmotion = todayEmotion && !ARRIVAL_CHIPS.some(c => c.value === todayEmotion);

  const displayCount = backendCount !== null ? backendCount : reflectionCount;
  const hour = new Date().getHours();
  const greeting =
    hour < 5  ? 'Good night'
  : hour < 12 ? 'Good morning'
  : hour < 17 ? 'Good afternoon'
  : hour < 21 ? 'Good evening'
              : 'Good night';

  return (
    <div className="px-6 pt-10 pb-32 fade-up">
      {/* Brand mark */}
      <div className="flex items-center gap-2 mb-10">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: C.ink }}>
          <Feather size={14} style={{ color: C.parchment }} />
        </div>
        <span className="font-display text-[16px] tracking-tight" style={{ color: C.ink, fontWeight: 500 }}>
          GitaFlow
        </span>
      </div>

      {/* Greeting — restrained */}
      <h1
        className="font-display text-[26px] leading-[1.1] mb-1"
        style={{ color: C.inkSoft, fontWeight: 400 }}
      >
        {greeting}.
      </h1>

      {/* Arrival prompt */}
      <p
        className="font-display italic text-[17px] leading-snug mb-5"
        style={{ color: C.inkMute, fontWeight: 350 }}
      >
        What's arriving with you?
      </p>

      {/* ── Arrival chips: now WEIGHTED and TINTED ─────────────────────── */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {ARRIVAL_CHIPS.map(({ value, label, description, tint, activeTint }) => {
          const active = todayEmotion === value;
          return (
            <button
              key={value}
              onClick={() => handleCheckin(value)}
              disabled={savingCheckin}
              className="rounded-md px-3 py-3 text-left transition border"
              style={{
                background: active ? activeTint : tint,
                borderColor: active ? activeTint : 'transparent',
                color: active ? C.paper : C.ink,
              }}
            >
              <div
                className="font-display text-[15px] leading-tight"
                style={{ fontWeight: active ? 500 : 400, color: active ? C.paper : C.ink }}
              >
                {label}
              </div>
              <div
                className="font-body text-[10px] mt-1 leading-snug"
                style={{ color: active ? 'rgba(251,246,236,0.7)' : C.inkMute }}
              >
                {description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Free-text escape hatch — collapsed by default */}
      {!showFreeText && !isCustomEmotion && (
        <button
          onClick={openFreeText}
          className="font-body text-[12px] flex items-center gap-1.5 mb-8 transition"
          style={{ color: C.inkMute }}
        >
          <PenLine size={12} />
          <span>Or name it yourself →</span>
        </button>
      )}

      {showFreeText && (
        <div className="flex items-center gap-2 mb-8">
          <input
            ref={freeTextRef}
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFreeTextSubmit()}
            placeholder="One word for it…"
            maxLength={40}
            className="flex-1 rounded-md px-3 py-2 font-body text-[14px] outline-none"
            style={{ background: C.paper, color: C.ink, border: `1px solid ${C.gold}55` }}
          />
          <button
            onClick={handleFreeTextSubmit}
            disabled={!freeText.trim()}
            className="rounded-md px-3 py-2 font-body text-[12px] disabled:opacity-40"
            style={{ background: C.ink, color: C.paper }}
          >
            Save
          </button>
          <button
            onClick={() => { setShowFreeText(false); setFreeText(''); }}
            className="rounded-md p-2"
            style={{ color: C.inkMute }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {isCustomEmotion && !showFreeText && (
        <div className="flex items-center gap-2 mb-8">
          <span
            className="font-body text-[11px] px-2.5 py-1 rounded-full"
            style={{ background: C.ink, color: C.paper }}
          >
            {todayEmotion}
          </span>
          <button
            onClick={() => { setTodayEmotion(null); openFreeText(); }}
            className="font-body text-[11px]"
            style={{ color: C.inkMute }}
          >
            change
          </button>
        </div>
      )}

      {/* ── Continuity strip ───────────────────────────────────────────── */}
      {insight?.line && (
        <div
          className="mb-8 pl-4 fade-up"
          style={{ borderLeft: `2px solid ${C.gold}` }}
        >
          <p
            className="font-display italic text-[15px] leading-[1.45]"
            style={{ color: C.inkSoft, fontWeight: 350 }}
          >
            {insight.line}
          </p>
        </div>
      )}

      {/* ── Active Journey card (when one exists) ──────────────────────── */}
      {activeJourney && (
        <div
          className="mb-8 rounded-md fade-up cursor-pointer transition active:scale-[0.99] overflow-hidden"
          style={{
            background: C.paper,
            border: `1px solid ${C.gold}55`,
            boxShadow: '0 1px 0 rgba(31,24,20,0.04)',
          }}
          onClick={() => onOpenJourneyDay(activeJourney.progress_id, activeJourney.current_day)}
        >
          {/* Progress dots strip */}
          <div className="flex gap-1 px-5 pt-5 pb-3">
            {Array.from({ length: activeJourney.duration_days }).map((_, i) => {
              const dayNum = i + 1;
              const isDone = dayNum <= activeJourney.days_completed;
              const isCurrent = dayNum === activeJourney.current_day;
              return (
                <div
                  key={i}
                  className="flex-1 h-1 rounded-full"
                  style={{
                    background: isDone ? C.sage : (isCurrent ? C.gold : 'rgba(31,24,20,0.10)'),
                  }}
                />
              );
            })}
          </div>
          <div className="px-5 pb-5">
            <div className="flex items-center gap-2 mb-2" style={{ color: C.gold }}>
              <Compass size={12} />
              <span className="font-body text-[10px] tracking-[0.22em]">
                JOURNEY · DAY {activeJourney.current_day} OF {activeJourney.duration_days}
              </span>
            </div>
            <h3
              className="font-display text-[22px] leading-tight mb-1"
              style={{ color: C.ink, fontWeight: 400 }}
            >
              {activeJourney.journey_title}
            </h3>
            <p
              className="font-display italic text-[14px]"
              style={{ color: C.inkMute, fontWeight: 350 }}
            >
              {activeJourney.journey_subtitle}
            </p>
            <div className="flex items-center justify-end gap-1.5 mt-3 font-body text-[12px]" style={{ color: C.inkSoft }}>
              <span>{activeJourney.current_day_is_unlocked ? 'Continue' : 'Sit with yesterday'}</span>
              <ArrowRight size={12} />
            </div>
          </div>
        </div>
      )}

      {/* ── Verse card — weightier ─────────────────────────────────────── */}
      {dailyVerse && (
        <div
          className="rounded-md p-6 mb-8 relative overflow-hidden"
          style={{
            background: `linear-gradient(180deg, ${C.paper} 0%, ${C.parchment2} 100%)`,
            border: `1px solid ${C.gold}55`,
          }}
        >
          {/* Subtle gold accent line on the left edge */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{ background: `linear-gradient(180deg, ${C.gold}, ${C.saffron})` }}
          />

          <div className="font-body text-[10px] tracking-[0.22em] mb-3" style={{ color: C.gold }}>
            {dailyVerse._reason && dailyVerse._reason !== 'daily'
              ? 'PICKED FOR YOU'
              : 'TODAY\'S VERSE'}{' '}
            · BG {dailyVerse.chapter}.{dailyVerse.verse}
          </div>

          {dailyVerse.sanskrit && (
            <div
              className="font-display text-[15px] leading-[1.7] mb-3"
              style={{ color: C.ink }}
            >
              {dailyVerse.sanskrit}
            </div>
          )}

          {dailyVerse.transliteration && (
            <div
              className="font-body text-[12px] italic mb-4"
              style={{ color: C.inkMute }}
            >
              {dailyVerse.transliteration}
            </div>
          )}

          {dailyVerse.translation && (
            <p
              className="font-display text-[17px] leading-[1.5] mb-4"
              style={{ color: C.inkSoft, fontStyle: 'italic', fontWeight: 350 }}
            >
              "{dailyVerse.translation}"
            </p>
          )}

          {dailyVerse.simple_meaning && (
            <div
              className="font-body text-[14px] leading-[1.5] pt-3"
              style={{ color: C.ink, borderTop: `1px solid rgba(31,24,20,0.08)` }}
            >
              <span className="font-medium" style={{ color: C.saffron }}>
                In plain words:{' '}
              </span>
              {dailyVerse.simple_meaning}
            </div>
          )}
        </div>
      )}

      {/* ── Karma Lens primary CTA ─────────────────────────────────────── */}
      <button
        onClick={() => onOpenLens('')}
        className="w-full rounded-md py-5 px-6 flex items-center justify-between transition active:scale-[0.99]"
        style={{ background: C.ink, color: C.paper }}
      >
        <div className="text-left">
          <div className="font-body text-[10px] tracking-[0.22em] opacity-70 mb-1">
            KARMA LENS
          </div>
          <div className="font-display text-[19px]" style={{ fontWeight: 400 }}>
            Reflect on a situation
          </div>
        </div>
        <ArrowRight size={20} />
      </button>

      {/* ── Journeys entry (only if no active journey, otherwise it's already shown above) ── */}
      {!activeJourney && (
        <button
          onClick={onOpenJourneys}
          className="w-full mt-3 rounded-md py-4 px-5 flex items-center justify-between transition"
          style={{
            background: 'transparent',
            color: C.inkSoft,
            border: '1px solid rgba(31,24,20,0.15)',
          }}
        >
          <div className="flex items-center gap-3">
            <Compass size={16} />
            <span className="font-body text-[14px]">Walk through a teaching</span>
          </div>
          <span className="font-body text-[12px]" style={{ color: C.inkMute }}>
            Journeys
          </span>
        </button>
      )}

      {/* ── Gita Explorer ──────────────────────────────────────────────── */}
      <button
        onClick={onOpenExplorer}
        className="w-full mt-3 rounded-md py-4 px-5 flex items-center justify-between transition"
        style={{
          background: 'transparent',
          color: C.inkSoft,
          border: '1px solid rgba(31,24,20,0.15)',
        }}
      >
        <div className="flex items-center gap-3">
          <BookOpen size={16} />
          <span className="font-body text-[14px]">Explore the Gita</span>
        </div>
        <span className="font-body text-[12px]" style={{ color: C.inkMute }}>
          18 chapters
        </span>
      </button>

      {/* ── Dashboard entry ────────────────────────────────────────────── */}
      <button
        onClick={onOpenDashboard}
        className="w-full mt-3 rounded-md py-4 px-5 flex items-center justify-between transition"
        style={{
          background: 'transparent',
          color: C.inkSoft,
          border: '1px solid rgba(31,24,20,0.15)',
        }}
      >
        <div className="flex items-center gap-3">
          <TrendingUp size={16} />
          <span className="font-body text-[14px]">Your practice, mirrored</span>
        </div>
        <span className="font-body text-[12px]" style={{ color: C.inkMute }}>
          Dashboard
        </span>
      </button>

      {/* ── Journal access ─────────────────────────────────────────────── */}
      <button
        onClick={onOpenJournal}
        className="w-full mt-3 rounded-md py-4 px-5 flex items-center justify-between transition"
        style={{
          background: 'transparent',
          color: C.inkSoft,
          border: '1px solid rgba(31,24,20,0.15)',
        }}
      >
        <div className="flex items-center gap-3">
          <Bookmark size={16} />
          <span className="font-body text-[14px]">Your journal</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-body text-[12px]" style={{ color: C.inkMute }}>
            {displayCount} {displayCount === 1 ? 'reflection' : 'reflections'}
          </span>
          {syncStatus === 'synced' && (
            <Cloud size={12} style={{ color: C.sage }} />
          )}
          {syncStatus === 'offline' && (
            <CloudOff size={12} style={{ color: C.inkMute }} />
          )}
        </div>
      </button>

      <p
        className="font-body text-[11px] leading-relaxed mt-12 text-center"
        style={{ color: C.inkMute }}
      >
        Gita-inspired reflection · Not a substitute for medical, legal,
        <br />
        or professional mental-health support.
      </p>
    </div>
  );
}
