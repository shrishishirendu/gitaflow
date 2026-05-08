import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C } from '../lib/colors';

const META = {
  reactive: {
    sanskrit: 'TAMAS',
    english:  'AVOIDANCE',
    iconName: 'cloud',
    bar: C.inkMute,
    isTrap: true,
  },
  balanced: {
    sanskrit: 'RAJAS',
    english:  'REACTIVE',
    iconName: 'zap',
    bar: C.rust,
    isTrap: false,
  },
  conscious: {
    sanskrit: 'SATTVA',
    english:  'CONSCIOUS',
    iconName: 'triangle',
    bar: C.saffron,
    isTrap: false,
  },
};

export default function PathCard({ kind, data }) {
  const { sanskrit, english, iconName, bar, isTrap } = META[kind];
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isTrap ? C.parchment2 : C.paper,
          borderColor: isTrap ? 'rgba(31,24,20,0.07)' : 'rgba(31,24,20,0.10)',
          opacity: isTrap ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <Feather name={iconName} size={14} color={bar} />
        <View style={styles.labelRow}>
          <Text style={[styles.sanskrit, { color: bar }]}>{sanskrit}</Text>
          <Text style={styles.english}>· {english}</Text>
        </View>
      </View>

      <Text style={styles.title}>
        {isTrap ? <Text style={styles.trapPrefix}>The pull to </Text> : null}
        {data.title}
      </Text>

      <Text style={styles.description}>{data.description}</Text>

      <View style={styles.divider} />
      <Text style={styles.likely}>Likely: {data.likely_result}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 20,
    marginBottom: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', marginLeft: 8 },
  sanskrit: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    letterSpacing: 2,
  },
  english: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 9,
    letterSpacing: 1.7,
    color: C.inkMute,
    opacity: 0.7,
    marginLeft: 6,
  },
  title: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 19,
    lineHeight: 23,
    color: C.ink,
    marginBottom: 8,
  },
  trapPrefix: {
    fontFamily: 'Fraunces_300Light',
    color: C.inkMute,
  },
  description: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: C.inkSoft,
    marginBottom: 12,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(31,24,20,0.13)',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  likely: {
    fontFamily: 'Fraunces_300Light_Italic',
    fontStyle: 'italic',
    fontSize: 12.5,
    lineHeight: 19,
    color: C.inkMute,
  },
});
