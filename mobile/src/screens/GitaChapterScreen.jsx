import { useEffect, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fetchChapter } from '../api/client';
import { C } from '../lib/colors';

export default function GitaChapterScreen({ chapterNumber, onBack, onOpenLens }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setLoading(true); setData(null); setErr(null);
    fetchChapter(chapterNumber)
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [chapterNumber]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={onBack} style={styles.backRow}>
        <Feather name="chevron-left" size={16} color={C.inkSoft} />
        <Text style={styles.backLabel}>Chapters</Text>
      </Pressable>

      {loading ? <ActivityIndicator color={C.inkMute} style={{ marginTop: 12 }} /> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}

      {data ? (
        <>
          <Text style={styles.kicker}>CHAPTER {data.number}</Text>
          <Text style={styles.title}>{data.name_english}</Text>
          <Text style={styles.subtitle}>{data.name_sanskrit} · {data.verse_count} verses</Text>
          <Text style={styles.intro}>{data.intro}</Text>

          {data.verses.map((v) => (
            <VerseCard key={v.verse_id} verse={v} onOpenLens={onOpenLens} />
          ))}

          <View style={styles.endBlock}>
            <Text style={styles.endLabel}>End of Chapter {data.number}.</Text>
            <Pressable onPress={onBack} style={styles.endBtn}>
              <Feather name="chevron-left" size={14} color={C.inkSoft} />
              <Text style={styles.endBtnLabel}>Back to chapters</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function VerseCard({ verse, onOpenLens }) {
  const lensPrefill = `Sitting with BG ${verse.chapter}.${verse.verse}: "${verse.translation || ''}"\n\nWhat I'm bringing to it:\n`;

  return (
    <View style={styles.verseCard}>
      <Text style={styles.verseKicker}>BG {verse.chapter}.{verse.verse}</Text>

      {verse.sanskrit ? (
        <Text style={styles.verseSanskrit}>{verse.sanskrit}</Text>
      ) : null}

      {verse.transliteration ? (
        <Text style={styles.verseTranslit}>{verse.transliteration}</Text>
      ) : null}

      {verse.translation ? (
        <Text style={styles.verseTranslation}>"{verse.translation}"</Text>
      ) : null}

      {verse.simple_meaning ? (
        <View style={styles.plainBlock}>
          <Text style={styles.plainText}>
            <Text style={styles.plainLabel}>In plain words: </Text>
            {verse.simple_meaning}
          </Text>
        </View>
      ) : null}

      {/* Tags */}
      {((verse.themes?.length || 0) + (verse.emotional_tags?.length || 0)) > 0 ? (
        <View style={styles.tagsRow}>
          <Feather name="tag" size={10} color={C.inkMute} style={{ marginRight: 4 }} />
          {[...(verse.themes || []), ...(verse.emotional_tags || [])].slice(0, 6).map((t) => (
            <View key={t} style={styles.tagPill}>
              <Text style={styles.tagPillLabel}>{t.replace(/_/g, ' ')}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* YouTube */}
      {verse.youtube_video_id ? (
        <Pressable
          onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${verse.youtube_video_id}`)}
          style={styles.youtubeRow}
        >
          <Feather name="play" size={12} color={C.saffron} />
          <Text style={styles.youtubeLabel}>Watch the explanation</Text>
          <Feather name="arrow-right" size={12} color={C.saffron} />
        </Pressable>
      ) : null}

      {/* Bring to Karma Lens */}
      <Pressable
        onPress={() => onOpenLens(lensPrefill)}
        style={styles.bringBtn}
      >
        <Text style={styles.bringBtnLabel}>Bring this to Karma Lens</Text>
        <Feather name="chevron-right" size={14} color={C.saffron} />
      </Pressable>

      {verse.is_narrative ? (
        <Text style={styles.narrativeNote}>
          This is a narrative verse — describing the scene rather than teaching directly.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 80 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 24 },
  backLabel: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.inkSoft },

  err: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.rust, marginVertical: 12 },

  kicker: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 2.2, color: C.gold, marginBottom: 8 },
  title: { fontFamily: 'Fraunces_400Regular', fontSize: 32, lineHeight: 35, color: C.ink, marginBottom: 4 },
  subtitle: { fontFamily: 'DMSans_400Regular', fontStyle: 'italic', fontSize: 13, color: C.inkMute, marginBottom: 24 },
  intro: {
    fontFamily: 'DMSans_400Regular', fontSize: 15.5, lineHeight: 25,
    color: C.inkSoft, marginBottom: 40,
  },

  // Verse card
  verseCard: {
    backgroundColor: C.paper,
    borderColor: 'rgba(31,24,20,0.08)', borderWidth: 1,
    borderRadius: 8, padding: 18,
    marginBottom: 16,
  },
  verseKicker: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 2.2, color: C.gold, marginBottom: 12 },
  verseSanskrit: {
    fontFamily: 'Fraunces_400Regular', fontSize: 16, lineHeight: 27,
    color: C.ink, marginBottom: 12,
  },
  verseTranslit: {
    fontFamily: 'DMSans_400Regular', fontStyle: 'italic',
    fontSize: 12, color: C.inkMute, marginBottom: 16,
  },
  verseTranslation: {
    fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic',
    fontSize: 16, lineHeight: 24, color: C.inkSoft, marginBottom: 16,
  },
  plainBlock: {
    paddingTop: 12, marginBottom: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(31,24,20,0.08)',
  },
  plainText: { fontFamily: 'DMSans_400Regular', fontSize: 13.5, lineHeight: 21, color: C.ink },
  plainLabel: { fontFamily: 'DMSans_500Medium', color: C.saffron },

  // Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 14 },
  tagPill: {
    backgroundColor: C.parchment2,
    borderColor: 'rgba(31,24,20,0.08)', borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2,
  },
  tagPillLabel: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: C.inkMute },

  // YouTube
  youtubeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 8, marginBottom: 4,
  },
  youtubeLabel: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.saffron, flex: 1 },

  // Bring button
  bringBtn: {
    marginTop: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 14,
    borderColor: 'rgba(182,80,46,0.33)', borderWidth: 1, borderRadius: 8,
  },
  bringBtnLabel: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.saffron },

  narrativeNote: {
    fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic',
    fontSize: 10, color: C.inkMute, marginTop: 10,
  },

  // End-of-chapter
  endBlock: {
    marginTop: 24, paddingTop: 24,
    borderTopWidth: 1, borderTopColor: 'rgba(31,24,20,0.10)',
  },
  endLabel: {
    fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic',
    fontSize: 15, color: C.inkMute, marginBottom: 14,
  },
  endBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 14,
    borderColor: 'rgba(31,24,20,0.18)', borderWidth: 1, borderRadius: 8,
    alignSelf: 'flex-start',
  },
  endBtnLabel: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.inkSoft },
});
