/**
 * GBECHE — Finance "Trésorerie"
 * Comptes multi-wallets, transactions, budgets, DonutChart.
 * Thème dynamique + Ionicons (0 emojis).
 */

import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/src/theme/ThemeContext';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { DonutChart, type DonutSlice } from '@/src/components/charts/DonutChart';
import { LineChart } from '@/src/components/charts/BarChart';

// ─── Types ────────────────────────────────────────────────

interface Account {
  id:      string;
  name:    string;
  icon:    keyof typeof Ionicons.glyphMap;
  color:   string;
  balance: number;
}

interface Transaction {
  id:       string;
  label:    string;
  category: string;
  amount:   number;
  icon:     keyof typeof Ionicons.glyphMap;
  date:     string;
  account:  string;
}

interface Budget {
  category: string;
  icon:     keyof typeof Ionicons.glyphMap;
  spent:    number;
  limit:    number;
  color:    string;
}

// ─── Seed Data ────────────────────────────────────────────

const ACCOUNTS: Account[] = [
  { id:'a1', name:'MTN MOMO', icon:'phone-portrait', color:'#FFB300', balance: 450_000 },
  { id:'a2', name:'Wave',     icon:'water',          color:'#00BCD4', balance: 280_000 },
  { id:'a3', name:'Cash',     icon:'cash',           color:'#00FF88', balance: 110_500 },
  { id:'a4', name:'Banque',   icon:'business',       color:'#A78BFA', balance: 400_000 },
];

const TRANSACTIONS: Transaction[] = [
  { id:'t1', label:'Supermarché',      category:'Nourriture', amount:-12_500, icon:'cart',           date:"Aujourd'hui", account:'Cash'     },
  { id:'t2', label:'Salaire',          category:'Revenu',     amount:450_000, icon:'briefcase',      date:'01 Avr',      account:'Banque'   },
  { id:'t3', label:'Taxi',             category:'Transport',  amount:-3_500,  icon:'car',            date:'Hier',        account:'MTN MOMO' },
  { id:'t4', label:'Frais scolaires',  category:'Éducation',  amount:-45_000, icon:'school',         date:'12 Avr',      account:'Banque'   },
  { id:'t5', label:'Freelance',        category:'Revenu',     amount:75_000,  icon:'laptop',         date:'10 Avr',      account:'Wave'     },
  { id:'t6', label:'Pharmacie',        category:'Santé',      amount:-8_200,  icon:'medical',        date:'09 Avr',      account:'Cash'     },
];

const BUDGETS: Budget[] = [
  { category:'Nourriture', icon:'restaurant', spent:78_000,  limit:100_000, color:'#FF6B35' },
  { category:'Transport',  icon:'car',         spent:25_000,  limit:30_000,  color:'#00E5FF' },
  { category:'Santé',      icon:'fitness',     spent:12_000,  limit:50_000,  color:'#00FF88' },
  { category:'Loisirs',    icon:'game-controller', spent:42_000, limit:40_000, color:'#FF4757' },
  { category:'Éducation',  icon:'school',      spent:45_000,  limit:80_000,  color:'#A78BFA' },
];

const TOTAL   = ACCOUNTS.reduce((s, a) => s + a.balance, 0);
const INCOME  = TRANSACTIONS.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
const EXPENSE = TRANSACTIONS.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

const DONUT_DATA: DonutSlice[] = [
  { label: 'Nourriture', value: 78_000,  color: '#FF6B35' },
  { label: 'Transport',  value: 25_000,  color: '#00E5FF' },
  { label: 'Éducation',  value: 45_000,  color: '#A78BFA' },
  { label: 'Santé',      value: 12_000,  color: '#00FF88' },
  { label: 'Loisirs',    value: 42_000,  color: '#FF4757' },
];

