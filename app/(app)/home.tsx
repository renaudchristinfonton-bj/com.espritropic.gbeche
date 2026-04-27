/**
 * GBECHE — Dashboard "Quartier Général"
 * Écran principal : stats warrior, missions, tâches du jour, radar, finances.
 * Thème + i18n + Ionicons (0 emojis) + Reanimated animations.
 */

import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/src/theme/ThemeContext';
import { useTranslation } from '@/src/i18n/I18nProvider';
import { useAppStore } from '@/src/store';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { XPBar, ProgressRing, XPFloat } from '@/src/components/ui/XPBar';
import { AchievementToast, XPModal } from '@/src/components/ui/AchievementToast';
import { RadarChart, type RadarAxis } from '@/src/components/charts/RadarChart';

const { width: W } = Dimensions.get('window');

// ─── Task data ────────────────────────────────────────────

interface Task {
  id:    number;
  title: string;
  war:   string;
  xp:    number;
  done:  boolean;
  hour:  string;
  color: string;
  icon:  keyof typeof Ionicons.glyphMap;
}

const TODAY_TASKS: Task[] = [
  { id:1, title:'Séance de sport 30min',    war:'Santé',      xp:150, done:false, hour:'07:00', color:'#00FF88', icon:'fitness' },
  { id:2, title:'Tracker dépenses du jour', war:'Finance',    xp:80,  done:false, hour:'20:00', color:'#FFD700', icon:'cash' },
  { id:3, title:'30 min Deep Work',         war:'Carrière',   xp:200, done:true,  hour:'09:00', color:'#00E5FF', icon:'laptop' },
  { id:4, title:'Méditation 10 min',        war:'Spirituel',  xp:100, done:false, hour:'06:30', color:'#A78BFA', icon:'leaf' },
  { id:5, title:'Lire 20 pages',            war:'Éducation',  xp:120, done:false, hour:'21:00', color:'#FF9F43', icon:'book' },
];

const RADAR_AXES: RadarAxis[] = [
  { label: 'Finance',   value: 72, color: '#FFD700' },
  { label: 'Santé',     value: 85, color: '#00FF88' },
  { label: 'Carrière',  value: 90, color: '#00E5FF' },
  { label: 'Spirituel', value: 60, color: '#A78BFA' },
  { label: 'Famille',   value: 55, color: '#FF6B35' },
  { label: 'Éducation', value: 78, color: '#FF9F43' },
];

// ─── Task Card ────────────────────────────────────────────

function TaskCard({ task, onComplete }: { task: Task; onComplete: (id: number, xp: number) => void }) {
  const { theme } = useTheme();
  const { colors } = theme;
  const scale = useSharedValue(1);
  const [done, setDone] = useState(task.done);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (done) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(0.96, { damping: 20, stiffness: 300 }, () => {
      scale.value = withSpring(1);
    });
    setDone(true);
    onComplete(task.id, task.xp);
  };

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.taskCard,
          {
            backgroundColor: done ? task.color + '12' : colors.glass,
            borderColor:     done ? task.color + '44' : colors.glassBorder,
            opacity:         done ? 0.7 : 1,
          },
        ]}
      >
        {/* Left accent */}
        <View style={[styles.taskAccent, { backgroundColor: task.color }]} />

        {/* Icon */}
        <View style={[styles.taskIconWrap, { backgroundColor: task.color + '22' }]}>
          <Ionicons name={task.icon} size={18} color={task.color} />
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <Text style={[
            styles.taskTitle,
            { color: colors.text, textDecorationLine: done ? 'line-through' : 'none' },
          ]}>
            {task.title}
          </Text>
          <Text style={[styles.taskMeta, { color: colors.textMuted }]}>
            {task.war} · {task.hour}
          </Text>
        </View>

        {/* XP badge */}
        <View style={[styles.xpBadge, { backgroundColor: task.color + '22' }]}>
          <Text style={[styles.xpBadgeText, { color: task.color }]}>+{task.xp}</Text>
        </View>

        {/* Checkmark */}
        <Ionicons
          name={done ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={done ? task.color : colors.glassBorder}
        />
      </Pressable>
    </Animated.View>
  );
}

// ─── Mission Card ─────────────────────────────────────────

