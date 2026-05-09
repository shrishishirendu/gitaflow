import { useEffect, useState, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, BookOpen, ArrowRight, Play, Tag,
} from 'lucide-react';
import { fetchChapter } from '../api/client';
import { C } from '../lib/colors';

/**
 * Chapter detail view — the actual reading experience.
 *
 * Layout: chapter intro at top, then every verse rendered as a "card" with:
 *   - kicker (BG N.M)
 *   - Devanagari Sanskrit (large, restful)
 *   - transliteration (italic, muted)
 *   - English translation (display serif)
 *   - simple_meaning (plain prose)
 *   - themes / emotional_tags (small chips)
 *   - "Bring this to Karma Lens" button (the freemium funnel)
 *   - "Watch the explanation" link (only when youtube_video_id is populated)
 *
 * Anchors per verse (id="v-N") so deep-linking works (#v-47 jumps to verse).
 */
export default function GitaChapterView({ chapterNumber, onBack, onOpenLens }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const topRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setData(null);
    setErr(null);
    fetchChapter(chapterNumber)
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
    // Scroll to top whenever the chapter changes
    topRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [chapterNumber]);

  return (
    <div className="px-6 pt-6 pb-32 fade-up" ref={topRef}>
      <button
        onClick={onBack}
        className="flex items-center gap-1 mb-6 font-body text-[13px]"
        style={{ color: C.inkSoft }}
      >
        <ChevronLeft size={16} />
        <span>Chapters</span>
      </button>

      {loading && (
        <p className="font-body text-[13px]" style={{ color: C.inkMute }}>Loading…</p>
      )}
      {err && (
        <p className="font-body text-[12px]" style={{ color: C.rust }}>{err}</p>
      )}

      {data && (
        <>
          {/* ── Chapter header ───────────────────────────────────────── */}
          <div
            className="font-body text-[10px] tracking-[0.22em] mb-2"
            style={{ color: C.gold }}
          >
            CHAPTER {data.number}
          </div>
          <h1
            className="font-display text-[32px] leading-[1.1] mb-2"
            style={{ color: C.ink, fontWeight: 400 }}
          >
            {data.name_english}
          </h1>
          <p
            className="font-body text-[13px] italic mb-6"
            style={{ color: C.inkMute }}
          >
            {data.name_sanskrit} · {data.verse_count} verses
          </p>

          {/* ── Intro ───────────────────────────────────────────────── */}
          <p
            className="font-body text-[15.5px] leading-[1.65] mb-12"
            style={{ color: C.inkSoft }}
          >
            {data.intro}
          </p>

          {/* ── Verses ──────────────────────────────────────────────── */}
          <div className="space-y-6">
            {data.verses.map((v) => (
              <VerseCard
                key={v.verse_id}
                verse={v}
                onOpenLens={onOpenLens}
              />
            ))}
          </div>

          {/* ── End-of-chapter affordance ───────────────────────────── */}
          <div className="mt-12 pt-6" style={{ borderTop: '1px solid rgba(31,24,20,0.10)' }}>
            <p
              className="font-display italic text-[15px] mb-4"
              style={{ color: C.inkMute, fontWeight: 350 }}
            >
              End of Chapter {data.number}.
            </p>
            <button
              onClick={onBack}
              className="rounded-md py-3 px-5 flex items-center gap-2 font-body text-[13px]"
              style={{
                background: 'transparent',
                color: C.inkSoft,
                border: '1px solid rgba(31,24,20,0.18)',
              }}
            >
              <ChevronLeft size={14} />
              <span>Back to chapters</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function VerseCard({ verse, onOpenLens }) {
  // The "Bring this to Karma Lens" prefill — phrased as something the user
  // would actually type, not robotic. The verse is given as anchor; the
  // user adds their situation.
  const lensPrefill = `Sitting with BG ${verse.chapter}.${verse.verse}: "${verse.translation || ''}"\n\nWhat I'm bringing to it:\n`;

  return (
    <article
      id={`v-${verse.verse}`}
      className="rounded-md p-5"
      style={{
        background: C.paper,
        border: '1px solid rgba(31,24,20,0.08)',
      }}
    >
      {/* Verse kicker */}
      <div
        className="font-body text-[10px] tracking-[0.22em] mb-3"
        style={{ color: C.gold }}
      >
        BG {verse.chapter}.{verse.verse}
      </div>

      {/* Sanskrit */}
      {verse.sanskrit && (
        <p
          className="font-display text-[16px] leading-[1.7] mb-3"
          style={{ color: C.ink, fontWeight: 400 }}
        >
          {verse.sanskrit}
        </p>
      )}

      {/* Transliteration */}
      {verse.transliteration && (
        <p
          className="font-body italic text-[12px] mb-4"
          style={{ color: C.inkMute }}
        >
          {verse.transliteration}
        </p>
      )}

      {/* Translation */}
      {verse.translation && (
        <p
          className="font-display italic text-[16px] leading-[1.5] mb-4"
          style={{ color: C.inkSoft, fontWeight: 350 }}
        >
          "{verse.translation}"
        </p>
      )}

      {/* Plain meaning */}
      {verse.simple_meaning && (
        <div
          className="font-body text-[13.5px] leading-[1.55] mb-4 pt-3"
          style={{ color: C.ink, borderTop: '1px solid rgba(31,24,20,0.08)' }}
        >
          <span className="font-medium" style={{ color: C.saffron }}>
            In plain words:{' '}
          </span>
          {verse.simple_meaning}
        </div>
      )}

      {/* Tags + themes — small, subtle */}
      {((verse.themes?.length || 0) + (verse.emotional_tags?.length || 0)) > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <Tag size={10} style={{ color: C.inkMute }} />
          {[...(verse.themes || []), ...(verse.emotional_tags || [])].slice(0, 6).map((t) => (
            <span
              key={t}
              className="font-body text-[10px] px-2 py-0.5 rounded-full"
              style={{
                color: C.inkMute,
                background: C.parchment2,
                border: '1px solid rgba(31,24,20,0.08)',
              }}
            >
              {t.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {/* YouTube — only renders when a video is linked */}
      {verse.youtube_video_id && (
        <a
          href={`https://www.youtube.com/watch?v=${verse.youtube_video_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 mt-3 font-body text-[13px]"
          style={{ color: C.saffron }}
        >
          <Play size={12} />
          <span>Watch the explanation</span>
          <ArrowRight size={12} />
        </a>
      )}

      {/* Bring to Karma Lens — the freemium bridge */}
      <button
        onClick={() => onOpenLens(lensPrefill)}
        className="w-full mt-4 rounded-md py-2.5 px-4 flex items-center justify-between transition"
        style={{
          background: 'transparent',
          color: C.saffron,
          border: `1px solid ${C.saffron}55`,
        }}
      >
        <span className="font-body text-[13px]">Bring this to Karma Lens</span>
        <ChevronRight size={14} />
      </button>

      {verse.is_narrative && (
        <p
          className="font-body italic text-[10px] mt-3"
          style={{ color: C.inkMute }}
        >
          This is a narrative verse — describing the scene rather than teaching directly.
        </p>
      )}
    </article>
  );
}