const BALANCE_TREND = [
  { label: 'Oct', value: 870_000 },
  { label: 'Nov', value: 920_000 },
  { label: 'Déc', value: 800_000 },
  { label: 'Jan', value: 1_050_000 },
  { label: 'Fév', value: 980_000 },
  { label: 'Mar', value: 1_120_000 },
  { label: 'Avr', value: 1_240_500 },
];

// ─── Format helpers ───────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('fr-FR');

// ─── Components ───────────────────────────────────────────

function AccountCard({ account }: { account: Account }) {
  const { theme } = useTheme();
  return (
    <GlassCard
      style={[styles.accountCard, { borderColor: account.color + '44' }]}
      accentColor={account.color}
    >
      <View style={[styles.accountIconWrap, { backgroundColor: account.color + '22' }]}>
        <Ionicons name={account.icon} size={20} color={account.color} />
      </View>
      <Text style={[styles.accountName, { color: theme.colors.textMuted }]}>{account.name}</Text>
      <Text style={[styles.accountBalance, { color: theme.colors.text }]}>
        {fmt(account.balance)}
      </Text>
      <Text style={[styles.accountCurrency, { color: account.color }]}>FCFA</Text>
    </GlassCard>
  );
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const { theme } = useTheme();
  const isIncome = tx.amount > 0;

  return (
    <View style={[styles.txRow, { borderBottomColor: theme.colors.glassBorder }]}>
      <View style={[styles.txIconWrap, { backgroundColor: isIncome ? '#00FF8822' : '#FF475722' }]}>
        <Ionicons name={tx.icon} size={18} color={isIncome ? '#00FF88' : '#FF4757'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.txLabel, { color: theme.colors.text }]}>{tx.label}</Text>
        <Text style={[styles.txMeta, { color: theme.colors.textMuted }]}>
          {tx.category} · {tx.date} · {tx.account}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color: isIncome ? '#00FF88' : '#FF4757' }]}>
        {isIncome ? '+' : ''}{fmt(tx.amount)}
      </Text>
    </View>
  );
}

function BudgetBar({ budget }: { budget: Budget }) {
  const { theme } = useTheme();
  const pct       = Math.min(budget.spent / budget.limit, 1);
  const over      = budget.spent > budget.limit;

  return (
    <View style={styles.budgetRow}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={budget.icon} size={14} color={over ? '#FF4757' : budget.color} />
          <Text style={[styles.budgetLabel, { color: theme.colors.text }]}>{budget.category}</Text>
        </View>
        <Text style={[styles.budgetAmt, { color: over ? '#FF4757' : theme.colors.textMuted }]}>
          {fmt(budget.spent)} / {fmt(budget.limit)}
        </Text>
      </View>
      <View style={[styles.budgetTrack, { backgroundColor: theme.colors.glass }]}>
        <View style={[
          styles.budgetFill,
          { width: `${pct * 100}%`, backgroundColor: over ? '#FF4757' : budget.color },
        ]} />
      </View>
    </View>
  );
}

// ─── Add Transaction Modal ────────────────────────────────

function AddTxModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const [type, setType]   = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [label,  setLabel]  = useState('');
  const [account, setAccount] = useState('a1');

  const submit = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
    setAmount(''); setLabel('');
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.surfaceHigh }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: theme.colors.glassBorder }]} />
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Nouvelle opération</Text>

          {/* Type toggle */}
          <View style={styles.typeRow}>
            {(['expense', 'income'] as const).map(t => (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor: type === t
                      ? (t === 'expense' ? '#FF475722' : '#00FF8822')
                      : 'transparent',
                    borderColor: type === t
                      ? (t === 'expense' ? '#FF4757' : '#00FF88')
                      : theme.colors.glassBorder,
                  },
                ]}
              >
                <Ionicons
                  name={t === 'expense' ? 'arrow-down-circle' : 'arrow-up-circle'}
                  size={18}
                  color={type === t ? (t === 'expense' ? '#FF4757' : '#00FF88') : theme.colors.textMuted}
                />
                <Text style={[styles.typeBtnLabel, {
                  color: type === t ? (t === 'expense' ? '#FF4757' : '#00FF88') : theme.colors.textMuted
                }]}>
                  {t === 'expense' ? 'Dépense' : 'Revenu'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Fields */}
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="Montant (FCFA)"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.glassBorder, backgroundColor: theme.colors.glass }]}
          />
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Description"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.glassBorder, backgroundColor: theme.colors.glass }]}
          />

          {/* Account selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {ACCOUNTS.map(a => (
                <Pressable
                  key={a.id}
                  onPress={() => setAccount(a.id)}
                  style={[
                    styles.acctChip,
                    {
                      borderColor:     account === a.id ? a.color : theme.colors.glassBorder,
                      backgroundColor: account === a.id ? a.color + '22' : 'transparent',
                    },
                  ]}
                >
                  <Ionicons name={a.icon} size={14} color={account === a.id ? a.color : theme.colors.textMuted} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: account === a.id ? a.color : theme.colors.textMuted }}>
                    {a.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Submit */}
          <Pressable onPress={submit} style={styles.submitBtn}>
            <LinearGradient
              colors={type === 'expense' ? ['#FF4757', '#CC2030'] : ['#00FF88', '#00CC66']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.submitInner}
            >
              <Text style={styles.submitText}>Enregistrer</Text>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Tab bar ──────────────────────────────────────────────

type Tab = 'overview' | 'transactions' | 'budgets';

// ─── Main Screen ──────────────────────────────────────────

