import { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, Bell, BellOff, Check } from 'lucide-react';
import { saveOnboarding, fetchWelcomeVerse } from '../api/client';
import { C } from '../lib/colors';
import Logo from '../components/Logo';

/**
 * Four-step onboarding flow shown only to first-time users.
 * Per spec §8.1, with refinements decided in this session:
 *   1. Welcome — single "Begin" button + small "Sign in later" note
 *   2. Intention — 5 options (peace, confusion, understand_gita, anger/stress, daily discipline)
 *   3. Personalization — 3 tones (simple/practical, spiritual/reflective, deep/philosophical)
 *   4. Daily reminder opt-in — yes/no, with no harm in declining
 *
 * On completion, posts to /api/users/onboarding which stamps onboarded_at,
 * and signals the parent App to switch to the home view.
 */

const INTENTIONS = [
  { value: 'peace_of_mind',       label: 'I want peace of mind' },
  { value: 'life_confusion',      label: 'I am facing life confusion' },
  { value: 'understand_gita',     label: 'I want to understand the Gita practically' },
  { value: 'manage_anger_stress', label: 'I want to manage anger and stress' },
  { value: 'daily_discipline',    label: 'I want daily spiritual discipline' },
];

const TONES = [
  {
    value: 'simple_practical',
    label: 'Simple and practical',
    description: 'Plain modern English. Action-focused. The Gita as an operating manual.',
  },
  {
    value: 'spiritual_reflective',
    label: 'Spiritual and reflective',
    description: 'Contemplative warmth. Sanskrit terms when they teach. Comfortable with depth.',
  },
  {
    value: 'deep_philosophical',
    label: 'Deep and philosophical',
    description: 'Lean into the structural concepts. Dharmic vocabulary where it sharpens meaning.',
  },
];

export default function OnboardingFlow({ onComplete }) {
  const [step, setStep] = useState(0); // 0..3
  const [intention, setIntention] = useState(null);
  const [tone, setTone] = useState(null);
  const [reminderOptIn, setReminderOptIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function next() { setStep((s) => Math.min(s + 1, 3)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      await saveOnboarding({
        intention,
        tonePreference: tone || 'simple_practical',
        dailyReminderOptIn: reminderOptIn,
      });
      onComplete();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="px-6 pt-10 pb-32 fade-up min-h-screen flex flex-col">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-full transition-all"
            style={{
              width: i === step ? 24 : 6,
              height: 6,
              background: i <= step ? C.ink : 'rgba(31,24,20,0.18)',
            }}
          />
        ))}
      </div>

      {/* Back button — only after step 0 */}
      {step > 0 && (
        <button
          onClick={back}
          className="flex items-center gap-1 mb-6 font-body text-[13px] self-start"
          style={{ color: C.inkSoft }}
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>
      )}

      <div className="flex-1">
        {step === 0 && <WelcomeStep onContinue={next} />}
        {step === 1 && (
          <IntentionStep
            value={intention}
            onChange={setIntention}
            onContinue={next}
          />
        )}
        {step === 2 && (
          <ToneStep
            value={tone}
            onChange={setTone}
            onContinue={next}
          />
        )}
        {step === 3 && (
          <ReminderStep
            value={reminderOptIn}
            onChange={setReminderOptIn}
            onFinish={finish}
            saving={saving}
            error={error}
          />
        )}
      </div>
    </div>
  );
}

