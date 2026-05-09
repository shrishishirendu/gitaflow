import { useEffect, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fetchDashboard } from '../api/client';
import { C } from '../lib/colors';

export default function DashboardScreen({ onBack, onOpenLens }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <BackButton onBack={onBack} />
        <ActivityIndicator color={C.inkMute} style={{ marginTop: 32 }} />
      </ScrollView>
    );
  }

  if (err || !data) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <BackButton onBack={onBack} />
        <Text style={styles.err}>{err || 'Could not load dashboard.'}</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton onBack={onBack} />

      <View style={styles.kickerRow}>
        <Feather name="trending-up" size={14} color={C.gold} />
        <Text style={styles.kicker}>KARMA DASHBOARD</Text>
      </View>
      <Text style={styles.title}>Your practice, mirrored.</Text>

      {data.enough_data
        ? <FullDashboard data={data} />
        : <SparseDashboard data={data} onOpenLens={onOpenLens} />}
    </ScrollView>
  );
}

function BackButton({ onBack }) {
  return (
    <Pressable onPress={onBack} style={styles.backRow}>
      <Feather name="chevron-left" size={16} color={C.inkSoft} />
      <Text style={styles.backLabel}>Home</Text>
    </Pressable>
  );
}

// ────────────────────────────────────────────────────────────────────────
// SPARSE STATE — < 5 reflections
// ────────────────────────────────────────────────────────────────────────
function SparseDashboard({ data, onOpenLens }) {
  const message = data.total_reflections === 0
    ? "Your dashboard becomes a mirror after a few reflections. It's quiet here for now — that's exactly right."
    : `Your dashboard becomes a mirror after ${data.threshold} reflections. You have ${data.total_reflections}${data.remaining > 0 ? ` — ${data.remaining} more and patterns will start to surface.` : '.'}`;

  const hasAny = data.cadence?.some((d) => d.has_reflection || d.has_journey_day || d.has_checkin);

  return (
    <>
      <Text style={styles.sparseMsg}>{message}</Text>

      {hasAny ? <CadenceGrid cadence={data.cadence} /> : null}

      <Pressable
        onPress={() => onOpenLens('')}
        style={({ pressed }) => [
          styles.primaryBtn,
          pressed && { transform: [{ scale: 0.99 }] },
        ]}
      >
        <View>
          <Text style={styles.primaryKicker}>CONTINUE</Text>
          <Text style={styles.primaryTitle}>Reflect on a situation</Text>
        </View>
        <Feather name="arrow-right" size={18} color={C.paper} />
      </Pressable>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────
// FULL DASHBOARD
// ────────────────────────────────────────────────────────────────────────
function FullDashboard({ data }) {
  return (
    <>
      <Text style={styles.totalLine}>{data.total_reflections} reflections so far.</Text>

      {data.insight ? (
        <View style={styles.noticingCard}>
          <View style={styles.noticingHeader}>
            <Feather name="star" size={11} color={C.paper} style={{ opacity: 0.7 }} />
            <Text style={styles.noticingKicker}>A NOTICING</Text>
          </View>
          <Text style={styles.noticingText}>{data.insight}</Text>
        </View>
      ) : null}

      {/* Cadence */}
      <Section title="LAST 30 DAYS">
        <CadenceGrid cadence={data.cadence} />
        <CadenceLegend />
      </Section>

      {/* Top patterns */}
      {data.top_patterns?.length > 0 ? (
        <Section title="WHAT KEEPS COMING UP">
          {data.top_patterns.map(({ pattern, count }) => (
            <View key={pattern} style={styles.patternRow}>
              <Text style={styles.patternLabel}>{pattern.replace(/_/g, ' ')}</Text>
              <Text style={styles.patternCount}>{count}× this month</Text>
            </View>
          ))}
        </Section>
      ) : null}

      {/* Top emotions */}
      {data.top_emotions?.length > 0 ? (
        <Section title="EMOTIONAL WEATHER">
          <Text style={styles.emotionsLine}>
            {data.top_emotions.map((e, i) => (
              <Text key={e.emotion}>
                <Text style={{ fontStyle: 'italic' }}>{e.emotion}</Text>
                {i < data.top_emotions.length - 1 ? (i === data.top_emotions.length - 2 ? ', and ' : ', ') : ''}
              </Text>
            ))}
            <Text> have been the texture of these reflections.</Text>
          </Text>
        </Section>
      ) : null}

      {/* Top verses */}
      {data.top_verses?.length > 0 ? (
        <Section title="VERSES YOU'VE BEEN MEETING">
          {data.top_verses.slice(0, 3).map((v) => (
            <View key={v.verse_id} style={styles.verseCard}>
              <View style={styles.verseHeader}>
                <View style={styles.verseHeaderLeft}>
                  <Feather name="book-open" size={12} color={C.gold} />
                  <Text style={styles.verseRef}>BG {v.chapter}.{v.verse}</Text>
                </View>
                <Text style={styles.verseCount}>appeared {v.count}×</Text>
              </View>
              <Text style={styles.verseTranslation}>"{v.translation}"</Text>
            </View>
          ))}
        </Section>
      ) : null}
    </>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function CadenceGrid({ cadence }) {
  return (
    <View style={styles.cadenceGrid}>
      {cadence.map((d, i) => {
        let bg = 'rgba(31,24,20,0.06)';
        if (d.has_reflection)        bg = C.sage;
        else if (d.has_journey_day)  bg = C.gold;
        else if (d.has_checkin)      bg = 'rgba(31,24,20,0.18)';
        return (
          <View
            key={i}
            style={[styles.cadenceCell, { backgroundColor: bg }]}
          />
        );
      })}
    </View>
  );
}

function CadenceLegend() {
  return (
    <View style={styles.legendRow}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: C.sage }]} />
        <Text style={styles.legendLabel}>reflection</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: C.gold }]} />
        <Text style={styles.legendLabel}>journey day</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: 'rgba(31,24,20,0.18)' }]} />
        <Text style={styles.legendLabel}>check-in</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 80 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 24 },
  backLabel: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.inkSoft },
  err: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.rust, marginTop: 16 },

  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  kicker: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 2.2, color: C.gold },
  title: { fontFamily: 'Fraunces_400Regular', fontSize: 28, lineHeight: 32, color: C.ink, marginBottom: 8 },

  // Sparse
  sparseMsg: {
    fontFamily: 'Fraunces_300Light_Italic',
    fontStyle: 'italic',
    fontSize: 16, lineHeight: 24,
    color: C.inkMute,
    marginTop: 8, marginBottom: 32,
  },

  totalLine: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.inkMute, marginBottom: 32 },

  // AI noticing card
  noticingCard: { backgroundColor: C.ink, borderRadius: 8, padding: 24, marginBottom: 40 },
  noticingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, opacity: 0.7 },
  noticingKicker: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 2.2, color: C.paper },
  noticingText: {
    fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic',
    fontSize: 18, lineHeight: 26, color: C.paper,
  },

  // Section
  section: { marginBottom: 40 },
  sectionTitle: {
    fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 2.2,
    color: C.inkMute, marginBottom: 16,
  },

  // Cadence
  cadenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cadenceCell: {
    width: '8.5%',           // ~10 per row with gaps
    aspectRatio: 1,
    borderRadius: 2,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendLabel: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: C.inkMute },

  // Patterns
  patternRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(31,24,20,0.06)',
  },
  patternLabel: { fontFamily: 'Fraunces_400Regular', fontSize: 15, color: C.ink },
  patternCount: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.inkMute },

  // Emotions
  emotionsLine: {
    fontFamily: 'Fraunces_300Light',
    fontSize: 15, lineHeight: 22, color: C.inkSoft,
  },

  // Verses
  verseCard: {
    backgroundColor: C.paper,
    borderColor: 'rgba(31,24,20,0.08)', borderWidth: 1,
    borderRadius: 8, padding: 16, marginBottom: 12,
  },
  verseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  verseHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verseRef: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 2, color: C.gold },
  verseCount: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: C.inkMute },
  verseTranslation: {
    fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic',
    fontSize: 14, lineHeight: 21, color: C.inkSoft,
  },

  // Primary CTA (sparse-state continue button)
  primaryBtn: {
    marginTop: 24,
    backgroundColor: C.ink, borderRadius: 8,
    paddingVertical: 18, paddingHorizontal: 22,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  primaryKicker: {
    fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 2.2,
    color: C.paper, opacity: 0.7, marginBottom: 4,
  },
  primaryTitle: { fontFamily: 'Fraunces_400Regular', fontSize: 17, color: C.paper },
});
