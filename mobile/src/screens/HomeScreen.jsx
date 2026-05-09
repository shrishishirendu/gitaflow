import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import {
  fetchReflectionCount,
  fetchTodayCheckin,
  saveCheckin,
  fetchHomeInsight,
  fetchHomeVerse,
  fetchActiveJourney,
} from '../api/client';
import { C } from '../lib/colors';

// Three weighted/tinted chips. Same vocabulary as web. The free-text escape
// hatch handles everything outside these three buckets.
const ARRIVAL_CHIPS = [
  { value: 'lifting',  label: 'Lifting',  description: 'open · grateful · hopeful', tint: '#EDE7D6', activeTint: '#C49A4D' },
  { value: 'steady',   label: 'Steady',   description: 'settled · clear · here',    tint: '#E4E5DD', activeTint: '#6E7A65' },
  { value: 'weighing', label: 'Weighing', description: 'heavy · stuck · tender',    tint: '#E8DDD6', activeTint: '#8E5C42' },
];

export default function HomeScreen({
  onOpenLens, onOpenJournal, onOpenJourneys, onOpenJourneyDay,
  reflectionCount, journeyTick = 0,
}) {
  const [dailyVerse, setDailyVerse] = useState(null);
  const [backendCount, setBackendCount] = useState(null);
  const [syncStatus, setSyncStatus] = useState('checking');
  const [todayEmotion, setTodayEmotion] = useState(null);
  const [savingCheckin, setSavingCheckin] = useState(false);
  const [insight, setInsight] = useState(null);
  const [showFreeText, setShowFreeText] = useState(false);
  const [freeText, setFreeText] = useState('');
  const [activeJourney, setActiveJourney] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    fetchHomeVerse().then((v) => { if (!cancelled) setDailyVerse(v); }).catch(() => {});
    fetchReflectionCount()
      .then((d) => { if (!cancelled) { setBackendCount(d.count); setSyncStatus('synced'); } })
      .catch(() => { if (!cancelled) setSyncStatus('offline'); });
    fetchTodayCheckin().then((d) => { if (!cancelled) setTodayEmotion(d.emotion); }).catch(() => {});
    fetchHomeInsight().then((d) => { if (!cancelled) setInsight(d); }).catch(() => {});
    fetchActiveJourney().then((d) => { if (!cancelled) setActiveJourney(d.active); }).catch(() => {});

    return () => { cancelled = true; };
  }, [journeyTick]);

  async function handleCheckin(emotion) {
    if (savingCheckin || todayEmotion === emotion) return;
    setSavingCheckin(true);
    setTodayEmotion(emotion);
    try {
      await saveCheckin(emotion);
    } catch {
      setTodayEmotion(null);
    } finally {
      setSavingCheckin(false);
    }
  }

  async function handleFreeTextSubmit() {
    const word = freeText.trim();
    if (!word || word.length > 40 || savingCheckin) return;
    setSavingCheckin(true);
    setTodayEmotion(word.toLowerCase());
    try {
      await saveCheckin(word.toLowerCase());
      setShowFreeText(false);
      setFreeText('');
    } catch {
      setTodayEmotion(null);
    } finally {
      setSavingCheckin(false);
    }
  }

  function openFreeText() {
    setShowFreeText(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  const isCustomEmotion = todayEmotion && !ARRIVAL_CHIPS.some(c => c.value === todayEmotion);
  const displayCount = backendCount !== null ? backendCount : reflectionCount;
  const hour = new Date().getHours();
  const greeting =
    hour < 5  ? 'Good night'
  : hour < 12 ? 'Good morning'
  : hour < 17 ? 'Good afternoon'
  : hour < 21 ? 'Good evening'
              : 'Good night';

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.brandRow}>
        <View style={styles.brandDot}>
          <Feather name="feather" size={14} color={C.parchment} />
        </View>
        <Text style={styles.brandWord}>GitaFlow</Text>
      </View>

      <Text style={styles.greeting}>{greeting}.</Text>
      <Text style={styles.subhead}>What's arriving with you?</Text>

      {/* Arrival chips — weighted/tinted, in a 3-column grid */}
      <View style={styles.chipsGrid}>
        {ARRIVAL_CHIPS.map(({ value, label, description, tint, activeTint }) => {
          const active = todayEmotion === value;
          return (
            <Pressable
              key={value}
              onPress={() => handleCheckin(value)}
              disabled={savingCheckin}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? activeTint : tint,
                  borderColor: active ? activeTint : 'transparent',
                },
              ]}
            >
              <Text style={[styles.chipLabel, { color: active ? C.paper : C.ink, fontFamily: active ? 'Fraunces_500Medium' : 'Fraunces_400Regular' }]}>
                {label}
              </Text>
              <Text style={[styles.chipDesc, { color: active ? 'rgba(251,246,236,0.7)' : C.inkMute }]}>
                {description}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Free-text escape hatch */}
      {!showFreeText && !isCustomEmotion && (
        <Pressable onPress={openFreeText} style={styles.freeTextLink}>
          <Feather name="edit-3" size={12} color={C.inkMute} />
          <Text style={styles.freeTextLinkLabel}>Or name it yourself →</Text>
        </Pressable>
      )}

      {showFreeText && (
        <View style={styles.freeTextRow}>
          <TextInput
            ref={inputRef}
            value={freeText}
            onChangeText={setFreeText}
            placeholder="One word for it…"
            placeholderTextColor={C.inkMute}
            maxLength={40}
            style={styles.freeTextInput}
            onSubmitEditing={handleFreeTextSubmit}
            returnKeyType="done"
          />
          <Pressable onPress={handleFreeTextSubmit} disabled={!freeText.trim()} style={[styles.freeTextSave, !freeText.trim() && { opacity: 0.4 }]}>
            <Text style={styles.freeTextSaveLabel}>Save</Text>
          </Pressable>
          <Pressable onPress={() => { setShowFreeText(false); setFreeText(''); }} style={styles.freeTextClose}>
            <Feather name="x" size={14} color={C.inkMute} />
          </Pressable>
        </View>
      )}

      {isCustomEmotion && !showFreeText && (
        <View style={styles.customRow}>
          <View style={styles.customTag}>
            <Text style={styles.customTagLabel}>{todayEmotion}</Text>
          </View>
          <Pressable onPress={() => { setTodayEmotion(null); openFreeText(); }}>
            <Text style={styles.customChange}>change</Text>
          </Pressable>
        </View>
      )}

      {/* Continuity strip */}
      {insight?.line ? (
        <View style={styles.continuityStrip}>
          <Text style={styles.continuityText}>{insight.line}</Text>
        </View>
      ) : null}

      {/* Active Journey card */}
      {activeJourney ? (
        <Pressable
          onPress={() => onOpenJourneyDay(activeJourney.progress_id, activeJourney.current_day)}
          style={({ pressed }) => [
            styles.journeyCard,
            pressed && { transform: [{ scale: 0.99 }] },
          ]}
        >
          {/* Progress dots strip */}
          <View style={styles.journeyDots}>
            {Array.from({ length: activeJourney.duration_days }).map((_, i) => {
              const dayNum = i + 1;
              const isDone = dayNum <= activeJourney.days_completed;
              const isCurrent = dayNum === activeJourney.current_day;
              return (
                <View
                  key={i}
                  style={[
                    styles.journeyDot,
                    {
                      backgroundColor: isDone ? C.sage : (isCurrent ? C.gold : 'rgba(31,24,20,0.10)'),
                    },
                  ]}
                />
              );
            })}
          </View>
          <View style={styles.journeyHeader}>
            <Feather name="compass" size={12} color={C.gold} />
            <Text style={styles.journeyKicker}>
              JOURNEY · DAY {activeJourney.current_day} OF {activeJourney.duration_days}
            </Text>
          </View>
          <Text style={styles.journeyTitle}>{activeJourney.journey_title}</Text>
          <Text style={styles.journeySubtitle}>{activeJourney.journey_subtitle}</Text>
          <View style={styles.journeyFoot}>
            <Text style={styles.journeyFootLabel}>
              {activeJourney.current_day_is_unlocked ? 'Continue' : 'Sit with yesterday'}
            </Text>
            <Feather name="arrow-right" size={12} color={C.inkSoft} />
          </View>
        </Pressable>
      ) : null}

      {/* Verse card — weightier */}
      {dailyVerse ? (
        <View style={styles.verseWrapper}>
          <View style={styles.verseAccent} />
          <LinearGradient
            colors={[C.paper, C.parchment2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.verseCard}
          >
            <Text style={styles.verseKicker}>
              {dailyVerse._reason && dailyVerse._reason !== 'daily' ? 'PICKED FOR YOU' : "TODAY'S VERSE"}
              {' · BG '}{dailyVerse.chapter}.{dailyVerse.verse}
            </Text>
            {dailyVerse.sanskrit ? <Text style={styles.verseSanskrit}>{dailyVerse.sanskrit}</Text> : null}
            {dailyVerse.transliteration ? <Text style={styles.verseTranslit}>{dailyVerse.transliteration}</Text> : null}
            {dailyVerse.translation ? <Text style={styles.verseTranslation}>"{dailyVerse.translation}"</Text> : null}
            {dailyVerse.simple_meaning ? (
              <View style={styles.verseMeaningWrap}>
                <Text style={styles.verseMeaning}>
                  <Text style={styles.verseMeaningLabel}>In plain words: </Text>
                  {dailyVerse.simple_meaning}
                </Text>
              </View>
            ) : null}
          </LinearGradient>
        </View>
      ) : null}

      {/* Karma Lens primary */}
      <Pressable
        onPress={() => onOpenLens('')}
        style={({ pressed }) => [
          styles.primaryBtn,
          pressed && { transform: [{ scale: 0.99 }] },
        ]}
      >
        <View>
          <Text style={styles.primaryKicker}>KARMA LENS</Text>
          <Text style={styles.primaryTitle}>Reflect on a situation</Text>
        </View>
        <Feather name="arrow-right" size={20} color={C.paper} />
      </Pressable>

      {/* Journeys (when no active journey, otherwise it's already shown above) */}
      {!activeJourney ? (
        <Pressable onPress={onOpenJourneys} style={styles.secondaryBtn}>
          <View style={styles.secondaryLeft}>
            <Feather name="compass" size={16} color={C.inkSoft} />
            <Text style={styles.secondaryLabel}>Walk through a teaching</Text>
          </View>
          <Text style={styles.secondaryCount}>Journeys</Text>
        </Pressable>
      ) : null}

      {/* Journal */}
      <Pressable onPress={onOpenJournal} style={styles.secondaryBtn}>
        <View style={styles.secondaryLeft}>
          <Feather name="bookmark" size={16} color={C.inkSoft} />
          <Text style={styles.secondaryLabel}>Your journal</Text>
        </View>
        <View style={styles.secondaryRight}>
          <Text style={styles.secondaryCount}>
            {displayCount} {displayCount === 1 ? 'reflection' : 'reflections'}
          </Text>
          {syncStatus === 'synced' && (
            <Feather name="cloud" size={12} color={C.sage} style={styles.syncIcon} />
          )}
          {syncStatus === 'offline' && (
            <Feather name="cloud-off" size={12} color={C.inkMute} style={styles.syncIcon} />
          )}
        </View>
      </Pressable>

      <Text style={styles.disclaimer}>
        Gita-inspired reflection · Not a substitute for medical, legal,{'\n'}or
        professional mental-health support.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 80 },

  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 40 },
  brandDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  brandWord: { fontFamily: 'Fraunces_500Medium', fontSize: 16, color: C.ink, letterSpacing: -0.3 },

  greeting: { fontFamily: 'Fraunces_400Regular', fontSize: 26, lineHeight: 30, color: C.inkSoft, marginBottom: 4 },
  subhead: {
    fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic',
    fontSize: 17, lineHeight: 22, color: C.inkMute, marginBottom: 20,
  },

  // Chips grid
  chipsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  chip: {
    flex: 1, marginHorizontal: 3,
    borderRadius: 8, paddingVertical: 12, paddingHorizontal: 10,
    borderWidth: 1,
  },
  chipLabel: { fontSize: 15, lineHeight: 18 },
  chipDesc: { fontFamily: 'DMSans_400Regular', fontSize: 10, marginTop: 4, lineHeight: 13 },

  // Free-text escape hatch
  freeTextLink: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  freeTextLinkLabel: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.inkMute, marginLeft: 6 },
  freeTextRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, gap: 8 },
  freeTextInput: {
    flex: 1, backgroundColor: C.paper, color: C.ink,
    borderColor: 'rgba(156,122,58,0.33)', borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    fontFamily: 'DMSans_400Regular', fontSize: 14,
  },
  freeTextSave: { backgroundColor: C.ink, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  freeTextSaveLabel: { color: C.paper, fontFamily: 'DMSans_400Regular', fontSize: 12 },
  freeTextClose: { padding: 6 },
  customRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, gap: 10 },
  customTag: { backgroundColor: C.ink, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  customTagLabel: { color: C.paper, fontFamily: 'DMSans_400Regular', fontSize: 11 },
  customChange: { color: C.inkMute, fontFamily: 'DMSans_400Regular', fontSize: 11 },

  // Continuity strip
  continuityStrip: { paddingLeft: 16, borderLeftWidth: 2, borderLeftColor: C.gold, marginBottom: 24 },
  continuityText: {
    fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic',
    fontSize: 15, lineHeight: 21, color: C.inkSoft,
  },

  // Active journey card
  journeyCard: {
    backgroundColor: C.paper,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(156,122,58,0.33)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  journeyDots: {
    flexDirection: 'row', gap: 4,
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12,
  },
  journeyDot: { flex: 1, height: 4, borderRadius: 2 },
  journeyHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, marginBottom: 8, gap: 8,
  },
  journeyKicker: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 2.2, color: C.gold },
  journeyTitle: { fontFamily: 'Fraunces_400Regular', fontSize: 22, lineHeight: 26, color: C.ink, paddingHorizontal: 18, marginBottom: 4 },
  journeySubtitle: { fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic', fontSize: 14, color: C.inkMute, paddingHorizontal: 18 },
  journeyFoot: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 6, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18,
  },
  journeyFootLabel: { color: C.inkSoft, fontFamily: 'DMSans_400Regular', fontSize: 12 },

  // Verse card
  verseWrapper: { position: 'relative', marginBottom: 28 },
  verseAccent: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
    backgroundColor: C.gold, borderTopLeftRadius: 8, borderBottomLeftRadius: 8,
    zIndex: 1,
  },
  verseCard: {
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(156,122,58,0.33)',
    padding: 22,
  },
  verseKicker: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 2.2, color: C.gold, marginBottom: 12 },
  verseSanskrit: { fontFamily: 'Fraunces_400Regular', fontSize: 15, lineHeight: 26, color: C.ink, marginBottom: 12 },
  verseTranslit: { fontFamily: 'DMSans_400Regular', fontStyle: 'italic', fontSize: 12, color: C.inkMute, marginBottom: 16 },
  verseTranslation: { fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic', fontSize: 17, lineHeight: 25, color: C.inkSoft, marginBottom: 16 },
  verseMeaningWrap: { paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(31,24,20,0.08)' },
  verseMeaning: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21, color: C.ink },
  verseMeaningLabel: { fontFamily: 'DMSans_500Medium', color: C.saffron },

  // Primary CTA
  primaryBtn: {
    backgroundColor: C.ink, borderRadius: 8,
    paddingVertical: 20, paddingHorizontal: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  primaryKicker: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 2.2, color: C.paper, opacity: 0.7, marginBottom: 4 },
  primaryTitle: { fontFamily: 'Fraunces_400Regular', fontSize: 19, color: C.paper },

  // Journal
  secondaryBtn: {
    marginTop: 12, borderRadius: 8, paddingVertical: 16, paddingHorizontal: 20,
    borderWidth: 1, borderColor: 'rgba(31,24,20,0.15)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  secondaryLeft: { flexDirection: 'row', alignItems: 'center' },
  secondaryRight: { flexDirection: 'row', alignItems: 'center' },
  syncIcon: { marginLeft: 6 },
  secondaryLabel: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: C.inkSoft, marginLeft: 12 },
  secondaryCount: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.inkMute },

  disclaimer: {
    fontFamily: 'DMSans_400Regular', fontSize: 11, lineHeight: 17,
    color: C.inkMute, textAlign: 'center', marginTop: 48,
  },
});
