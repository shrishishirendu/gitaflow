import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { saveOnboarding, fetchWelcomeVerse } from '../api/client';
import { C } from '../lib/colors';

const INTENTIONS = [
  { value: 'peace_of_mind',       label: 'I want peace of mind' },
  { value: 'life_confusion',      label: 'I am facing life confusion' },
  { value: 'understand_gita',     label: 'I want to understand the Gita practically' },
  { value: 'manage_anger_stress', label: 'I want to manage anger and stress' },
  { value: 'daily_discipline',    label: 'I want daily spiritual discipline' },
];

const TONES = [
  {
    value: 'simple_practical',
    label: 'Simple and practical',
    description: 'Plain modern English. Action-focused. The Gita as an operating manual.',
  },
  {
    value: 'spiritual_reflective',
    label: 'Spiritual and reflective',
    description: 'Contemplative warmth. Sanskrit terms when they teach. Comfortable with depth.',
  },
  {
    value: 'deep_philosophical',
    label: 'Deep and philosophical',
    description: 'Lean into the structural concepts. Dharmic vocabulary where it sharpens meaning.',
  },
];

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(0);
  const [intention, setIntention] = useState(null);
  const [tone, setTone] = useState(null);
  const [reminderOptIn, setReminderOptIn] = useState(null); // null until user picks
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      await saveOnboarding({
        intention,
        tonePreference: tone || 'simple_practical',
        dailyReminderOptIn: reminderOptIn === true,
      });
      onComplete();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: i === step ? 24 : 6,
                backgroundColor: i <= step ? C.ink : 'rgba(31,24,20,0.18)',
              },
            ]}
          />
        ))}
      </View>

      {/* Back button — only after step 0 */}
      {step > 0 && (
        <Pressable onPress={back} style={styles.backRow}>
          <Feather name="chevron-left" size={16} color={C.inkSoft} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      )}

      {step === 0 && <WelcomeStep onContinue={next} />}
      {step === 1 && (
        <IntentionStep
          value={intention}
          onChange={setIntention}
          onContinue={next}
        />
      )}
      {step === 2 && (
        <ToneStep
          value={tone}
          onChange={setTone}
          onContinue={next}
        />
      )}
      {step === 3 && (
        <ReminderStep
          value={reminderOptIn}
          onChange={setReminderOptIn}
          onFinish={finish}
          saving={saving}
          error={error}
        />
      )}
    </ScrollView>
  );
}

// ─── Step 0: Welcome ───────────────────────────────────────────────────
function WelcomeStep({ onContinue }) {
  const [verse, setVerse] = useState(null);

  useEffect(() => {
    fetchWelcomeVerse()
      .then(setVerse)
      .catch(() => null);
  }, []);

  return (
    <View>
      {/* Brand mark — top-left, restrained */}
      <View style={styles.brandRow}>
        <View style={styles.brandDotSmall}>
          <Feather name="feather" size={14} color={C.parchment} />
        </View>
        <Text style={styles.brandWord}>GitaFlow</Text>
      </View>

      {/* Verse hero */}
      {verse ? (
        <View style={styles.verseBlock}>
          <Text style={styles.verseKicker}>
            TODAY'S OPENING · BG {verse.chapter}.{verse.verse}
          </Text>
          {verse.sanskrit ? (
            <Text style={styles.verseSanskrit}>{verse.sanskrit}</Text>
          ) : null}
          {verse.transliteration ? (
            <Text style={styles.verseTranslit}>{verse.transliteration}</Text>
          ) : null}
          {verse.translation ? (
            <Text style={styles.verseTranslation}>"{verse.translation}"</Text>
          ) : null}
        </View>
      ) : null}

      {/* Hairline divider */}
      <View style={styles.divider} />

      <Text style={styles.welcomeTitleSmall}>Welcome to GitaFlow.</Text>
      <Text style={styles.welcomeSubtitleSmall}>
        A guide for clarity, calmness, and conscious action — rooted in the Bhagavad Gita.
      </Text>

      <Pressable onPress={onContinue} style={styles.beginBtnInline}>
        <Text style={styles.beginBtnLabel}>Begin</Text>
        <Feather name="arrow-right" size={16} color={C.paper} />
      </Pressable>

      <Text style={styles.welcomeFootnoteWarm}>
        Three small choices to set things up — about a minute. Your reflections
        live on this device. Sign-in comes later.
      </Text>
    </View>
  );
}

