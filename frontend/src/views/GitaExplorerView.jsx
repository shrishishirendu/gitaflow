import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { fetchChapters } from '../api/client';
import { C } from '../lib/colors';

/**
 * The Gita Explorer's home — list of all 18 chapters.
 *
 * Designed as a *reading* experience, not a feature dashboard. Each row
 * gives the user enough to decide which chapter to enter:
 *   - Chapter number, English name, Sanskrit name
 *   - The intro paragraph (the chapter's character in 50-80 words)
 *   - Verse count
 *
 * No counts of "how many verses you've read" yet (Phase 2 — bookmarks).
 * No search bar (Phase 2). The first version is purely about reading well.
 */
export default function GitaExplorerView({ onBack, onOpenChapter }) {
  const [chapters, setChapters] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetchChapters()
      .then((d) => setChapters(d.chapters || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

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
        <BookOpen size={14} />
        <span className="font-body text-[10px] tracking-[0.22em]">EXPLORE THE GITA</span>
      </div>
      <h1
        className="font-display text-[28px] leading-[1.1] mb-2"
        style={{ color: C.ink, fontWeight: 400 }}
      >
        All 18 chapters.
      </h1>
      <p
        className="font-display italic text-[16px] mb-8 leading-[1.5]"
        style={{ color: C.inkMute, fontWeight: 350 }}
      >
        Tap a chapter to read its character and verses.
      </p>

      {loading && (
        <p className="font-body text-[13px]" style={{ color: C.inkMute }}>Loading…</p>
      )}
      {err && (
        <p className="font-body text-[12px]" style={{ color: C.rust }}>{err}</p>
      )}

      <div className="space-y-2">
        {chapters?.map((ch) => (
          <button
            key={ch.number}
            onClick={() => onOpenChapter(ch.number)}
            className="w-full text-left rounded-md py-3 px-4 transition active:scale-[0.99] flex items-center gap-4"
            style={{
              background: C.paper,
              border: '1px solid rgba(31,24,20,0.10)',
            }}
          >
            {/* Number badge */}
            <div
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-display text-[14px]"
              style={{
                background: C.parchment2,
                color: C.ink,
                border: `1px solid ${C.gold}55`,
              }}
            >
              {ch.number}
            </div>

            {/* Title + Sanskrit */}
            <div className="flex-1 min-w-0">
              <div
                className="font-display text-[16px] leading-tight truncate"
                style={{ color: C.ink, fontWeight: 400 }}
              >
                {ch.name_english}
              </div>
              <div
                className="font-body text-[11px] mt-0.5 italic truncate"
                style={{ color: C.inkMute }}
              >
                {ch.name_sanskrit}
              </div>
            </div>

            {/* Verse count + chevron */}
            <div className="flex-shrink-0 flex items-center gap-2">
              <span
                className="font-body text-[10px] tracking-[0.18em]"
                style={{ color: C.inkMute }}
              >
                {ch.verse_count}V
              </span>
              <ChevronRight size={14} style={{ color: C.gold }} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
