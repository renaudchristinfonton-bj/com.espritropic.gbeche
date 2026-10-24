/**
 * GBECHE — Écran Finances (Trésorerie).
 * Soldes calculés, comptes, transactions, budgets mensuels et répartition
 * des dépenses. Tous les montants dérivent de la base, jamais de cache.
 */

import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Screen } from '@/src/components/ui/Screen';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { Button } from '@/src/components/ui/Button';
import { Chip } from '@/src/components/ui/Chip';
import { Sheet } from '@/src/components/ui/Sheet';
import { TextField } from '@/src/components/ui/TextField';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { DonutChart, type DonutSlice } from '@/src/components/charts/DonutChart';
import { useTheme } from '@/src/theme/ThemeContext';
import { useRepoQuery } from '@/src/db/useRepoQuery';
import type { AccountType, TxType } from '@/src/db/types';
import {
  addAccount,
  addMovement,
  getBalances,
  getBreakdown,
  getBudgets,
  getMonthStats,
  getTransactions,
  setBudget,
} from '@/src/services/finance.service';
import {
  ACCOUNT_PRESETS,
  EXPENSE_CATEGORIES,
  getCategory,
  INCOME_CATEGORIES,
} from '@/src/domain/catalog';
import { currentMonthKey, formatCurrency, formatDate, formatTime, monthLabel } from '@/src/services/format';
import { radius, spacing, typography } from '@/src/theme';

type Tab = 'accounts' | 'transactions' | 'budgets';

export default function FinanceScreen() {
  const { colors } = useTheme().theme;
  const params = useLocalSearchParams<{ action?: string }>();

  const [tab, setTab] = useState<Tab>('accounts');
  const [movementType, setMovementType] = useState<TxType>('expense');
  const [movementSheet, setMovementSheet] = useState(false);
  const [accountSheet, setAccountSheet] = useState(false);
  const [budgetSheet, setBudgetSheet] = useState(false);

  const balances = useRepoQuery(() => getBalances(), []);
  const month = useRepoQuery(() => getMonthStats(), []);
  const transactions = useRepoQuery(() => getTransactions({ limit: 100 }), []);
  const budgets = useRepoQuery(() => getBudgets(), []);
  const breakdown = useRepoQuery(() => getBreakdown(), []);

  useEffect(() => {
    if (params.action === 'expense' || params.action === 'income') {
      setMovementType(params.action);
      setMovementSheet(true);
    }
  }, [params.action]);

  const donutData: DonutSlice[] = (breakdown.data ?? [])
    .filter((row) => row.total > 0)
    .slice(0, 6)
    .map((row) => {
      const meta = getCategory(row.category);
      return { label: meta.label, value: row.total, color: meta.color };
    });

  return (
    <Screen padded={false}>
      <View style={{ padding: spacing[5], paddingBottom: spacing[3] }}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Trésorerie</Text>

        <GlassCard noPadding elevated style={styles.balanceCard}>
          <LinearGradient
            colors={['rgba(255,215,0,0.14)', 'rgba(255,159,67,0.06)']}
            style={styles.balanceGradient}
          >
            <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>Solde total</Text>
            <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.balanceValue, { color: colors.text }]}>
              {formatCurrency(balances.data?.total ?? 0)}
            </Text>
            <View style={styles.monthRow}>
              <View style={styles.monthPill}>
                <Ionicons name="arrow-up" size={14} color={colors.success} />
                <Text style={[styles.monthText, { color: colors.success }]}>
                  {formatCurrency(month.data?.income ?? 0)}
                </Text>
              </View>
              <View style={styles.monthPill}>
                <Ionicons name="arrow-down" size={14} color={colors.danger} />
                <Text style={[styles.monthText, { color: colors.danger }]}>
                  {formatCurrency(month.data?.expense ?? 0)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </GlassCard>
      </View>

      <View style={{ paddingHorizontal: spacing[5] }}>
        <SegmentedControl<Tab>
          segments={[
            { value: 'accounts', label: 'Comptes' },
            { value: 'transactions', label: 'Transactions' },
            { value: 'budgets', label: 'Budgets' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing[5], paddingBottom: 120, gap: spacing[3] }}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'accounts' ? (
          <AccountsTab onAdd={() => setAccountSheet(true)} accounts={balances.data?.accounts ?? []} />
        ) : null}

        {tab === 'transactions' ? (
          <TransactionsTab
            transactions={transactions.data ?? []}
            onAdd={(type) => {
              setMovementType(type);
              setMovementSheet(true);
            }}
          />
        ) : null}

        {tab === 'budgets' ? (
          <BudgetsTab
            budgets={budgets.data ?? []}
            donut={donutData}
            onAdd={() => setBudgetSheet(true)}
          />
        ) : null}
      </ScrollView>

      {/* Feuilles */}
      <MovementSheet
        visible={movementSheet}
        type={movementType}
        onClose={() => setMovementSheet(false)}
        accounts={balances.data?.accounts ?? []}
      />
      <AccountSheet visible={accountSheet} onClose={() => setAccountSheet(false)} />
      <BudgetSheet visible={budgetSheet} onClose={() => setBudgetSheet(false)} />
    </Screen>
  );
}

