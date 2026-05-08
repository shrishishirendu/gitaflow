import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { C } from '../lib/colors';

const MESSAGES = [
  'Listening…',
  "Looking through karma's lens…",
  'Finding the verse that meets you here…',
  'Translating wisdom into action…',
];

export default function LoadingScreen() {
  const [i, setI] = useState(0);
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.55)).current;
  const fade = useRef(new Animated.Value(0)).current;

  // Cycle messages.
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % MESSAGES.length), 1700);
    return () => clearInterval(t);
  }, []);

  // Crossfade messages.
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [i]);

  // Breathing halo.
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.18, duration: 1700, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 1700, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 1700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.55, duration: 1700, useNativeDriver: true }),
        ]),
      ]),
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.haloWrap}>
        <Animated.View
          style={[
            styles.halo,
            { transform: [{ scale }], opacity },
          ]}
        />
        <View style={styles.dot} />
      </View>
      <Animated.Text style={[styles.message, { opacity: fade }]}>
        {MESSAGES[i]}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  haloWrap: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  halo: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.saffron,
    opacity: 0.25,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.saffron,
  },
  message: {
    fontFamily: 'Fraunces_300Light_Italic',
    fontStyle: 'italic',
    fontSize: 19,
    textAlign: 'center',
    color: C.inkSoft,
  },
});