export default function FinanceScreen() {
  const { theme } = useTheme();
  const { colors } = theme;

  const [tab,     setTab]     = useState<Tab>('overview');
  const [addModal, setAdd]    = useState(false);

  const saved = INCOME - EXPENSE;
  const savedPct = INCOME > 0 ? saved / INCOME : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={['rgba(255,215,0,0.07)', 'transparent']}
        style={styles.headerGrad}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerLabel, { color: colors.textMuted }]}>Trésorerie totale</Text>
            <Text style={[styles.totalBalance, { color: colors.text }]}>
              {fmt(TOTAL)} <Text style={styles.fcfa}>FCFA</Text>
            </Text>
          </View>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setAdd(true); }}
            style={styles.addBtn}
          >
            <LinearGradient
              colors={['#FFD700', '#FF9F43']}
              style={styles.addBtnInner}
            >
              <Ionicons name="add" size={22} color="#000" />
            </LinearGradient>
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Revenus',  value: fmt(INCOME),   color: '#00FF88', icon: 'trending-up' as const },
            { label: 'Dépenses', value: fmt(EXPENSE),  color: '#FF4757', icon: 'trending-down' as const },
            { label: 'Épargné',  value: `${Math.round(savedPct*100)}%`, color: '#A78BFA', icon: 'save' as const },
          ].map((s, i) => (
            <View key={i} style={[styles.statItem, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <Ionicons name={s.icon} size={14} color={s.color} />
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.glassBorder }]}>
        {([
          { id: 'overview',      label: 'Vue d\'ensemble' },
          { id: 'transactions',  label: 'Transactions' },
          { id: 'budgets',       label: 'Budgets' },
        ] as const).map(t => (
          <Pressable
            key={t.id}
            onPress={() => { setTab(t.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[styles.tabItem, tab === t.id && { borderBottomColor: '#FFD700', borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabLabel, { color: tab === t.id ? '#FFD700' : colors.textMuted }]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'overview' && (
          <Animated.View entering={FadeIn.duration(300)} style={{ gap: 16 }}>
            {/* Accounts horizontal scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 12, paddingRight: 16 }}>
                {ACCOUNTS.map(a => <AccountCard key={a.id} account={a} />)}
              </View>
            </ScrollView>

            {/* Donut chart — expense breakdown */}
            <GlassCard>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Répartition des dépenses</Text>
              <View style={{ alignItems: 'center', marginTop: 16 }}>
                <DonutChart
                  data={DONUT_DATA}
                  size={180}
                  strokeWidth={36}
                  centerLabel={fmt(EXPENSE)}
                  centerSub="FCFA dépensés"
                />
              </View>
            </GlassCard>

            {/* Balance trend */}
            <GlassCard>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Évolution du solde</Text>
              <View style={{ marginTop: 12 }}>
                <LineChart
                  data={BALANCE_TREND}
                  height={140}
                  color="#FFD700"
                  showArea
                  formatValue={v => `${Math.round(v/1000)}k`}
                />
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {tab === 'transactions' && (
          <Animated.View entering={FadeIn.duration(300)}>
            <GlassCard noPadding>
              {TRANSACTIONS.map(tx => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </GlassCard>
          </Animated.View>
        )}

        {tab === 'budgets' && (
          <Animated.View entering={FadeIn.duration(300)} style={{ gap: 16 }}>
            <GlassCard>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Budgets du mois</Text>
              <View style={{ gap: 14, marginTop: 14 }}>
                {BUDGETS.map((b, i) => <BudgetBar key={i} budget={b} />)}
              </View>
            </GlassCard>
            {/* Savings tip */}
            <GlassCard accentColor="#00FF88" style={{ borderColor: '#00FF8833' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#00FF8822', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="bulb" size={20} color="#00FF88" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#00FF88' }}>Conseil du Guerrier</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 16 }}>
                    Tes loisirs dépassent le budget de 2 000 FCFA. Réduis pour atteindre ton objectif d'épargne.
                  </Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal */}
      <AddTxModal visible={addModal} onClose={() => setAdd(false)} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  root:         { flex: 1 },
  headerGrad:   { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerLabel:  { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  totalBalance: { fontSize: 32, fontWeight: '900', letterSpacing: -1.5 },
  fcfa:         { fontSize: 14, fontWeight: '600', letterSpacing: 0 },

  addBtn:       { marginTop: 4 },
  addBtnInner:  { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  statsRow:     { flexDirection: 'row', gap: 10 },
  statItem:     { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10, alignItems: 'center', gap: 4 },
  statValue:    { fontSize: 13, fontWeight: '900' },
  statLabel:    { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },

  tabRow:       { flexDirection: 'row', marginHorizontal: 20, borderBottomWidth: 1 },
  tabItem:      { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabLabel:     { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },

  content:      { padding: 16, gap: 16, paddingBottom: 100 },
  sectionTitle: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },

  // Account card
  accountCard:     { width: 140, padding: 14 },
  accountIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  accountName:     { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, marginBottom: 4 },
  accountBalance:  { fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  accountCurrency: { fontSize: 9, fontWeight: '700', marginTop: 2 },

  // Transactions
  txRow:      { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: 1 },
  txIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txLabel:    { fontSize: 13, fontWeight: '700' },
  txMeta:     { fontSize: 10, fontWeight: '500', marginTop: 2 },
  txAmount:   { fontSize: 14, fontWeight: '900' },

  // Budget
  budgetRow:    { gap: 0 },
  budgetLabel:  { fontSize: 12, fontWeight: '700' },
  budgetAmt:    { fontSize: 11, fontWeight: '600' },
  budgetTrack:  { height: 6, borderRadius: 3, overflow: 'hidden' },
  budgetFill:   { height: '100%', borderRadius: 3 },

  // Modal
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent:  'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    padding:              24,
    paddingBottom:        48,
  },
  handle:     { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 20, letterSpacing: -0.5 },

  typeRow:    { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingVertical: 12 },
  typeBtnLabel:{ fontSize: 13, fontWeight: '800' },

  input: {
    borderWidth:   1,
    borderRadius:  12,
    padding:       14,
    fontSize:      15,
    fontWeight:    '600',
    marginBottom:  10,
  },
  acctChip: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    borderWidth:     1,
    borderRadius:    20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  submitBtn:   { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  submitInner: { paddingVertical: 16, alignItems: 'center' },
  submitText:  { fontSize: 15, fontWeight: '900', color: '#000', letterSpacing: -0.2 },
});
