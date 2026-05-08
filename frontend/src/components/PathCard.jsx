import { Cloud, Flame, Mountain } from 'lucide-react';
import { C } from '../lib/colors';

// The three doors, mapped to their actual gunas. Visual hierarchy intentionally
// does NOT make them equal weight — Sattva and Rajas are real options; Tamas
// is the trap to see.
const META = {
  reactive: {
    sanskrit: 'TAMAS',
    english:  'AVOIDANCE',
    Icon: Cloud,
    bar: C.inkMute,
    isTrap: true,
  },
  balanced: {
    sanskrit: 'RAJAS',
    english:  'REACTIVE',
    Icon: Flame,
    bar: C.rust,
    isTrap: false,
  },
  conscious: {
    sanskrit: 'SATTVA',
    english:  'CONSCIOUS',
    Icon: Mountain,
    bar: C.saffron,
    isTrap: false,
  },
};

export default function PathCard({ kind, data }) {
  const { sanskrit, english, Icon, bar, isTrap } = META[kind];

  // Tamas (the trap) gets a slightly muted treatment — not collapsed,
  // not hidden, but visually marked as "this is the inertia pull, not
  // an option to choose." A small "the pull to..." prefix in the kicker
  // signals it's diagnostic, not prescriptive.
  return (
    <div
      className="rounded-md p-5 fade-up"
      style={{
        background: isTrap ? C.parchment2 : C.paper,
        border: `1px solid ${isTrap ? 'rgba(31,24,20,0.07)' : 'rgba(31,24,20,0.10)'}`,
        opacity: isTrap ? 0.92 : 1,
      }}
    >
      <div className="flex items-center gap-2 mb-2" style={{ color: bar }}>
        <Icon size={14} />
        <div className="flex items-baseline gap-1.5">
          <span className="font-body text-[10px] tracking-[0.2em] font-medium">
            {sanskrit}
          </span>
          <span
            className="font-body text-[9px] tracking-[0.18em]"
            style={{ color: C.inkMute, opacity: 0.7 }}
          >
            · {english}
          </span>
        </div>
      </div>

      <h4
        className="font-display text-[19px] leading-tight mb-2"
        style={{ color: C.ink, fontWeight: 400 }}
      >
        {isTrap ? <span style={{ color: C.inkMute, fontWeight: 350 }}>The pull to </span> : null}
        {data.title}
      </h4>

      <p
        className="font-body text-[14px] leading-[1.55] mb-3"
        style={{ color: C.inkSoft }}
      >
        {data.description}
      </p>

      <div
        className="font-body text-[12.5px] italic leading-[1.5] pt-3"
        style={{ color: C.inkMute, borderTop: '1px dashed rgba(31,24,20,0.13)' }}
      >
        Likely: {data.likely_result}
      </div>
    </div>
  );
}
