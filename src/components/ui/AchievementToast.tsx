/**
 * GBECHE — AchievementToast + XPModal
 * Toast d'achievement et modal de victoire.
 * Animations Reanimated + haptics.
 */

import React, { useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/src/services/haptics';
import { useTheme } from '@/src/theme/ThemeContext';
import { XPBar } from './XPBar';

const { width: W } = Dimensions.get('window');
const TOAST_WIDTH  = Math.min(W - 32, 400);

// ─── Achievement Toast ────────────────────────────────────

interface ToastProps {
  visible:     boolean;
  title:       string;
  description: string;
  icon:        string;          // Ionicons name
  rarity?:     'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
  xpReward?:   number;
  onHide?:     () => void;
}

const RARITY_CONFIG = {
  bronze:    { color: '#CD7F32', label: 'BRONZE',    glow: 'rgba(205,127,50,0.3)'  },
  silver:    { color: '#C0C0C0', label: 'ARGENT',    glow: 'rgba(192,192,192,0.3)' },
  gold:      { color: '#FFD700', label: 'OR',         glow: 'rgba(255,215,0,0.35)'  },
  platinum:  { color: '#E5E4E2', label: 'PLATINE',   glow: 'rgba(229,228,226,0.3)' },
  legendary: { color: '#A78BFA', label: 'LÉGENDAIRE',glow: 'rgba(167,139,250,0.4)' },
};

export function AchievementToast({
  visible,
  title,
  description,
  icon,
  rarity    = 'gold',
  xpReward  = 0,
  onHide,
}: ToastProps) {
  const cfg       = RARITY_CONFIG[rarity];

  const translateY = useSharedValue(-120);
  const opacity    = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      opacity.value    = withTiming(1, { duration: 250 });

      // Auto-hide après 3.5s
      translateY.value = withDelay(
        3500,
        withTiming(-120, { duration: 400, easing: Easing.in(Easing.quad) }, (done) => {
          if (done && onHide) runOnJS(onHide)();
        })
      );
      opacity.value = withDelay(3500, withTiming(0, { duration: 400 }));
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity:   opacity.value,
  }));

  return (
    <Animated.View style={[styles.toast, { borderColor: cfg.color, shadowColor: cfg.color }, style]}>
      <LinearGradient
        colors={['rgba(15,12,35,0.97)', 'rgba(7,9,17,0.97)']}
        style={styles.toastInner}
      >
        <View style={[styles.toastIconWrap, { backgroundColor: cfg.color + '22', borderColor: cfg.color + '44' }]}>
          <Ionicons name={icon as any} size={28} color={cfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.toastRarity, { color: cfg.color }]}>{cfg.label}</Text>
          <Text style={styles.toastTitle}>{title}</Text>
          <Text style={styles.toastDesc}>{description}</Text>
          {xpReward > 0 && (
            <Text style={styles.toastXP}>+{xpReward} XP</Text>
          )}
        </View>
        <Ionicons name="checkmark-circle" size={22} color={cfg.color} />
      </LinearGradient>
    </Animated.View>
  );
}

// ─── XP Victory Modal ─────────────────────────────────────

interface XPModalProps {
  visible:     boolean;
  xpGained:    number;
  multiplier?: number;
  comboText?:  string;
  xpProgress:  number;   // 0-1
  onClose:     () => void;
}

