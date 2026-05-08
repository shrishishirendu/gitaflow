import { Quote } from 'lucide-react';
import { C } from '../lib/colors';

// Receives the full verse object hydrated from the backend (not just an id).
export default function VerseCard({ verse, reason }) {
  if (!verse) return null;
  const { chapter, verse: v, sanskrit, transliteration, translation, simple_meaning } = verse;

  return (
    <div
      className="relative rounded-md p-6 fade-up overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${C.paper} 0%, ${C.parchment2} 100%)`,
        border: `1px solid ${C.gold}33`,
      }}
    >
      <Quote size={36} className="absolute top-3 right-4 opacity-15" style={{ color: C.gold }} />

      <div className="font-body text-[10px] tracking-[0.22em] mb-3" style={{ color: C.gold }}>
        BHAGAVAD GITA · {chapter}.{v}
      </div>

      <div className="font-display text-[15px] leading-[1.6] mb-3" style={{ color: C.ink }}>
        {sanskrit}
      </div>

      <div className="font-body text-[12px] italic mb-4" style={{ color: C.inkMute }}>
        {transliteration}
      </div>

      <p
        className="font-display text-[18px] leading-[1.45] mb-4"
        style={{ color: C.inkSoft, fontStyle: 'italic', fontWeight: 350 }}
      >
        "{translation}"
      </p>

      <div className="font-body text-[14px] leading-[1.55] mb-4" style={{ color: C.ink }}>
        <span className="font-medium" style={{ color: C.saffron }}>
          In plain words:{' '}
        </span>
        {simple_meaning}
      </div>

      {reason && (
        <div
          className="font-body text-[12.5px] italic leading-[1.5] pt-4"
          style={{ color: C.inkMute, borderTop: '1px solid rgba(31,24,20,0.08)' }}
        >
          Why this verse: {reason}
        </div>
      )}
    </div>
  );
}