// ─── Onglet comptes ───────────────────────────────────────
function AccountsTab({
  accounts,
  onAdd,
}: {
  accounts: Awaited<ReturnType<typeof getBalances>>['accounts'];
  onAdd: () => void;
}) {
  const { colors } = useTheme().theme;

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon="wallet-outline"
        title="Aucun compte"
        description="Ajoute ton Mobile Money, ton cash ou ton compte bancaire pour suivre tes soldes."
        actionLabel="Ajouter un compte"
        onAction={onAdd}
      />
    );
  }

  return (
    <>
      {accounts.map((account) => (
        <GlassCard key={account.id} style={styles.accountCard}>
          <View style={[styles.accountIcon, { backgroundColor: `${account.color}1A` }]}>
            <Ionicons name={account.icon as never} size={22} color={account.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.accountName, { color: colors.text }]}>{account.name}</Text>
            <Text style={[styles.accountType, { color: colors.textMuted }]}>
              Solde initial : {formatCurrency(account.initial_balance)}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            style={[
              styles.accountBalance,
              { color: account.balance < 0 ? colors.danger : colors.text },
            ]}
          >
            {formatCurrency(account.balance)}
          </Text>
        </GlassCard>
      ))}
      <Button label="Ajouter un compte" variant="glass" onPress={onAdd} fullWidth />
    </>
  );
}

// ─── Onglet transactions ──────────────────────────────────
function TransactionsTab({
  transactions,
  onAdd,
}: {
  transactions: Awaited<ReturnType<typeof getTransactions>>;
  onAdd: (type: TxType) => void;
}) {
  const { colors } = useTheme().theme;

  return (
    <>
      <View style={styles.txActions}>
        <Button
          label="Dépense"
          variant="danger"
          size="sm"
          icon={<Ionicons name="arrow-down" size={16} color="#fff" />}
          onPress={() => onAdd('expense')}
          style={{ flex: 1 }}
        />
        <Button
          label="Revenu"
          size="sm"
          icon={<Ionicons name="arrow-up" size={16} color={colors.textInverse} />}
          onPress={() => onAdd('income')}
          style={{ flex: 1 }}
        />
      </View>

      {transactions.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Aucune transaction"
          description="Enregistre ta première dépense ou ton premier revenu pour construire tes graphes."
        />
      ) : (
        <GlassCard animated={false} noPadding style={{ overflow: 'hidden' }}>
          {transactions.map((tx, index) => {
            const meta = getCategory(tx.category);
            const signed = tx.type === 'expense' ? -Math.abs(tx.amount) : Math.abs(tx.amount);
            return (
              <View
                key={tx.id}
                style={[
                  styles.txRow,
                  index > 0 && { borderTopWidth: 1, borderTopColor: colors.separator },
                ]}
              >
                <View style={[styles.txIcon, { backgroundColor: `${meta.color}1A` }]}>
                  <Ionicons name={meta.icon as never} size={18} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={[styles.txLabel, { color: colors.text }]}>
                    {tx.label || meta.label}
                  </Text>
                  <Text style={[styles.txMeta, { color: colors.textMuted }]}>
                    {formatDate(tx.timestamp)} · {formatTime(tx.timestamp)} · {tx.account_name}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    { color: signed < 0 ? colors.danger : colors.success },
                  ]}
                >
                  {signed > 0 ? '+' : '−'}
                  {formatCurrency(Math.abs(signed))}
                </Text>
              </View>
            );
          })}
        </GlassCard>
      )}
    </>
  );
}

