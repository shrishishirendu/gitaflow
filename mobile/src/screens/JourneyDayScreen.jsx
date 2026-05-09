import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { fetchJourneyDay, completeJourneyDay } from '../api/client';
import { C } from '../lib/colors';

export default function JourneyDayScreen({ progressId, dayNumber, onBack, onOpenLens, onJourneyChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [overrideLock, setOverrideLock] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    setLoading(true); setData(null); setResponse(''); setOverrideLock(false); setJustCompleted(false);
    fetchJourneyDay(progressId, dayNumber)
      .then((d) => { setData(d); if (d.my_response) setResponse(d.my_response); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [progressId, dayNumber]);

  async function handleComplete() {
    setSaving(true);
    try {
      await completeJourneyDay(progressId, dayNumber, response.trim() || null);
      setJustCompleted(true);
      onJourneyChanged?.();
      const fresh = await fetchJourneyDay(progressId, dayNumber);
      setData(fresh);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  if (loading) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={onBack} style={styles.backRow}>
          <Feather name="chevron-left" size={16} color={C.inkSoft} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <ActivityIndicator color={C.inkMute} style={{ marginTop: 16 }} />
      </ScrollView>
    );
  }

  if (err || !data) {
    return (
      <View style={styles.container}>
        <Pressable onPress={onBack} style={styles.backRow}>
          <Feather name="chevron-left" size={16} color={C.inkSoft} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <Text style={styles.err}>{err || 'Could not load.'}</Text>
      </View>
    );
  }

  const { day, journey, thread, completed, is_unlocked } = data;
  const lockedNotOverridden = !is_unlocked && !overrideLock && !completed;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} style={styles.backRow}>
        <Feather name="chevron-left" size={16} color={C.inkSoft} />
        <Text style={styles.backLabel}>Home</Text>
      </Pressable>

      <Text style={styles.kicker}>{day.kicker}</Text>
      <Text style={styles.title}>{day.title}</Text>

      {lockedNotOverridden ? (
        <View style={styles.lockBox}>
          <Feather name="lock" size={14} color={C.gold} style={{ marginTop: 3 }} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.lockText}>Day {dayNumber} unlocks at sunrise. Sit with yesterday for a day.</Text>
            <Pressable onPress={() => setOverrideLock(true)}>
              <Text style={styles.lockOverride}>Continue anyway →</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {thread && thread.length > 0 && !lockedNotOverridden ? (
        <View style={styles.threadBox}>
          <Text style={styles.threadKicker}>
            {thread.length === 1 ? `DAY ${thread[0].day_number} · YOU WROTE` : 'EARLIER YOU WROTE'}
          </Text>
          {thread.slice(-2).map((t) => (
            <Text key={t.day_number} style={styles.threadQuote}>"{t.response}"</Text>
          ))}
        </View>
      ) : null}

      {!lockedNotOverridden ? (
        <Text style={styles.framing}>{day.framing}</Text>
      ) : null}

      {!lockedNotOverridden && day.verse ? (
        <View style={styles.verseWrap}>
          <View style={styles.verseAccent} />
          <LinearGradient colors={[C.paper, C.parchment2]} style={styles.verseCard}>
            <Text style={styles.verseKicker}>BG {day.verse.chapter}.{day.verse.verse}</Text>
            {day.verse.sanskrit ? <Text style={styles.verseSanskrit}>{day.verse.sanskrit}</Text> : null}
            {day.verse.translation ? <Text style={styles.verseTranslation}>"{day.verse.translation}"</Text> : null}
          </LinearGradient>
        </View>
      ) : null}

      {!lockedNotOverridden ? <Text style={styles.context}>{day.context}</Text> : null}

      {!lockedNotOverridden ? (
        <>
          <Text style={styles.promptLabel}>{day.prompt_label}</Text>
          <TextInput
            value={response}
            onChangeText={setResponse}
            placeholder={day.prompt_placeholder}
            placeholderTextColor={C.inkMute}
            multiline
            numberOfLines={4}
            maxLength={4000}
            style={styles.textArea}
            textAlignVertical="top"
          />
          <Pressable onPress={handleComplete} disabled={saving} style={[styles.completeBtn, saving && { opacity: 0.5 }]}>
            <Text style={styles.completeBtnLabel}>
              {completed ? 'Save changes' : `Mark Day ${dayNumber} complete`}
            </Text>
            {completed ? (
              <Feather name="check" size={16} color={C.paper} />
            ) : (
              <Feather name="arrow-right" size={16} color={C.paper} />
            )}
          </Pressable>

          {(justCompleted || completed) && (
            <Text style={styles.savedNote}>✓ saved</Text>
          )}

          {day.karma_lens_entry ? (
            <Pressable
              onPress={() => onOpenLens(day.karma_lens_prompt || `Reflecting on Day ${dayNumber} of ${journey.title}: `)}
              style={styles.lensBtn}
            >
              <Feather name="star" size={13} color={C.saffron} />
              <Text style={styles.lensBtnLabel}>Bring this to Karma Lens</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      {/* Journey map */}
      <View style={styles.mapWrap}>
        <Text style={styles.mapHeader}>{journey.title.toUpperCase()} · 7 DAYS</Text>
        {journey.days.map((d) => {
          const isDone = d.completed;
          const isCurrent = d.is_current;
          return (
            <View key={d.day_number} style={[styles.mapRow, { opacity: isCurrent ? 1 : (isDone ? 0.85 : 0.5) }]}>
              <View
                style={[
                  styles.mapDot,
                  {
                    backgroundColor: isDone ? C.sage : (isCurrent ? C.ink : 'transparent'),
                    borderColor: !isDone && !isCurrent ? 'rgba(31,24,20,0.33)' : 'transparent',
                    borderWidth: !isDone && !isCurrent ? 1 : 0,
                  },
                ]}
              >
                {isDone ? (
                  <Feather name="check" size={10} color={C.paper} />
                ) : (
                  <Text style={[styles.mapDotLabel, { color: isCurrent ? C.paper : C.inkMute }]}>{d.day_number}</Text>
                )}
              </View>
              <Text style={[styles.mapLabel, { color: isCurrent ? C.ink : C.inkSoft, fontFamily: isCurrent ? 'Fraunces_500Medium' : 'Fraunces_400Regular' }]}>
                Day {d.day_number} · {d.title}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 80 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 4 },
  backLabel: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.inkSoft },
  err: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.rust, marginTop: 16 },
  kicker: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 2.2, color: C.gold, marginBottom: 8 },
  title: { fontFamily: 'Fraunces_400Regular', fontSize: 30, lineHeight: 33, color: C.ink, marginBottom: 16 },

  lockBox: {
    flexDirection: 'row',
    backgroundColor: C.parchment2,
    borderColor: 'rgba(156,122,58,0.33)', borderWidth: 1, borderRadius: 8,
    padding: 14, marginBottom: 20,
  },
  lockText: { fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic', fontSize: 14.5, lineHeight: 21, color: C.inkSoft },
  lockOverride: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.inkMute, marginTop: 6, textDecorationLine: 'underline' },

  threadBox: { paddingLeft: 16, borderLeftWidth: 2, borderLeftColor: C.gold, marginBottom: 20 },
  threadKicker: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 2, color: C.gold, marginBottom: 6 },
  threadQuote: { fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic', fontSize: 15, lineHeight: 21, color: C.inkSoft, marginBottom: 4 },

  framing: { fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic', fontSize: 18, lineHeight: 25, color: C.ink, marginBottom: 20 },

  verseWrap: { position: 'relative', marginBottom: 20 },
  verseAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: C.gold, borderTopLeftRadius: 8, borderBottomLeftRadius: 8, zIndex: 1 },
  verseCard: { borderColor: 'rgba(156,122,58,0.33)', borderWidth: 1, borderRadius: 8, padding: 18 },
  verseKicker: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 2.2, color: C.gold, marginBottom: 10 },
  verseSanskrit: { fontFamily: 'Fraunces_400Regular', fontSize: 14, lineHeight: 22, color: C.ink, marginBottom: 8 },
  verseTranslation: { fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic', fontSize: 15, lineHeight: 22, color: C.inkSoft },

  context: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 22, color: C.ink, marginBottom: 24 },

  promptLabel: { fontFamily: 'Fraunces_400Regular', fontSize: 16, color: C.ink, marginBottom: 10 },
  textArea: {
    backgroundColor: C.paper, color: C.ink,
    borderColor: 'rgba(156,122,58,0.33)', borderWidth: 1, borderRadius: 8,
    padding: 12, fontFamily: 'DMSans_400Regular', fontSize: 14, minHeight: 90,
    marginBottom: 14,
  },
  completeBtn: {
    backgroundColor: C.ink, borderRadius: 8,
    paddingVertical: 14, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  completeBtnLabel: { color: C.paper, fontFamily: 'DMSans_400Regular', fontSize: 14 },
  savedNote: { color: C.sage, fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic', fontSize: 12, textAlign: 'center', marginBottom: 8 },
  lensBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'transparent', borderColor: 'rgba(182,80,46,0.33)', borderWidth: 1,
    borderRadius: 8, paddingVertical: 12, marginBottom: 8,
  },
  lensBtnLabel: { color: C.saffron, fontFamily: 'DMSans_400Regular', fontSize: 13 },

  mapWrap: { marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(31,24,20,0.10)' },
  mapHeader: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 2.2, color: C.inkMute, marginBottom: 16 },
  mapRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 12 },
  mapDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mapDotLabel: { fontFamily: 'DMSans_500Medium', fontSize: 10 },
  mapLabel: { fontSize: 13 },
});
