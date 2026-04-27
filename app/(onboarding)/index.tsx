/**
 * GBECHE — Onboarding
 * 5 étapes avec animations Reanimated complètes.
 * Motion design : slide, fade, scale, particle effects.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  SlideOutLeft,
  Easing,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { MMKV } from 'react-native-mmkv';

import { useTheme } from '@/src/theme/ThemeContext';
import { useTranslation } from '@/src/i18n/I18nProvider';
import { hashAndStorePin, requestBiometric } from '@/src/services/crypto';

const { width: W, height: H } = Dimensions.get('window');
const storage = new MMKV({ id: 'gbeche-onboarding' });

// ─── Step Configs ─────────────────────────────────────────

interface StepConfig {
  phase:    string;
  icon:     keyof typeof Ionicons.glyphMap;
  iconColor:string;
  title:    string;
  subtitle: string;
  cta:      string;
  gradient: [string, string];
  accent:   string;
}

const STEPS: StepConfig[] = [
  {
    phase:    'PHASE 01',
    icon:     'flash',
    iconColor:'#00E5FF',
    title:    'LE CHAOS\nS\'ARRÊTE ICI',
    subtitle: 'GBECHE transforme ta vie en battlefield. Tes objectifs deviennent des Guerres. Tes tâches, des Adversaires à vaincre.',
    cta:      'Prendre le commandement',
    gradient: ['#00E5FF22', 'transparent'],
    accent:   '#00E5FF',
  },
  {
    phase:    'PHASE 02',
    icon:     'shield-checkmark',
    iconColor:'#00FF88',
    title:    'LA\nFORTERESSE',
    subtitle: 'Tes données restent sur ton appareil. Chiffrement AES-256. Aucun serveur. Aucun cloud. Tu gardes le contrôle total.',
    cta:      'Sécuriser ma forteresse',
    gradient: ['#00FF8822', 'transparent'],
    accent:   '#00FF88',
  },
  {
    phase:    'PHASE 03',
    icon:     'cash',
    iconColor:'#FFD700',
    title:    'LE\nRECENSEMENT',
    subtitle: 'Initialisons ton arsenal financier. MTN MoMo, Wave, Cash — chaque ressource compte dans la guerre.',
    cta:      'Établir mon bilan',
    gradient: ['#FFD70022', 'transparent'],
    accent:   '#FFD700',
  },
  {
    phase:    'PHASE 04',
    icon:     'flag',
    iconColor:'#FF6B35',
    title:    'DÉCLARATION\nDE GUERRE',
    subtitle: 'Choisis ton premier théâtre d\'opérations. Santé, Finance, Carrière — où attaques-tu en premier ?',
    cta:      'Choisir mon front',
    gradient: ['#FF6B3522', 'transparent'],
    accent:   '#FF6B35',
  },
  {
    phase:    'PHASE 05',
    icon:     'rocket',
    iconColor:'#A78BFA',
    title:    'EN\nBATAILLE !',
    subtitle: 'Ton QG est prêt. Active le suivi de temps et reçois tes ordres de mission chaque matin à 6h30.',
    cta:      'Entrer dans la bataille',
    gradient: ['#A78BFA22', 'transparent'],
    accent:   '#A78BFA',
  },
];

// ─── Domain Selector (Step 4) ─────────────────────────────

const DOMAINS = [
  { id: 'sante',    label: 'Santé',    icon: 'fitness',     color: '#00FF88' },
  { id: 'finance',  label: 'Finance',  icon: 'cash',        color: '#FFD700' },
  { id: 'carriere', label: 'Carrière', icon: 'briefcase',   color: '#00E5FF' },
  { id: 'famille',  label: 'Famille',  icon: 'people',      color: '#FF6B35' },
  { id: 'spirit',   label: 'Spirituel',icon: 'leaf',        color: '#A78BFA' },
  { id: 'educ',     label: 'Éducation',icon: 'school',      color: '#FF9F43' },
];

// ─── Particle ─────────────────────────────────────────────

function Particle({ color, delay }: { color: string; delay: number }) {
  const x   = useSharedValue(Math.random() * W);
  const y   = useSharedValue(H * 0.3 + Math.random() * H * 0.4);
  const op  = useSharedValue(0);
  const sc  = useSharedValue(0.5);

  useEffect(() => {
    op.value  = withDelay(delay, withSequence(
      withTiming(0.7, { duration: 600 }),
      withTiming(0,   { duration: 1200 }),
    ));
    y.value   = withDelay(delay, withTiming(y.value - 80, { duration: 1800 }));
    sc.value  = withDelay(delay, withSpring(1.2));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity:   op.value,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: sc.value },
    ],
  }));

  return (
    <Animated.View style={[styles.particle, { backgroundColor: color }, style]} />
  );
}

// ─── Step Slide ───────────────────────────────────────────

interface StepSlideProps {
  config:   StepConfig;
  step:     number;
  onNext:   () => void;
  children?: React.ReactNode;
}

function StepSlide({ config, step, onNext, children }: StepSlideProps) {
  const scale  = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value  = withSpring(1, { damping: 18, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 300 });
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  // Icon pulse
  const iconScale = useSharedValue(1);
  useEffect(() => {
    iconScale.value = withSequence(
      withDelay(400, withSpring(1.15, { damping: 10 })),
      withSpring(1, { damping: 15 }),
    );
  }, []);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <Animated.View style={[styles.slide, containerStyle]}>
      {/* Glow bloom */}
      <View style={[styles.bloom, { backgroundColor: config.accent + '18' }]} />

      {/* Phase label */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <Text style={[styles.phase, { color: config.accent }]}>{config.phase}</Text>
      </Animated.View>

      {/* Icon */}
      <Animated.View style={[styles.iconWrap, { borderColor: config.accent + '44', backgroundColor: config.accent + '18' }, iconStyle]}>
        <Ionicons name={config.icon} size={52} color={config.accent} />
      </Animated.View>

      {/* Title */}
      <Animated.Text
        entering={FadeInDown.delay(200).duration(500)}
        style={styles.title}
      >
        {config.title}
      </Animated.Text>

      {/* Subtitle */}
      <Animated.Text
        entering={FadeInDown.delay(350).duration(500)}
        style={styles.subtitle}
      >
        {config.subtitle}
      </Animated.Text>

      {/* Custom children (e.g. PIN input, domain picker) */}
      {children}

      {/* CTA */}
      <Animated.View
        entering={FadeInUp.delay(500).duration(400)}
        style={styles.ctaWrap}
      >
        <Pressable onPress={onNext} style={styles.ctaBtn}>
          <LinearGradient
            colors={[config.accent, config.accent + 'BB']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.ctaInner}
          >
            <Text style={styles.ctaText}>{config.cta.toUpperCase()}</Text>
            <Ionicons name="arrow-forward" size={18} color="#000" style={{ marginLeft: 8 }} />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

// ─── PIN Input (Step 2) ───────────────────────────────────

function PINSetup({ onComplete }: { onComplete: () => void }) {
  const [pin,    setPin]    = useState('');
  const [confirm, setConf]  = useState('');
  const [phase,  setPhase]  = useState<'enter' | 'confirm'>('enter');
  const [error,  setError]  = useState('');

  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const doShake = () => {
    shake.value = withSequence(
      withTiming(-10, { duration: 60 }),
      withTiming(10,  { duration: 60 }),
      withTiming(-8,  { duration: 60 }),
      withTiming(8,   { duration: 60 }),
      withTiming(0,   { duration: 60 }),
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const handleDigit = (d: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (phase === 'enter') {
      const next = pin + d;
      setPin(next);
      if (next.length === 4) setPhase('confirm');
    } else {
      const next = confirm + d;
      setConf(next);
      if (next.length === 4) {
        if (next === pin) {
          hashAndStorePin(pin).then(onComplete);
        } else {
          setError('Les codes ne correspondent pas');
          doShake();
          setTimeout(() => { setConf(''); setPin(''); setPhase('enter'); setError(''); }, 1200);
        }
      }
    }
  };

  const handleDel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (phase === 'enter') setPin(p => p.slice(0, -1));
    else setConf(c => c.slice(0, -1));
  };

  const current = phase === 'enter' ? pin : confirm;
  const DIGITS  = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']];

  return (
    <Animated.View style={[styles.pinWrap, shakeStyle]}>
      <Text style={styles.pinLabel}>
        {phase === 'enter' ? 'Crée ton code PIN (4 chiffres)' : 'Confirme ton code PIN'}
      </Text>
      <View style={styles.pinDots}>
        {Array.from({ length: 4 }, (_, i) => (
          <View key={i} style={[
            styles.pinDot,
            { backgroundColor: i < current.length ? '#00FF88' : 'rgba(255,255,255,0.15)' },
          ]} />
        ))}
      </View>
      {error ? <Text style={styles.pinError}>{error}</Text> : null}
      {DIGITS.map((row, ri) => (
        <View key={ri} style={styles.pinRow}>
          {row.map((d, ci) => (
            d === '' ? <View key={ci} style={styles.pinKey} /> :
            <Pressable key={ci} onPress={() => d === '⌫' ? handleDel() : handleDigit(d)} style={styles.pinKey}>
              {({ pressed }) => (
                <View style={[styles.pinKeyInner, { opacity: pressed ? 0.6 : 1 }]}>
                  <Text style={styles.pinKeyText}>{d}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </Animated.View>
  );
}

// ─── Domain Picker (Step 4) ────────────────────────────────

function DomainPicker({ onSelect }: { onSelect: (id: string) => void }) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    onSelect(id);
  };

  return (
    <View style={styles.domainGrid}>
      {DOMAINS.map((d, i) => {
        const sel = selected.includes(d.id);
        return (
          <Animated.View key={d.id} entering={FadeInDown.delay(i * 80).duration(400)}>
            <Pressable
              onPress={() => toggle(d.id)}
              style={[
                styles.domainItem,
                {
                  borderColor:     sel ? d.color : 'rgba(255,255,255,0.1)',
                  backgroundColor: sel ? d.color + '22' : 'rgba(255,255,255,0.04)',
                },
              ]}
            >
              <Ionicons name={d.icon as any} size={24} color={sel ? d.color : '#888'} />
              <Text style={[styles.domainLabel, { color: sel ? d.color : '#888' }]}>
                {d.label}
              </Text>
              {sel && <Ionicons name="checkmark-circle" size={14} color={d.color} style={{ position: 'absolute', top: 8, right: 8 }} />}
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

// ─── Main Onboarding ──────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pinDone, setPinDone]   = useState(false);
  const [domainSel, setDomainSel] = useState('');

  // Progress bar animated
  const progWidth = useSharedValue(0);
  useEffect(() => {
    progWidth.value = withTiming((step + 1) / 5, { duration: 400 });
  }, [step]);
  const progStyle = useAnimatedStyle(() => ({
    width: `${progWidth.value * 100}%`,
  }));

  const handleNext = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (step === 1 && !pinDone) {
      // PIN not yet done, do nothing (PINSetup handles it)
      return;
    }

    if (step < 4) {
      setStep(s => s + 1);
    } else {
      // Done — mark onboarding complete
      storage.set('done', true);
      router.replace('/(app)/home');
    }
  }, [step, pinDone]);

  const goBack = () => {
    if (step > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(s => s - 1);
    }
  };

  const cfg = STEPS[step];

  return (
    <View style={styles.root}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#0A0B10', '#070912']}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating particles on step 4 (victory) */}
      {step === 4 && Array.from({ length: 8 }, (_, i) => (
        <Particle key={i} color={cfg.accent} delay={i * 150} />
      ))}

      {/* Back button */}
      {step > 0 && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.backBtn}>
          <Pressable onPress={goBack}>
            <Ionicons name="arrow-back" size={24} color="rgba(255,255,255,0.5)" />
          </Pressable>
        </Animated.View>
      )}

      {/* Step indicator dots */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dotItem,
              {
                backgroundColor: i === step ? cfg.accent : 'rgba(255,255,255,0.15)',
                width: i === step ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Main slide */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <StepSlide config={cfg} step={step} onNext={handleNext}>
          {/* Step 2: PIN setup */}
          {step === 1 && !pinDone && (
            <PINSetup onComplete={() => {
              setPinDone(true);
              setTimeout(() => setStep(2), 300);
            }} />
          )}

          {/* Step 4: Domain picker */}
          {step === 3 && (
            <DomainPicker onSelect={setDomainSel} />
          )}
        </StepSlide>
      </ScrollView>

      {/* Bottom progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { backgroundColor: cfg.accent }, progStyle]} />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: '#0A0B10',
  },
  scroll: {
    flexGrow:       1,
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  slide: {
    alignItems: 'center',
    paddingTop: 20,
  },
  bloom: {
    position:     'absolute',
    top:          -60,
    width:        W * 0.8,
    height:       W * 0.8,
    borderRadius: W * 0.4,
    alignSelf:    'center',
    opacity:      0.6,
  },
  phase: {
    fontSize:     11,
    fontWeight:   '900',
    letterSpacing: 3,
    marginBottom: 24,
  },
  iconWrap: {
    width:          96,
    height:         96,
    borderRadius:   32,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    1,
    marginBottom:   28,
  },
  title: {
    fontSize:     36,
    fontWeight:   '900',
    color:        '#EEF0FF',
    textAlign:    'center',
    letterSpacing:-1.5,
    lineHeight:   40,
    marginBottom: 16,
  },
  subtitle: {
    fontSize:   15,
    color:      'rgba(238,240,255,0.55)',
    textAlign:  'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  ctaWrap:  { width: '100%', marginTop: 8 },
  ctaBtn:   { borderRadius: 16, overflow: 'hidden' },
  ctaInner: {
    paddingVertical:   16,
    paddingHorizontal: 28,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
  },
  ctaText: {
    fontSize:     14,
    fontWeight:   '900',
    color:        '#000',
    letterSpacing: 0.5,
  },

  // Progress
  progressTrack: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    height:          3,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressFill: {
    height:       '100%',
    borderRadius: 2,
  },

  // Dots
  dots: {
    position:       'absolute',
    top:            56,
    alignSelf:      'center',
    flexDirection:  'row',
    gap:             6,
    alignItems:     'center',
  },
  dotItem: {
    height:       8,
    borderRadius: 4,
    transition:   'width 0.3s',
  } as any,

  // Back
  backBtn: {
    position: 'absolute',
    top:      52,
    left:     20,
    zIndex:   10,
    padding:  8,
  },

  // Particle
  particle: {
    position:     'absolute',
    width:        6,
    height:       6,
    borderRadius: 3,
  },

  // PIN
  pinWrap: {
    width:      '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  pinLabel: {
    fontSize:   13,
    color:      'rgba(238,240,255,0.5)',
    marginBottom: 20,
    fontWeight: '600',
  },
  pinDots: {
    flexDirection:  'row',
    gap:            16,
    marginBottom:   24,
  },
  pinDot: {
    width:        16,
    height:       16,
    borderRadius: 8,
  },
  pinError: {
    fontSize:   12,
    color:      '#FF4757',
    marginBottom: 12,
    fontWeight: '700',
  },
  pinRow:   { flexDirection: 'row', gap: 12, marginBottom: 12 },
  pinKey:   { width: 72, height: 56, alignItems: 'center', justifyContent: 'center' },
  pinKeyInner: {
    width:           72,
    height:          56,
    borderRadius:    16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.1)',
  },
  pinKeyText: {
    fontSize:   22,
    fontWeight: '700',
    color:      '#EEF0FF',
  },

  // Domain grid
  domainGrid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:             10,
    marginBottom:   20,
    justifyContent: 'center',
  },
  domainItem: {
    width:          (W - 68) / 3,
    paddingVertical: 14,
    borderRadius:   14,
    borderWidth:    1,
    alignItems:     'center',
    gap:             6,
    position:       'relative',
  },
  domainLabel: {
    fontSize:   11,
    fontWeight: '700',
  },
});
