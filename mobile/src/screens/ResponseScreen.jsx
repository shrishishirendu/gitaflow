import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import PathCard from '../components/PathCard';
import VerseCard from '../components/VerseCard';
import { C } from '../lib/colors';

export default function ResponseScreen({ result, onBack, onSave, savedFlag }) {
  // Crisis branch — per spec §7.6 / §15
  if (result.is_crisis) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={onBack} style={styles.backRow}>
          <Feather name="chevron-left" size={16} color={C.inkMute} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <View style={styles.crisisCard}>
          <View style={styles.crisisHeader}>
            <Feather name="heart" size={18} color={C.saffronDk} />
            <Text style={styles.crisisKicker}>A PAUSE BEFORE WISDOM</Text>
          </View>
          <Text style={styles.crisisBody}>{result.crisis_response}</Text>
          <View style={styles.crisisDivider} />
          <Text style={styles.crisisFooter}>
            This app offers reflection — not urgent care. Please reach a person or service who can
            be with you right now.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={onBack} style={styles.backRow}>
        <Feather name="chevron-left" size={16} color={C.inkMute} />
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>

      {/* SECTION: emotion */}
      <View style={styles.section}>
        <Text style={[styles.kicker, { color: C.saffron }]}>WHAT YOU MAY BE FEELING</Text>
        <Text style={styles.heading}>{result.emotion.summary}</Text>
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: C.ink }]}>
            <Text style={[styles.tagLabel, { color: C.paper }]}>
              {result.emotion.primary} · {result.emotion.intensity}
            </Text>
          </View>
          {result.emotion.secondary?.map((e) => (
            <View key={e} style={styles.tagOutline}>
              <Text style={[styles.tagLabel, { color: C.inkSoft }]}>{e}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* SECTION: hidden pattern (vasana) */}
      <View style={styles.patternBlock}>
        <View style={styles.dualLabelRow}>
          <Text style={[styles.dualLabelSanskrit, { color: C.gold }]}>VASANA</Text>
          <Text style={styles.dualLabelEnglish}>· THE STORED IMPULSE</Text>
        </View>
        <Text style={styles.patternBody}>{result.dharma.inner_conflict}</Text>
        <Text style={styles.patternMeta}>
          {result.dharma.pattern.replace(/_/g, ' ')} · {result.dharma.theme.replace(/_/g, ' ')}
        </Text>
      </View>

      {/* SECTION: verse */}
      <View style={styles.section}>
        <VerseCard verse={result.verse} reason={result.verse_reason} />
      </View>

      {/* SECTION: wisdom */}
      <View style={styles.wisdomSection}>
        <Text style={styles.wisdomBody}>{result.wisdom.simple_explanation}</Text>
        <View style={styles.oneLine}>
          <Text style={styles.oneLineKicker}>ONE LINE TO CARRY</Text>
          <Text style={styles.oneLineText}>{result.wisdom.one_line_wisdom}</Text>
        </View>
      </View>

      {/* SECTION: paths */}
      <View style={styles.section}>
        <Text style={styles.pathsHeading}>Three places this could go</Text>
        <Text style={styles.pathsSub}>Notice which one is pulling at you most strongly.</Text>
        <PathCard kind="reactive"  data={result.paths.reactive} />
        <PathCard kind="balanced"  data={result.paths.balanced} />
        <PathCard kind="conscious" data={result.paths.conscious} />
      </View>

      {/* SECTION: micro-practice (sadhana) */}
      <View style={styles.practice}>
        <View style={styles.practiceHeader}>
          <Feather name="wind" size={14} color={C.sage} />
          <View style={styles.practiceLabelRow}>
            <Text style={[styles.dualLabelSanskrit, { color: C.sage, marginLeft: 8 }]}>
              SADHANA
            </Text>
            <Text style={styles.dualLabelEnglish}>
              · A SMALL PRACTICE · {result.micro_practice.duration}
            </Text>
          </View>
        </View>
        <Text style={styles.practiceTitle}>{result.micro_practice.title}</Text>
        <Text style={styles.practiceBody}>{result.micro_practice.instructions}</Text>
      </View>

      {/* SECTION: reflection question */}
      <View style={styles.questionBlock}>
        <Text style={styles.questionKicker}>SIT WITH THIS</Text>
        <Text style={styles.questionText}>"{result.reflection_question}"</Text>
      </View>

      {/* SAVE */}
      <Pressable
        onPress={onSave}
        disabled={savedFlag}
        style={[styles.saveBtn, { backgroundColor: savedFlag ? C.sage : C.ink }]}
      >
        <Feather
          name={savedFlag ? 'check' : 'bookmark'}
          size={16}
          color={C.paper}
        />
        <Text style={styles.saveLabel}>
          {savedFlag ? 'Saved to your journal' : 'Save reflection'}
        </Text>
      </Pressable>
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
  section: { marginBottom: 32 },
  kicker: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    letterSpacing: 2.2,
    marginBottom: 8,
  },
  heading: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 26,
    lineHeight: 30,
    color: C.ink,
    marginBottom: 8,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
  },
  tagOutline: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(31,24,20,0.18)',
    marginRight: 8,
    marginBottom: 8,
  },
  tagLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
  },
  patternBlock: {
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: C.gold,
    marginBottom: 32,
  },
  patternBody: {
    fontFamily: 'Fraunces_300Light',
    fontSize: 18,
    lineHeight: 26,
    color: C.ink,
    marginBottom: 4,
  },
  patternMeta: {
    fontFamily: 'DMSans_400Regular',
    fontStyle: 'italic',
    fontSize: 12.5,
    color: C.inkMute,
  },
  wisdomSection: { marginBottom: 40 },
  wisdomBody: {
    fontFamily: 'Fraunces_300Light',
    fontSize: 20,
    lineHeight: 29,
    color: C.ink,
    marginBottom: 20,
  },
  oneLine: {
    backgroundColor: C.ink,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  oneLineKicker: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    letterSpacing: 2.2,
    color: C.paper,
    opacity: 0.6,
    marginBottom: 6,
  },
  oneLineText: {
    fontFamily: 'Fraunces_300Light_Italic',
    fontStyle: 'italic',
    fontSize: 17,
    lineHeight: 24,
    color: C.paper,
  },
  pathsHeading: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 22,
    color: C.ink,
    marginBottom: 4,
  },
  pathsSub: {
    fontFamily: 'Fraunces_300Light_Italic',
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 18,
    color: C.inkMute,
    marginBottom: 20,
  },
  // Dual-label pattern: SANSKRIT · english (used in Vasana + Sadhana headers)
  dualLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  dualLabelSanskrit: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    letterSpacing: 2.2,
  },
  dualLabelEnglish: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 9,
    letterSpacing: 1.8,
    color: C.inkMute,
    opacity: 0.85,
    marginLeft: 6,
  },
  practiceLabelRow: { flexDirection: 'row', alignItems: 'baseline' },
  practice: {
    backgroundColor: C.parchment2,
    borderColor: 'rgba(31,24,20,0.08)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 20,
    marginBottom: 32,
  },
  practiceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  practiceKicker: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    letterSpacing: 2,
    color: C.sage,
    marginLeft: 8,
  },
  practiceTitle: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 19,
    color: C.ink,
    marginBottom: 8,
  },
  practiceBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: C.inkSoft,
  },
  questionBlock: {
    paddingHorizontal: 8,
    alignItems: 'center',
    marginBottom: 40,
  },
  questionKicker: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    letterSpacing: 2.2,
    color: C.inkMute,
    marginBottom: 12,
  },
  questionText: {
    fontFamily: 'Fraunces_300Light_Italic',
    fontStyle: 'italic',
    fontSize: 22,
    lineHeight: 29,
    color: C.ink,
    textAlign: 'center',
  },
  saveBtn: {
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: C.paper,
    marginLeft: 8,
  },
  // Crisis
  crisisCard: {
    backgroundColor: C.paper,
    borderColor: C.saffronDk,
    borderWidth: 2,
    borderRadius: 8,
    padding: 24,
  },
  crisisHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  crisisKicker: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 2,
    color: C.saffronDk,
    marginLeft: 8,
  },
  crisisBody: {
    fontFamily: 'Fraunces_300Light',
    fontSize: 18,
    lineHeight: 27,
    color: C.ink,
  },
  crisisDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(31,24,20,0.1)',
    marginTop: 20,
    marginBottom: 20,
  },
  crisisFooter: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: C.inkMute,
  },
});
