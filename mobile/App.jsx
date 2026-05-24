import { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts as useFraunces,
  Fraunces_300Light,
  Fraunces_300Light_Italic,
  Fraunces_400Regular,
  Fraunces_500Medium,
} from '@expo-google-fonts/fraunces';
import { DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';

import HomeScreen from './src/screens/HomeScreen';
import LensScreen from './src/screens/LensScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import ResponseScreen from './src/screens/ResponseScreen';
import JournalScreen from './src/screens/JournalScreen';
import JourneysScreen from './src/screens/JourneysScreen';
import JourneyDayScreen from './src/screens/JourneyDayScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import GitaExplorerScreen from './src/screens/GitaExplorerScreen';
import GitaChapterScreen from './src/screens/GitaChapterScreen';

import { analyseKarma } from './src/api/client';
import { fetchMe } from './src/api/client';
import {
  loadReflections,
  saveReflection,
  migrateLegacyReflections,
} from './src/lib/storage';
import { C } from './src/lib/colors';

// Hold the splash screen until fonts load — prevents the flash-of-fallback-font.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore: app may have been hot-reloaded */
});

export default function App() {

  const [fontsLoaded] = useFraunces({
    Fraunces_300Light,
    Fraunces_300Light_Italic,
    Fraunces_400Regular,
    Fraunces_500Medium,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  // 'onboarding' | 'home' | 'lens' | 'loading' | 'response' | 'journal' | 'journeys' | 'journey_day'
  // Start with `null` (unknown) so we don't flash the wrong screen before
  // /api/users/me returns.
  const [view, setView] = useState(null);
  const [userText, setUserText] = useState('');
  const [emotionHint, setEmotionHint] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [reflections, setReflections] = useState([]);
  const [savedFlag, setSavedFlag] = useState(false);
  const [lensPrefill, setLensPrefill] = useState('');
  const [journeyDayCtx, setJourneyDayCtx] = useState({ progressId: null, dayNumber: 1 });
  const [journeyTick, setJourneyTick] = useState(0);
  const [explorerChapter, setExplorerChapter] = useState(1);
  // Guard against rapid Save taps — see web App.jsx for rationale
  const savingRef = useRef(false);

  // Onboarding gate + reflection migration on mount.
  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMe();
        setView(me.onboarded_at ? 'home' : 'onboarding');
      } catch {
        setView('home'); // network failure — default to home, don't trap user
      }

      await migrateLegacyReflections();
      const items = await loadReflections();
      setReflections(items);
    })();
  }, []);

  // Hide splash once fonts are ready.
  const onLayout = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

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
    if (savedFlag || !result || savingRef.current) return;
    savingRef.current = true;
    try {
      const saved = await saveReflection({
        analysisId: result.analysis_id,
        userText,
        result,
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

  /** Open the Lens, optionally pre-populating the input. */
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

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']} onLayout={onLayout}>
        <StatusBar style="dark" />
        <View style={styles.container}>
          {view === 'onboarding' && (
            <OnboardingScreen onComplete={() => setView('home')} />
          )}

          {view === 'home' && (
            <HomeScreen
              onOpenLens={openLens}
              onOpenJournal={() => setView('journal')}
              onOpenJourneys={() => setView('journeys')}
              onOpenJourneyDay={openJourneyDay}
              onOpenDashboard={() => setView('dashboard')}
              onOpenExplorer={() => setView('gita_explorer')}
              reflectionCount={reflections.length}
              journeyTick={journeyTick}
            />
          )}

          {view === 'gita_explorer' && (
            <GitaExplorerScreen
              onBack={() => setView('home')}
              onOpenChapter={(n) => {
                setExplorerChapter(n);
                setView('gita_chapter');
              }}
            />
          )}

          {view === 'gita_chapter' && (
            <GitaChapterScreen
              key={explorerChapter}
              chapterNumber={explorerChapter}
              onBack={() => setView('gita_explorer')}
              onOpenLens={openLens}
            />
          )}

          {view === 'dashboard' && (
            <DashboardScreen
              onBack={() => setView('home')}
              onOpenLens={openLens}
            />
          )}

          {view === 'lens' && (
            <LensScreen
              onBack={() => setView('home')}
              onSubmit={handleSubmit}
              error={error}
              initialText={lensPrefill}
            />
          )}

          {view === 'loading' && <LoadingScreen />}

          {view === 'response' && result && (
            <ResponseScreen
              result={result}
              onBack={() => setView(savedFlag ? 'journal' : 'lens')}
              onSave={handleSave}
              savedFlag={savedFlag}
            />
          )}

          {view === 'journal' && (
            <JournalScreen
              reflections={reflections}
              onBack={() => setView('home')}
              onOpen={openSaved}
            />
          )}

          {view === 'journeys' && (
            <JourneysScreen
              onBack={() => setView('home')}
              onOpenDay={openJourneyDay}
            />
          )}

          {view === 'journey_day' && journeyDayCtx.progressId && (
            <JourneyDayScreen
              key={`${journeyDayCtx.progressId}:${journeyDayCtx.dayNumber}`}
              progressId={journeyDayCtx.progressId}
              dayNumber={journeyDayCtx.dayNumber}
              onBack={() => { bumpJourney(); setView('home'); }}
              onOpenLens={openLens}
              onJourneyChanged={bumpJourney}
            />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.parchment },
  container: { flex: 1 },
});
