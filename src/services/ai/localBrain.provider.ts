/**
 * GBECHE — Cerveau local déterministe (fournisseur d'IA par défaut).
 *
 * Il discute, calcule, projette des enveloppes d'épargne, explique chaque
 * fonctionnalité et conseille à partir des chiffres réels de l'utilisateur.
 * Aucune donnée ne sort de l'appareil. Le matching est sur mots entiers.
 */
import type { AiProvider, BrainContext, BrainReply } from './types';
import { evaluate, percentOf, savingsEnvelope, type DepositFrequency } from './calculator';
import { extractAmount, extractMonths, hasAny, hasWord, normalizeText } from './text';

const SUGGESTIONS = [
  'Combien font 250 000 × 12 ?',
  'Je veux 3 000 000 dans 1 an, combien par semaine ?',
  'Comment enregistrer une dépense ?',
  'C’est quoi une guerre ?',
];

function reply(intent: string, text: string, extra: Partial<BrainReply> = {}): BrainReply {
  return { intent, text, suggestions: SUGGESTIONS, ...extra };
}

/** « 7 h 05 » à partir d'un timestamp. */
function clockOf(ms: number): string {
  const date = new Date(ms);
  return `${date.getHours()} h ${`${date.getMinutes()}`.padStart(2, '0')}`;
}

function roundFcfa(value: number): string {
  return `${Math.round(value).toLocaleString('fr-FR').replace(/[ ‑ ]/g, ' ')} FCFA`;
}

/** Formate un nombre quelconque en chaînée française sans espaces insolites. */
function formatNumber(value: number): string {
  const body = Number.isInteger(value)
    ? value.toLocaleString('fr-FR')
    : value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  return body.replace(/[ ‑ ]/g, ' ');
}

const EXPLANATIONS: { id: string; keywords: string[]; title: string; body: string }[] = [
  {
    id: 'expense',
    keywords: ['depense', 'depenser', 'transaction', 'mouvement'],
    title: 'Enregistrer une dépense',
    body:
      'Écris-moi par exemple « j’ai dépensé 2 500 FCFA de transport ». Je prépare une carte de confirmation : tu valides, et la dépense est écrite sur ton compte par défaut. Tu peux aussi passer par Finances → bouton +.',
  },
  {
    id: 'income',
    keywords: ['revenu', 'recette', 'salaire', 'gagne', 'argent recu'],
    title: 'Enregistrer un revenu',
    body:
      'Dis-moi « j’ai reçu 50 000 FCFA de salaire ». Après confirmation, le revenu s’ajoute à ton solde. Le classement par catégorie est automatique, tu peux le corriger dans Finances.',
  },
  {
    id: 'mission',
    keywords: ['mission', 'tache', 'rendez vous', 'rdv', 'rappel'],
    title: 'Planifier une mission',
    body:
      'Une mission est une action datée. Écris « ajoute une mission sport demain 7h30 », ou crée-la dans Guerres avec une date et une heure précises à la minute, et même une récurrence « tous les 3 jours ».',
  },
  {
    id: 'war',
    keywords: ['guerre', 'bataille', 'objectif', 'adversaire'],
    title: 'Guerres et batailles',
    body:
      'Une guerre est un grand domaine de vie (foi, argent, santé…). Les batailles sont ses objectifs, et les missions récurrentes tes actions quotidiennes. Gagner une mission donne de l’XP et monte ton niveau de guerrier.',
  },
  {
    id: 'budget',
    keywords: ['budget', 'plafond', 'limiter'],
    title: 'Budgets mensuels',
    body:
      'Le budget est un plafond mensuel par catégorie, par exemple « budget alimentation 30 000 FCFA ». Je te préviens dans le bilan finances quand une catégorie dépasse ou s’approche du plafond.',
  },
  {
    id: 'savings',
    keywords: ['epargne', 'epargner', 'economie', 'economiser', 'versement', 'enveloppe'],
    title: 'Épargne et projets',
    body:
      'Décris-moi un projet (« je veux acheter une voiture ») : je te pose les questions utiles, calcule une enveloppe de versement et crée un plan complet après ta validation. Tu peux aussi me demander un calcul direct de versement.',
  },
  {
    id: 'backup',
    keywords: ['sauvegarde', 'backup', 'fichier', 'donnees', 'perdu'],
    title: 'Sauvegarde de tes données',
    body:
      'Tout reste sur cet appareil dans une base SQLite, avec une sauvegarde automatique. Dans Réglages → Données & fichiers, tu peux exporter un JSON complet et le réimporter : rien ne se perd.',
  },
  {
    id: 'security',
    keywords: ['pin', 'code', 'securite', 'verrou', 'face id'],
    title: 'Sécurité',
    body:
      'Active le code PIN (et la biométrie si ton téléphone le permet) dans Réglages. L’app se verrouille automatiquement quand tu la mets en arrière-plan.',
  },
  {
    id: 'notifications',
    keywords: ['notification', 'rappel', 'alarme', 'prevenir'],
    title: 'Rappels',
    body:
      'Chaque mission planifiée peut déclencher une notification locale. Aucun serveur : tout est programmé sur ton appareil, même hors-ligne.',
  },
];

