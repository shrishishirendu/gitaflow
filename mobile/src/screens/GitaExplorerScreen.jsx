import { useEffect, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fetchChapters } from '../api/client';
import { C } from '../lib/colors';

export default function GitaExplorerScreen({ onBack, onOpenChapter }) {
  const [chapters, setChapters] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetchChapters()
      .then((d) => setChapters(d.chapters || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={onBack} style={styles.backRow}>
        <Feather name="chevron-left" size={16} color={C.inkSoft} />
        <Text style={styles.backLabel}>Home</Text>
      </Pressable>

      <View style={styles.kickerRow}>
        <Feather name="book-open" size={14} color={C.gold} />
        <Text style={styles.kicker}>EXPLORE THE GITA</Text>
      </View>
      <Text style={styles.title}>All 18 chapters.</Text>
      <Text style={styles.subtitle}>
        Read chronologically, or move toward whatever you need today. Every chapter has its own character.
      </Text>

      {loading ? <ActivityIndicator color={C.inkMute} style={{ marginTop: 12 }} /> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}

      {chapters?.map((ch) => (
        <Pressable
          key={ch.number}
          onPress={() => onOpenChapter(ch.number)}
          style={({ pressed }) => [
            styles.chapterCard,
            pressed && { transform: [{ scale: 0.99 }] },
          ]}
        >
          <View style={styles.numberCircle}>
            <Text style={styles.numberText}>{ch.number}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.chapterHeaderRow}>
              <Text style={styles.chapterName} numberOfLines={2}>{ch.name_english}</Text>
              <Text style={styles.verseCount}>{ch.verse_count} VERSES</Text>
            </View>
            <Text style={styles.sanskritName}>{ch.name_sanskrit}</Text>
            <Text style={styles.intro}>{ch.intro}</Text>
            <View style={styles.readRow}>
              <Text style={styles.readLabel}>Read chapter</Text>
              <Feather name="chevron-right" size={12} color={C.gold} />
            </View>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 80 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 24 },
  backLabel: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.inkSoft },

  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  kicker: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 2.2, color: C.gold },
  title: { fontFamily: 'Fraunces_400Regular', fontSize: 28, lineHeight: 32, color: C.ink, marginBottom: 8 },
  subtitle: {
    fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic',
    fontSize: 16, lineHeight: 23, color: C.inkMute, marginBottom: 32,
  },

  err: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.rust, marginVertical: 12 },

  chapterCard: {
    backgroundColor: C.paper,
    borderColor: 'rgba(31,24,20,0.10)', borderWidth: 1,
    borderRadius: 8, padding: 18,
    flexDirection: 'row', gap: 14,
    marginBottom: 12,
  },
  numberCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.parchment2,
    borderColor: 'rgba(156,122,58,0.33)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  numberText: { fontFamily: 'Fraunces_400Regular', fontSize: 16, color: C.ink },
  chapterHeaderRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 8, marginBottom: 4,
  },
  chapterName: {
    fontFamily: 'Fraunces_400Regular', fontSize: 18, lineHeight: 22, color: C.ink,
    flex: 1,
  },
  verseCount: {
    fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 1.8,
    color: C.inkMute, paddingTop: 4,
  },
  sanskritName: {
    fontFamily: 'DMSans_400Regular', fontStyle: 'italic',
    fontSize: 11, color: C.inkMute, marginBottom: 10,
  },
  intro: {
    fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 20, color: C.inkSoft,
    marginBottom: 10,
  },
  readRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readLabel: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.gold },
});
