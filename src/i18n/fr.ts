/**
 * GBECHE — Traductions françaises (langue par défaut)
 */
export const fr = {
  // ── Common ──────────────────────────────────────────────
  common: {
    confirm:   'Confirmer',
    cancel:    'Annuler',
    save:      'Enregistrer',
    edit:      'Modifier',
    delete:    'Supprimer',
    add:       'Ajouter',
    close:     'Fermer',
    next:      'Suivant',
    back:      'Retour',
    done:      'Terminé',
    loading:   'Chargement...',
    error:     'Une erreur est survenue',
    or:        'ou',
    seeAll:    'Voir tout',
    today:     "Aujourd'hui",
    yesterday: 'Hier',
    tomorrow:  'Demain',
    fcfa:      'FCFA',
    xp:        'XP',
    level:     'NIV',
    days:      'jours',
    hours:     'heures',
    minutes:   'minutes',
  },

  // ── Onboarding ──────────────────────────────────────────
  onboarding: {
    skip:      'Passer',
    getStarted:'Prendre le commandement',
    continue:  'Continuer',

    step1: {
      label:    'Le Manifeste',
      title:    'Le chaos\ns\'arrête ici.',
      subtitle: 'GBECHE n\'est pas un outil. C\'est ton quartier général. Tes objectifs sont des Guerres. Tes tâches sont des Adversaires.',
      cta:      'Prendre le commandement',
    },
    step2: {
      label:    'La Forteresse',
      title:    '100%\nHors-ligne.',
      subtitle: 'Pas de cloud. Pas de serveurs. Pas d\'abonnement. Tes données financières t\'appartiennent uniquement. Chiffrées sur ton appareil.',
      cta:      'C\'est sécurisé',
    },
    step3: {
      label:    'La Trésorerie',
      title:    'Connecte\nta trésorerie.',
      subtitle: 'MTN MOMO, Wave, Cash, Banque. Configure tes comptes en 30 secondes. L\'agent IA s\'occupe du reste.',
      cta:      'Configurer mes comptes',
    },
    step4: {
      label:    'Déclaration',
      title:    'Déclare\ntes Guerres.',
      subtitle: 'Santé, Finance, Carrière, Spiritualité, Famille... Chaque domaine est un territoire à conquérir. Chaque tâche un adversaire à vaincre.',
      cta:      'Choisir mes guerres',
    },
    step5: {
      label:    'Le Pacte',
      title:    'Ton agent\nveille sur toi.',
      subtitle: 'L\'IA locale traque chaque heure. Elle te rappelle, réajuste ton planning, analyse ta progression. Sans jamais quitter ton téléphone.',
      cta:      'Démarrer GBECHE',
    },
  },

  // ── Auth ────────────────────────────────────────────────
  auth: {
    lockTitle:   'Accès sécurisé',
    lockSub:     'Entre ton code GBECHE',
    useBiometric:'Utiliser l\'empreinte / Face ID',
    pinError:    'Code incorrect. Réessaie.',
    pinHint:     '4 chiffres',
    createPin:   'Crée ton code',
    confirmPin:  'Confirme ton code',
    pinMismatch: 'Les codes ne correspondent pas.',
  },

  // ── Navigation ──────────────────────────────────────────
  nav: {
    home:     'Accueil',
    wars:     'Guerres',
    calendar: 'Planning',
    finance:  'Finance',
    agent:    'Agent',
    settings: 'Réglages',
  },

  // ── Dashboard ───────────────────────────────────────────
  home: {
    greeting:        'Quartier Général',
    xpLabel:         'XP vers le niveau suivant',
    streakLabel:     'Flamme de Guerre',
    winsLabel:       'Victoires',
    lossesLabel:     'Défaites',
    medalsLabel:     'Médailles',
    dailyMissions:   'Missions du Jour',
    timeLeft:        'restantes',
    todayAdversaries:'Adversaires du Jour',
    completed:       'vaincus',
    lifeBalance:     'Équilibre de Vie',
    treasury:        'Trésorerie',
    totalBalance:    'Solde Total · Toutes Sources',
    missionBonus:    'TOUTES LES MISSIONS = BONUS',
    perfectDay:      'Journée Parfaite !',
    taskVanquished:  'Adversaire vaincu !',
    continueButton:  'Continuer la bataille',
    details:         'Détails',
  },

  // ── Wars ────────────────────────────────────────────────
  wars: {
    title:         'Mes Guerres',
    newWar:        'Nouvelle Guerre',
    declareWar:    'Déclarer une Guerre',
    chooseDomain:  'Choisis un domaine de vie à conquérir',
    customDomain:  'Ou nomme-la toi-même',
    customHint:    'Ex: Entrepreneuriat',
    declareBtn:    'Déclarer cette Guerre',
    territories:   'Territoires Actifs',
    battles:       'Batailles',
    adversaries:   'Adversaires',
    conquered:     'du territoire conquis',
    threatened:    'Territoire menacé',
    addBattle:     'Ajouter une Bataille',
    newBattle:     'Nouvelle Bataille',
    battleTitle:   'Objectif de cette bataille',
    battleDeadline:'Deadline',
    dominated:     'Domination totale',
    status: {
      safe:       'Stable',
      at_risk:    'Risque',
      dominating: 'En Force',
    },
    domains: {
      finance:   'Finance',
      health:    'Santé',
      career:    'Carrière',
      spiritual: 'Spirituel',
      family:    'Famille',
      education: 'Éducation',
      leisure:   'Loisirs',
      sport:     'Sport',
    },
  },

  // ── Finance ─────────────────────────────────────────────
  finance: {
    title:         'Trésorerie',
    totalBalance:  'Solde Total · Toutes Sources',
    accounts:      'Comptes',
    addAccount:    'Ajouter un compte',
    budgets:       'Budgets du Mois',
    transactions:  'Transactions Récentes',
    recap:         'Récapitulatif',
    income:        'Revenus',
    expenses:      'Dépenses',
    saved:         'Épargné',
    savingsRate:   'Taux d\'épargne',
    newTransaction:'Nouvelle Transaction',
    expense:       'Dépense',
    revenue:       'Revenu',
    amount:        'Montant',
    label:         'Libellé',
    account:       'Compte',
    category:      'Catégorie',
    distribution:  'Répartition des Dépenses',
    exceeded:      'Budget dépassé de',
    evolution:     'Évolution du Solde',
    categories: {
      food:        'Nourriture',
      transport:   'Transport',
      health:      'Santé',
      education:   'Éducation',
      leisure:     'Loisirs',
      beauty:      'Beauté',
      other:       'Autre',
      income:      'Revenu',
    },
  },

  // ── Calendar ────────────────────────────────────────────
  calendar: {
    title:        'Planning',
    today:        "Aujourd'hui",
    events:       'événements',
    mood:         'Comment tu te sens ?',
    moodLabels:   ['Épuisé', 'Neutre', 'Bien', 'Super', 'En feu'],
    activity:     'Activité sur 90 jours',
    emptySlot:    'Créneau libre',
    addEvent:     'Ajouter un événement',
    emptyDay:     'Aucun événement prévu. Profite ou planifie !',
  },

  // ── Agent ───────────────────────────────────────────────
  agent: {
    title:          'Agent GBECHE',
    subtitle:       'En ligne',
    offline:        '100% hors-ligne',
    nlpBadge:       'NLP Local',
    placeholder:    'Ex: J\'ai payé 5 000 en taxi...',
    typing:         'Agent réfléchit...',
    expenseDetected:'DÉPENSE DÉTECTÉE',
    taskDetected:   'ADVERSAIRE DÉTECTÉ',
    validate:       'Valider',
    modify:         'Modifier',
    addAdversary:   'Ajouter l\'Adversaire',
    confirmed:      'enregistrée !',
    taskCreated:    'Adversaire créé !',
    quickActions: {
      expense:  'Dépense',
      task:     'Tâche',
      summary:  'Bilan',
      reschedule:'Planning',
      stats:    'Stats',
    },
    greetings: [
      'Prêt à conquérir ta journée, Guerrier ?',
      'Tes ordres de mission sont en attente.',
      'Dis-moi ce que tu veux faire, je m\'occupe du reste.',
    ],
  },

  // ── Settings ────────────────────────────────────────────
  settings: {
    title:          'Réglages',
    appearance:     'Apparence',
    theme:          'Thème',
    themeDark:      'Sombre',
    themeLight:     'Clair',
    themeSystem:    'Système',
    language:       'Langue',
    langFr:         'Français',
    langEn:         'English',
    security:       'Sécurité',
    changePin:      'Changer le code',
    biometric:      'Face ID / Empreinte',
    biometricSub:   'Déverrouillage rapide',
    data:           'Données',
    export:         'Exporter mes données',
    exportSub:      'CSV ou Excel, partout',
    import:         'Importer des données',
    deleteData:     'Supprimer toutes les données',
    deleteConfirm:  'Cette action est irréversible. Toutes tes guerres, finances et progressions seront perdues.',
    about:          'À propos',
    version:        'Version',
    privacy:        'Confidentialité',
    privacySub:     'Aucune donnée ne quitte ton téléphone',
    notifications:  'Notifications',
    notifMorning:   'Réveil du Guerrier (matin)',
    notifNoon:      'Vérification mi-journée',
    notifEvening:   'Bilan du soir',
    notifHourly:    'Suivi horaire',
    gamification:   'Gamification',
    hapticFeedback: 'Vibrations',
    hapticSub:      'Retour haptique lors des victoires',
    soundEffects:   'Effets sonores',
    soundSub:       'Sons lors des succès',
    profile:        'Profil Guerrier',
    warriorName:    'Nom du Guerrier',
  },

  // ── Gamification ────────────────────────────────────────
  gamification: {
    levelUp:        'Niveau supérieur !',
    achievement:    'Nouvelle Médaille',
    streakContinued:'Streak maintenu !',
    streakBroken:   'Streak brisé...',
    streakProtected:'Shield utilisé — Streak protégé',
    shieldEarned:   'Shield gagné !',
    perfectDay:     'Journée Parfaite !',
    perfectWeek:    'Semaine de Légende !',
    bossDefeated:   'Boss vaincu !',
    comboLabel:     'COMBO',
    ranks: {
      Recrue:         'Recrue',
      Fantassin:      'Fantassin',
      Guerrier:       'Guerrier',
      Vétéran:        'Vétéran',
      'Guerrier Élite':'Guerrier Élite',
      Général:        'Général',
      Légende:        'Légende',
    },
  },
} as const;

/**
 * Type structurel où toutes les feuilles sont de simples chaînes,
 * afin que le catalogue anglais puisse utiliser des textes différents
 * tout en respectant exactement la même arborescence de clés.
 */
type DeepString<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>;
};

export type Translations = DeepString<typeof fr>;