export class LocalBrainProvider implements AiProvider {
  readonly name = 'local-brain';

  /**
   * Mémoire courte du dernier échange. Elle vit en RAM, jamais sur disque,
   * et sert uniquement à ne pas répéter mot pour mot la même réponse.
   */
  private last: { text: string; topic: string } | null = null;

  respond({ raw, context = {} }: { raw: string; context?: BrainContext }): BrainReply | null {
    const text = normalizeText(raw);
    if (text.length < 2) return null;

    // Question strictement identique : le dire franchement vaut mieux que
    // rejouer la même phrase une deuxième fois.
    if (this.last && this.last.text === text) {
      return reply(
        'brain-repeat',
        'Je t’ai déjà répondu juste au-dessus. Si ce n’est pas clair, précise : un calcul, une mission, ou ton argent.',
        { topic: this.last.topic },
      );
    }

    const out = this.compose(text, raw, context);
    this.last = { text, topic: out?.topic ?? 'discussion' };
    return out;
  }

  private compose(text: string, raw: string, context: BrainContext): BrainReply | null {

    // 1. Salutations et formules sociales.
    if (hasAny(text, ['cc', 'slt', 'salut', 'bonjour', 'bonsoir', 'coucou', 'hello', 'wesh'])) {
      return reply(
        'brain-greeting',
        'Salut, chef de guerre. Je suis ton assistant de quartier général : je calcule, conseille, planifie et garde tout sur cet appareil. On attaque quoi aujourd’hui ?',
      );
    }
    if (hasAny(text, ['ca va', 'comment vas tu', 'la forme'])) {
      return reply(
        'brain-smalltalk',
        'Au garde-à-vous et prêt. Et toi ? Si tu veux faire le point, demande-moi le bilan de ta journée ou de tes finances.',
      );
    }
    if (hasAny(text, ['merci', 'thanks', 'thank'])) {
      return reply('brain-thanks', 'Toujours prêt. Chaque petite victoire compte, continue.');
    }
    if (hasAny(text, ['qui es tu', 'ton nom', 'tu es qui', 'c est quoi gbeche', 'presente toi'])) {
      return reply(
        'brain-identity',
        'Je suis l’intelligence locale de GBECHE : un cerveau déterministe qui vit dans l’app, sans internet. Je transforme tes phrases en plans, je calcule tes enveloppes et je veille sur tes objectifs.',
      );
    }
    if (hasAny(text, ['abandonne', 'decourage', 'décourage', 'fatigue', 'motivation', 'motive', 'arreter'])) {
      return reply(
        'brain-motivation',
        'La discipline bat la motivation : tu n’as pas besoin d’avoir envie, juste de faire la prochaine petite mission. Gagne la plus courte maintenant, l’élan fera le reste.',
      );
    }

    // 2. Le quotidien : quoi faire maintenant, comment progresser, mon score.
    const now = this.whatNow(text, context);
    if (now) return now;

    // 3. Explications de fonctionnalités.
    if (hasAny(text, ['comment', 'quoi', 'explique', 'marche', 'aide', 'aide moi', 'c est quoi'])) {
      for (const guide of EXPLANATIONS) {
        if (guide.keywords.some((keyword) => hasWord(text, keyword))) {
          return reply(`brain-help-${guide.id}`, `${guide.title}.\n\n${guide.body}`);
        }
      }
      return reply(
        'brain-help',
        'Je peux : enregistrer dépenses et revenus, planifier des missions à la minute, bâtir des projets de vie complets, calculer des enveloppes d’épargne, et te donner tes bilans. Essaie « comment enregistrer une dépense ? ».',
      );
    }

    // 4. Calculs de pourcentage.
    const percent = percentOf(raw);
    if (percent) {
      return reply(
        'brain-percent',
        `${percent.percent} % de ${roundFcfa(percent.base)} = ${roundFcfa(percent.result)}.`,
      );
    }

    // 5. Arithmétique parlée.
    const value = evaluate(raw);
    if (value !== null) {
      return reply('brain-calc', `Résultat : ${formatNumber(value)}.`);
    }

    // 6. Enveloppe d'épargne selon une fréquence libre.
    const savings = this.handleSavings(text);
    if (savings) return savings;

    // 7. Conseil contextuel sur les vraies données.
    const advice = this.contextualAdvice(text, context);
    if (advice) return advice;

    return null;
  }

