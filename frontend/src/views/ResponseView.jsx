import { Check, ChevronLeft, Heart, Save, Wind } from 'lucide-react';
import PathCard from '../components/PathCard';
import VerseCard from '../components/VerseCard';
import DonationNudge from '../components/DonationNudge';
import { C } from '../lib/colors';

export default function ResponseView({ result, onBack, onSave, savedFlag, reflectionCount }) {
  // Crisis branch — per spec §7.6 / §15
  if (result.is_crisis) {
    return (
      <div className="px-6 pt-6 pb-32">
        <button
          onClick={onBack}
          className="flex items-center gap-1 mb-8 font-body text-[13px]"
          style={{ color: C.inkMute }}
        >
          <ChevronLeft size={16} /> Back
        </button>
        <div
          className="rounded-md p-6"
          style={{ background: C.paper, border: `2px solid ${C.saffronDk}` }}
        >
          <div className="flex items-center gap-2 mb-4" style={{ color: C.saffronDk }}>
            <Heart size={18} />
            <span className="font-body text-[11px] tracking-[0.2em] font-medium">
              A PAUSE BEFORE WISDOM
            </span>
          </div>
          <p
            className="font-display text-[18px] leading-[1.5]"
            style={{ color: C.ink, fontWeight: 350 }}
          >
            {result.crisis_response}
          </p>
          <p
            className="font-body text-[13px] mt-5 pt-5 leading-relaxed"
            style={{ color: C.inkMute, borderTop: '1px solid rgba(31,24,20,0.1)' }}
          >
            This app offers reflection — not urgent care. Please reach a person or service who can
            be with you right now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pt-6 pb-32 fade-up">
      <button
        onClick={onBack}
        className="flex items-center gap-1 mb-6 font-body text-[13px]"
        style={{ color: C.inkMute }}
      >
        <ChevronLeft size={16} /> Back
      </button>

      {/* SECTION: emotion */}
      <div className="mb-8">
        <div className="font-body text-[10px] tracking-[0.22em] mb-2" style={{ color: C.saffron }}>
          WHAT YOU MAY BE FEELING
        </div>
        <h2
          className="font-display text-[26px] leading-[1.15] mb-2"
          style={{ color: C.ink, fontWeight: 400 }}
        >
          {result.emotion.summary}
        </h2>
        <div className="flex flex-wrap gap-2 mt-3">
          <span
            className="font-body text-[11px] px-2.5 py-1 rounded-full"
            style={{ background: C.ink, color: C.paper }}
          >
            {result.emotion.primary} · {result.emotion.intensity}
          </span>
          {result.emotion.secondary?.map((e) => (
            <span
              key={e}
              className="font-body text-[11px] px-2.5 py-1 rounded-full"
              style={{
                background: 'transparent',
                color: C.inkSoft,
                border: '1px solid rgba(31,24,20,0.18)',
              }}
            >
              {e}
            </span>
          ))}
        </div>
      </div>

      {/* SECTION: hidden pattern (vasana) */}
      <div className="mb-8 pl-4" style={{ borderLeft: `2px solid ${C.gold}` }}>
        <div
          className="flex items-baseline gap-1.5 mb-2"
          style={{ color: C.gold }}
        >
          <span className="font-body text-[10px] tracking-[0.22em] font-medium">
            VASANA
          </span>
          <span
            className="font-body text-[9px] tracking-[0.18em]"
            style={{ color: C.inkMute, opacity: 0.85 }}
          >
            · THE STORED IMPULSE
          </span>
        </div>
        <p
          className="font-display text-[18px] leading-[1.45] mb-1"
          style={{ color: C.ink, fontWeight: 350 }}
        >
          {result.dharma.inner_conflict}
        </p>
        <p className="font-body text-[12.5px] italic" style={{ color: C.inkMute }}>
          {result.dharma.pattern.replace(/_/g, ' ')} · {result.dharma.theme.replace(/_/g, ' ')}
        </p>
      </div>

      {/* SECTION: verse */}
      <div className="mb-8">
        <VerseCard verse={result.verse} reason={result.verse_reason} />
      </div>

      {/* SECTION: wisdom */}
      <div className="mb-10">
        <p
          className="font-display text-[20px] leading-[1.45] mb-5"
          style={{ color: C.ink, fontWeight: 350 }}
        >
          {result.wisdom.simple_explanation}
        </p>
        <div
          className="rounded-md py-4 px-5"
          style={{ background: C.ink, color: C.paper }}
        >
          <div className="font-body text-[10px] tracking-[0.22em] opacity-60 mb-1.5">
            ONE LINE TO CARRY
          </div>
          <p
            className="font-display italic text-[17px] leading-snug"
            style={{ fontWeight: 350 }}
          >
            {result.wisdom.one_line_wisdom}
          </p>
        </div>
      </div>

      {/* SECTION: three paths */}
      <div className="mb-8">
        <h3
          className="font-display text-[22px] mb-1"
          style={{ color: C.ink, fontWeight: 400 }}
        >
          Three places this could go
        </h3>
        <p
          className="font-body text-[13px] mb-5 italic"
          style={{ color: C.inkMute, fontStyle: 'italic' }}
        >
          Notice which one is pulling at you most strongly.
        </p>
        <div className="space-y-3">
          <PathCard kind="reactive"  data={result.paths.reactive} />
          <PathCard kind="balanced"  data={result.paths.balanced} />
          <PathCard kind="conscious" data={result.paths.conscious} />
        </div>
      </div>

      {/* SECTION: micro-practice (sadhana) */}
      <div
        className="mb-8 rounded-md p-5"
        style={{ background: C.parchment2, border: '1px solid rgba(31,24,20,0.08)' }}
      >
        <div className="flex items-center gap-2 mb-2" style={{ color: C.sage }}>
          <Wind size={14} />
          <div className="flex items-baseline gap-1.5">
            <span className="font-body text-[10px] tracking-[0.2em] font-medium">
              SADHANA
            </span>
            <span
              className="font-body text-[9px] tracking-[0.18em]"
              style={{ color: C.inkMute, opacity: 0.85 }}
            >
              · A SMALL PRACTICE · {result.micro_practice.duration}
            </span>
          </div>
        </div>
        <h4
          className="font-display text-[19px] mb-2"
          style={{ color: C.ink, fontWeight: 400 }}
        >
          {result.micro_practice.title}
        </h4>
        <p className="font-body text-[14px] leading-[1.55]" style={{ color: C.inkSoft }}>
          {result.micro_practice.instructions}
        </p>
      </div>

      {/* SECTION: reflection question */}
      <div className="mb-10 text-center px-2">
        <div
          className="font-body text-[10px] tracking-[0.22em] mb-3"
          style={{ color: C.inkMute }}
        >
          SIT WITH THIS
        </div>
        <p
          className="font-display italic text-[22px] leading-[1.3]"
          style={{ color: C.ink, fontWeight: 350 }}
        >
          "{result.reflection_question}"
        </p>
      </div>

      {/* SAVE */}
      <button
        onClick={onSave}
        disabled={savedFlag}
        className="w-full rounded-md py-4 flex items-center justify-center gap-2 transition"
        style={{ background: savedFlag ? C.sage : C.ink, color: C.paper }}
      >
        {savedFlag ? (
          <>
            <Check size={18} />
            <span className="font-body text-[14px]">Saved to your journal</span>
          </>
        ) : (
          <>
            <Save size={16} />
            <span className="font-body text-[14px]">Save reflection</span>
          </>
        )}
      </button>
      <DonationNudge reflectionCount={reflectionCount} />
    </div>
  );
}
