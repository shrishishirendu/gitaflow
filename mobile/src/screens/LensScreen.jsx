import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Chip from '../components/Chip';
import { C } from '../lib/colors';

const EMOTION_OPTIONS = ['Angry', 'Anxious', 'Confused', 'Hurt', 'Stuck', 'Heavy'];

export default function LensScreen({ onBack, onSubmit, error, initialText = '' }) {
  const [text, setText] = useState(initialText);
  const [emotion, setEmotion] = useState(null);
  const canSubmit = text.trim().length > 5;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={20}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable onPress={onBack} style={styles.backRow}>
          <Feather name="chevron-left" size={16} color={C.inkMute} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        <Text style={styles.heading}>What's on your mind?</Text>
        <Text style={styles.subhead}>Write freely. No judgement, no fixing.</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Something interrupted: {error}</Text>
          </View>
        ) : null}

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="A situation, a feeling, a decision you're sitting with…"
          placeholderTextColor={C.inkMute}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          style={styles.textarea}
        />

        <Text style={styles.kicker}>IF YOU'D LIKE TO TAG IT</Text>
        <View style={styles.chipsRow}>
          {EMOTION_OPTIONS.map((e) => (
            <Chip
              key={e}
              label={e}
              active={emotion === e}
              onPress={() => setEmotion(emotion === e ? null : e)}
            />
          ))}
        </View>

        <Pressable
          onPress={() => canSubmit && onSubmit(text.trim(), emotion)}
          disabled={!canSubmit}
          style={[styles.submitBtn, !canSubmit && { opacity: 0.4 }]}
        >
          <Text style={styles.submitLabel}>Reflect with the Gita</Text>
          <Feather name="arrow-right" size={18} color={C.paper} />
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 80,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  backLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: C.inkMute,
    marginLeft: 4,
  },
  heading: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 30,
    lineHeight: 33,
    color: C.ink,
    marginBottom: 8,
  },
  subhead: {
    fontFamily: 'Fraunces_300Light_Italic',
    fontStyle: 'italic',
    fontSize: 16,
    color: C.inkMute,
    marginBottom: 28,
  },
  errorBox: {
    backgroundColor: '#FFF1EC',
    borderColor: 'rgba(182,80,46,0.33)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: C.saffronDk,
    lineHeight: 17,
  },
  textarea: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: 'rgba(31,24,20,0.12)',
    borderRadius: 8,
    padding: 16,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 23,
    color: C.ink,
    minHeight: 180,
  },
  kicker: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    letterSpacing: 1.8,
    color: C.inkMute,
    marginTop: 24,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 32,
  },
  submitBtn: {
    backgroundColor: C.saffron,
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitLabel: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 17,
    color: C.paper,
    marginRight: 8,
  },
});
