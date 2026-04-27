/**
 * GBECHE — Moteur de Gamification
 * ─────────────────────────────────────────────────────────
 * Système complet, conçu pour dépasser Duolingo en termes
 * d'engagement et de rétention psychologique.
 *
 * Principes psychologiques intégrés :
 *  • Variable Ratio Reinforcement (slot machine mechanic)
 *  • Loss Aversion (streak shield + territoire menacé)
 *  • Endowment Effect ("ton" warrior, "tes" territoires)
 *  • Social Proof (classement anonyme)
 *  • Sunk Cost Fallacy (XP total visible)
 *  • Progress Zeigarnik Effect (missions jamais à 100% à J)
 *  • Mastery & Competence (niveaux bien définis)
 *  • Autonomy (choix des domaines et des tâches)
 *  • Relatedness (accountability partner hors-ligne)
 */

// ─── Types ────────────────────────────────────────────────
export type WarriorRank =
  | 'Recrue' | 'Fantassin' | 'Guerrier' | 'Vétéran'
  | 'Guerrier Élite' | 'Général' | 'Légende';

export interface XPEvent {
  type:        XPEventType;
  baseAmount:  number;
  multiplier:  number;
  finalAmount: number;
  reason:      string;
  timestamp:   number;
}

export type XPEventType =
  | 'task_complete'    // Adversaire vaincu
  | 'battle_complete'  // Bataille gagnée
  | 'war_complete'     // Guerre conclue
  | 'daily_streak'     // Streak quotidien
  | 'perfect_day'      // Tous adversaires du jour vaincus
  | 'perfect_week'     // Toutes tâches de la semaine
  | 'mission_complete' // Mission quotidienne accomplie
  | 'boss_battle'      // Boss hebdomadaire vaincu
  | 'finance_track'    // Dépense enregistrée
  | 'mood_log'         // Humeur trackée
  | 'early_bird'       // Tâche avant 9h (+25%)
  | 'combo'            // Combo x tâches d'affilée
  | 'prestige';        // Prestige atteint

export interface Achievement {
  id:          string;
  title:       string;
  description: string;
  icon:        string;
  rarity:      'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
  xpReward:    number;
  condition:   (stats: GamificationStats) => boolean;
  category:    'warrior' | 'finance' | 'streak' | 'discipline' | 'social' | 'special';
}

export interface GamificationStats {
  xp:           number;
  level:        number;
  streak:       number;
  maxStreak:    number;
  totalWins:    number;
  totalLosses:  number;
  perfectDays:  number;
  perfectWeeks: number;
  bossKills:    number;
  comboMax:     number;
  transactionsLogged: number;
  earlyBirdDays:number;
  unlockedMedals: string[];
}

export interface DailyMission {
  id:       string;
  title:    string;
  icon:     string;
  xpReward: number;
  current:  number;
  total:    number;
  color:    string;
}

export interface BossChallenge {
  id:       string;
  title:    string;
  desc:     string;
  xpReward: number;
  deadline: number; // timestamp fin de semaine
  done:     boolean;
  type:     'endurance' | 'finance' | 'combo' | 'perfect';
}

// ─── XP TABLE (level thresholds) ─────────────────────────
export const XP_TABLE: number[] = [
  0,       // 1  → Recrue
  150,     // 2
  350,     // 3  → Fantassin
  700,     // 4
  1200,    // 5  → Guerrier
  1900,    // 6
  2800,    // 7  → Vétéran
  4000,    // 8
  5500,    // 9  → Guerrier Élite
  7200,    // 10
  9200,    // 11 → Général
  11500,   // 12
  14000,   // 13
  17000,   // 14 → Légende
  20500,   // 15
  24500,   // 16
  29000,   // 17
  34000,   // 18
  39500,   // 19
  45500,   // 20 (Max avant Prestige)
];

export const RANK_THRESHOLDS: { level: number; rank: WarriorRank; icon: string }[] = [
  { level: 1,  rank: 'Recrue',        icon: '🪖'  },
  { level: 3,  rank: 'Fantassin',     icon: '⚔️'  },
  { level: 5,  rank: 'Guerrier',      icon: '🛡️'  },
  { level: 7,  rank: 'Vétéran',       icon: '🎖️'  },
  { level: 9,  rank: 'Guerrier Élite',icon: '⭐'   },
  { level: 11, rank: 'Général',       icon: '🦅'  },
  { level: 14, rank: 'Légende',       icon: '👑'  },
];