export function XPModal({
  visible,
  xpGained,
  multiplier = 1,
  comboText,
  xpProgress,
  onClose,
}: XPModalProps) {
  const { theme }  = useTheme();
  const { colors } = theme;

  const scale   = useSharedValue(0.7);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value   = withSpring(1,   { damping: 15, stiffness: 200 });
      opacity.value = withTiming(1,   { duration: 200 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      scale.value   = withSpring(0.7);
      opacity.value = withTiming(0);
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Animated.View style={animStyle}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <LinearGradient
              colors={['rgba(15,12,35,0.98)', 'rgba(7,9,17,0.98)']}
              style={[styles.xpModal, { borderColor: colors.xpDim }]}
            >
              {/* Icon */}
              <View style={styles.victoryIcon}>
                <Ionicons name="trophy" size={52} color="#A78BFA" />
              </View>

              {/* Title */}
              <Text style={styles.victoryTitle}>Adversaire Vaincu !</Text>

              {/* XP Amount */}
              <Text style={styles.xpAmount}>+{xpGained} XP</Text>

              {/* Combo */}
              {comboText && (
                <View style={styles.comboBadge}>
                  <Ionicons name="flash" size={14} color="#FFD700" />
                  <Text style={styles.comboText}>{comboText}</Text>
                </View>
              )}

              {/* Multiplier */}
              {multiplier > 1 && (
                <Text style={styles.multText}>Multiplicateur ×{multiplier.toFixed(1)}</Text>
              )}

              {/* XP Bar */}
              <View style={styles.xpBarSection}>
                <Text style={styles.xpBarLabel}>Progression vers le niveau suivant</Text>
                <XPBar progress={xpProgress} height={10} />
              </View>

              {/* CTA */}
              <Pressable onPress={onClose} style={styles.continueBtn}>
                <LinearGradient
                  colors={['#00E5FF', '#0099FF']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.continueBtnInner}
                >
                  <Text style={styles.continueBtnText}>Continuer la Bataille</Text>
                </LinearGradient>
              </Pressable>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─── Level Up Modal ───────────────────────────────────────

interface LevelUpModalProps {
  visible:   boolean;
  newLevel:  number;
  newRank:   string;
  onClose:   () => void;
}

export function LevelUpModal({ visible, newLevel, newRank, onClose }: LevelUpModalProps) {
  const scale   = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value   = withSequence(
        withSpring(1.08, { damping: 12, stiffness: 200 }),
        withSpring(1,    { damping: 20, stiffness: 300 }),
      );
      opacity.value = withTiming(1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Animated.View style={animStyle}>
          <LinearGradient
            colors={['rgba(20,10,50,0.99)', 'rgba(7,9,17,0.99)']}
            style={[styles.xpModal, { borderColor: 'rgba(167,139,250,0.3)' }]}
          >
            <View style={[styles.victoryIcon, { backgroundColor: 'rgba(167,139,250,0.15)' }]}>
              <Ionicons name="star" size={52} color="#A78BFA" />
            </View>

            <Text style={[styles.victoryTitle, { color: '#A78BFA' }]}>NIVEAU SUPÉRIEUR !</Text>
            <Text style={styles.levelNum}>Niveau {newLevel}</Text>
            <View style={styles.comboBadge}>
              <Ionicons name="ribbon" size={14} color="#FFD700" />
              <Text style={[styles.comboText, { color: '#FFD700' }]}>{newRank}</Text>
            </View>
            <Text style={[styles.xpBarLabel, { marginTop: 12 }]}>
              Tu as atteint un nouveau rang de guerrier.
            </Text>

            <Pressable onPress={onClose} style={[styles.continueBtn, { marginTop: 20 }]}>
              <LinearGradient
                colors={['#A78BFA', '#6366F1']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.continueBtnInner}
              >
                <Text style={styles.continueBtnText}>Excellent !</Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  // Toast
  toast: {
    position:     'absolute',
    top:          0,
    alignSelf:    'center',
    width:        TOAST_WIDTH,
    borderRadius: 20,
    borderWidth:  1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity:0.6,
    shadowRadius: 20,
    elevation:    20,
    zIndex:       999,
  },
  toastInner: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            14,
    padding:        16,
    borderRadius:   20,
  },
  toastIconWrap: {
    width:        52,
    height:       52,
    borderRadius: 16,
    alignItems:   'center',
    justifyContent:'center',
    borderWidth:  1,
    flexShrink:   0,
  },
  toastRarity: {
    fontSize:     9,
    fontWeight:   '800',
    letterSpacing:1.5,
    marginBottom: 2,
  },
  toastTitle: {
    fontSize:     15,
    fontWeight:   '800',
    color:        '#EEF0FF',
    marginBottom: 2,
  },
  toastDesc:  { fontSize: 12, color: 'rgba(238,240,255,0.55)', lineHeight: 16 },
  toastXP:    { fontSize: 12, fontWeight: '800', color: '#A78BFA', marginTop: 3 },

  // XP Modal
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         20,
  },
  xpModal: {
    borderRadius: 28,
    borderWidth:  1,
    padding:      28,
    alignItems:   'center',
    width:        Math.min(W - 40, 380),
  },
  victoryIcon: {
    width:          88,
    height:         88,
    borderRadius:   44,
    backgroundColor:'rgba(167,139,250,0.12)',
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   16,
  },
  victoryTitle: {
    fontSize:     22,
    fontWeight:   '900',
    color:        '#00FF88',
    letterSpacing:-0.5,
    marginBottom: 8,
  },
  xpAmount: {
    fontSize:     48,
    fontWeight:   '900',
    color:        '#A78BFA',
    letterSpacing:-2,
    lineHeight:   52,
    marginBottom: 8,
  },
  comboBadge: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            5,
    backgroundColor:'rgba(255,215,0,0.12)',
    borderRadius:   20,
    paddingHorizontal:10,
    paddingVertical:  4,
    marginBottom:   8,
  },
  comboText:  { fontSize: 12, fontWeight: '800', color: '#FFD700' },
  multText:   { fontSize: 13, color: 'rgba(238,240,255,0.55)', marginBottom: 16 },
  xpBarSection:{ width: '100%', marginBottom: 20 },
  xpBarLabel: { fontSize: 11, color: 'rgba(238,240,255,0.45)', marginBottom: 8, textAlign: 'center', fontWeight: '600', letterSpacing: 0.5 },

  continueBtn:     { width: '100%', borderRadius: 14, overflow: 'hidden' },
  continueBtnInner:{ paddingVertical: 14, alignItems: 'center' },
  continueBtnText: { fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: -0.2 },

  levelNum: { fontSize: 42, fontWeight: '900', color: '#EEF0FF', letterSpacing: -2, marginTop: 4 },
});