  /**
   * Répond à « je fais quoi maintenant ? », « par quoi commencer ? »,
   * « comment progresser ? » et « c'est quoi mon score ? ».
   * Tout part du bilan réel transmis par l'écran ; rien n'est supposé.
   */
  private whatNow(text: string, context: BrainContext): BrainReply | null {
    const asksNext = hasAny(text, [
      'je fais quoi',
      'quoi faire',
      'par quoi commencer',
      'prochaine mission',
      'etape suivante',
      'on attaque quoi',
      'aujourd hui je fais',
    ]);
    if (asksNext) {
      if (context.nextMissionTitle) {
        const when = context.nextMissionAt ? ` à ${clockOf(context.nextMissionAt)}` : '';
        return reply(
          'brain-next-mission',
          `Ta prochaine mission : « ${context.nextMissionTitle} »${when}. Commence par elle : une victoire courte crée l'élan pour le reste.`,
          { action: { label: 'Voir mes missions', route: '/(app)/home' }, topic: 'missions' },
        );
      }
      if ((context.pendingToday ?? 0) > 0) {
        return reply(
          'brain-next-mission',
          `Il te reste ${context.pendingToday} mission(s) aujourd'hui. Ouvre l'ordre de bataille et prends la plus courte.`,
          { action: { label: 'Ordre de bataille', route: '/(app)/home' }, topic: 'missions' },
        );
      }
      return reply(
        'brain-next-empty',
        'Rien n’est programmé pour aujourd’hui. Pose une mission de 10 minutes maintenant : sans plan, la journée décide pour toi.',
        { action: { label: 'Planifier', route: '/(app)/calendar' }, topic: 'missions' },
      );
    }

    const asksProgress = hasAny(text, [
      'progresser',
      'ameliorer',
      'mieux faire',
      'monter',
      'meilleur score',
      'augmenter mon score',
      'gagner des points',
    ]);
    if (asksProgress) {
      return this.improvementPlan(context);
    }

    const asksGoal = hasAny(text, [
      'mon objectif',
      'objectif de la semaine',
      'j ai tenu mon objectif',
      'objectif hebdo',
      'je suis dans les temps',
      'je tiens le rythme',
    ]);
    if (asksGoal) {
      if (typeof context.weeklyTarget !== 'number') {
        return reply(
          'brain-goal-empty',
          'Ton objectif se calcule à partir de tes semaines réelles. Ouvre le Bilan : il te donnera une cible chiffrée dès la première semaine terminée.',
          { action: { label: 'Ouvrir le bilan', route: '/(app)/review' }, topic: 'objectif' },
        );
      }
      if (context.weeklyReached) {
        return reply(
          'brain-goal-reached',
          `Objectif tenu : ${context.score ?? context.weeklyTarget}/${context.weeklyTarget} cette semaine. Tu peux viser ${Math.min(95, context.weeklyTarget + 3)} la semaine prochaine.`,
          { action: { label: 'Voir le détail', route: '/(app)/review' }, topic: 'objectif' },
        );
      }
      const current = typeof context.score === 'number' ? context.score : null;
      const gap = current === null ? null : Math.max(0, context.weeklyTarget - current);
      return reply(
        'brain-goal-open',
        gap === null
          ? `Ton objectif de la semaine est de ${context.weeklyTarget}/100.`
          : `Ton objectif de la semaine est de ${context.weeklyTarget}/100 et tu es à ${current} : il manque ${gap} point${gap > 1 ? 's' : ''}. Une mission courte suffit souvent à combler ça.`,
        { action: { label: 'Ouvrir le bilan', route: '/(app)/review' }, topic: 'objectif' },
      );
    }

    const asksScore = hasAny(text, ['mon score', 'ma note', 'combien je vaux', 'ma performance', 'mon niveau']);
    if (asksScore) {
      if (typeof context.score !== 'number') {
        return reply(
          'brain-score-empty',
          'Je n’ai pas encore de bilan sous la main. Demande-moi « bilan de la semaine » et je te sors ton score détaillé.',
          { action: { label: 'Ouvrir le bilan', route: '/(app)/review' }, topic: 'score' },
        );
      }
      return reply(
        'brain-score',
        `Ton score sur ${context.periodDays ?? 30} jours est de ${Math.round(context.score)}/100. Le détail (discipline, régularité, épargne, élan) est dans l’onglet Bilan.`,
        { action: { label: 'Voir le détail', route: '/(app)/review' }, topic: 'score' },
      );
    }

    return null;
  }

