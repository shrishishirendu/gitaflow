import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fetchJourneys, startJourney, resumeJourney } from '../api/client';
import { C } from '../lib/colors';

export default function JourneysScreen({ onBack, onOpenDay }) {
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetchJourneys()
      .then((d) => setJourneys(d.journeys || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleStartOrResume(j) {
    setBusy(true); setErr(null);
    try {
      if (j.progress?.state === 'paused') {
        await resumeJourney(j.progress.id);
        onOpenDay(j.progress.id, j.progress.current_day);
      } else if (j.progress?.state === 'active') {
        onOpenDay(j.progress.id, j.progress.current_day);
      } else {
        const started = await startJourney(j.slug);
        onOpenDay(started.progress_id, 1);
      }
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={onBack} style={styles.backRow}>
        <Feather name="chevron-left" size={16} color={C.inkSoft} />
        <Text style={styles.backLabel}>Home</Text>
      </Pressable>

      <View style={styles.kickerRow}>
        <Feather name="compass" size={14} color={C.gold} />
        <Text style={styles.kicker}>JOURNEYS</Text>
      </View>
      <Text style={styles.title}>Walk through a teaching.</Text>
      <Text style={styles.subtitle}>Seven small days. Returns to the same theme from different angles.</Text>

      {loading && <ActivityIndicator color={C.inkMute} style={{ marginTop: 16 }} />}
      {err && <Text style={styles.err}>{err}</Text>}
      {!loading && journeys.length === 0 && (
        <Text style={styles.muted}>No journeys available yet.</Text>
      )}

      {journeys.map((j) => {
        const status =
          j.progress?.state === 'active'    ? 'IN PROGRESS'
        : j.progress?.state === 'paused'    ? 'PAUSED'
        : j.progress?.state === 'completed' ? 'COMPLETED'
                                            : null;
        return (
          <View key={j.slug} style={styles.card}>
            {status ? (
              <Text style={[styles.status, { color: status === 'COMPLETED' ? C.sage : C.gold }]}>
                {status}
                {j.progress?.days_completed > 0 && status !== 'COMPLETED'
                  ? ` · ${j.progress.days_completed}/${j.duration_days} days`
                  : ''}
              </Text>
            ) : null}
            <Text style={styles.cardTitle}>{j.title}</Text>
            <Text style={styles.cardSubtitle}>{j.subtitle}</Text>
            <Text style={styles.cardDesc}>{j.description}</Text>
            <View style={styles.cardFoot}>
              <Text style={styles.muted}>
                {j.duration_days} days · ~{j.estimated_minutes_per_day} min/day
              </Text>
              <Pressable
                onPress={() => handleStartOrResume(j)}
                disabled={busy}
                style={[styles.cta, busy && { opacity: 0.5 }]}
              >
                <Text style={styles.ctaLabel}>
                  {j.progress?.state === 'paused'    ? 'Resume'
                : j.progress?.state === 'active'    ? 'Continue'
                : j.progress?.state === 'completed' ? 'Revisit'
                                                    : 'Begin'}
                </Text>
                <Feather name="arrow-right" size={12} color={C.paper} />
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 80 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 4 },
  backLabel: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.inkSoft },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  kicker: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 2.2, color: C.gold },
  title: { fontFamily: 'Fraunces_400Regular', fontSize: 28, lineHeight: 32, color: C.ink, marginBottom: 8 },
  subtitle: { fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic', fontSize: 16, lineHeight: 22, color: C.inkMute, marginBottom: 28 },
  err: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.rust, marginVertical: 12 },
  muted: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: C.inkMute },
  card: {
    backgroundColor: C.paper, borderColor: 'rgba(31,24,20,0.10)', borderWidth: 1,
    borderRadius: 8, padding: 18, marginBottom: 16,
  },
  status: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 2, marginBottom: 8 },
  cardTitle: { fontFamily: 'Fraunces_400Regular', fontSize: 22, lineHeight: 26, color: C.ink, marginBottom: 4 },
  cardSubtitle: { fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic', fontSize: 14, color: C.inkMute, marginBottom: 12 },
  cardDesc: { fontFamily: 'DMSans_400Regular', fontSize: 13.5, lineHeight: 21, color: C.inkSoft, marginBottom: 16 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cta: { backgroundColor: C.ink, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  ctaLabel: { color: C.paper, fontFamily: 'DMSans_400Regular', fontSize: 12 },
});
