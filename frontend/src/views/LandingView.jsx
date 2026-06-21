import { useState, useEffect, useRef } from 'react';
import Logo from '../components/Logo';
import { C } from '../lib/colors';

// GitaMoment landing — the interaction IS the hero: type a situation,
// a verse rises to meet it. After the user sees the demo response, the
// "Sit with this in GitaMoment" CTA flows them into onboarding.
//
// The 4 demo verses are real BG verses (2.47, 6.5, 2.14, 2.50). Keyword
// matching is intentionally simple — the real Karma Lens runs after
// onboarding. This is a taste, not the meal.

const MOMENTS = [
  {
    cue: "I can't stop worrying about how it'll turn out",
    ref: 'BG 2.47',
    sanskrit: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन',
    translit: 'karmaṇy-evādhikāras te mā phaleṣhu kadāchana',
    meaning: 'Your work is yours to do. The harvest was never the part you held.',
  },
  {
    cue: "I feel stuck and can't get myself to move",
    ref: 'BG 6.5',
    sanskrit: 'उद्धरेदात्मनात्मानम्',
    translit: 'uddhared ātmanātmānam',
    meaning: 'Lift yourself by yourself. You are not your own enemy here.',
  },
  {
    cue: "Everything keeps changing and I can't settle",
    ref: 'BG 2.14',
    sanskrit: 'मात्रास्पर्शास्तु कौन्तेय',
    translit: 'mātrā-sparśās tu kaunteya',
    meaning: 'Heat and cold, pleasure and pain — they come and go. Let them pass through.',
  },
  {
    cue: "I don't know what the right thing to do is",
    ref: 'BG 2.50',
    sanskrit: 'योगः कर्मसु कौशलम्',
    translit: 'yogaḥ karmasu kauśalam',
    meaning: 'Skill in action is the practice. Begin where you stand.',
  },
];

