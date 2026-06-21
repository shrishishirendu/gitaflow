import { useEffect, useRef, useState } from 'react';
import { analyseKarma, fetchHomeVerse, fetchMe } from './api/client';
import {
  loadReflections,
  saveReflection,
  migrateLegacyReflections,
} from './lib/storage';
import { C } from './lib/colors';
import HomeView from './views/HomeView';
import LandingView from './views/LandingView';
import LensView from './views/LensView';
import LoadingView from './views/LoadingView';
import ResponseView from './views/ResponseView';
import JournalView from './views/JournalView';
import JourneysView from './views/JourneysView';
import JourneyDayView from './views/JourneyDayView';
import OnboardingFlow from './views/OnboardingFlow';
import DashboardView from './views/DashboardView';
import GitaExplorerView from './views/GitaExplorerView';
import GitaChapterView from './views/GitaChapterView';
import AdminPanel from './views/AdminPanel';

export default function App() {
  if (window.location.pathname === '/admin') return <AdminPanel />;
  // 'onboarding' | 'home' | 'lens' | 'loading' | 'response' | 'journal' | 'journeys' | 'journey_day'
  // Start with `null` (loading) so we don't flash the wrong screen before
  // /api/users/me returns. Once we know whether onboarded_at is set, we
  // route to either 'onboarding' or 'home'.
  const [view, setView] = useState(null);
  const [userText, setUserText] = useState('');
  const [emotionHint, setEmotionHint] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [reflections, setReflections] = useState([]);
  const [savedFlag, setSavedFlag] = useState(false);
  const [dailyVerse, setDailyVerse] = useState(null);
  const [lensPrefill, setLensPrefill] = useState('');
  const [journeyDayCtx, setJourneyDayCtx] = useState({ progressId: null, dayNumber: 1 });
  const [journeyTick, setJourneyTick] = useState(0);
  // Explorer navigation: which chapter is open (1..18) when view='gita_chapter'
  const [explorerChapter, setExplorerChapter] = useState(1);
  // Guard against rapid Save clicks (button-disabled relies on React state
  // which only updates after the await — meanwhile the user can fire 10
  // clicks in 100ms). This ref is synchronous, so it blocks re-entry the
  // moment the first save starts.
  const savingRef = useRef(false);

  useEffect(() => {
    (async () => {
      // Onboarding gate: ask the backend whether this device's user has
      // been onboarded. If the call fails (offline), default to 'home' so
      // existing users aren't trapped on the onboarding screen.
      try {
        const me = await fetchMe();
        setView(me.onboarded_at ? 'home' : 'landing');
      } catch {
        setView('home');
      }

      // These don't depend on onboarding state — kick them off in parallel
      await migrateLegacyReflections();
      const items = await loadReflections();
      setReflections(items);
    })();

    fetchHomeVerse()
      .then(setDailyVerse)
      .catch(() => null);
  }, []);

  async function handleSubmit(text, emotion) {
    setUserText(text);
    setEmotionHint(emotion);
    setView('loading');
    setError(null);
    setSavedFlag(false);
    try {
      const r = await analyseKarma(text, emotion);
      setResult(r);
      setView('response');
    } catch (e) {
      setError(e.message);
      setView('lens');
    }
  }

  async function handleSave() {
    // Triple guard: state, payload, and an in-flight ref. The ref is the
    // only thing that catches rapid clicks before React state updates.
    if (savedFlag || !result || savingRef.current) return;
    savingRef.current = true;
    try {
      const saved = await saveReflection({
        analysisId: result.analysis_id, userText, result,
      });
      if (saved) {
        setSavedFlag(true);
        setReflections((prev) => [saved, ...prev]);
      }
    } finally {
      savingRef.current = false;
    }
  }

  function openSaved(reflection) {
    setUserText(reflection.input_text || '');
    setEmotionHint(null);
    setResult(reflection.response || null);
    setSavedFlag(true);
    setView('response');
  }

  function openLens(prefill = '') {
    setError(null);
    setLensPrefill(prefill);
    setView('lens');
  }

  function openJourneyDay(progressId, dayNumber) {
    setJourneyDayCtx({ progressId, dayNumber });
    setView('journey_day');
  }

  function bumpJourney() {
    setJourneyTick((t) => t + 1);
  }

  // Landing renders full-width (no max-w-md wrap) since it's a marketing page
  // with its own hero layout. Everything else stays inside the narrow column.
  if (view === 'landing') {
    return (
      <div className="font-body grain min-h-screen" style={{ background: C.parchment, color: C.ink }}>
        <LandingView onBegin={() => setView('onboarding')} />
      </div>
    );
  }

  return (
    <div className="font-body grain min-h-screen" style={{ background: C.parchment, color: C.ink }}>
      <div className="max-w-md mx-auto relative">
        {/* Loading state: show nothing while we figure out if user is onboarded */}
        {view === null && null}

        {view === 'onboarding' && (
          <OnboardingFlow onComplete={() => setView('home')} />
        )}

        {view === 'home' && (
          <HomeView
            onOpenLens={openLens}
            onOpenJournal={() => setView('journal')}
            onOpenJourneys={() => setView('journeys')}
            onOpenJourneyDay={openJourneyDay}
            onOpenDashboard={() => setView('dashboard')}
            onOpenExplorer={() => setView('gita_explorer')}
            reflectionCount={reflections.length}
            dailyVerse={dailyVerse}
            journeyTick={journeyTick}
          />
        )}

        {view === 'gita_explorer' && (
          <GitaExplorerView
            onBack={() => setView('home')}
            onOpenChapter={(n) => {
              setExplorerChapter(n);
              setView('gita_chapter');
            }}
          />
        )}

        {view === 'gita_chapter' && (
          <GitaChapterView
            key={explorerChapter}
            chapterNumber={explorerChapter}
            onBack={() => setView('gita_explorer')}
            onOpenLens={openLens}
          />
        )}

        {view === 'dashboard' && (
          <DashboardView
            onBack={() => setView('home')}
            onOpenLens={openLens}
          />
        )}

        {view === 'lens' && (
          <LensView
            onBack={() => setView('home')}
            onSubmit={handleSubmit}
            error={error}
            initialText={lensPrefill}
          />
        )}

        {view === 'loading' && <LoadingView />}

        {view === 'response' && result && (
          <ResponseView
            result={result}
            onBack={() => setView(savedFlag ? 'journal' : 'lens')}
            onSave={handleSave}
            savedFlag={savedFlag}
          />
        )}

        {view === 'journal' && (
          <JournalView
            reflections={reflections}
            onBack={() => setView('home')}
            onOpen={openSaved}
          />
        )}

        {view === 'journeys' && (
          <JourneysView
            onBack={() => setView('home')}
            onOpenDay={openJourneyDay}
          />
        )}

        {view === 'journey_day' && journeyDayCtx.progressId && (
          <JourneyDayView
            key={`${journeyDayCtx.progressId}:${journeyDayCtx.dayNumber}`}
            progressId={journeyDayCtx.progressId}
            dayNumber={journeyDayCtx.dayNumber}
            onBack={() => { bumpJourney(); setView('home'); }}
            onOpenLens={openLens}
            onJourneyChanged={bumpJourney}
          />
        )}
      </div>
    </div>
  );
}
