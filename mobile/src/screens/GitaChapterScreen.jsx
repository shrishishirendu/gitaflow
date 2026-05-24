import { useEffect, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator,
  Linking, Image, Modal, TouchableOpacity,
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

// Split Sanskrit at uvāca so speaker attribution sits on its own line
function splitAtUvaca(sanskrit) {
  if (!sanskrit) return { speaker: null, verse: sanskrit };
  const idx = sanskrit.indexOf('उवाच');
  if (idx === -1) return { speaker: null, verse: sanskrit };
  return {
    speaker: sanskrit.slice(0, idx + 4).trim(),
    verse: sanskrit.slice(idx + 4).trim(),
  };
}

function VerseCard({ verse, onOpenLens }) {
  const [imgExpanded, setImgExpanded] = useState(false);

  const trans = (verse.translation || '').trim();
  const simple = (verse.simple_meaning || '').trim();
  const primaryText = trans || simple;
  const showSecondaryPlainMeaning = !!trans && !!simple && trans !== simple;

  const lensPrefill = `Sitting with BG ${verse.chapter}.${verse.verse}: "${primaryText}"\n\nWhat I'm bringing to it:\n`;
  const { speaker, verse: verseBody } = splitAtUvaca(verse.sanskrit);

  return (
    <View style={styles.verseCard}>
      <Text style={styles.verseKicker}>BG {verse.chapter}.{verse.verse}</Text>

      {/* Sanskrit with uvāca split */}
      {verse.sanskrit ? (
        <View style={{ marginBottom: 12 }}>
          {speaker ? (
            <Text style={styles.verseSpeaker}>{speaker}</Text>
          ) : null}
          <Text style={styles.verseSanskrit}>{verseBody || verse.sanskrit}</Text>
        </View>
      ) : null}

      {verse.transliteration ? (
        <Text style={styles.verseTranslit}>{verse.transliteration}</Text>
      ) : null}

      {primaryText ? (
        <Text style={styles.verseTranslation}>"{primaryText}"</Text>
      ) : null}

      {showSecondaryPlainMeaning ? (
        <View style={styles.plainBlock}>
          <Text style={styles.plainText}>
            <Text style={styles.plainLabel}>In plain words: </Text>
            {simple}
          </Text>
        </View>
      ) : null}

      {/* Infographic thumbnail — tap to expand fullscreen */}
      {verse.infographic_url ? (
        <View style={styles.infographicBlock}>
          <Pressable
            onPress={() => setImgExpanded(true)}
            style={styles.infographicThumbBtn}
          >
            <Image
              source={{ uri: verse.infographic_url }}
              style={styles.infographicThumb}
              resizeMode="cover"
            />
            <View style={styles.infographicOverlay}>
              <Feather name="maximize-2" size={18} color="#fff" />
              <Text style={styles.infographicOverlayText}>Tap to expand</Text>
            </View>
          </Pressable>

          {/* Fullscreen modal */}
          <Modal
            visible={imgExpanded}
            transparent
            animationType="fade"
            onRequestClose={() => setImgExpanded(false)}
          >
            <View style={styles.modalBg}>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setImgExpanded(false)}
              >
                <Feather name="x" size={22} color="#fff" />
              </TouchableOpacity>
              <Image
                source={{ uri: verse.infographic_url }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            </View>
          </Modal>
        </View>
      ) : null}

      {/* Media links */}
      {(verse.youtube_url || verse.podcast_url) ? (
        <View style={styles.mediaRow}>
          {verse.youtube_url ? (
            <Pressable
              onPress={() => Linking.openURL(verse.youtube_url)}
              style={styles.mediaBtn}
            >
              <Feather name="play" size={12} color={C.saffron} />
              <Text style={styles.mediaBtnLabel}>Watch explanation</Text>
            </Pressable>
          ) : null}
          {verse.podcast_url ? (
            <Pressable
              onPress={() => Linking.openURL(verse.podcast_url)}
              style={styles.mediaBtn}
            >
              <Feather name="mic" size={12} color={C.inkSoft} />
              <Text style={[styles.mediaBtnLabel, { color: C.inkSoft }]}>Listen to podcast</Text>
            </Pressable>
          ) : null}
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

      {/* Karma Lens CTA */}
      <Pressable
        onPress={() => onOpenLens(lensPrefill)}
        style={styles.bringBtn}
      >
        <Text style={styles.bringBtnLabel}>Let this verse meet your moment</Text>
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
  intro: { fontFamily: 'DMSans_400Regular', fontSize: 15.5, lineHeight: 25, color: C.inkSoft, marginBottom: 40 },

  // Verse card
  verseCard: {
    backgroundColor: C.paper,
    borderColor: 'rgba(31,24,20,0.08)', borderWidth: 1,
    borderRadius: 8, padding: 18, marginBottom: 16,
  },
  verseKicker: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 2.2, color: C.gold, marginBottom: 12 },
  verseSpeaker: {
    fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic',
    fontSize: 13, lineHeight: 20, color: C.inkMute, marginBottom: 4,
  },
  verseSanskrit: { fontFamily: 'Fraunces_400Regular', fontSize: 16, lineHeight: 27, color: C.ink },
  verseTranslit: { fontFamily: 'DMSans_400Regular', fontStyle: 'italic', fontSize: 12, color: C.inkMute, marginBottom: 16 },
  verseTranslation: { fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic', fontSize: 16, lineHeight: 24, color: C.inkSoft, marginBottom: 16 },

  plainBlock: { paddingTop: 12, marginBottom: 16, borderTopWidth: 1, borderTopColor: 'rgba(31,24,20,0.08)' },
  plainText: { fontFamily: 'DMSans_400Regular', fontSize: 13.5, lineHeight: 21, color: C.ink },
  plainLabel: { fontFamily: 'DMSans_500Medium', color: C.saffron },

  // Infographic
  infographicBlock: { marginBottom: 14 },
  infographicThumbBtn: { position: 'relative', borderRadius: 8, overflow: 'hidden' },
  infographicThumb: { width: '100%', height: 160, borderRadius: 8 },
  infographicOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(31,24,20,0.55)',
    paddingVertical: 8, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  infographicOverlayText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#fff' },

  // Fullscreen modal
  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalClose: {
    position: 'absolute', top: 48, right: 20,
    padding: 8, zIndex: 10,
  },
  modalImage: { width: '100%', height: '80%' },

  // Media links
  mediaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  mediaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mediaBtnLabel: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.saffron },

  // Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 14 },
  tagPill: {
    backgroundColor: C.parchment2,
    borderColor: 'rgba(31,24,20,0.08)', borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2,
  },
  tagPillLabel: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: C.inkMute },

  // Bring button
  bringBtn: {
    marginTop: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 14,
    borderColor: 'rgba(182,80,46,0.33)', borderWidth: 1, borderRadius: 8,
  },
  bringBtnLabel: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.saffron },

  narrativeNote: { fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic', fontSize: 10, color: C.inkMute, marginTop: 10 },

  // End of chapter
  endBlock: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(31,24,20,0.10)' },
  endLabel: { fontFamily: 'Fraunces_300Light_Italic', fontStyle: 'italic', fontSize: 15, color: C.inkMute, marginBottom: 14 },
  endBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 14,
    borderColor: 'rgba(31,24,20,0.18)', borderWidth: 1, borderRadius: 8, alignSelf: 'flex-start',
  },
  endBtnLabel: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.inkSoft },
});