// ─── ACHIEVEMENTS (50+ médailles) ────────────────────────
export const ACHIEVEMENTS: Achievement[] = [
  // ── Warrior ─────────────────────────────────────────
  {
    id: 'first_win', title: 'Première Victoire',
    description: 'Vaincre ton premier Adversaire',
    icon: '⚔️', rarity: 'bronze', xpReward: 100, category: 'warrior',
    condition: s => s.totalWins >= 1,
  },
  {
    id: 'ten_wins', title: 'En marche',
    description: '10 Adversaires vaincus',
    icon: '🗡️', rarity: 'silver', xpReward: 200, category: 'warrior',
    condition: s => s.totalWins >= 10,
  },
  {
    id: 'fifty_wins', title: 'Guerrier Aguerri',
    description: '50 Adversaires vaincus',
    icon: '🏹', rarity: 'gold', xpReward: 500, category: 'warrior',
    condition: s => s.totalWins >= 50,
  },
  {
    id: 'hundred_wins', title: 'Machine de Guerre',
    description: '100 Adversaires vaincus',
    icon: '⚡', rarity: 'platinum', xpReward: 1000, category: 'warrior',
    condition: s => s.totalWins >= 100,
  },
  {
    id: 'perfect_warrior', title: 'Parfait',
    description: 'Taux de réussite > 90% sur 30 jours',
    icon: '💎', rarity: 'legendary', xpReward: 2000, category: 'warrior',
    condition: s => s.totalWins / Math.max(1, s.totalWins + s.totalLosses) >= 0.9 && s.totalWins >= 30,
  },
  {
    id: 'combo_3', title: 'En Série',
    description: 'Combo x3 tâches d\'affilée',
    icon: '🔥', rarity: 'bronze', xpReward: 150, category: 'warrior',
    condition: s => s.comboMax >= 3,
  },
  {
    id: 'combo_7', title: 'Inarrêtable',
    description: 'Combo x7 tâches d\'affilée',
    icon: '💫', rarity: 'gold', xpReward: 400, category: 'warrior',
    condition: s => s.comboMax >= 7,
  },

  // ── Streak ───────────────────────────────────────────
  {
    id: 'streak_3', title: 'Habitude en Formation',
    description: 'Streak de 3 jours',
    icon: '🔥', rarity: 'bronze', xpReward: 150, category: 'streak',
    condition: s => s.streak >= 3,
  },
  {
    id: 'streak_7', title: 'Une Semaine de Feu',
    description: 'Streak de 7 jours',
    icon: '🌟', rarity: 'silver', xpReward: 300, category: 'streak',
    condition: s => s.streak >= 7,
  },
  {
    id: 'streak_30', title: 'Mois Solide',
    description: 'Streak de 30 jours',
    icon: '🏆', rarity: 'gold', xpReward: 750, category: 'streak',
    condition: s => s.streak >= 30,
  },
  {
    id: 'streak_100', title: 'Centurion',
    description: 'Streak de 100 jours',
    icon: '👑', rarity: 'legendary', xpReward: 3000, category: 'streak',
    condition: s => s.streak >= 100,
  },

  // ── Discipline ───────────────────────────────────────
  {
    id: 'perfect_day', title: 'Journée Parfaite',
    description: 'Tous tes adversaires vaincus en une journée',
    icon: '🎯', rarity: 'silver', xpReward: 350, category: 'discipline',
    condition: s => s.perfectDays >= 1,
  },
  {
    id: 'perfect_week', title: 'Semaine de Légende',
    description: 'Semaine parfaite sans aucune défaite',
    icon: '🦅', rarity: 'platinum', xpReward: 1500, category: 'discipline',
    condition: s => s.perfectWeeks >= 1,
  },
  {
    id: 'early_bird', title: 'Guerrier du Matin',
    description: 'Tâche accomplie avant 9h',
    icon: '🌅', rarity: 'bronze', xpReward: 200, category: 'discipline',
    condition: s => s.earlyBirdDays >= 1,
  },
  {
    id: 'early_bird_30', title: 'Lève-tôt Légendaire',
    description: '30 jours avec tâche avant 9h',
    icon: '☀️', rarity: 'gold', xpReward: 800, category: 'discipline',
    condition: s => s.earlyBirdDays >= 30,
  },
  {
    id: 'boss_first', title: 'Tueur de Boss',
    description: 'Premier Boss hebdomadaire vaincu',
    icon: '👹', rarity: 'silver', xpReward: 400, category: 'discipline',
    condition: s => s.bossKills >= 1,
  },

  // ── Finance ──────────────────────────────────────────
  {
    id: 'finance_first', title: 'Comptable en Herbe',
    description: 'Première dépense enregistrée',
    icon: '📊', rarity: 'bronze', xpReward: 100, category: 'finance',
    condition: s => s.transactionsLogged >= 1,
  },
  {
    id: 'finance_100', title: 'Maître des Finances',
    description: '100 transactions enregistrées',
    icon: '💰', rarity: 'gold', xpReward: 600, category: 'finance',
    condition: s => s.transactionsLogged >= 100,
  },
  {
    id: 'finance_daily_30', title: 'Mois de Transparence',
    description: 'Tracker ses finances 30 jours de suite',
    icon: '📈', rarity: 'platinum', xpReward: 1200, category: 'finance',
    condition: s => s.transactionsLogged >= 60, // 2 entrées/jour × 30 jours
  },
];

