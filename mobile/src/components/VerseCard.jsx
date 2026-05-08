import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { C } from '../lib/colors';

export default function VerseCard({ verse, reason }) {
  if (!verse) return null;
  const { chapter, verse: v, sanskrit, transliteration, translation, simple_meaning } = verse;

  return (
    <LinearGradient
      colors={[C.paper, C.parchment2]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.card}
    >
      <Feather
        name="bookmark"
        size={28}
        color={C.gold}
        style={styles.cornerIcon}
      />

      <Text style={styles.kicker}>BHAGAVAD GITA · {chapter}.{v}</Text>
      <Text style={styles.sanskrit}>{sanskrit}</Text>
      <Text style={styles.transliteration}>{transliteration}</Text>
      <Text style={styles.translation}>"{translation}"</Text>

      <Text style={styles.simpleMeaning}>
        <Text style={styles.simpleMeaningLabel}>In plain words: </Text>
        {simple_meaning}
      </Text>

      {reason ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.reason}>Why this verse: {reason}</Text>
        </>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(156,122,58,0.2)',
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  cornerIcon: {
    position: 'absolute',
    top: 14,
    right: 18,
    opacity: 0.18,
  },
  kicker: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    letterSpacing: 2.2,
    color: C.gold,
    marginBottom: 12,
  },
  sanskrit: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 15,
    lineHeight: 24,
    color: C.ink,
    marginBottom: 12,
  },
  transliteration: {
    fontFamily: 'DMSans_400Regular',
    fontStyle: 'italic',
    fontSize: 12,
    color: C.inkMute,
    marginBottom: 16,
  },
  translation: {
    fontFamily: 'Fraunces_300Light_Italic',
    fontStyle: 'italic',
    fontSize: 18,
    lineHeight: 26,
    color: C.inkSoft,
    marginBottom: 16,
  },
  simpleMeaning: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: C.ink,
    marginBottom: 16,
  },
  simpleMeaningLabel: {
    fontFamily: 'DMSans_500Medium',
    color: C.saffron,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(31,24,20,0.08)',
    marginBottom: 14,
  },
  reason: {
    fontFamily: 'Fraunces_300Light_Italic',
    fontStyle: 'italic',
    fontSize: 12.5,
    lineHeight: 19,
    color: C.inkMute,
  },
});