function pickMoment(text) {
  if (!text || !text.trim()) return MOMENTS[0];
  const t = text.toLowerCase();
  if (/(worr|anx|outcome|result|fear|afraid|turn out)/.test(t)) return MOMENTS[0];
  if (/(stuck|lazy|can't move|procrast|motivat|tired|paralys)/.test(t)) return MOMENTS[1];
  if (/(chang|unsettl|chaos|overwhelm|restless|too much)/.test(t)) return MOMENTS[2];
  if (/(decide|decision|right thing|choice|confus|which)/.test(t)) return MOMENTS[3];
  return MOMENTS[text.trim().length % MOMENTS.length];
}

export default function LandingView({ onBegin }) {
  const [draft, setDraft] = useState('');
  const [moment, setMoment] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const responseRef = useRef(null);

  const reflect = (text) => {
    const m = pickMoment(text);
    setMoment(m);
    setRevealed(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setRevealed(true)));
  };

  const onSubmit = () => {
    if (!draft.trim()) return;
    reflect(draft);
  };

  const onChip = (cue) => {
    setDraft(cue);
    reflect(cue);
  };

  useEffect(() => {
    if (moment && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [moment]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `radial-gradient(120% 80% at 50% -10%, ${C.paper} 0%, ${C.parchment} 60%)`,
        color: C.ink,
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <style>{`
        @keyframes gm-rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .gm-rise { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
        .gm-chip:hover { border-color: ${C.saffron}; color: ${C.ink}; }
        .gm-input:focus { outline: none; border-color: ${C.saffron}; box-shadow: 0 0 0 3px rgba(182,80,46,0.12); }
        .gm-cta:hover { background: ${C.saffronDk}; }
        .gm-link:hover { color: ${C.saffron}; }
      `}</style>

      {/* slim top bar — wordmark + two quiet links */}
      <header
        style={{
          maxWidth: 980,
          margin: '0 auto',
          padding: '22px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo size={26} alt="GitaMoment" />
          <span
            className="font-display"
            style={{ fontWeight: 500, fontSize: 19, letterSpacing: '0.01em' }}
          >
            GitaMoment
          </span>
        </div>
        <nav style={{ display: 'flex', gap: 22, fontSize: 14, color: C.inkMute }}>
          <button
            type="button"
            onClick={onBegin}
            className="gm-link"
            style={{ ...navLink, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
          >
            Explore
          </button>
          <a className="gm-link" style={navLink} href="https://buymeacoffee.com/gitaflow" target="_blank" rel="noopener noreferrer">
            Support
          </a>
        </nav>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
        {/* HERO — the ask box is the hero */}
        <section style={{ paddingTop: '7vh', textAlign: 'center' }}>
          <p
            style={{
              fontSize: 13,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: C.inkMute,
              marginBottom: 18,
            }}
          >
            Timeless wisdom for modern dilemmas
          </p>

          <h1
            className="font-display"
            style={{
              fontWeight: 400,
              fontSize: 'clamp(30px, 5.4vw, 46px)',
              lineHeight: 1.12,
              margin: '0 0 30px',
              letterSpacing: '-0.01em',
            }}
          >
            What challenge are you navigating today?
          </h1>

          {/* the ask box */}
          <div style={{ position: 'relative' }}>
            <textarea
              className="gm-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="A decision, conflict, fear, or uncertainty..."
              rows={2}
              style={{
                width: '100%',
                resize: 'none',
                fontFamily: 'inherit',
                fontSize: 17,
                lineHeight: 1.5,
                color: C.ink,
                background: C.paper,
                border: '1px solid rgba(31,24,20,0.14)',
                borderRadius: 16,
                padding: '18px 20px',
                transition: 'border-color .2s, box-shadow .2s',
              }}
            />
            <button
              type="button"
              className="gm-cta"
              onClick={onSubmit}
              style={{
                marginTop: 14,
                background: C.saffron,
                color: C.paper,
                border: 'none',
                borderRadius: 999,
                padding: '13px 30px',
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background .2s',
              }}
            >
              Find guidance
            </button>
          </div>

          {/* example situations — tappable */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 9,
              marginTop: 22,
            }}
          >
            {MOMENTS.map((m) => (
              <button
                key={m.ref}
                type="button"
                className="gm-chip"
                onClick={() => onChip(m.cue)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(31,24,20,0.15)',
                  color: C.inkMute,
                  borderRadius: 999,
                  padding: '8px 15px',
                  fontSize: 13.5,
                  cursor: 'pointer',
                  transition: 'border-color .2s, color .2s',
                }}
              >
                {m.cue}
              </button>
            ))}
          </div>
        </section>

        {/* THE WISDOM RESPONSE — the signature moment */}
        <section ref={responseRef} style={{ minHeight: moment ? 'auto' : 0 }}>
          {moment && (
            <div
              className={revealed ? 'gm-rise' : ''}
              style={{
                animation: revealed ? 'gm-rise .7s cubic-bezier(.2,.7,.2,1) both' : 'none',
                margin: '44px auto 0',
                maxWidth: 600,
                textAlign: 'center',
                padding: '36px 32px 32px',
                background: C.paper,
                border: '1px solid rgba(156,122,58,0.28)',
                borderRadius: 20,
                boxShadow: '0 1px 0 rgba(31,24,20,0.03)',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: C.gold,
                  marginBottom: 18,
                }}
              >
                {moment.ref}
              </div>
              <div
                className="font-display"
                style={{
                  fontSize: 26,
                  lineHeight: 1.5,
                  marginBottom: 12,
                  color: C.ink,
                }}
              >
                {moment.sanskrit}
              </div>
              <div
                style={{
                  fontStyle: 'italic',
                  fontSize: 14.5,
                  color: C.inkMute,
                  marginBottom: 22,
                }}
              >
                {moment.translit}
              </div>
              <p
                className="font-display"
                style={{
                  fontSize: 20,
                  lineHeight: 1.55,
                  margin: '0 auto 26px',
                  maxWidth: 440,
                }}
              >
                {moment.meaning}
              </p>
              <button
                type="button"
                onClick={onBegin}
                className="gm-link"
                style={{
                  fontSize: 14.5,
                  color: C.saffron,
                  fontWeight: 500,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `1px solid ${C.saffron}`,
                  paddingBottom: 2,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Sit with this in GitaMoment →
              </button>
            </div>
          )}
        </section>

        {/* one quiet orientation line — the only explanatory text on the page */}
        <section
          style={{
            textAlign: 'center',
            padding: '76px 0 64px',
            color: C.inkMute,
            fontSize: 15,
            lineHeight: 1.6,
          }}
        >
          Bring whatever you're wrestling with — a decision, a conflict, a fear —
          and find the guidance to meet it.
        </section>
      </main>

      {/* footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(31,24,20,0.10)',
          padding: '26px 24px',
        }}
      >
        <div
          style={{
            maxWidth: 980,
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13.5,
            color: C.inkMute,
          }}
        >
          <span>© GitaMoment</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <a className="gm-link" style={navLink} href="https://buymeacoffee.com/gitaflow" target="_blank" rel="noopener noreferrer">
              Support this work
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const navLink = {
  textDecoration: 'none',
  color: 'inherit',
  transition: 'color .2s',
};
