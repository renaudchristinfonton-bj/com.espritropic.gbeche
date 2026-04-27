/**
 * GBECHE — Screen Guerres
 * ─────────────────────────────────────────────────────────
 * Vue arborescence : Guerres → Batailles → Adversaires
 * Système de territoires visuels avec progression.
 */

import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/src/store';
import { useTheme } from '@/src/theme/ThemeContext';
import { GlassCard } from '@/src/components/ui/GlassCard';

// ─── Types ────────────────────────────────────────────────
interface War {
  id:       string;
  icon:     keyof typeof Ionicons.glyphMap;
  title:    string;
  color:    string;
  battles:  number;
  adversaries: number;
  xpEarned: number;
  territory: number; // 0-100
  status:   'safe' | 'at_risk' | 'dominating';
}

interface Battle {
  id:       string;
  warId:    string;
  title:    string;
  deadline: string;
  done:     number;
  total:    number;
}

// ─── Seed Data (remplacer par WatermelonDB) ───────────────
const WARS: War[] = [
  { id:'w1', icon:'cash',       title:'Guerre Financière',  color:'#FFD700', battles:3, adversaries:8,  xpEarned:1240, territory:72, status:'safe'      },
  { id:'w2', icon:'fitness',    title:'Guerre Santé',        color:'#FF4757', battles:2, adversaries:6,  xpEarned:580,  territory:45, status:'at_risk'    },
  { id:'w3', icon:'briefcase',  title:'Guerre Carrière',     color:'#00E5FF', battles:4, adversaries:12, xpEarned:2100, territory:88, status:'dominating' },
  { id:'w4', icon:'leaf',       title:'Guerre Spirituelle',  color:'#A78BFA', battles:1, adversaries:4,  xpEarned:420,  territory:60, status:'safe'       },
  { id:'w5', icon:'people',     title:'Guerre Familiale',    color:'#FF6B35', battles:2, adversaries:5,  xpEarned:350,  territory:55, status:'safe'       },
];

const BATTLES: Battle[] = [
  { id:'b1', warId:'w1', title:'Économiser 500 000 FCFA',    deadline:'30 Juin',   done:3, total:5 },
  { id:'b2', warId:'w1', title:'Éliminer toutes les dettes', deadline:'31 Déc',    done:1, total:3 },
  { id:'b3', warId:'w3', title:'Lancer projet freelance',    deadline:'15 Mai',    done:4, total:4 },
  { id:'b4', warId:'w3', title:'Obtenir certification RN',   deadline:'30 Juil',   done:2, total:6 },
];

const DOMAINS_PRESETS: Array<{ icon: keyof typeof Ionicons.glyphMap; name: string; color: string }> = [
  { icon:'cash',         name:'Finance',      color:'#FFD700' },
  { icon:'fitness',      name:'Santé',        color:'#FF4757' },
  { icon:'briefcase',    name:'Carrière',     color:'#00E5FF' },
  { icon:'leaf',         name:'Spirituel',    color:'#A78BFA' },
  { icon:'people',       name:'Famille',      color:'#FF6B35' },
  { icon:'school',       name:'Éducation',    color:'#00FF88' },
  { icon:'game-controller', name:'Loisirs',   color:'#888'    },
  { icon:'barbell',      name:'Sport',        color:'#FF4757' },
];

// ─── Composants ──────────────────────────────────────────

function StatusBadge({ status }: { status: War['status'] }) {
  const config = {
    safe:       { label: 'STABLE',    icon: 'shield-checkmark' as const, bg: 'rgba(0,229,255,0.12)',  text: '#00E5FF', border: 'rgba(0,229,255,0.2)'  },
    at_risk:    { label: 'RISQUE',    icon: 'warning' as const,          bg: 'rgba(255,71,87,0.12)',  text: '#FF4757', border: 'rgba(255,71,87,0.2)'  },
    dominating: { label: 'EN FORCE',  icon: 'flame' as const,            bg: 'rgba(0,255,136,0.12)', text: '#00FF88', border: 'rgba(0,255,136,0.2)' },
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border, flexDirection: 'row', gap: 4, alignItems: 'center' }]}>
      <Ionicons name={config.icon} size={10} color={config.text} />
      <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