// ─── Step 0: Welcome ───────────────────────────────────────────────────
function WelcomeStep({ onContinue }) {
  const [verse, setVerse] = useState(null);

  useEffect(() => {
    fetchWelcomeVerse()
      .then(setVerse)
      .catch(() => null); // welcome screen still works if endpoint fails
  }, []);

  return (
    <div className="flex flex-col min-h-[78vh]">
      {/* Hero brand mark — centered above the opening verse */}
      <div className="flex flex-col items-center text-center mb-10 mt-2 fade-up">
        <Logo size={140} />
        <span
          className="font-display text-[21px] tracking-tight mt-3"
          style={{ color: C.ink, fontWeight: 500 }}
        >
          GitaFlow
        </span>
      </div>

      {/* ── Verse hero — the anchor of the screen ─────────────────────── */}
      {verse && (
        <div className="mb-10 fade-up">
          <div
            className="font-body text-[10px] tracking-[0.22em] mb-4"
            style={{ color: C.gold }}
          >
            TODAY'S OPENING · BG {verse.chapter}.{verse.verse}
          </div>
          {verse.sanskrit && (
            <p
              className="font-display text-[17px] leading-[1.7] mb-3"
              style={{ color: C.ink, fontWeight: 400 }}
            >
              {verse.sanskrit}
            </p>
          )}
          {verse.transliteration && (
            <p
              className="font-body text-[12px] mb-4"
              style={{ color: C.inkMute, fontStyle: 'italic' }}
            >
              {verse.transliteration}
            </p>
          )}
          {verse.translation && (
            <p
              className="font-display text-[18px] leading-[1.45]"
              style={{ color: C.inkSoft, fontStyle: 'italic', fontWeight: 350 }}
            >
              "{verse.translation}"
            </p>
          )}
        </div>
      )}

      {/* Hairline divider */}
      <div
        className="mb-6"
        style={{ borderTop: '1px solid rgba(31,24,20,0.10)' }}
      />

      {/* Welcome title — smaller now, supporting role */}
      <h1
        className="font-display text-[26px] leading-[1.15] mb-2"
        style={{ color: C.ink, fontWeight: 400 }}
      >
        Welcome to GitaFlow.
      </h1>
      <p
        className="font-display text-[16px] leading-[1.45] mb-4"
        style={{ color: C.inkSoft, fontWeight: 350 }}
      >
        A guide for clarity, calmness, and conscious action — rooted in the
        Bhagavad Gita.
      </p>
      <p
        className="font-body text-[12.5px] leading-[1.55] mb-8 italic"
        style={{ color: C.inkMute }}
      >
        For thousands of years, this has been a way of seeing — clarifying impossible decisions, settling restless minds. GitaFlow brings it into your daily life.
      </p>

      {/* Begin button */}
      <button
        onClick={onContinue}
        className="rounded-md py-4 px-6 flex items-center justify-center gap-3 font-body text-[15px] mb-4 self-start"
        style={{ background: C.ink, color: C.paper }}
      >
        <span>Begin</span>
        <ArrowRight size={16} />
      </button>

      {/* Warmer footnote */}
      <p
        className="font-body text-[11.5px] leading-[1.5]"
        style={{ color: C.inkMute }}
      >
        Three small choices to set things up — about a minute. Your reflections
        live on this device. Sign-in comes later.
      </p>
    </div>
  );
}

// ─── Step 1: Intention ─────────────────────────────────────────────────
function IntentionStep({ value, onChange, onContinue }) {
  return (
    <div>
      <h2
        className="font-display text-[28px] leading-[1.1] mb-3"
        style={{ color: C.ink, fontWeight: 400 }}
      >
        What's heavy right now?
      </h2>
      <p
        className="font-display italic text-[15px] leading-[1.55] mb-2"
        style={{ color: C.inkSoft, fontWeight: 350 }}
      >
        Whatever's on your mind, the Gita has met it before — across thousands of years of people facing the same things you are.
      </p>
      <p
        className="font-body text-[12.5px] mb-8"
        style={{ color: C.inkMute }}
      >
        Pick the one that fits closest. We'll keep it quietly in mind.
      </p>

      <div className="space-y-2.5 mb-8">
        {INTENTIONS.map(({ value: v, label }) => {
          const active = value === v;
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              className="w-full text-left rounded-md px-5 py-4 flex items-center justify-between transition border"
              style={{
                background: active ? C.ink : 'transparent',
                color: active ? C.paper : C.ink,
                borderColor: active ? C.ink : 'rgba(31,24,20,0.18)',
              }}
            >
              <span className="font-body text-[14.5px]">{label}</span>
              {active && <Check size={14} />}
            </button>
          );
        })}
      </div>

      <button
        onClick={onContinue}
        disabled={!value}
        className="w-full rounded-md py-4 px-5 flex items-center justify-center gap-2 font-body text-[14px] transition disabled:opacity-40"
        style={{ background: C.ink, color: C.paper }}
      >
        <span>Continue</span>
        <ArrowRight size={14} />
      </button>
    </div>
  );
}