  /** Nomme le levier le plus faible, un seul, avec un geste concret. */
  private improvementPlan(context: BrainContext): BrainReply {
    const savings = context.savingsRate ?? null;
    const completion = context.completionRate ?? null;

    if (completion !== null && completion < 0.6) {
      return reply(
        'brain-improve-discipline',
        `Ton levier numéro un, c’est la constance : ${Math.round(completion * 100)} % de missions tenues. Réduis la taille des missions à 10 minutes et gagne-en une aujourd’hui, même petite.`,
        { action: { label: 'Ajuster mes missions', route: '/(app)/wars' }, topic: 'progression' },
      );
    }
    if (savings !== null && savings < 0.1) {
      return reply(
        'brain-improve-savings',
        `Ton levier numéro un, c’est la marge : tu gardes ${Math.round(Math.max(0, savings) * 100)} % de ce qui rentre. Fixe une enveloppe automatique dès l’entrée d’argent, même 5 %.`,
        { action: { label: 'Créer une enveloppe', route: '/(app)/agent' }, topic: 'progression' },
      );
    }
    if ((context.overrunBudgets ?? 0) > 0) {
      return reply(
        'brain-improve-budget',
        `${context.overrunBudgets} budget(s) sont dépassés. Coupe d’abord dans la catégorie la plus lourde : c’est là que chaque franc rendu compte double.`,
        { action: { label: 'Voir mes budgets', route: '/(app)/finance' }, topic: 'progression' },
      );
    }
    if (typeof context.score === 'number') {
      return reply(
        'brain-improve-steady',
        `Ton score est de ${Math.round(context.score)}/100 et rien ne fuit. Pour franchir un palier, ajoute une mission récurrente courte les jours où tu n’en as aucune : la régularité pèse plus lourd que l’intensité.`,
        { action: { label: 'Ouvrir le bilan', route: '/(app)/review' }, topic: 'progression' },
      );
    }
    return reply(
      'brain-improve-empty',
      'Commence par trois jours d’affilée avec une mission gagnée : c’est la base de tout le reste. Ensuite je te montre les chiffres.',
      { action: { label: 'Programmer une mission', route: '/(app)/calendar' }, topic: 'progression' },
    );
  }

  private handleSavings(text: string): BrainReply | null {
    const wantsSavings = hasAny(text, ['epargne', 'epargner', 'verser', 'versement', 'enveloppe', 'objectif']);
    const target = extractAmount(text);
    const months = extractMonths(text);
    if (!wantsSavings || !target || !months) return null;

    let frequency: DepositFrequency = 'monthly';
    let intervalDays = 3;
    if (hasAny(text, ['jour', 'journee', 'quotidien'])) frequency = 'daily';
    else if (hasWord(text, 'semaine') || hasWord(text, 'hebdo')) frequency = 'weekly';
    else if (hasWord(text, 'mois') || hasWord(text, 'mensuel')) frequency = 'monthly';
    const intervalMatch = text.match(/tous les (\d+) jours/);
    if (intervalMatch) {
      frequency = 'interval_days';
      intervalDays = Math.max(2, Number(intervalMatch[1]));
    }

    const envelope = savingsEnvelope(target, months, frequency, intervalDays);
    if (!envelope) return null;
    const frequencyLabel: Record<DepositFrequency, string> = {
      daily: 'chaque jour',
      weekly: 'chaque semaine',
      interval_days: `tous les ${intervalDays} jours`,
      monthly: 'chaque mois',
    };
    const totalEffort = envelope.perDeposit * envelope.occurrences;
    const monthlyEquivalent = Math.round(target / months / 100) * 100;
    return reply(
      'brain-savings',
      `Pour atteindre ${roundFcfa(target)} en ${months} mois, verse ${roundFcfa(envelope.perDeposit)} ${frequencyLabel[frequency]}, ` +
        `soit environ ${envelope.occurrences} versements (effort total projeté : ${roundFcfa(totalEffort)}). ` +
        `Équivalent mensuel de référence : ${roundFcfa(monthlyEquivalent)}.`,
    );
  }

  private contextualAdvice(text: string, context: BrainContext): BrainReply | null {
    if (!hasAny(text, ['conseil', 'conseille', 'conseilles', 'que faire', 'recommande', 'recommandes', 'avis'])) return null;
    const lines: string[] = [];
    if (context.overrunBudgets && context.overrunBudgets > 0) {
      lines.push(
        `⚠️ ${context.overrunBudgets} catégorie(s) budgétaire(s) en dépassement : recentre les prochaines dépenses sur l’essentiel.`,
      );
    }
    if (typeof context.pendingToday === 'number' && context.pendingToday > 0) {
      lines.push(
        `Il te reste ${context.pendingToday} mission(s) aujourd’hui : attaque la plus courte pour lancer l’élan.`,
      );
    }
    if (lines.length === 0) {
      lines.push(
        'Aucune alerte sur tes chiffres. Planifie ta prochaine mission récurrente et fixe un plafond d’épargne pour garder le cap.',
      );
    }
    return reply('brain-advice', lines.join('\n'));
  }
}
