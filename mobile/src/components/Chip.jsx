import { Pressable, Text, StyleSheet } from 'react-native';
import { C } from '../lib/colors';

export default function Chip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.active : styles.inactive]}
    >
      <Text
        style={[
          styles.label,
          { color: active ? C.paper : C.inkSoft },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  active: {
    backgroundColor: C.ink,
    borderColor: C.ink,
  },
  inactive: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(31,24,20,0.18)',
  },
  label: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
