/**
 * GBECHE — Calendar & Tracking
 * Vue jour, heatmap 90j, mood tracker, logs santé.
 * Reanimated + SVG charts.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/src/theme/ThemeContext';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { HeatMap }   from '@/src/components/charts/HeatMap';
import { ProgressRing } from '@/src/components/ui/XPBar';

const { width: W } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────

interface TimeBlock {
  id:       string;
  hour:     number;
  label:    string;
  duration: number;   // minutes
  color:    string;
  category: string;
  completed: boolean;
}

interface MoodEntry {
  date:  string;
  score: number;  // 1-5
  note:  string;
}

interface HealthLog {
  sleep:  number;   // hours
  water:  number;   // liters
  sport:  number;   // minutes
  weight: number;   // kg
}

// ─── Seed Data ────────────────────────────────────────────

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6h→21h

const MOCK_BLOCKS: TimeBlock[] = [
  { id: '1', hour: 6,  label: 'Méditation',       duration: 20, color: '#A78BFA', category: 'Spirituel',  completed: true  },
  { id: '2', hour: 7,  label: 'Sport – Musculation',duration: 60, color: '#00FF88', category: 'Santé',     completed: true  },
  { id: '3', hour: 9,  label: 'Deep Work – Projet A',duration: 120, color: '#00E5FF', category: 'Carrière', completed: true  },
  { id: '4', hour: 12, label: 'Déjeuner',          duration: 45, color: '#FFD700', category: 'Santé',     completed: true  },
  { id: '5', hour: 14, label: 'Réunion Équipe',    duration: 60, color: '#FF6B35', category: 'Carrière',  completed: false },
  { id: '6', hour: 16, label: 'Prospection Clients',duration: 90, color: '#00E5FF', category: 'Finance',  completed: false },
  { id: '7', hour: 19, label: 'Famille – Dîner',   duration: 60, color: '#FF6B35', category: 'Famille',   completed: false },
  { id: '8', hour: 20, label: 'Lecture / Apprentissage',duration: 45, color: '#A78BFA', category: 'Éducation', completed: false },
];

const MOOD_EMOJIS = [
  { score: 1, icon: 'sad-outline' as const,     color: '#FF4757', label: 'Mauvais' },
  { score: 2, icon: 'partly-sunny-outline' as const, color: '#FF9F43', label: 'Moyen' },
  { score: 3, icon: 'happy-outline' as const,   color: '#FFD700', label: 'Ok' },
  { score: 4, icon: 'sunny-outline' as const,   color: '#00FF88', label: 'Bien' },
  { score: 5, icon: 'rocket-outline' as const,  color: '#A78BFA', label: 'Excellent' },
];

// Generate 90 days of mock heat data
const MOCK_HEAT = Array.from({ length: 90 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - i);
  return {
    date:  d.toISOString().split('T')[0],
    value: Math.floor(Math.random() * 5),
  };
});

// ─── Month mini-calendar ──────────────────────────────────

const MONTH_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const DOW_FR   = ['D','L','M','M','J','V','S'];

function MiniCalendar({ selectedDate, onSelect, accent }: {
  selectedDate: Date;
  onSelect:     (d: Date) => void;
  accent:       string;
}) {
  const [viewDate, setViewDate] = useState(new Date());

  const days = useMemo(() => {
    const year  = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = Array(first).fill(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewDate]);

  const isSame = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate();

  const isToday = (d: number) => isSame(new Date(viewDate.getFullYear(), viewDate.getMonth(), d), new Date());
  const isSel   = (d: number) => isSame(new Date(viewDate.getFullYear(), viewDate.getMonth(), d), selectedDate);

  const prevMonth = () => setViewDate(v => new Date(v.getFullYear(), v.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(v => new Date(v.getFullYear(), v.getMonth() + 1, 1));

  return (
    <View style={cal.wrap}>
      {/* Header */}
      <View style={cal.header}>
        <Pressable onPress={prevMonth}><Ionicons name="chevron-back" size={20} color="#888" /></Pressable>
        <Text style={cal.headerTitle}>
          {MONTH_FR[viewDate.getMonth()]} {viewDate.getFullYear()}
        </Text>
        <Pressable onPress={nextMonth}><Ionicons name="chevron-forward" size={20} color="#888" /></Pressable>
      </View>

      {/* Day labels */}
      <View style={cal.dowRow}>
        {DOW_FR.map((d, i) => (
          <Text key={i} style={cal.dow}>{d}</Text>
        ))}
      </View>

      {/* Days grid */}
      <View style={cal.grid}>
        {days.map((d, i) => (
          d === null ? <View key={i} style={cal.cell} /> :
          <Pressable
            key={i}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(new Date(viewDate.getFullYear(), viewDate.getMonth(), d));
            }}
            style={[
              cal.cell,
              isSel(d) && { backgroundColor: accent },
              isToday(d) && !isSel(d) && { borderColor: accent, borderWidth: 1, borderRadius: 20 },
            ]}
          >
            <Text style={[
              cal.dayNum,
              isSel(d) && { color: '#000', fontWeight: '900' },
              isToday(d) && !isSel(d) && { color: accent },
            ]}>
              {d}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const cal = StyleSheet.create({
  wrap:        { paddingHorizontal: 4 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 14, fontWeight: '800', color: '#EEF0FF', letterSpacing: -0.3 },
  dowRow:      { flexDirection: 'row', marginBottom: 6 },
  dow:         { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: '#555', letterSpacing: 0.5 },
  grid:        { flexDirection: 'row', flexWrap: 'wrap' },
  cell:        { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  dayNum:      { fontSize: 12, color: '#AAA', fontWeight: '500' },
});

// ─── Day Timeline ─────────────────────────────────────────

function DayTimeline({ blocks }: { blocks: TimeBlock[] }) {
  const PX_PER_HOUR = 64;

  return (
    <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingBottom: 24 }}>
        {HOURS.map((h) => {
          const block = blocks.find(b => b.hour === h);
          return (
            <View key={h} style={tl.row}>
              <Text style={tl.hourLabel}>{h < 10 ? `0${h}` : h}h</Text>
              <View style={tl.line} />
              {block && (
                <Animated.View
                  entering={FadeInDown.delay(50).duration(300)}
                  style={[
                    tl.block,
                    {
                      borderLeftColor:  block.color,
                      backgroundColor:  block.color + '15',
                      height:           Math.max((block.duration / 60) * PX_PER_HOUR - 4, 36),
                    },
                  ]}
                >
                  <View style={[tl.blockDot, { backgroundColor: block.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={tl.blockLabel}>{block.label}</Text>
                    <Text style={[tl.blockSub, { color: block.color }]}>
                      {block.category} · {block.duration}min
                    </Text>
                  </View>
                  <Ionicons
                    name={block.completed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={block.completed ? block.color : '#555'}
                  />
                </Animated.View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const tl = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, minHeight: 56 },
  hourLabel: { width: 36, fontSize: 10, color: '#555', fontWeight: '700', paddingTop: 8, textAlign: 'right', marginRight: 8 },
  line:      { width: 1, backgroundColor: 'rgba(255,255,255,0.06)', alignSelf: 'stretch', marginRight: 10 },
  block: {
    flex:           1,
    borderLeftWidth: 3,
    borderRadius:   8,
    padding:        10,
    flexDirection:  'row',
    alignItems:     'center',
    gap:             8,
  },
  blockDot:   { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  blockLabel: { fontSize: 13, fontWeight: '700', color: '#EEF0FF' },
  blockSub:   { fontSize: 10, fontWeight: '600', marginTop: 2 },
});

// ─── Mood Tracker ─────────────────────────────────────────

function MoodTracker() {
  const [mood,    setMood]    = useState(0);
  const [note,    setNote]    = useState('');
  const [saved,   setSaved]   = useState(false);

  const save = () => {
    if (!mood) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
  };

  return (
    <View style={mood_.wrap}>
      <Text style={mood_.title}>Comment te sens-tu aujourd'hui ?</Text>
      <View style={mood_.row}>
        {MOOD_EMOJIS.map((m) => (
          <Pressable
            key={m.score}
            onPress={() => { setMood(m.score); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[
              mood_.btn,
              {
                borderColor:     mood === m.score ? m.color : 'rgba(255,255,255,0.1)',
                backgroundColor: mood === m.score ? m.color + '22' : 'transparent',
              },
            ]}
          >
            <Ionicons name={m.icon} size={22} color={mood === m.score ? m.color : '#555'} />
          </Pressable>
        ))}
      </View>
      {mood > 0 && !saved && (
        <Animated.View entering={FadeIn.duration(300)}>
          <TextInput
            placeholder="Note (optionnel)…"
            placeholderTextColor="#555"
            value={note}
            onChangeText={setNote}
            style={mood_.input}
            multiline
          />
          <Pressable onPress={save} style={mood_.saveBtn}>
            <Text style={mood_.saveTxt}>Enregistrer</Text>
          </Pressable>
        </Animated.View>
      )}
      {saved && (
        <Animated.View entering={FadeIn.duration(300)} style={mood_.saved}>
          <Ionicons name="checkmark-circle" size={20} color="#00FF88" />
          <Text style={mood_.savedTxt}>Humeur enregistrée !</Text>
        </Animated.View>
      )}
    </View>
  );
}

const mood_ = StyleSheet.create({
  wrap:     { gap: 12 },
  title:    { fontSize: 13, fontWeight: '700', color: 'rgba(238,240,255,0.6)' },
  row:      { flexDirection: 'row', gap: 8 },
  btn:      { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, borderWidth: 1 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius:    10,
    padding:         12,
    color:           '#EEF0FF',
    fontSize:        13,
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.1)',
    minHeight:       60,
  },
  saveBtn:  { backgroundColor: '#00FF8822', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#00FF8844' },
  saveTxt:  { color: '#00FF88', fontWeight: '800', fontSize: 13 },
  saved:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  savedTxt: { color: '#00FF88', fontWeight: '700', fontSize: 13 },
});

// ─── Health Quick-log ─────────────────────────────────────

function HealthQuickLog() {
  const [sleep,  setSleep]  = useState('');
  const [water,  setWater]  = useState('');
  const [sport,  setSport]  = useState('');
  const [weight, setWeight] = useState('');

  const fields = [
    { key: 'sleep',  label: 'Sommeil', unit: 'h',   icon: 'moon',          color: '#A78BFA', val: sleep,  set: setSleep  },
    { key: 'water',  label: 'Eau',     unit: 'L',   icon: 'water',         color: '#00E5FF', val: water,  set: setWater  },
    { key: 'sport',  label: 'Sport',   unit: 'min', icon: 'fitness',       color: '#00FF88', val: sport,  set: setSport  },
    { key: 'weight', label: 'Poids',   unit: 'kg',  icon: 'barbell',       color: '#FFD700', val: weight, set: setWeight },
  ];

  return (
    <View style={hq.wrap}>
      {fields.map((f) => (
        <View key={f.key} style={hq.field}>
          <View style={[hq.iconWrap, { backgroundColor: f.color + '22' }]}>
            <Ionicons name={f.icon as any} size={18} color={f.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={hq.fieldLabel}>{f.label}</Text>
            <TextInput
              value={f.val}
              onChangeText={f.set}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor="#555"
              style={hq.input}
            />
          </View>
          <Text style={[hq.unit, { color: f.color }]}>{f.unit}</Text>
        </View>
      ))}
    </View>
  );
}

const hq = StyleSheet.create({
  wrap:       { gap: 10 },
  field:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12 },
  iconWrap:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 10, color: '#888', fontWeight: '700', letterSpacing: 0.5 },
  input:      { fontSize: 16, fontWeight: '800', color: '#EEF0FF', padding: 0 },
  unit:       { fontSize: 11, fontWeight: '700' },
});

// ─── Tab bar ──────────────────────────────────────────────

type Tab = 'day' | 'month' | 'activity' | 'health';

const TABS: { id: Tab; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { id: 'day',      icon: 'today',       label: 'Jour'    },
  { id: 'month',    icon: 'calendar',    label: 'Mois'    },
  { id: 'activity', icon: 'bar-chart',   label: 'Activité'},
  { id: 'health',   icon: 'heart',       label: 'Santé'   },
];

// ─── Main Screen ──────────────────────────────────────────

export default function CalendarScreen() {
  const { theme } = useTheme();
  const { colors } = theme;

  const [tab,   setTab]   = useState<Tab>('day');
  const [selDate, setSelDate] = useState(new Date());

  const ACCENT = '#00E5FF';

  const formatDate = (d: Date) =>
    d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Completion ring
  const completed = MOCK_BLOCKS.filter(b => b.completed).length;
  const total     = MOCK_BLOCKS.length;
  const pct       = completed / total;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={['rgba(0,229,255,0.08)', 'transparent']}
        style={styles.headerGrad}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Calendrier</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              {formatDate(selDate)}
            </Text>
          </View>
          <ProgressRing
            size={56}
            progress={pct}
            strokeWidth={5}
            label={`${Math.round(pct * 100)}%`}
            color={ACCENT}
          />
        </View>
      </LinearGradient>

      {/* Tab switcher */}
      <View style={[styles.tabRow, { borderBottomColor: colors.glassBorder }]}>
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => { setTab(t.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={styles.tabItem}
          >
            <Ionicons
              name={t.id === tab ? t.icon : (t.icon + '-outline') as any}
              size={20}
              color={t.id === tab ? ACCENT : colors.textMuted}
            />
            <Text style={[styles.tabLabel, { color: t.id === tab ? ACCENT : colors.textMuted }]}>
              {t.label}
            </Text>
            {t.id === tab && (
              <View style={[styles.tabUnderline, { backgroundColor: ACCENT }]} />
            )}
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'day' && (
          <Animated.View entering={FadeIn.duration(300)} style={{ gap: 16 }}>
            {/* Stats row */}
            <View style={styles.statsRow}>
              {[
                { label: 'Complétés', value: `${completed}/${total}`, color: '#00FF88' },
                { label: 'Temps planifié', value: `${Math.round(MOCK_BLOCKS.reduce((s,b) => s+b.duration,0)/60)}h`, color: ACCENT },
                { label: 'Efficacité', value: `${Math.round(pct*100)}%`, color: '#A78BFA' },
              ].map((s, i) => (
                <GlassCard key={i} style={styles.statCard}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
                </GlassCard>
              ))}
            </View>

            {/* Timeline */}
            <GlassCard noPadding style={{ padding: 16 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Planning de la journée</Text>
              <DayTimeline blocks={MOCK_BLOCKS} />
            </GlassCard>

            {/* Mood */}
            <GlassCard>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Humeur</Text>
              <MoodTracker />
            </GlassCard>
          </Animated.View>
        )}

        {tab === 'month' && (
          <Animated.View entering={FadeIn.duration(300)} style={{ gap: 16 }}>
            <GlassCard>
              <MiniCalendar
                selectedDate={selDate}
                onSelect={setSelDate}
                accent={ACCENT}
              />
            </GlassCard>
            <GlassCard>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {selDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </Text>
              <Text style={[{ color: colors.textMuted, fontSize: 13, marginTop: 8 }]}>
                {MOCK_BLOCKS.length} tâches planifiées · {completed} complétées
              </Text>
            </GlassCard>
          </Animated.View>
        )}

        {tab === 'activity' && (
          <Animated.View entering={FadeIn.duration(300)} style={{ gap: 16 }}>
            <GlassCard>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Activité sur 90 jours</Text>
              <View style={{ marginTop: 12 }}>
                <HeatMap data={MOCK_HEAT} days={90} />
              </View>
            </GlassCard>

            {/* Category breakdown */}
            <GlassCard>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Par domaine</Text>
              <View style={{ gap: 10, marginTop: 12 }}>
                {[
                  { label: 'Carrière',  hours: 14, color: '#00E5FF', pct: 0.85 },
                  { label: 'Santé',    hours: 8,  color: '#00FF88', pct: 0.60 },
                  { label: 'Famille',  hours: 5,  color: '#FF6B35', pct: 0.40 },
                  { label: 'Spirituel',hours: 3,  color: '#A78BFA', pct: 0.30 },
                  { label: 'Finance',  hours: 6,  color: '#FFD700', pct: 0.50 },
                ].map((cat, i) => (
                  <View key={i}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={[styles.catLabel, { color: colors.text }]}>{cat.label}</Text>
                      <Text style={[styles.catLabel, { color: cat.color }]}>{cat.hours}h</Text>
                    </View>
                    <View style={[styles.progressBg, { backgroundColor: colors.glass }]}>
                      <Animated.View
                        entering={FadeIn.delay(i * 100).duration(600)}
                        style={[styles.progressFill, { width: `${cat.pct * 100}%`, backgroundColor: cat.color }]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {tab === 'health' && (
          <Animated.View entering={FadeIn.duration(300)} style={{ gap: 16 }}>
            {/* Quick log */}
            <GlassCard>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Log santé d'aujourd'hui</Text>
              <View style={{ marginTop: 12 }}>
                <HealthQuickLog />
              </View>
              <Pressable style={styles.saveHealthBtn}>
                <Text style={styles.saveHealthTxt}>Enregistrer</Text>
              </Pressable>
            </GlassCard>

            {/* Weekly summary */}
            <GlassCard>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Cette semaine</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                {[
                  { icon: 'moon',    val: '7.2h',  label: 'Sommeil moy.', color: '#A78BFA' },
                  { icon: 'water',   val: '2.1L',  label: 'Eau moy.',    color: '#00E5FF' },
                  { icon: 'fitness', val: '4/7',   label: 'Jours sport', color: '#00FF88' },
                ].map((s, i) => (
                  <GlassCard key={i} elevated style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                    <Ionicons name={s.icon as any} size={22} color={s.color} />
                    <Text style={[{ fontSize: 16, fontWeight: '900', color: s.color }]}>{s.val}</Text>
                    <Text style={[{ fontSize: 9, color: colors.textMuted, fontWeight: '700', textAlign: 'center' }]}>{s.label}</Text>
                  </GlassCard>
                ))}
              </View>
            </GlassCard>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  root:         { flex: 1 },
  headerGrad:   { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle:  { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  headerSub:    { fontSize: 13, fontWeight: '500', marginTop: 4, textTransform: 'capitalize' },

  tabRow: {
    flexDirection:  'row',
    borderBottomWidth: 1,
    marginHorizontal: 20,
    marginBottom:   4,
  },
  tabItem:       { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3, position: 'relative' },
  tabLabel:      { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  tabUnderline:  { position: 'absolute', bottom: -1, left: 8, right: 8, height: 2, borderRadius: 1 },

  content:       { padding: 16, gap: 16, paddingBottom: 100 },

  statsRow:      { flexDirection: 'row', gap: 10 },
  statCard:      { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12 },
  statValue:     { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  statLabel:     { fontSize: 9, fontWeight: '700', textAlign: 'center' },

  sectionTitle:  { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },

  progressBg:    { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },
  catLabel:      { fontSize: 12, fontWeight: '700' },

  saveHealthBtn: { marginTop: 14, backgroundColor: 'rgba(0,229,255,0.12)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,229,255,0.25)' },
  saveHealthTxt: { color: '#00E5FF', fontWeight: '800', fontSize: 14 },
});