// ─── Onglet budgets ───────────────────────────────────────
function BudgetsTab({
  budgets,
  donut,
  onAdd,
}: {
  budgets: Awaited<ReturnType<typeof getBudgets>>;
  donut: DonutSlice[];
  onAdd: () => void;
}) {
  const { colors } = useTheme().theme;

  return (
    <>
      <Text style={[styles.monthTitle, { color: colors.textMuted }]}>
        {monthLabel(currentMonthKey())}
      </Text>

      {donut.length > 0 ? (
        <GlassCard style={{ alignItems: 'center' }}>
          <DonutChart data={donut} size={190} strokeWidth={22} centerLabel="Dépenses" />
        </GlassCard>
      ) : (
        <EmptyState
          icon="pie-chart-outline"
          title="Pas encore de dépenses ce mois"
          description="Le camembert se construira dès ta première transaction."
        />
      )}

      {budgets.map((budget) => {
        const meta = getCategory(budget.category);
        const ratio = budget.amount ? budget.spent / budget.amount : 0;
        const over = ratio > 1;
        return (
          <GlassCard key={budget.id}>
            <View style={styles.budgetHead}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Ionicons name={meta.icon as never} size={18} color={meta.color} />
                <Text style={[styles.budgetName, { color: colors.text }]}>{meta.label}</Text>
              </View>
              <Text style={[styles.budgetAmount, { color: over ? colors.danger : colors.textMuted }]}>
                {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
              </Text>
            </View>
            <ProgressBar
              progress={ratio}
              color={over ? colors.danger : meta.color}
              height={8}
            />
          </GlassCard>
        );
      })}

      <Button label="Définir un budget" variant="glass" onPress={onAdd} fullWidth />
    </>
  );
}

// ─── Sheet : mouvement (dépense / revenu) ─────────────────
function MovementSheet({
  visible,
  type,
  accounts,
  onClose,
}: {
  visible: boolean;
  type: TxType;
  accounts: Awaited<ReturnType<typeof getBalances>>['accounts'];
  onClose: () => void;
}) {
  const { colors } = useTheme().theme;
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmount('');
      setAccountId(accounts[0]?.id ?? null);
      const firstCategory = type === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0];
      setCategory(firstCategory.id);
      setLabel('');
      setSaving(false);
    }
  }, [visible, type, accounts]);

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const valid = Number(amount) > 0 && accountId;

  const save = async () => {
    if (!valid || !accountId) return;
    setSaving(true);
    try {
      await addMovement({
        accountId,
        type,
        amount: Number(amount),
        category,
        label,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error(error);
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      title={type === 'expense' ? 'Nouvelle dépense' : 'Nouveau revenu'}
      onClose={onClose}
    >
      <TextInput
        value={amount}
        onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))}
        keyboardType="numeric"
        placeholder="Montant en FCFA"
        placeholderTextColor={colors.textTertiary}
        style={[styles.amountInput, { color: colors.text, backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
      />

      <Text style={styles.sheetLabel}>Compte</Text>
      <View style={styles.chipWrap}>
        {accounts.length === 0 ? (
          <Text style={{ color: colors.danger, ...styles.helper }}>
            Crée d'abord un compte dans l'onglet Comptes.
          </Text>
        ) : (
          accounts.map((account) => (
            <Chip
              key={account.id}
              label={account.name}
              icon={account.icon as never}
              color={account.color}
              selected={accountId === account.id}
              onPress={() => setAccountId(account.id)}
            />
          ))
        )}
      </View>

      <Text style={styles.sheetLabel}>Catégorie</Text>
      <View style={styles.chipWrap}>
        {categories.map((meta) => (
          <Chip
            key={meta.id}
            label={meta.label}
            icon={meta.icon as never}
            color={meta.color}
            selected={category === meta.id}
            onPress={() => setCategory(meta.id)}
          />
        ))}
      </View>

      <TextField
        label="Description (optionnel)"
        icon="create-outline"
        placeholder="Ex : Déjeuner, course taxi…"
        value={label}
        onChangeText={setLabel}
      />

      <Button
        label={type === 'expense' ? 'Enregistrer la dépense' : 'Enregistrer le revenu'}
        variant={type === 'expense' ? 'danger' : 'primary'}
        onPress={save}
        loading={saving}
        disabled={!valid}
        fullWidth
        style={{ marginTop: spacing[3] }}
      />
    </Sheet>
  );
}

// ─── Sheet : compte ───────────────────────────────────────
function AccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [preset, setPreset] = useState(ACCOUNT_PRESETS[0]);
  const [name, setName] = useState(ACCOUNT_PRESETS[0].name);
  const [balance, setBalance] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setPreset(ACCOUNT_PRESETS[0]);
      setName(ACCOUNT_PRESETS[0].name);
      setBalance('');
      setSaving(false);
    }
  }, [visible]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await addAccount({
        name,
        type: preset.type as AccountType,
        icon: preset.icon,
        color: preset.color,
        initialBalance: Number(balance) || 0,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error(error);
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} title="Nouveau compte" onClose={onClose}>
      <Text style={styles.sheetLabel}>Type de compte</Text>
      <View style={styles.chipWrap}>
        {ACCOUNT_PRESETS.map((item) => (
          <Chip
            key={item.name}
            label={item.name}
            icon={item.icon as never}
            color={item.color}
            selected={preset.name === item.name}
            onPress={() => {
              setPreset(item);
              setName(item.name);
            }}
          />
        ))}
      </View>

      <TextField
        label="Nom du compte"
        icon="bookmark"
        value={name}
        onChangeText={setName}
      />
      <TextField
        label="Solde initial"
        icon="cash"
        keyboardType="numeric"
        placeholder="0"
        suffix="FCFA"
        value={balance}
        onChangeText={(text) => setBalance(text.replace(/[^0-9]/g, ''))}
      />

      <Button
        label="Créer le compte"
        onPress={save}
        loading={saving}
        disabled={!name.trim()}
        fullWidth
        style={{ marginTop: spacing[3] }}
      />
    </Sheet>
  );
}

