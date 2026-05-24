import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C } from '../lib/colors';

// Replace with your actual Buy Me a Coffee URL once created
const DONATION_URL = 'https://buymeacoffee.com/gitaflow';

/**
 * DonationNudge — appears quietly after every 5th saved reflection.
 * Same logic as web: show when reflectionCount > 0 && reflectionCount % 5 === 0
 */
export default function DonationNudge({ reflectionCount }) {
  if (!reflectionCount || reflectionCount === 0) return null;
  if (reflectionCount % 5 !== 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.kickerRow}>
        <Feather name="heart" size={11} color={C.inkMute} />
        <Text style={styles.kicker}>SUSTAIN THIS WORK</Text>
      </View>
      <Text style={styles.message}>
        GitaFlow is built freely, sustained by those who find it useful.
      </Text>
      <Pressable
        onPress={() => Linking.openURL(DONATION_URL)}
        style={({ pressed }) => [
          styles.btn,
          pressed && { opacity: 0.75 },
        ]}
      >
        <Feather name="heart" size={13} color={C.saffron} />
        <Text style={styles.btnLabel}>Support GitaFlow</Text>
      </Pressable>
      <Text style={styles.footnote}>
        Every contribution keeps this running. No pressure, ever.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(31,24,20,0.08)',
    alignItems: 'center',
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  kicker: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    letterSpacing: 1.8,
    color: C.inkMute,
  },
  message: {
    fontFamily: 'Fraunces_300Light_Italic',
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 23,
    color: C.inkSoft,
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 280,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(182,80,46,0.33)',
    marginBottom: 10,
  },
  btnLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: C.saffron,
  },
  footnote: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: C.inkMute,
    textAlign: 'center',
  },
});
