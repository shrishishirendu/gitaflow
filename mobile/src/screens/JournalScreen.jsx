import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C } from '../lib/colors';

export default function JournalScreen({ reflections, onBack, onOpen }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={onBack} style={styles.backRow}>
        <Feather name="chevron-left" size={16} color={C.inkMute} />
        <Text style={styles.backLabel}>Home</Text>
      </Pressable>

      <Text style={styles.heading}>Reflections</Text>
      <Text style={styles.subhead}>Patterns become visible when written down.</Text>

      {reflections.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="bookmark" size={28} color={C.ink} style={{ opacity: 0.3 }} />
          <Text style={styles.emptyText}>Your saved reflections will live here.</Text>
        </View>
      ) : (
        reflections.map((r, index) => {
          const resp = r.response || r.result || {};
          const v = resp.verse;
          const inputText = r.input_text || r.userText || '';
          const date = new Date(r.saved_at || r.savedAt);
          const dateLabel = date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          // Use the most stable identifier available. Some reflections
          // come from the backend (with `id`), some from older local
          // storage (with `analysis_id` or `analysisId`). If everything
          // is missing, fall back to index — not ideal but always unique.
          const key = r.id || r.analysis_id || r.analysisId || `reflection-${index}`;
          return (
            <Pressable key={key} onPress={() => onOpen(r)} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardDate}>{dateLabel}</Text>
                {resp.emotion?.primary ? (
                  <View style={styles.emotionTag}>
                    <Text style={styles.emotionTagLabel}>{resp.emotion.primary}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.cardLine}>
                {resp.wisdom?.one_line_wisdom || inputText.slice(0, 80)}
              </Text>
              {v ? <Text style={styles.cardVerse}>BG {v.chapter}.{v.verse}</Text> : null}
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 80,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: C.inkMute,
    marginLeft: 4,
  },
  heading: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 30,
    color: C.ink,
    marginBottom: 4,
  },
  subhead: {
    fontFamily: 'Fraunces_300Light_Italic',
    fontStyle: 'italic',
    fontSize: 15,
    color: C.inkMute,
    marginBottom: 32,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: C.inkMute,
    marginTop: 12,
  },
  card: {
    backgroundColor: C.paper,
    borderColor: 'rgba(31,24,20,0.08)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardDate: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    letterSpacing: 1.8,
    color: C.gold,
  },
  emotionTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(31,24,20,0.15)',
  },
  emotionTagLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: C.inkSoft,
  },
  cardLine: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 15,
    lineHeight: 21,
    color: C.ink,
    marginBottom: 8,
  },
  cardVerse: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: C.inkMute,
  },
});