// ─── Sheet : budget ───────────────────────────────────────
function BudgetSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].id);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setCategory(EXPENSE_CATEGORIES[0].id);
      setAmount('');
      setSaving(false);
    }
  }, [visible]);

  const save = async () => {
    if (!(Number(amount) > 0)) return;
    setSaving(true);
    try {
      await setBudget(category, Number(amount));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error(error);
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} title="Budget mensuel" onClose={onClose}>
      <Text style={styles.sheetLabel}>Catégorie</Text>
      <View style={styles.chipWrap}>
        {EXPENSE_CATEGORIES.map((meta) => (
          <Chip
            key={meta.id}
            label={meta.label}
            icon={meta.icon as never}
            color={meta.color}
            selected={category === meta.id}
            onPress={() => setCategory(meta.id)}
          />
        ))}
      </View>
      <TextField
        label="Plafond mensuel"
        icon="speedometer"
        keyboardType="numeric"
        placeholder="Ex : 50 000"
        suffix="FCFA"
        value={amount}
        onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))}
      />
      <Button
        label="Enregistrer le budget"
        onPress={save}
        loading={saving}
        disabled={!(Number(amount) > 0)}
        fullWidth
        style={{ marginTop: spacing[3] }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  screenTitle: { fontSize: typography.sizes['3xl'], fontWeight: '800', letterSpacing: -0.5, marginBottom: spacing[4] },
  balanceCard: { borderRadius: radius['2xl'], overflow: 'hidden' },
  balanceGradient: { padding: spacing[6], gap: 6 },
  balanceLabel: { fontSize: typography.sizes.base, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  balanceValue: { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  monthRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[3] },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
  },
  monthText: { fontSize: typography.sizes.sm, fontWeight: '800' },
  accountCard: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], borderRadius: radius.lg },
  accountIcon: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  accountName: { fontSize: typography.sizes.md, fontWeight: '800' },
  accountType: { fontSize: typography.sizes.xs, marginTop: 2, fontWeight: '600' },
  accountBalance: { fontSize: typography.sizes.lg, fontWeight: '800', maxWidth: 150 },
  txActions: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[2] },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4] },
  txIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  txLabel: { fontSize: typography.sizes.base, fontWeight: '700' },
  txMeta: { fontSize: typography.sizes.xs, marginTop: 2, fontWeight: '600' },
  txAmount: { fontSize: typography.sizes.md, fontWeight: '800', maxWidth: 140 },
  monthTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  budgetHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[3], gap: spacing[2] },
  budgetName: { fontSize: typography.sizes.base, fontWeight: '700' },
  budgetAmount: { fontSize: typography.sizes.sm, fontWeight: '800' },
  sheetLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: '#9AA1B8',
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  helper: { fontSize: typography.sizes.base, fontWeight: '600' },
  amountInput: {
    borderWidth: 1,
    borderRadius: radius.lg,
    minHeight: 64,
    paddingHorizontal: spacing[4],
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing[2],
  },
});