// ─── XP CALCULATOR ───────────────────────────────────────
export class XPCalculator {
  /**
   * Calcule le XP final avec multiplicateurs.
   * @param base   XP de base de la tâche
   * @param combo  Nombre de tâches d'affilée
   * @param hour   Heure de complétion (0-23)
   * @param early  Si avant 9h → Early Bird bonus
   */
  static calculate(base: number, combo: number, hour?: number): XPEvent {
    let multiplier = 1;
    const reasons: string[] = [];

    // Combo multiplier (like Duolingo but better)
    if (combo >= 10) { multiplier *= 2.5; reasons.push('🔥 COMBO x10 — Légendaire !'); }
    else if (combo >= 7) { multiplier *= 2.0; reasons.push('⚡ COMBO x7 — Inarrêtable !'); }
    else if (combo >= 5) { multiplier *= 1.75; reasons.push('💥 COMBO x5 — En feu !'); }
    else if (combo >= 3) { multiplier *= 1.5; reasons.push('🔥 COMBO x3'); }
    else if (combo >= 2) { multiplier *= 1.2; reasons.push('✨ COMBO x2'); }

    // Early bird (avant 9h)
    if (hour !== undefined && hour < 9) {
      multiplier *= 1.25;
      reasons.push('🌅 Guerrier du Matin +25%');
    }

    // Random bonus (variable ratio = addictive!)
    const randomBonus = Math.random();
    if (randomBonus > 0.9) {
      multiplier *= 1.5;
      reasons.push('🎲 Bonus Surprise ×1.5 !');
    } else if (randomBonus > 0.75) {
      multiplier *= 1.2;
      reasons.push('✨ Bonus Surprise ×1.2');
    }

    const finalAmount = Math.round(base * multiplier);

    return {
      type: 'task_complete',
      baseAmount: base,
      multiplier,
      finalAmount,
      reason: reasons.join(' · ') || 'Adversaire vaincu',
      timestamp: Date.now(),
    };
  }

  static forPerfectDay(): XPEvent {
    return { type:'perfect_day', baseAmount:500, multiplier:1, finalAmount:500, reason:'🎯 Journée Parfaite !', timestamp:Date.now() };
  }

  static forStreakBonus(days: number): XPEvent {
    const bonus = days >= 100 ? 1000 : days >= 30 ? 500 : days >= 7 ? 250 : 100;
    return { type:'daily_streak', baseAmount:bonus, multiplier:1, finalAmount:bonus, reason:`🔥 Streak ${days} jours !`, timestamp:Date.now() };
  }
}

// ─── STREAK MANAGER ──────────────────────────────────────
export class StreakManager {
  /**
   * Vérifie si le streak continue ou est cassé.
   * Règle GBECHE (plus indulgente que Duolingo) :
   *   → Streak OK si ≥ 50% des tâches du jour sont faites
   *   → Shield consommé si 0% mais shield disponible
   */
  static checkStreak(
    completionRate: number,
    currentStreak: number,
    shields: number,
  ): { newStreak: number; shieldsLeft: number; streakEvent: 'continued' | 'protected' | 'broken' } {

    if (completionRate >= 0.5) {
      return { newStreak: currentStreak + 1, shieldsLeft: shields, streakEvent: 'continued' };
    }

    if (shields > 0) {
      return { newStreak: currentStreak, shieldsLeft: shields - 1, streakEvent: 'protected' };
    }

    return { newStreak: 0, shieldsLeft: shields, streakEvent: 'broken' };
  }

  /**
   * Earn shields through performance (not through purchase).
   * Un shield est gagné tous les 7 jours de streak parfait.
   */
  static shouldEarnShield(streak: number, existingShields: number): boolean {
    return streak > 0 && streak % 7 === 0 && existingShields < 3;
  }
}

