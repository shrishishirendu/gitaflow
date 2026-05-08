import { useEffect, useState } from 'react';
import { analyseKarma, fetchHomeVerse } from './api/client';
import {
  loadReflections,
  saveReflection,
  migrateLegacyReflections,
} from './lib/storage';
import { C } from './lib/colors';
import HomeView from './views/HomeView';
import LensView from './views/LensView';
import LoadingView from './views/LoadingView';
import ResponseView from './views/ResponseView';
import JournalView from './views/JournalView';

export default function App() {
  const [view, setView] = useState('home');
  const [userText, setUserText] = useState('');
  const [emotionHint, setEmotionHint] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [reflections, setReflections] = useState([]);
  const [savedFlag, setSavedFlag] = useState(false);
  const [dailyVerse, setDailyVerse] = useState(null);
  const [lensPrefill, setLensPrefill] = useState('');

  useEffect(() => {
    (async () => {
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
    if (savedFlag || !result) return;
    const saved = await saveReflection({
      analysisId: result.analysis_id,
      userText,
      result,
    });
    if (saved) {
      setSavedFlag(true);
      setReflections((prev) => [saved, ...prev]);
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

  return (
    <div
      className="font-body grain min-h-screen"
      style={{ background: C.parchment, color: C.ink }}
    >
      <div className="max-w-md mx-auto relative">
        {view === 'home' && (
          <HomeView
            onOpenLens={openLens}
            onOpenJournal={() => setView('journal')}
            reflectionCount={reflections.length}
            dailyVerse={dailyVerse}
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
      </div>
    </div>
  );
}