// ─── Step 1: Intention ─────────────────────────────────────────────────
function IntentionStep({ value, onChange, onContinue }) {
  return (
    <View>
      <Text style={styles.stepTitle}>What brings you here?</Text>
      <Text style={styles.stepSub}>We'll keep your answer quietly in mind.</Text>

      <View style={{ marginBottom: 24 }}>
        {INTENTIONS.map(({ value: v, label }) => {
          const active = value === v;
          return (
            <Pressable
              key={v}
              onPress={() => onChange(v)}
              style={[
                styles.optionRow,
                active && { backgroundColor: C.ink, borderColor: C.ink },
              ]}
            >
              <Text
                style={[
                  styles.optionLabel,
                  active && { color: C.paper },
                ]}
              >
                {label}
              </Text>
              {active ? <Feather name="check" size={14} color={C.paper} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={onContinue}
        disabled={!value}
        style={[styles.continueBtn, !value && { opacity: 0.4 }]}
      >
        <Text style={styles.continueBtnLabel}>Continue</Text>
        <Feather name="arrow-right" size={14} color={C.paper} />
      </Pressable>
    </View>
  );
}

// ─── Step 2: Tone ──────────────────────────────────────────────────────
function ToneStep({ value, onChange, onContinue }) {
  return (
    <View>
      <Text style={styles.stepTitle}>How would you like guidance?</Text>
      <Text style={styles.stepSub}>You can change this later in settings.</Text>

      <View style={{ marginBottom: 24 }}>
        {TONES.map(({ value: v, label, description }) => {
          const active = value === v;
          return (
            <Pressable
              key={v}
              onPress={() => onChange(v)}
              style={[
                styles.toneCard,
                active && { backgroundColor: C.ink, borderColor: C.ink },
              ]}
            >
              <View style={styles.toneCardHead}>
                <Text
                  style={[styles.toneLabel, { color: active ? C.paper : C.ink }]}
                >
                  {label}
                </Text>
                {active ? <Feather name="check" size={14} color={C.paper} /> : null}
              </View>
              <Text
                style={[
                  styles.toneDescription,
                  { color: active ? 'rgba(251,246,236,0.75)' : C.inkSoft },
                ]}
              >
                {description}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={onContinue}
        disabled={!value}
        style={[styles.continueBtn, !value && { opacity: 0.4 }]}
      >
        <Text style={styles.continueBtnLabel}>Continue</Text>
        <Feather name="arrow-right" size={14} color={C.paper} />
      </Pressable>
    </View>
  );
}

// ─── Step 3: Reminder ──────────────────────────────────────────────────
function ReminderStep({ value, onChange, onFinish, saving, error }) {
  return (
    <View>
      <Text style={styles.stepTitle}>A small daily nudge?</Text>
      <Text style={styles.stepSub}>
        We don't send notifications yet, but we can surface a gentle in-app
        reminder when you next open GitaFlow.
      </Text>

      <View style={{ marginBottom: 24 }}>
        <Pressable
          onPress={() => onChange(true)}
          style={[
            styles.reminderCard,
            value === true && { backgroundColor: C.ink, borderColor: C.ink },
          ]}
        >
          <Feather
            name="bell"
            size={18}
            color={value === true ? C.paper : C.ink}
          />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text
              style={[
                styles.reminderLabel,
                { color: value === true ? C.paper : C.ink },
              ]}
            >
              Yes, gently remind me
            </Text>
            <Text
              style={[
                styles.reminderDesc,
                { color: value === true ? 'rgba(251,246,236,0.7)' : C.inkMute },
              ]}
            >
              Once a day at most
            </Text>
          </View>
          {value === true ? (
            <Feather name="check" size={14} color={C.paper} />
          ) : null}
        </Pressable>

        <Pressable
          onPress={() => onChange(false)}
          style={[
            styles.reminderCard,
            value === false && { backgroundColor: C.ink, borderColor: C.ink },
          ]}
        >
          <Feather
            name="bell-off"
            size={18}
            color={value === false ? C.paper : C.ink}
          />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text
              style={[
                styles.reminderLabel,
                { color: value === false ? C.paper : C.ink },
              ]}
            >
              No, I'll come on my own
            </Text>
            <Text
              style={[
                styles.reminderDesc,
                { color: value === false ? 'rgba(251,246,236,0.7)' : C.inkMute },
              ]}
            >
              Equally welcome
            </Text>
          </View>
          {value === false ? (
            <Feather name="check" size={14} color={C.paper} />
          ) : null}
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        onPress={onFinish}
        disabled={saving}
        style={[styles.continueBtn, saving && { opacity: 0.4 }]}
      >
        <Text style={styles.continueBtnLabel}>
          {saving ? 'Saving…' : 'Enter GitaFlow'}
        </Text>
        {!saving ? <Feather name="arrow-right" size={14} color={C.paper} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 80,
    minHeight: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: { height: 6, borderRadius: 3 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 24 },
  backLabel: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.inkSoft },

  // Welcome — verse hero layout
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  brandDotSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  brandWord: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 16,
    color: C.ink,
    letterSpacing: -0.3,
  },
  verseBlock: { marginBottom: 28 },
  verseKicker: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    letterSpacing: 2.2,
    color: C.gold,
    marginBottom: 14,
  },
  verseSanskrit: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 17,
    lineHeight: 29,
    color: C.ink,
    marginBottom: 12,
  },
  verseTranslit: {
    fontFamily: 'DMSans_400Regular',
    fontStyle: 'italic',
    fontSize: 12,
    color: C.inkMute,
    marginBottom: 16,
  },
  verseTranslation: {
    fontFamily: 'Fraunces_300Light_Italic',
    fontStyle: 'italic',
    fontSize: 18,
    lineHeight: 26,
    color: C.inkSoft,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(31,24,20,0.10)',
    marginBottom: 20,
  },
  welcomeTitleSmall: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 26,
    lineHeight: 30,
    color: C.ink,
    marginBottom: 8,
  },
  welcomeSubtitleSmall: {
    fontFamily: 'Fraunces_300Light',
    fontSize: 16,
    lineHeight: 23,
    color: C.inkSoft,
    marginBottom: 28,
  },
  beginBtnInline: {
    backgroundColor: C.ink,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  welcomeFootnoteWarm: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11.5,
    lineHeight: 17,
    color: C.inkMute,
  },

  // Welcome — old centered layout (kept in case we want to revert)
  welcomeWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
  },
  brandDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 36,
    lineHeight: 40,
    color: C.ink,
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeSubtitle: {
    fontFamily: 'Fraunces_300Light_Italic',
    fontStyle: 'italic',
    fontSize: 18,
    lineHeight: 26,
    color: C.inkSoft,
    textAlign: 'center',
    marginBottom: 40,
    maxWidth: 320,
  },
  beginBtn: {
    backgroundColor: C.ink,
    borderRadius: 8,
    paddingHorizontal: 36,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  beginBtnLabel: { color: C.paper, fontFamily: 'DMSans_400Regular', fontSize: 15 },
  welcomeFootnote: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: C.inkMute },

  // Step heading
  stepTitle: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 28,
    lineHeight: 32,
    color: C.ink,
    marginBottom: 8,
  },
  stepSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: C.inkMute,
    marginBottom: 32,
  },

  // Single-line option (intention)
  optionRow: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(31,24,20,0.18)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  optionLabel: { fontFamily: 'DMSans_400Regular', fontSize: 14.5, color: C.ink, flex: 1 },

  // Tone option (with description)
  toneCard: {
    backgroundColor: C.paper,
    borderColor: 'rgba(31,24,20,0.10)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 18,
    marginBottom: 12,
  },
  toneCardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  toneLabel: { fontFamily: 'Fraunces_400Regular', fontSize: 17 },
  toneDescription: { fontFamily: 'DMSans_400Regular', fontSize: 12.5, lineHeight: 19 },

  // Reminder option
  reminderCard: {
    backgroundColor: C.paper,
    borderColor: 'rgba(31,24,20,0.10)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reminderLabel: { fontFamily: 'Fraunces_400Regular', fontSize: 16 },
  reminderDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12 },

  // Continue button
  continueBtn: {
    backgroundColor: C.ink,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueBtnLabel: { color: C.paper, fontFamily: 'DMSans_400Regular', fontSize: 14 },

  error: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: C.rust, marginBottom: 12 },
});
