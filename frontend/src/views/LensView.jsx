import { useState } from 'react';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import Chip from '../components/Chip';
import { C } from '../lib/colors';

const EMOTION_OPTIONS = ['Angry', 'Anxious', 'Confused', 'Hurt', 'Stuck', 'Heavy'];

export default function LensView({ onBack, onSubmit, error, initialText = '' }) {
  const [text, setText] = useState(initialText);
  const [emotion, setEmotion] = useState(null);

  const canSubmit = text.trim().length > 5;

  return (
    <div className="px-6 pt-6 pb-32 fade-up">
      <button
        onClick={onBack}
        className="flex items-center gap-1 mb-8 font-body text-[13px]"
        style={{ color: C.inkMute }}
      >
        <ChevronLeft size={16} /> Back
      </button>

      <h2
        className="font-display text-[30px] leading-[1.1] mb-2"
        style={{ color: C.ink, fontWeight: 400 }}
      >
        What's on your mind?
      </h2>
      <p
        className="font-display italic text-[16px] mb-7"
        style={{ color: C.inkMute, fontWeight: 350 }}
      >
        Write freely. No judgement, no fixing.
      </p>

      {error && (
        <div
          className="mb-4 p-3 rounded-md font-body text-[12px]"
          style={{
            background: '#FFF1EC',
            color: C.saffronDk,
            border: `1px solid ${C.saffron}55`,
          }}
        >
          Something interrupted: {error}
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="A situation, a feeling, a decision you're sitting with…"
        rows={8}
        className="w-full rounded-md p-4 font-body text-[15px] leading-[1.55] outline-none resize-none"
        style={{
          background: C.paper,
          color: C.ink,
          border: '1px solid rgba(31,24,20,0.12)',
        }}
      />

      <div
        className="mt-6 mb-2 font-body text-[11px] tracking-[0.18em]"
        style={{ color: C.inkMute }}
      >
        IF YOU'D LIKE TO TAG IT
      </div>
      <div className="flex flex-wrap gap-2 mb-8">
        {EMOTION_OPTIONS.map((e) => (
          <Chip
            key={e}
            label={e}
            active={emotion === e}
            onClick={() => setEmotion(emotion === e ? null : e)}
          />
        ))}
      </div>

      <button
        onClick={() => canSubmit && onSubmit(text.trim(), emotion)}
        disabled={!canSubmit}
        className="w-full rounded-md py-4 flex items-center justify-center gap-2 transition disabled:opacity-40"
        style={{ background: C.saffron, color: C.paper }}
      >
        <span className="font-display text-[17px]" style={{ fontWeight: 400 }}>
          Reflect with the Gita
        </span>
        <ArrowRight size={18} />
      </button>
    </div>
  );
}