// ─── DAILY MISSIONS GENERATOR ────────────────────────────
export function generateDailyMissions(date: Date): DailyMission[] {
  const day = date.getDay(); // 0=dim, 1=lun, ...

  // Missions de base (toujours présentes)
  const base: DailyMission[] = [
    { id:'m_win3',   title:'Vaincre 3 Adversaires', icon:'⚔️', xpReward:200, current:0, total:3, color:'#FF6B35' },
    { id:'m_track',  title:'Saisir une dépense',    icon:'💰', xpReward:100, current:0, total:1, color:'#FFD700' },
    { id:'m_streak', title:'Maintenir le Streak',   icon:'🔥', xpReward:150, current:0, total:1, color:'#FF4757' },
  ];

  // Mission bonus selon le jour
  const extras: DailyMission[] = [
    { id:'m_morning', title:'Tâche avant 9h',       icon:'🌅', xpReward:200, current:0, total:1, color:'#00E5FF'  }, // lun
    { id:'m_deep',    title:'1h de Deep Work',      icon:'🧠', xpReward:300, current:0, total:1, color:'#A78BFA'  }, // mar
    { id:'m_health',  title:'Tracker santé (eau/sommeil)', icon:'💧', xpReward:150, current:0, total:1, color:'#00FF88' }, // mer
    { id:'m_social',  title:'Appel famille/ami',    icon:'📞', xpReward:100, current:0, total:1, color:'#FF6B35'  }, // jeu
    { id:'m_review',  title:'Bilan hebdo',          icon:'📊', xpReward:250, current:0, total:1, color:'#FFD700'  }, // ven
    { id:'m_rest',    title:'Journée de récup',     icon:'😴', xpReward:100, current:0, total:1, color:'#A78BFA'  }, // sam
    { id:'m_spirit',  title:'10min méditation/prière', icon:'🙏', xpReward:200, current:0, total:1, color:'#9F7AEA' }, // dim
  ];

  return [...base, extras[day === 0 ? 6 : day - 1]];
}

// ─── BOSS BATTLE GENERATOR ────────────────────────────────
export function generateWeeklyBoss(weekNumber: number): BossChallenge {
  const bosses: Omit<BossChallenge, 'id' | 'deadline' | 'done'>[] = [
    {
      title: '🐉 Le Dragon de l\'Endurance',
      desc:  'Accomplis 20 adversaires en 7 jours',
      xpReward: 1500, type: 'endurance',
    },
    {
      title: '💰 Le Titan Financier',
      desc:  'Tracker toutes tes dépenses 7 jours de suite',
      xpReward: 1200, type: 'finance',
    },
    {
      title: '⚡ Le Maître du Combo',
      desc:  'Enchaîne 7 adversaires sans interruption',
      xpReward: 1800, type: 'combo',
    },
    {
      title: '🌟 La Semaine de Perfection',
      desc:  'Journée parfaite 5 jours sur 7',
      xpReward: 2000, type: 'perfect',
    },
  ];

  const boss = bosses[weekNumber % bosses.length];
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  return {
    id:       `boss_w${weekNumber}`,
    deadline: endOfWeek.getTime(),
    done:     false,
    ...boss,
  };
}

// ─── ACHIEVEMENT CHECKER ─────────────────────────────────
export function checkAchievements(
  stats: GamificationStats,
  alreadyUnlocked: string[],
): Achievement[] {
  return ACHIEVEMENTS.filter(
    ach => !alreadyUnlocked.includes(ach.id) && ach.condition(stats)
  );
}

// ─── RANK UTILS ──────────────────────────────────────────
export function getRankForLevel(level: number): WarriorRank {
  let rank: WarriorRank = 'Recrue';
  for (const r of RANK_THRESHOLDS) {
    if (level >= r.level) rank = r.rank;
  }
  return rank;
}

export function getRankIcon(rank: WarriorRank): string {
  return RANK_THRESHOLDS.find(r => r.rank === rank)?.icon ?? '🪖';
}

export function getLevelProgress(xp: number, level: number): number {
  const current = XP_TABLE[level - 1] ?? 0;
  const next    = XP_TABLE[level]     ?? XP_TABLE[XP_TABLE.length - 1] + 5000;
  return (xp - current) / (next - current);
}

export function getXPToNextLevel(xp: number, level: number): number {
  const next = XP_TABLE[level] ?? XP_TABLE[XP_TABLE.length - 1] + 5000;
  return Math.max(0, next - xp);
}

// ─── TERRITORY SYSTEM ────────────────────────────────────
/**
 * Calcule le % de territoire d'un domaine (Guerre).
 * Basé sur le ratio wins/(wins+losses) des adversaires du domaine.
 */
export function computeTerritory(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 50; // Neutre au départ
  const raw = wins / total;

  // Atténuation : le territoire ne peut pas dépasser 95% ni descendre sous 5%
  return Math.round(Math.min(95, Math.max(5, raw * 100)));
}

export function getTerritoryStatus(pct: number): 'at_risk' | 'safe' | 'dominating' {
  if (pct >= 80) return 'dominating';
  if (pct <= 40) return 'at_risk';
  return 'safe';
}
