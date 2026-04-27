/**
 * GBECHE — Screen Agent IA "L'Agent"
 * ─────────────────────────────────────────────────────────
 * Chat interface avec NLP local (regex + pattern matching).
 * Pas de serveur, pas d'internet — tout se passe sur l'appareil.
 *
 * Architecture NLP locale :
 *  1. Tokenisation de la phrase utilisateur
 *  2. Détection d'intent (finance | task | calendar | query)
 *  3. Extraction d'entités (montant, catégorie, heure, date)
 *  4. Génération de cartes d'action pour validation utilisateur
 *  5. Écriture en DB après confirmation
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// ─── Types ────────────────────────────────────────────────
type MessageRole = 'ai' | 'user';
type MessageType = 'text' | 'action-expense' | 'action-task' | 'action-stats';

interface Message {
  id:     string;
  role:   MessageRole;
  type:   MessageType;
  text?:  string;
  data?:  Record<string, any>;
  time:   string;
}

// ─── NLP Local (no internet) ─────────────────────────────
const nlp = {
  detect(msg: string): MessageType {
    const lc = msg.toLowerCase();
    if (/\d+/.test(msg) && (lc.includes('fcfa') || lc.includes('dépens') || lc.includes('payé') || lc.includes('achet') || lc.includes('cash') || lc.includes('momo') || lc.includes('wave') || lc.includes('coiffeur') || lc.includes('taxi') || lc.includes('marché') || lc.includes('restaurant'))) return 'action-expense';
    if (lc.includes('tâche') || lc.includes('rappelle') || lc.includes('planif') || lc.includes('demain') || lc.includes('lire') || lc.includes('sport') || lc.includes('fait') || lc.includes('faire')) return 'action-task';
    if (lc.includes('stat') || lc.includes('bilan') || lc.includes('résumé') || lc.includes('niveau') || lc.includes('xp') || lc.includes('streak')) return 'action-stats';
    return 'text';
  },

  extractAmount(msg: string): number | null {
    const m = msg.match(/(\d[\d\s]*)/);
    return m ? parseInt(m[1].replace(/\s/g,'')) : null;
  },

  extractCategory(msg: string): string {
    const lc = msg.toLowerCase();
    if (lc.includes('taxi') || lc.includes('transport') || lc.includes('moto') || lc.includes('bus')) return 'Transport 🚕';
    if (lc.includes('restau') || lc.includes('manger') || lc.includes('nourriture') || lc.includes('marché') || lc.includes('café')) return 'Nourriture 🍽️';
    if (lc.includes('coiffeur') || lc.includes('salon') || lc.includes('beauté')) return 'Beauté 💇';
    if (lc.includes('médicament') || lc.includes('santé') || lc.includes('clinique') || lc.includes('pharmac')) return 'Santé ⚕️';
    if (lc.includes('école') || lc.includes('cours') || lc.includes('livre') || lc.includes('formation')) return 'Éducation 📚';
    return 'Autre 📦';
  },

  extractAccount(msg: string): string {
    const lc = msg.toLowerCase();
    if (lc.includes('momo') || lc.includes('mtn')) return 'MTN MOMO 📱';
    if (lc.includes('wave')) return 'Wave 🌊';
    if (lc.includes('banque') || lc.includes('virement')) return 'Banque 🏦';
    return 'Cash 💵';
  },

  extractTime(msg: string): string | null {
    const m = msg.match(/(\d{1,2})[h:](\d{0,2})/);
    if (m) return `${m[1]}h${m[2] || '00'}`;
    if (msg.toLowerCase().includes('soir'))  return '20h00';
    if (msg.toLowerCase().includes('matin')) return '07h00';
    return null;
  },

  extractTask(msg: string): string {
    const patterns = [
      /rappelle.{0,10}(?:de|moi)\s+(.+)/i,
      /(?:planifier?|faire|lire|sport|méditer?)\s+(.+)/i,
    ];
    for (const p of patterns) {
      const m = msg.match(p);
      if (m) return m[1].trim();
    }
    return msg.replace(/\d+/g,'').replace(/fcfa/gi,'').trim().slice(0,40);
  },
};

// ─── Réponses IA ─────────────────────────────────────────
const AI_REPLIES = {
  text: (msg: string) => {
    const lc = msg.toLowerCase();
    if (lc.includes('bonjour') || lc.includes('salut')) return 'Salut Guerrier ! 👋 Comment puis-je t\'aider à conquérir ta journée ?';
    if (lc.includes('help') || lc.includes('aide'))     return 'Je peux t\'aider à :\n• Enregistrer une dépense : "J\'ai payé 5000 en taxi"\n• Créer une tâche : "Rappelle-moi de faire du sport à 18h"\n• Voir tes stats : "Mon bilan du jour"\n• Réajuster ton planning : "Réorganise ma journée"';
    if (lc.includes('merci'))                            return 'Avec plaisir ! Ensemble, on gagne toutes les guerres. ⚔️';
    return 'Je t\'écoute. Dis-moi naturellement ce que tu veux faire — je comprends et j\'enregistre. 💪';
  },
  stats: () => `📊 **Ton bilan :**\n\n🏆 Niveau 12 — Guerrier Élite\n⭐ 3 420 / 4 000 XP\n🔥 Streak : 12 jours\n⚔️ Victoires : 47\n📊 Taux de réussite : 88.7%\n\n_Tu es dans le top 12% des guerriers. Continue !_ 💪`,
};

// ─── Composants Message ───────────────────────────────────
function MessageBubble({ msg, onConfirm }: { msg: Message; onConfirm: (m: Message) => void }) {
  if (msg.role === 'user') {
    return (
      <View style={styles.userBubbleWrap}>
        <LinearGradient colors={['#00E5FF','#0099FF']} style={styles.userBubble}>
          <Text style={styles.userBubbleText}>{msg.text}</Text>
        </LinearGradient>
        <Text style={styles.msgTime}>{msg.time}</Text>
      </View>
    );
  }

  if (msg.type === 'action-expense' && msg.data) {
    return (
      <View style={styles.aiBubbleWrap}>
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>💸 DÉPENSE DÉTECTÉE</Text>
          <Row label="Montant"    value={msg.data.amount ? `${msg.data.amount.toLocaleString('fr-FR')} FCFA` : '?'} color="#FF4757" />
          <Row label="Catégorie"  value={msg.data.category}  />
          <Row label="Compte"     value={msg.data.account}   />
          <Row label="Date"       value="Aujourd'hui"         />
          <View style={styles.actionBtns}>
            <Pressable onPress={() => onConfirm(msg)} style={styles.confirmBtn}>
              <LinearGradient colors={['#00E5FF','#0099FF']} style={styles.confirmBtnInner}>
                <Text style={styles.confirmBtnText}>✅ Valider</Text>
              </LinearGradient>
            </Pressable>
            <Pressable style={styles.editBtn}>
              <Text style={styles.editBtnText}>✏️ Modifier</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.msgTime}>{msg.time}</Text>
      </View>
    );
  }

  if (msg.type === 'action-task' && msg.data) {
    return (
      <View style={styles.aiBubbleWrap}>
        <View style={styles.actionCard}>
          <Text style={[styles.actionTitle, { color: '#00E5FF' }]}>⚔️ ADVERSAIRE DÉTECTÉ</Text>
          <Row label="Tâche"    value={msg.data.task}     />
          <Row label="Heure"    value={msg.data.time || 'Non spécifiée'}  />
          <Row label="Guerre"   value="🚀 Carrière (déduit)" />
          <Row label="XP"       value="+120 XP" color="#A78BFA" />
          <Pressable onPress={() => onConfirm(msg)} style={[styles.confirmBtn, { marginTop: 12 }]}>
            <LinearGradient colors={['#00E5FF','#0099FF']} style={styles.confirmBtnInner}>
              <Text style={styles.confirmBtnText}>✅ Ajouter l'Adversaire</Text>
            </LinearGradient>
          </Pressable>
        </View>
        <Text style={styles.msgTime}>{msg.time}</Text>
      </View>
    );
  }

  // Texte simple AI
  return (
    <View style={styles.aiBubbleWrap}>
      <View style={styles.aiBubble}>
        <Text style={styles.aiBubbleText}>{msg.text}</Text>
      </View>
      <Text style={styles.msgTime}>{msg.time}</Text>
    </View>
  );
}

function Row({ label, value, color }: { label:string; value:string; color?:string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────
const QUICK_ACTIONS = [
  { label:'💸 Dépense',   msg:'J\'ai dépensé' },
  { label:'📋 Tâche',     msg:'Rappelle-moi de' },
  { label:'📊 Bilan',     msg:'Mon bilan du jour' },
  { label:'🔄 Planning',  msg:'Réorganise ma journée' },
  { label:'⚡ Stats',     msg:'Mes statistiques' },
];

const NOW = () => new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });

const INIT_MESSAGES: Message[] = [
  { id:'m0', role:'ai', type:'text', text:'👋 Salut Guerrier ! Je suis ton Agent GBECHE. 100% offline — je tourne directement sur ton appareil, sans jamais envoyer tes données quelque part.', time: NOW() },
  { id:'m1', role:'ai', type:'text', text:'💡 Parle-moi naturellement :\n"J\'ai dépensé 5 000 en taxi"\n"Rappelle-moi de faire du sport à 18h"\n"Mon bilan du jour"\n\nJe comprends, j\'analyse, tu valides.', time: NOW() },
];

export default function AgentScreen() {
  const [messages, setMessages] = useState<Message[]>(INIT_MESSAGES);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlatList>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role:'user', type:'text', text, time: NOW() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Simulate NLP processing delay
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 800));
    setTyping(false);

    const intent = nlp.detect(text);
    let aiMsg: Message;

    if (intent === 'action-expense') {
      aiMsg = {
        id: (Date.now()+1).toString(), role:'ai', type:'action-expense', time: NOW(),
        text: 'Voici ce que j\'ai compris :',
        data: {
          amount:   nlp.extractAmount(text),
          category: nlp.extractCategory(text),
          account:  nlp.extractAccount(text),
        },
      };
    } else if (intent === 'action-task') {
      aiMsg = {
        id: (Date.now()+1).toString(), role:'ai', type:'action-task', time: NOW(),
        data: {
          task: nlp.extractTask(text),
          time: nlp.extractTime(text),
        },
      };
    } else if (intent === 'action-stats') {
      aiMsg = { id:(Date.now()+1).toString(), role:'ai', type:'text', text: AI_REPLIES.stats(), time: NOW() };
    } else {
      aiMsg = { id:(Date.now()+1).toString(), role:'ai', type:'text', text: AI_REPLIES.text(text), time: NOW() };
    }

    setMessages(prev => [...prev, aiMsg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleConfirm = useCallback((msg: Message) => {
    const confirmText = msg.type === 'action-expense'
      ? `✅ Dépense de ${msg.data?.amount?.toLocaleString('fr-FR')} FCFA enregistrée sur ${msg.data?.account} ! +50 XP`
      : `✅ Adversaire "${msg.data?.task}" créé ! Je te rappelle${msg.data?.time ? ' à ' + msg.data.time : ''}. +120 XP`;

    setMessages(prev => [...prev, {
      id: Date.now().toString(), role:'ai', type:'text',
      text: confirmText, time: NOW(),
    }]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 200);
  }, []);

  return (
    <KeyboardAvoidingView style={{ flex:1, backgroundColor:'#070911' }} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={80}>

      {/* Topbar */}
      <View style={styles.topbar}>
        <LinearGradient colors={['#A78BFA','#00E5FF']} style={styles.agentAvatar}>
          <Text style={{ fontSize: 18 }}>🤖</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.agentName}>Agent GBECHE</Text>
          <Text style={styles.agentStatus}>● En ligne · 100% offline · NLP Local</Text>
        </View>
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineBadgeText}>NLP Local</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        renderItem={({ item }) => <MessageBubble msg={item} onConfirm={handleConfirm} />}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Typing indicator */}
      {typing && (
        <View style={styles.typingWrap}>
          <View style={styles.aiBubble}><Text style={styles.aiBubbleText}>Agent réfléchit...</Text></View>
        </View>
      )}

      {/* Quick actions */}
      <View style={styles.quickRow}>
        {QUICK_ACTIONS.map((q, i) => (
          <Pressable key={i} onPress={() => sendMessage(q.msg)} style={styles.quickChip}>
            <Text style={styles.quickChipText}>{q.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ex: J'ai payé 3 500 en taxi..."
          placeholderTextColor="rgba(238,240,255,0.3)"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={200}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage(input)}
        />
        <Pressable onPress={() => sendMessage(input)} style={({ pressed }) => [styles.sendBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <LinearGradient colors={['#00E5FF','#0099FF']} style={styles.sendBtnInner}>
            <Text style={{ fontSize: 18 }}>➤</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  topbar:        { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14, flexDirection:'row', alignItems:'center', gap:12, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.06)', backgroundColor:'rgba(7,9,17,0.8)' },
  agentAvatar:   { width:40, height:40, borderRadius:12, alignItems:'center', justifyContent:'center' },
  agentName:     { fontSize:16, fontWeight:'800', color:'#EEF0FF' },
  agentStatus:   { fontSize:11, color:'#00FF88', fontWeight:'600', marginTop:1 },
  offlineBadge:  { backgroundColor:'rgba(167,139,250,0.12)', borderRadius:20, paddingHorizontal:10, paddingVertical:4, borderWidth:1, borderColor:'rgba(167,139,250,0.2)' },
  offlineBadgeText:{ fontSize:11, fontWeight:'700', color:'#A78BFA' },

  userBubbleWrap:{ alignItems:'flex-end', marginBottom:12 },
  userBubble:    { borderRadius:18, borderBottomRightRadius:4, paddingHorizontal:16, paddingVertical:12, maxWidth:'78%' },
  userBubbleText:{ fontSize:14, fontWeight:'600', color:'#000', lineHeight:20 },

  aiBubbleWrap:  { alignItems:'flex-start', marginBottom:12 },
  aiBubble:      { backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1, borderColor:'rgba(255,255,255,0.08)', borderRadius:18, borderBottomLeftRadius:4, paddingHorizontal:16, paddingVertical:12, maxWidth:'80%' },
  aiBubbleText:  { fontSize:14, color:'#EEF0FF', lineHeight:22 },

  actionCard:    { backgroundColor:'rgba(255,255,255,0.055)', borderWidth:1, borderColor:'rgba(255,255,255,0.08)', borderRadius:16, padding:16, width:280, maxWidth:'90%' },
  actionTitle:   { fontSize:11, fontWeight:'700', letterSpacing:1, textTransform:'uppercase', color:'#FFD700', marginBottom:12 },
  row:           { flexDirection:'row', justifyContent:'space-between', paddingVertical:5, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.04)' },
  rowLabel:      { fontSize:13, color:'rgba(238,240,255,0.5)' },
  rowValue:      { fontSize:13, fontWeight:'700', color:'#EEF0FF' },
  actionBtns:    { flexDirection:'row', gap:8, marginTop:12 },
  confirmBtn:    { flex:1, borderRadius:12, overflow:'hidden' },
  confirmBtnInner:{ paddingVertical:10, alignItems:'center' },
  confirmBtnText:{ fontSize:13, fontWeight:'800', color:'#000' },
  editBtn:       { flex:1, borderRadius:12, borderWidth:1, borderColor:'rgba(255,255,255,0.08)', alignItems:'center', justifyContent:'center' },
  editBtnText:   { fontSize:13, fontWeight:'600', color:'rgba(238,240,255,0.6)' },

  msgTime:       { fontSize:10, color:'rgba(238,240,255,0.3)', marginTop:4, fontWeight:'600' },
  typingWrap:    { paddingHorizontal:16, paddingBottom:8 },

  quickRow:      { flexDirection:'row', paddingHorizontal:16, paddingVertical:8, gap:8, flexWrap:'wrap' },
  quickChip:     { backgroundColor:'rgba(0,229,255,0.08)', borderWidth:1, borderColor:'rgba(0,229,255,0.2)', borderRadius:20, paddingHorizontal:12, paddingVertical:6 },
  quickChipText: { fontSize:12, fontWeight:'700', color:'#00E5FF' },

  inputRow:      { flexDirection:'row', gap:10, padding:12, paddingBottom:24, borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.06)' },
  input:         { flex:1, backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1, borderColor:'rgba(255,255,255,0.08)', borderRadius:16, paddingHorizontal:16, paddingVertical:12, color:'#EEF0FF', fontSize:14, maxHeight:120 },
  sendBtn:       { width:48, height:48, borderRadius:14, overflow:'hidden', alignSelf:'flex-end' },
  sendBtnInner:  { flex:1, alignItems:'center', justifyContent:'center' },
});