// ─── Step 2: Tone preference ───────────────────────────────────────────
function ToneStep({ value, onChange, onContinue }) {
  return (
    <div>
      <h2
        className="font-display text-[28px] leading-[1.1] mb-2"
        style={{ color: C.ink, fontWeight: 400 }}
      >
        How would you like guidance?
      </h2>
      <p
        className="font-body text-[13px] mb-8"
        style={{ color: C.inkMute }}
      >
        You can change this later in settings.
      </p>

      <div className="space-y-3 mb-8">
        {TONES.map(({ value: v, label, description }) => {
          const active = value === v;
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              className="w-full text-left rounded-md p-5 transition border"
              style={{
                background: active ? C.ink : C.paper,
                color: active ? C.paper : C.ink,
                borderColor: active ? C.ink : 'rgba(31,24,20,0.10)',
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className="font-display text-[17px]"
                  style={{ color: active ? C.paper : C.ink, fontWeight: 400 }}
                >
                  {label}
                </span>
                {active && <Check size={14} style={{ color: C.paper }} />}
              </div>
              <p
                className="font-body text-[12.5px] leading-[1.5]"
                style={{ color: active ? 'rgba(251,246,236,0.75)' : C.inkSoft }}
              >
                {description}
              </p>
            </button>
          );
        })}
      </div>

      <button
        onClick={onContinue}
        disabled={!value}
        className="w-full rounded-md py-4 px-5 flex items-center justify-center gap-2 font-body text-[14px] transition disabled:opacity-40"
        style={{ background: C.ink, color: C.paper }}
      >
        <span>Continue</span>
        <ArrowRight size={14} />
      </button>
    </div>
  );
}

// ─── Step 3: Daily reminder opt-in ─────────────────────────────────────
function ReminderStep({ value, onChange, onFinish, saving, error }) {
  return (
    <div>
      <h2
        className="font-display text-[28px] leading-[1.1] mb-2"
        style={{ color: C.ink, fontWeight: 400 }}
      >
        A small daily nudge?
      </h2>
      <p
        className="font-body text-[13px] mb-8"
        style={{ color: C.inkMute }}
      >
        We don't send notifications yet, but we can surface a gentle in-app reminder when you next open GitaFlow.
      </p>

      <div className="space-y-3 mb-8">
        <button
          onClick={() => onChange(true)}
          className="w-full rounded-md p-5 flex items-center gap-4 transition border"
          style={{
            background: value === true ? C.ink : C.paper,
            color: value === true ? C.paper : C.ink,
            borderColor: value === true ? C.ink : 'rgba(31,24,20,0.10)',
          }}
        >
          <Bell size={18} />
          <div className="flex-1 text-left">
            <div
              className="font-display text-[16px]"
              style={{ color: value === true ? C.paper : C.ink, fontWeight: 400 }}
            >
              Yes, gently remind me
            </div>
            <div
              className="font-body text-[12px]"
              style={{ color: value === true ? 'rgba(251,246,236,0.7)' : C.inkMute }}
            >
              Once a day at most
            </div>
          </div>
          {value === true && <Check size={14} />}
        </button>

        <button
          onClick={() => onChange(false)}
          className="w-full rounded-md p-5 flex items-center gap-4 transition border"
          style={{
            background: value === false ? C.ink : C.paper,
            color: value === false ? C.paper : C.ink,
            borderColor: value === false ? C.ink : 'rgba(31,24,20,0.10)',
          }}
        >
          <BellOff size={18} />
          <div className="flex-1 text-left">
            <div
              className="font-display text-[16px]"
              style={{ color: value === false ? C.paper : C.ink, fontWeight: 400 }}
            >
              No, I'll come on my own
            </div>
            <div
              className="font-body text-[12px]"
              style={{ color: value === false ? 'rgba(251,246,236,0.7)' : C.inkMute }}
            >
              Equally welcome
            </div>
          </div>
          {value === false && <Check size={14} />}
        </button>
      </div>

      {error && (
        <p className="font-body text-[12px] mb-4" style={{ color: C.rust }}>
          {error}
        </p>
      )}

      <button
        onClick={onFinish}
        disabled={saving}
        className="w-full rounded-md py-4 px-5 flex items-center justify-center gap-2 font-body text-[14px] transition disabled:opacity-40"
        style={{ background: C.ink, color: C.paper }}
      >
        <span>{saving ? 'Saving…' : 'Enter GitaFlow'}</span>
        {!saving && <ArrowRight size={14} />}
      </button>
    </div>
  );
}