function WarCard({ war, onPress }: { war: War; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <LinearGradient
        colors={[war.color + '14', 'transparent']}
        style={[styles.warCard, { borderColor: war.color + '30' }]}
      >
        {/* Glow */}
        <View style={[styles.warGlow, { backgroundColor: war.color }]} />

        <View style={styles.warTop}>
          <View style={[styles.warIconWrap, { backgroundColor: war.color + '22' }]}>
            <Ionicons name={war.icon} size={22} color={war.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.warTitle, { color: theme.colors.text }]}>{war.title}</Text>
            <Text style={[styles.warSub, { color: theme.colors.textMuted }]}>
              {war.battles} Batailles · {war.adversaries} Adversaires
            </Text>
          </View>
          <StatusBadge status={war.status} />
        </View>

        <View style={styles.warMeta}>
          <View style={[styles.badge, { backgroundColor: 'rgba(0,255,136,0.12)', borderColor: 'rgba(0,255,136,0.2)', flexDirection: 'row', gap: 4, alignItems: 'center' }]}>
            <Ionicons name="star" size={10} color="#00FF88" />
            <Text style={[styles.badgeText, { color: '#00FF88' }]}>+{war.xpEarned.toLocaleString('fr-FR')} XP</Text>
          </View>
        </View>

        {/* Territory bar */}
        <View style={[styles.progBarBg, { backgroundColor: theme.colors.glass }]}>
          <View style={[styles.progBarFill, { width: `${war.territory}%`, backgroundColor: war.color }]} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          {war.status === 'at_risk' && <Ionicons name="warning" size={11} color="#FF4757" />}
          <Text style={[styles.terrText, { color: war.status === 'at_risk' ? '#FF4757' : war.color }]}>
            {war.status === 'at_risk' ? `Territoire menacé — ${war.territory}%` : `${war.territory}% du territoire conquis`}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function BattleCard({ battle }: { battle: Battle }) {
  const pct = battle.done / battle.total;
  return (
    <View style={styles.battleCard}>
      <View style={styles.battleLeft}>
        <Text style={styles.battleTitle}>{battle.title}</Text>
        <Text style={styles.battleDeadline}>Deadline : {battle.deadline}</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
          <View style={[styles.badge, { backgroundColor: 'rgba(0,255,136,0.12)', borderColor: 'rgba(0,255,136,0.2)' }]}>
            <Text style={[styles.badgeText, { color: '#00FF88' }]}>{battle.done}/{battle.total} Adversaires</Text>
          </View>
        </View>
      </View>
      <View style={styles.battleProgress}>
        <Text style={styles.battlePct}>{Math.round(pct * 100)}%</Text>
        <View style={[styles.progBarBg, { height: 4, marginTop: 4 }]}>
          <View style={[styles.progBarFill, { width: `${pct * 100}%`, backgroundColor: '#00E5FF' }]} />
        </View>
      </View>
    </View>
  );
}

// ─── Modal Nouvelle Guerre ────────────────────────────────
function NewWarModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [customName, setCustomName] = useState('');

  const handleCreate = () => {
    if (selected === null && !customName.trim()) {
      Alert.alert('Sélectionne un domaine ou entre un nom');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
    Alert.alert('Guerre déclarée !', 'Ton nouveau territoire est créé. À toi de le conquérir. ⚔️');
  };

  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHandle, { backgroundColor: colors.glassBorder }]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Ionicons name="flag" size={22} color="#00E5FF" />
          <Text style={[styles.modalTitle, { color: colors.text }]}>Déclarer une Guerre</Text>
        </View>
        <Text style={[styles.modalSub, { color: colors.textMuted }]}>Choisis un domaine de vie à conquérir</Text>

        <View style={styles.domainGrid}>
          {DOMAINS_PRESETS.map((d, i) => (
            <Pressable
              key={i}
              onPress={() => { setSelected(i); Haptics.selectionAsync(); }}
              style={[styles.domainCard, { borderColor: selected === i ? d.color : colors.glassBorder, backgroundColor: selected === i ? d.color + '15' : colors.glass }]}
            >
              <Ionicons name={d.icon} size={26} color={selected === i ? d.color : colors.textMuted} />
              <Text style={[styles.domainName, { color: selected === i ? d.color : colors.textMuted }]}>{d.name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.orText, { color: colors.textDim }]}>— ou nomme la toi-même —</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
          placeholder="Ex: Entrepreneuriat"
          placeholderTextColor={colors.textDim}
          value={customName}
          onChangeText={setCustomName}
        />

        <Pressable onPress={handleCreate} style={styles.createBtn}>
          <LinearGradient colors={['#00E5FF', '#0099FF']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.createBtnInner}>
            <Ionicons name="flag" size={16} color="#000" />
            <Text style={styles.createBtnText}>Déclarer cette Guerre</Text>
          </LinearGradient>
        </Pressable>

        <Pressable onPress={onClose} style={styles.cancelBtn}>
          <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Annuler</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

// ─── Écran principal ──────────────────────────────────────
export default function WarsScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const [showNewWar, setShowNewWar] = useState(false);
  const [selectedWar, setSelectedWar] = useState<War | null>(null);

  const activeBattles = BATTLES.filter(b => selectedWar ? b.warId === selectedWar.id : true);

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        {/* Topbar */}
        <LinearGradient
          colors={['rgba(255,71,87,0.07)', 'transparent']}
          style={styles.topbar}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="flame" size={24} color="#FF4757" />
            <Text style={[styles.topTitle, { color: colors.text }]}>
              Mes <Text style={{ color: '#00E5FF' }}>Guerres</Text>
            </Text>
          </View>
          <Pressable onPress={() => setShowNewWar(true)} style={styles.newBtn}>
            <LinearGradient colors={['#00E5FF', '#0099FF']} style={styles.newBtnInner}>
              <Ionicons name="add" size={16} color="#000" />
              <Text style={styles.newBtnText}>Nouvelle</Text>
            </LinearGradient>
          </Pressable>
        </LinearGradient>

        {/* Guerres */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Territoires Actifs</Text>
          {WARS.map((w, i) => (
            <Animated.View key={w.id} entering={FadeInDown.delay(i * 80).duration(400)}>
              <WarCard war={w} onPress={() => setSelectedWar(w.id === selectedWar?.id ? null : w)} />
            </Animated.View>
          ))}
        </View>

        {/* Batailles de la guerre sélectionnée */}
        {selectedWar && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Ionicons name={selectedWar.icon} size={16} color={selectedWar.color} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Batailles — {selectedWar.title}</Text>
            </View>
            {activeBattles.map(b => <BattleCard key={b.id} battle={b} />)}
            <Pressable style={[styles.addBattleBtn, { borderColor: colors.glassBorder }]} onPress={() => Alert.alert('Nouvelle Bataille', 'Formulaire à brancher sur WatermelonDB')}>
              <Ionicons name="add-circle-outline" size={16} color="#00E5FF" />
              <Text style={styles.addBattleText}>Ajouter une Bataille</Text>
            </Pressable>
          </Animated.View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <NewWarModal visible={showNewWar} onClose={() => setShowNewWar(false)} />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1 },
  topbar:      { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle:    { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  newBtn:      { borderRadius: 12, overflow: 'hidden' },
  newBtnInner: { paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  newBtnText:  { fontSize: 13, fontWeight: '700', color: '#000' },

  section:      { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12 },

  warCard:     { borderRadius: 20, padding: 18, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  warGlow:     { position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: 60, opacity: 0.4 },
  warTop:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  warIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  warTitle:    { fontSize: 16, fontWeight: '800' },
  warSub:      { fontSize: 12, marginTop: 2 },
  warMeta:     { flexDirection: 'row', gap: 8, marginBottom: 10 },

  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  badgeText:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  progBarBg:   { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progBarFill: { height: '100%', borderRadius: 3 },
  terrText:    { fontSize: 11, fontWeight: '700' },

  battleCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.055)', borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  battleLeft:     { flex: 1 },
  battleTitle:    { fontSize: 14, fontWeight: '700', color: '#EEF0FF' },
  battleDeadline: { fontSize: 11, color: 'rgba(238,240,255,0.5)', marginTop: 2 },
  battleProgress: { alignItems: 'flex-end', width: 60 },
  battlePct:      { fontSize: 18, fontWeight: '900', color: '#00E5FF' },

  addBattleBtn:  { borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, padding: 12, alignItems: 'center', marginTop: 4, flexDirection: 'row', gap: 6, justifyContent: 'center' },
  addBattleText: { fontSize: 13, fontWeight: '700', color: '#00E5FF' },

  // Modal
  modalContainer: { flex: 1, padding: 20, paddingTop: 12 },
  modalHandle:    { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle:     { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  modalSub:       { fontSize: 14, marginBottom: 20 },
  domainGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  domainCard:     { width: '23%', padding: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 6 },
  domainName:     { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  orText:         { textAlign: 'center', fontSize: 12, marginVertical: 12 },
  input:          { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 14, marginBottom: 16 },
  createBtn:      { borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
  createBtnInner: { padding: 15, alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center' },
  createBtnText:  { fontSize: 15, fontWeight: '800', color: '#000' },
  cancelBtn:      { padding: 12, alignItems: 'center' },
  cancelBtnText:  { fontSize: 14, fontWeight: '600' },
});