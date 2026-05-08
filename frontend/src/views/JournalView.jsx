import { Bookmark, ChevronLeft } from 'lucide-react';
import { C } from '../lib/colors';

export default function JournalView({ reflections, onBack, onOpen }) {
  return (
    <div className="px-6 pt-6 pb-32 fade-up">
      <button
        onClick={onBack}
        className="flex items-center gap-1 mb-6 font-body text-[13px]"
        style={{ color: C.inkMute }}
      >
        <ChevronLeft size={16} /> Home
      </button>

      <h2 className="font-display text-[30px] mb-1" style={{ color: C.ink, fontWeight: 400 }}>
        Reflections
      </h2>
      <p
        className="font-display italic text-[15px] mb-8"
        style={{ color: C.inkMute, fontWeight: 350 }}
      >
        Patterns become visible when written down.
      </p>

      {reflections.length === 0 ? (
        <div className="text-center py-16">
          <Bookmark size={28} className="mx-auto mb-3 opacity-30" style={{ color: C.ink }} />
          <p className="font-body text-[14px]" style={{ color: C.inkMute }}>
            Your saved reflections will live here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reflections.map((r) => {
            const resp = r.response || r.result || {};
            const v = resp.verse;
            const inputText = r.input_text || r.userText || '';
            const date = new Date(r.saved_at || r.savedAt);
            return (
              <button
                key={r.id}
                onClick={() => onOpen(r)}
                className="w-full text-left rounded-md p-4 transition"
                style={{ background: C.paper, border: '1px solid rgba(31,24,20,0.08)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="font-body text-[10px] tracking-[0.18em]"
                    style={{ color: C.gold }}
                  >
                    {date.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  {resp.emotion?.primary && (
                    <span
                      className="font-body text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        color: C.inkSoft,
                        border: '1px solid rgba(31,24,20,0.15)',
                      }}
                    >
                      {resp.emotion.primary}
                    </span>
                  )}
                </div>
                <p
                  className="font-display text-[15px] leading-snug mb-2"
                  style={{ color: C.ink, fontWeight: 400 }}
                >
                  {resp.wisdom?.one_line_wisdom || inputText.slice(0, 80)}
                </p>
                {v && (
                  <span className="font-body text-[11px]" style={{ color: C.inkMute }}>
                    BG {v.chapter}.{v.verse}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
