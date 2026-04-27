/**
 * GBECHE — PIN Lock Screen
 * Déverrouillage via PIN 4 chiffres + biométrie.
 * Reanimated shake animation on wrong PIN.
 */

import React, { useState, useEffect } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';

import { verifyPin, requestBiometric } from '@/src/services/crypto';

const { width: W } = Dimensions.get('window');

const DIGITS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['',  '0', '⌫'],
];

export default function PinScreen() {
  const router = useRouter();
  const [pin, setPin]       = useState('');
  const [error, setError]   = useState('');
  const [attempts, setAttempts] = useState(0);
  const [bioAvail, setBioAvail] = useState(false);

  const shake   = useSharedValue(0);
  const dotsOp  = useSharedValue(1);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().then(has => {
      if (has) LocalAuthentication.isEnrolledAsync().then(setBioAvail);
    });
    // Auto-try biometric on mount
    tryBiometric();
  }, []);

  const tryBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:     'Déverrouille GBECHE',
        fallbackLabel:     'Utiliser le PIN',
        disableDeviceFallback: false,
      });
      if (result.success) {
        router.replace('/(app)/home');
      }
    } catch {}
  };

  const doShake = () => {
    shake.value = withSequence(
      withTiming(-14, { duration: 60 }),
      withTiming(14,  { duration: 60 }),
      withTiming(-10, { duration: 60 }),
      withTiming(10,  { duration: 60 }),
      withTiming(-6,  { duration: 60 }),
      withTiming(0,   { duration: 60 }),
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const handleDigit = async (d: string) => {
    if (d === '') return;
    if (d === '⌫') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPin(p => p.slice(0, -1));
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = pin + d;
    setPin(next);

    if (next.length === 4) {
      const ok = await verifyPin(next);
      if (ok) {
        router.replace('/(app)/home');
      } else {
        doShake();
        const a = attempts + 1;
        setAttempts(a);
        setError(a >= 5 ? 'Trop de tentatives. Attends 30s.' : 'PIN incorrect');
        setTimeout(() => { setPin(''); setError(''); }, 800);
      }
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0A0B10', '#070912']}
        style={StyleSheet.absoluteFill}
      />

      {/* Bloom */}
      <View style={styles.bloom} />

      {/* Logo */}
      <Animated.View entering={FadeIn.duration(500)} style={styles.logo}>
        <LinearGradient
          colors={['#00E5FF', '#A78BFA']}
          style={styles.logoGrad}
        >
          <Ionicons name="flash" size={28} color="#000" />
        </LinearGradient>
        <Text style={styles.logoText}>GBECHE</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <Text style={styles.prompt}>Ton code PIN</Text>
      </Animated.View>

      {/* PIN dots */}
      <Animated.View style={[styles.dotsRow, shakeStyle]}>
        {Array.from({ length: 4 }, (_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i < pin.length ? '#00E5FF' : 'rgba(255,255,255,0.15)' },
            ]}
          />
        ))}
      </Animated.View>

      {error ? (
        <Animated.Text entering={FadeIn.duration(200)} style={styles.error}>
          {error}
        </Animated.Text>
      ) : (
        <View style={{ height: 20 }} />
      )}

      {/* Keypad */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.keypad}>
        {DIGITS.map((row, ri) => (
          <View key={ri} style={styles.keyRow}>
            {row.map((d, ci) => (
              d === '' ? <View key={ci} style={styles.key} /> :
              <Pressable key={ci} onPress={() => handleDigit(d)}>
                {({ pressed }) => (
                  <View style={[
                    styles.keyInner,
                    {
                      backgroundColor: pressed
                        ? 'rgba(0,229,255,0.12)'
                        : 'rgba(255,255,255,0.06)',
                      borderColor: pressed ? '#00E5FF44' : 'rgba(255,255,255,0.08)',
                    },
                  ]}>
                    {d === '⌫'
                      ? <Ionicons name="backspace" size={20} color="#888" />
                      : <Text style={styles.keyText}>{d}</Text>
                    }
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </Animated.View>

      {/* Biometric button */}
      {bioAvail && (
        <Animated.View entering={FadeInDown.delay(500).duration(400)}>
          <Pressable onPress={tryBiometric} style={styles.bioBtn}>
            <Ionicons name="finger-print" size={28} color="rgba(0,229,255,0.7)" />
            <Text style={styles.bioLabel}>Déverrouiller avec biométrie</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    backgroundColor:'#0A0B10',
  },
  bloom: {
    position:     'absolute',
    top:          '10%',
    width:        W * 0.7,
    height:       W * 0.7,
    borderRadius: W * 0.35,
    backgroundColor: 'rgba(0,229,255,0.06)',
    alignSelf:    'center',
  },
  logo: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
    marginBottom:   40,
  },
  logoGrad: {
    width:        44,
    height:       44,
    borderRadius: 14,
    alignItems:   'center',
    justifyContent:'center',
  },
  logoText: {
    fontSize:     22,
    fontWeight:   '900',
    color:        '#EEF0FF',
    letterSpacing:-1,
  },
  prompt: {
    fontSize:     16,
    fontWeight:   '700',
    color:        'rgba(238,240,255,0.5)',
    marginBottom: 28,
    letterSpacing: 0.5,
  },
  dotsRow: {
    flexDirection: 'row',
    gap:           18,
    marginBottom:  8,
  },
  dot: {
    width:        18,
    height:       18,
    borderRadius: 9,
  },
  error: {
    fontSize:   12,
    color:      '#FF4757',
    fontWeight: '700',
    height:     20,
    marginBottom: 8,
  },
  keypad: { gap: 12, marginTop: 16 },
  keyRow: { flexDirection: 'row', gap: 16 },
  key:    { width: 80, height: 72 },
  keyInner: {
    width:          80,
    height:         72,
    borderRadius:   20,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    1,
  },
  keyText: {
    fontSize:   26,
    fontWeight: '600',
    color:      '#EEF0FF',
  },
  bioBtn: {
    marginTop:   32,
    alignItems:  'center',
    gap:         8,
  },
  bioLabel: {
    fontSize:   12,
    color:      'rgba(0,229,255,0.6)',
    fontWeight: '700',
  },
});
