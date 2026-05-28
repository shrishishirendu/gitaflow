import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight, BookOpen, ArrowRight, Play, Mic, Volume2, Image, X,
} from 'lucide-react';
import { fetchChapter } from '../api/client';
import { C } from '../lib/colors';

export default function GitaChapterView({ chapterNumber, onBack, onOpenLens }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const topRef = useRef(null);

  useEffect(() => {
    setLoading(true); setData(null); setErr(null);
    fetchChapter(chapterNumber)
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
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

      {loading && <p className="font-body text-[13px]" style={{ color: C.inkMute }}>Loading…</p>}
      {err && <p className="font-body text-[12px]" style={{ color: C.rust }}>{err}</p>}

      {data && (
        <>
          <div className="font-body text-[10px] tracking-[0.22em] mb-2" style={{ color: C.gold }}>
            CHAPTER {data.number}
          </div>
          <h1 className="font-display text-[32px] leading-[1.1] mb-2" style={{ color: C.ink, fontWeight: 400 }}>
            {data.name_english}
          </h1>
          <p className="font-body text-[13px] italic mb-6" style={{ color: C.inkMute }}>
            {data.name_sanskrit} · {data.verse_count} verses
          </p>
          <p className="font-body text-[15.5px] leading-[1.65] mb-12" style={{ color: C.inkSoft }}>
            {data.intro}
          </p>

          <div className="space-y-6">
            {data.verses.map((v) => (
              <VerseCard key={v.verse_id} verse={v} onOpenLens={onOpenLens} />
            ))}
          </div>

          <div className="mt-12 pt-6" style={{ borderTop: '1px solid rgba(31,24,20,0.10)' }}>
            <p className="font-display italic text-[15px] mb-4" style={{ color: C.inkMute, fontWeight: 350 }}>
              End of Chapter {data.number}.
            </p>
            <button
              onClick={onBack}
              className="rounded-md py-3 px-5 flex items-center gap-2 font-body text-[13px]"
              style={{ background: 'transparent', color: C.inkSoft, border: '1px solid rgba(31,24,20,0.18)' }}
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

function splitAtUvaca(sanskrit) {
  if (!sanskrit) return { speaker: null, verse: sanskrit };
  const idx = sanskrit.indexOf('उवाच');
  if (idx === -1) return { speaker: null, verse: sanskrit };
  return {
    speaker: sanskrit.slice(0, idx + 4).trim(),
    verse: sanskrit.slice(idx + 4).trim(),
  };
}

function VerseCard({ verse, onOpenLens }) {
  const [imgExpanded, setImgExpanded] = useState(false);

  const trans = (verse.translation || '').trim();
  const simple = (verse.simple_meaning || '').trim();
  const primaryText = trans || simple;
  const showSecondaryPlainMeaning = !!trans && !!simple && trans !== simple;
  const lensPrefill = `Sitting with BG ${verse.chapter}.${verse.verse}: "${primaryText}"\n\nWhat I'm bringing to it:\n`;
  const { speaker, verse: verseBody } = splitAtUvaca(verse.sanskrit);

  return (
    <article
      id={`v-${verse.verse}`}
      className="rounded-md p-5"
      style={{ background: C.paper, border: '1px solid rgba(31,24,20,0.08)' }}
    >
      {/* Kicker */}
      <div className="font-body text-[10px] tracking-[0.22em] mb-3" style={{ color: C.gold }}>
        BG {verse.chapter}.{verse.verse}
      </div>

      {/* Sanskrit with uvāca split */}
      {verse.sanskrit && (
        <div className="mb-3">
          {speaker && (
            <p className="font-display text-[13px] leading-[1.6] mb-1.5 italic" style={{ color: C.inkMute, fontWeight: 400 }}>
              {speaker}
            </p>
          )}
          <p className="font-display text-[16px] leading-[1.7]" style={{ color: C.ink, fontWeight: 400 }}>
            {verseBody || verse.sanskrit}
          </p>
        </div>
      )}

      {/* Transliteration */}
      {verse.transliteration && (
        <p className="font-body italic text-[12px] mb-4" style={{ color: C.inkMute }}>
          {verse.transliteration}
        </p>
      )}

      {/* Primary teaching text */}
      {primaryText && (
        <p className="font-display italic text-[16px] leading-[1.5] mb-4" style={{ color: C.inkSoft, fontWeight: 350 }}>
          "{primaryText}"
        </p>
      )}

      {/* Secondary plain meaning */}
      {showSecondaryPlainMeaning && (
        <div className="font-body text-[13.5px] leading-[1.55] mb-4 pt-3"
          style={{ color: C.ink, borderTop: '1px solid rgba(31,24,20,0.08)' }}>
          <span className="font-medium" style={{ color: C.saffron }}>In plain words: </span>
          {simple}
        </div>
      )}

      {/* 1. Recitation — your voice, leads the media */}
      {verse.recitation_url && (
        <div className="mb-4">
          <a
            href={verse.recitation_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-body text-[13px]"
            style={{ color: C.gold }}
          >
            <Volume2 size={12} />
            <span>Listen to recitation</span>
          </a>
        </div>
      )}

      {/* 2. Infographic thumbnail */}
      {verse.infographic_url && (
        <div className="mb-4">
          {imgExpanded ? (
            <div className="relative">
              <img
                src={verse.infographic_url}
                alt={`BG ${verse.chapter}.${verse.verse} infographic`}
                className="w-full rounded-md"
                style={{ border: '1px solid rgba(31,24,20,0.10)' }}
              />
              <button
                onClick={() => setImgExpanded(false)}
                className="absolute top-2 right-2 rounded-full p-1"
                style={{ background: C.ink, color: C.paper }}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setImgExpanded(true)}
              className="flex items-center gap-2 font-body text-[13px]"
              style={{ color: C.inkSoft }}
            >
              <Image size={14} />
              <span>View infographic</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      )}

      {/* Media links row — 3. Podcast · 4. Analysis by Shri Shishirendu · 5. Modern day Analysis */}
      {(verse.podcast_url || verse.analysis_url || verse.youtube_url) && (
        <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mb-4">
          {verse.podcast_url && (
            <a
              href={verse.podcast_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-body text-[13px]"
              style={{ color: C.inkSoft }}
            >
              <Mic size={12} />
              <span>Listen to podcast</span>
            </a>
          )}
          {verse.analysis_url && (
            <a
              href={verse.analysis_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-body text-[13px]"
              style={{ color: C.rust }}
            >
              <Play size={12} />
              <span>Analysis by Shri Shishirendu</span>
            </a>
          )}
          {verse.youtube_url && (
            <a
              href={verse.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-body text-[13px]"
              style={{ color: C.saffron }}
            >
              <Play size={12} />
              <span>Modern day Analysis</span>
            </a>
          )}
        </div>
      )}

      {/* Tags */}
      {((verse.themes?.length || 0) + (verse.emotional_tags?.length || 0)) > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {[...(verse.themes || []), ...(verse.emotional_tags || [])].slice(0, 6).map((t) => (
            <span key={t} className="font-body text-[10px] px-2 py-0.5 rounded-full"
              style={{ color: C.inkMute, background: C.parchment2, border: '1px solid rgba(31,24,20,0.08)' }}>
              {t.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Karma Lens CTA */}
      <button
        onClick={() => onOpenLens(lensPrefill)}
        className="w-full mt-2 rounded-md py-2.5 px-4 flex items-center justify-between transition"
        style={{ background: 'transparent', color: C.saffron, border: `1px solid ${C.saffron}55` }}
      >
        <span className="font-body text-[13px]">Let this verse meet your moment</span>
        <ChevronRight size={14} />
      </button>

      {verse.is_narrative && (
        <p className="font-body italic text-[10px] mt-3" style={{ color: C.inkMute }}>
          This is a narrative verse — describing the scene rather than teaching directly.
        </p>
      )}
    </article>
  );
}