function MissionCard({
  title, desc, progress, total, reward, color, icon,
}: {
  title:string; desc:string; progress:number; total:number; reward:number; color:string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const { theme } = useTheme();
  const pct = progress / total;

  return (
    <GlassCard accentColor={color} style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={[styles.missionIcon, { backgroundColor: color + '22' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.missionTitle, { color: theme.colors.text }]}>{title}</Text>
          <Text style={[styles.missionDesc, { color: theme.colors.textMuted }]}>{desc}</Text>
        </View>
        <View style={[styles.rewardBadge, { backgroundColor: color + '22' }]}>
          <Ionicons name="star" size={10} color={color} />
          <Text style={[styles.rewardText, { color }]}>{reward} XP</Text>
        </View>
      </View>
      <XPBar progress={pct} height={6} color={[color, color + 'BB']} />
      <Text style={[styles.missionProgress, { color: theme.colors.textMuted }]}>
        {progress}/{total} · {Math.round(pct * 100)}%
      </Text>
    </GlassCard>
  );
}

// ─── Main Screen ──────────────────────────────────────────

export default function HomeScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { colors } = theme;

  const warrior      = useAppStore(s => s.warrior);
  const missions     = useAppStore(s => s.dailyMissions);
  const completeTask = useAppStore(s => s.completeTask);
  const xpModalVisible = useAppStore(s => s.showXpModal);
  const xpGained     = useAppStore(s => s.lastXpGained);
  const closeXpModal = useAppStore(s => s.closeXpModal);

  const [tasks, setTasks]         = useState(TODAY_TASKS);
  const [xpFloat, setXpFloat]     = useState({ visible: false, amount: 0, mult: 1 });
  const [toast, setToast]         = useState({ visible: false, title: '', desc: '', icon: 'trophy' as keyof typeof Ionicons.glyphMap });

  const handleComplete = useCallback((id: number, xp: number) => {
    completeTask(xp);
    setXpFloat({ visible: true, amount: xp, mult: warrior.combo > 1 ? Math.min(1 + warrior.combo * 0.2, 2.5) : 1 });
    setTimeout(() => setXpFloat(f => ({ ...f, visible: false })), 1000);

    // Check random achievement toast
    if (Math.random() < 0.3) {
      setToast({ visible: true, title: 'Adversaire Vaincu !', desc: `+${xp} XP gagnés`, icon: 'checkmark-circle' });
    }
  }, [completeTask, warrior.combo]);

  const xpProgress = warrior.xp / warrior.xpNext;
  const completedToday = tasks.filter(t => t.done).length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Achievement Toast (absolute top) */}
      <AchievementToast
        visible={toast.visible}
        title={toast.title}
        description={toast.desc}
        icon={toast.icon}
        rarity="gold"
        xpReward={80}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />

      {/* XP float */}
      <View style={styles.xpFloatContainer} pointerEvents="none">
        <XPFloat visible={xpFloat.visible} amount={xpFloat.amount} mult={xpFloat.mult} />
      </View>

      {/* XP Victory Modal */}
      <XPModal
        visible={xpModalVisible}
        xpGained={xpGained}
        multiplier={warrior.combo > 1 ? Math.min(1 + warrior.combo * 0.2, 2.5) : 1}
        comboText={warrior.combo > 1 ? `Combo ×${warrior.combo}` : undefined}
        xpProgress={xpProgress}
        onClose={closeXpModal}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────── */}
        <LinearGradient
          colors={['rgba(0,229,255,0.08)', 'transparent']}
          style={styles.headerGrad}
        >
          <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
            <View>
              <Text style={[styles.greet, { color: colors.textMuted }]}>Quartier Général</Text>
              <Text style={[styles.name, { color: colors.text }]}>
                Guerrier Niv. {warrior.level}
              </Text>
              <Text style={[styles.rank, { color: '#00E5FF' }]}>{warrior.rank}</Text>
            </View>

            {/* XP Ring */}
            <View style={{ alignItems: 'center' }}>
              <ProgressRing
                size={70}
                progress={xpProgress}
                strokeWidth={6}
                label={String(warrior.level)}
                sublabel="NIV"
                color="#00E5FF"
              />
            </View>
          </Animated.View>

          {/* Stats row */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsRow}>
            {[
              { label: 'Victoires',  value: warrior.wins,    color: '#00FF88', icon: 'trophy' as const },
              { label: 'Défaites',   value: warrior.losses,  color: '#FF4757', icon: 'skull' as const },
              { label: 'Streak',     value: warrior.streak,  color: '#FFD700', icon: 'flame' as const },
              { label: 'Médailles',  value: warrior.medals,  color: '#A78BFA', icon: 'ribbon' as const },
            ].map((s, i) => (
              <View key={i} style={[styles.statItem, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                <Ionicons name={s.icon} size={14} color={s.color} />
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* XP Bar */}
          <Animated.View entering={FadeInDown.delay(180).duration(400)} style={styles.xpSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={[styles.xpLabel, { color: colors.textMuted }]}>
                {warrior.xp.toLocaleString()} / {warrior.xpNext.toLocaleString()} XP
              </Text>
              <Text style={[styles.xpLabel, { color: '#00E5FF' }]}>
                {Math.round(xpProgress * 100)}%
              </Text>
            </View>
            <XPBar progress={xpProgress} height={8} />
          </Animated.View>
        </LinearGradient>

        {/* ── Daily Missions ───────────────────────── */}
        <Animated.View entering={FadeInDown.delay(220).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flag" size={16} color="#FF6B35" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Missions du jour</Text>
            <View style={styles.missionCount}>
              <Text style={styles.missionCountText}>{completedToday}/{tasks.length}</Text>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            {missions.slice(0, 3).map(m => (
              <MissionCard
                key={m.id}
                title={m.title}
                desc={m.done ? 'Accomplie !' : `${m.current}/${m.total} complétés`}
                progress={m.current}
                total={m.total}
                reward={m.xpReward}
                color={m.color}
                icon="flash"
              />
            ))}
          </View>

          {/* Bonus */}
          {completedToday === tasks.length && (
            <Animated.View entering={FadeIn.duration(400)}>
              <GlassCard accentColor="#FFD700" style={{ borderColor: '#FFD70033' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFD70022', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="star" size={22} color="#FFD700" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFD700' }}>Toutes missions accomplies !</Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>Bonus +500 XP débloqué</Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>
          )}
        </Animated.View>

        {/* ── Today's Tasks ────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(280).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list" size={16} color="#A78BFA" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Adversaires du jour</Text>
          </View>
          <View style={{ gap: 8 }}>
            {tasks.map(task => (
              <TaskCard key={task.id} task={task} onComplete={handleComplete} />
            ))}
          </View>
        </Animated.View>

        {/* ── Radar Life Balance ───────────────────── */}
        <Animated.View entering={FadeInDown.delay(340).duration(400)} style={styles.section}>
          <GlassCard>
            <View style={styles.sectionHeader}>
              <Ionicons name="radio" size={16} color="#00E5FF" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Équilibre de vie</Text>
            </View>
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <RadarChart axes={RADAR_AXES} size={200} />
            </View>
          </GlassCard>
        </Animated.View>

        {/* ── Combo indicator ──────────────────────── */}
        {warrior.combo > 1 && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.section}>
            <GlassCard accentColor="#FF6B35" style={{ borderColor: '#FF6B3533' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FF6B3522', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="flash" size={24} color="#FF6B35" />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#FF6B35' }}>
                    COMBO ×{warrior.combo}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    Multiplicateur actif · {Math.min(1 + warrior.combo * 0.2, 2.5).toFixed(1)}× XP
                  </Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* ── Streak Shield ────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.section}>
          <GlassCard accentColor="#FFD700" style={{ borderColor: '#FFD70033' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFD70022', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="flame" size={22} color="#FFD700" />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFD700' }}>
                    {warrior.streak} jours
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>Flamme de guerre</Text>
                </View>
              </View>
              {/* Shields */}
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {Array.from({ length: 3 }, (_, i) => (
                    <Ionicons
                      key={i}
                      name={i < warrior.shields ? 'shield' : 'shield-outline'}
                      size={20}
                      color={i < warrior.shields ? '#00FF88' : '#333'}
                    />
                  ))}
                </View>
                <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700' }}>
                  {warrior.shields} bouclier{warrior.shields !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1 },
  content: { paddingBottom: 20 },

  // Header
  headerGrad:  { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greet:       { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  name:        { fontSize: 22, fontWeight: '900', letterSpacing: -0.8 },
  rank:        { fontSize: 11, fontWeight: '800', marginTop: 3, letterSpacing: 0.5 },

  statsRow:    { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statItem:    { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 10, alignItems: 'center', gap: 4 },
  statValue:   { fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  statLabel:   { fontSize: 8, fontWeight: '700', letterSpacing: 0.3, textAlign: 'center' },

  xpSection:   { marginTop: 4 },
  xpLabel:     { fontSize: 11, fontWeight: '700' },

  // Sections
  section:      { paddingHorizontal: 16, marginTop: 16, gap: 10 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '900', letterSpacing: -0.3, flex: 1 },
  missionCount: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  missionCountText: { fontSize: 11, fontWeight: '800', color: '#888' },

  // Mission card
  missionIcon:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  missionTitle:   { fontSize: 13, fontWeight: '800', marginBottom: 1 },
  missionDesc:    { fontSize: 11, fontWeight: '500' },
  rewardBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  rewardText:     { fontSize: 10, fontWeight: '800' },
  missionProgress:{ fontSize: 10, fontWeight: '700', marginTop: -4 },

  // Task card
  taskCard:      { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 12, gap: 10, overflow: 'hidden' },
  taskAccent:    { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  taskIconWrap:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  taskTitle:     { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  taskMeta:      { fontSize: 10, fontWeight: '600' },
  xpBadge:       { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  xpBadgeText:   { fontSize: 11, fontWeight: '900' },

  // XP float
  xpFloatContainer: {
    position: 'absolute',
    top:      '40%',
    left:     0,
    right:    0,
    alignItems: 'center',
    zIndex:   999,
    pointerEvents: 'none',
  } as any,
});
