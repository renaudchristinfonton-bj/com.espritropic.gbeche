/**
 * GBECHE — Guides de vie intégrés (base d'éducation 100 % hors-ligne).
 *
 * Chaque guide joue le rôle d'un conseiller thématique : mots-clés de
 * détection, questions de précision à poser, et modèle de plan (guerre,
 * batailles, missions récurrentes, éventuelle enveloppe d'épargne).
 *
 * Ce contenu est rédigé, versionné et livré avec l'app — aucune recherche
 * internet, aucun modèle distant. Il pourra être enrichi par import JSON.
 * Tous les mots-clés sont écrits en forme normalisée (minuscules, sans
 * accents) pour matcher la sortie de normalize() de l'agent.
 */
import type { DomainType, Frequency } from '../db/types';

export type LifeQuestionKind = 'text' | 'choice' | 'amount' | 'months';

export interface LifeGuideQuestion {
  id: string;
  label: string;
  kind: LifeQuestionKind;
  /** Réponses rapides proposées en pastilles (kind 'choice' ou 'months'). */
  choices?: string[];
  hint?: string;
}

export interface LifeMissionTemplate {
  /** Le titre peut contenir des emplacements {slotId}. */
  title: string;
  frequency: Frequency;
  hour: number;
  durationMin?: number;
  /** ISO 1..7 (lundi..dimanche), uniquement pour specific_days. */
  specificDays?: number[];
}

export interface LifeBattleTemplate {
  title: string;
  priority: 'low' | 'medium' | 'high';
  missions: LifeMissionTemplate[];
}

export interface LifeSavingsTemplate {
  /** Slot portant le montant total visé (kind 'amount'). */
  targetSlot: string;
  /** Slot portant l'horizon du projet (kind 'months'). */
  horizonSlot: string;
  category: 'savings';
  label: string;
  missionTitle: string;
}

export interface LifeGuide {
  id: string;
  title: string;
  icon: string;
  color: string;
  domainType: DomainType;
  /** Forme normalisée (minuscules, sans accents) — matching mot entier. */
  keywords: string[];
  pitch: string;
  questions: LifeGuideQuestion[];
  battles: LifeBattleTemplate[];
  savings?: LifeSavingsTemplate;
}

const HORIZON_CHOICES = ['3 mois', '6 mois', '1 an', '2 ans ou plus'];

export const LIFE_GUIDES: LifeGuide[] = [
  {
    id: 'marriage',
    title: 'Mariage & vie de couple',
    icon: 'heart',
    color: '#FF6B8A',
    domainType: 'family',
    keywords: ['mariage', 'marier', 'mariee', 'epouser', 'epoux', 'epouse', 'couple', 'fiancailles', 'noces'],
    pitch:
      "Le mariage se prépare comme une opération : vision claire, budget maîtrisé et fondations solides. Je vais te poser quelques questions pour bâtir un plan concret.",
    questions: [
      {
        id: 'vision',
        label: 'Concrètement, à quoi ressemble ton projet : célébration, foyer, étape avec ton/ta partenaire ? Décris-le en une phrase.',
        kind: 'text',
      },
      {
        id: 'horizon',
        label: 'Dans quel délai vises-tu ce mariage ?',
        kind: 'months',
        choices: HORIZON_CHOICES,
      },
      {
        id: 'target',
        label: 'Quel budget total estimes-tu pour la célébration et l’installation (FCFA) ?',
        kind: 'amount',
        hint: 'Exemple : 1 500 000 FCFA',
      },
      {
        id: 'rhythm',
        label: 'Combien de temps par semaine peux-tu consacrer aux préparatifs ?',
        kind: 'choice',
        choices: ['15 min/jour', '30 min/jour', '1h/jour', 'Selon le planning'],
      },
    ],
    savings: {
      targetSlot: 'target',
      horizonSlot: 'horizon',
      category: 'savings',
      label: 'Épargne mariage',
      missionTitle: 'Verser mon enveloppe d’épargne mariage',
    },
    battles: [
      {
        title: 'Préparation du mariage',
        priority: 'high',
        missions: [
          { title: 'Point mariage : checklist, prestataires et démarches', frequency: 'weekly', hour: 10, specificDays: [6], durationMin: 45 },
          { title: 'Revoir le budget mariage et l’épargne constituée', frequency: 'monthly', hour: 19, durationMin: 30 },
        ],
      },
      {
        title: 'Fondations du couple',
        priority: 'medium',
        missions: [
          { title: 'Temps de connexion à deux : échange ou prière commune', frequency: 'daily', hour: 21, durationMin: 15 },
          { title: 'Soirée de couple planifiée et protégée', frequency: 'weekly', hour: 19, specificDays: [5], durationMin: 90 },
        ],
      },
    ],
  },
  {
    id: 'vehicle',
    title: 'Véhicule (voiture ou moto)',
    icon: 'car',
    color: '#00E5FF',
    domainType: 'finance',
    keywords: ['voiture', 'vehicule', 'moto', 'automobile', 'permis', 'conduire', 'engin'],
    pitch:
      "Un véhicule, c'est d'abord une discipline d'épargne et des démarches ordonnées. Je te guide pour fixer la cible, le rythme et les étapes.",
    questions: [
      {
        id: 'vision',
        label: 'Quel véhicule vises-tu (modèle, neuf ou occasion, usage principal) ?',
        kind: 'text',
      },
      {
        id: 'target',
        label: 'Quel montant total viser pour l’achat, assurances comprises (FCFA) ?',
        kind: 'amount',
        hint: 'Exemple : 3 000 000 FCFA',
      },
      {
        id: 'horizon',
        label: 'Dans quel délai veux-tu l’acquérir ?',
        kind: 'months',
        choices: HORIZON_CHOICES,
      },
      {
        id: 'stage',
        label: 'Où en es-tu aujourd’hui ?',
        kind: 'choice',
        choices: ['Permis en poche', 'Permis en cours', 'Pas encore le permis', 'J’économise seulement'],
      },
    ],
    savings: {
      targetSlot: 'target',
      horizonSlot: 'horizon',
      category: 'savings',
      label: 'Épargne véhicule',
      missionTitle: 'Verser mon enveloppe d’épargne véhicule',
    },
    battles: [
      {
        title: 'Financement du véhicule',
        priority: 'high',
        missions: [
          { title: 'Suivre mes dépenses pour dégager mon enveloppe véhicule', frequency: 'weekly', hour: 18, specificDays: [7], durationMin: 20 },
        ],
      },
      {
        title: 'Démarches & préparation',
        priority: 'medium',
        missions: [
          { title: 'Une démarche véhicule (permis, devis, comparaison, documents)', frequency: 'weekly', hour: 18, specificDays: [3], durationMin: 30 },
          { title: 'Comparer trois offres : prix, assurance, entretien', frequency: 'monthly', hour: 10, durationMin: 45 },
        ],
      },
    ],
  },
  {
    id: 'faith',
    title: 'Croissance dans la foi',
    icon: 'leaf',
    color: '#A78BFA',
    domainType: 'spiritual',
    keywords: ['foi', 'spirituel', 'spirituelle', 'prier', 'priere', 'bible', 'eglise', 'jeune', 'meditation', 'mediter', 'dieu'],
    pitch:
      "Grandir dans la foi repose sur une règle de vie tenable, pas sur l'élan d'un jour. Construisons ensemble des habitatures quotidiennes et un ancrage communautaire.",
    questions: [
      {
        id: 'vision',
        label: 'Que signifie « grandir dans la foi » pour toi en ce moment (prière, connaissance, service, caractère) ?',
        kind: 'text',
      },
      {
        id: 'horizon',
        label: 'Sur quel horizon veux-tu ancrer cette nouvelle règle de vie ?',
        kind: 'months',
        choices: HORIZON_CHOICES,
      },
      {
        id: 'rhythm',
        label: 'Quel temps quotidien peux-tu tenir durablement ?',
        kind: 'choice',
        choices: ['10 min/jour', '20 min/jour', '30 min et plus/jour'],
      },
    ],
    battles: [
      {
        title: 'Vie quotidienne avec Dieu',
        priority: 'high',
        missions: [
          { title: 'Temps de prière et de lecture biblique', frequency: 'daily', hour: 6, durationMin: 15 },
          { title: 'Un acte de foi concret : service, pardon ou gratitude', frequency: 'daily', hour: 20, durationMin: 10 },
        ],
      },
      {
        title: 'Croissance & communauté',
        priority: 'medium',
        missions: [
          { title: 'Culte ou réunion de communauté', frequency: 'weekly', hour: 9, specificDays: [7], durationMin: 90 },
          { title: 'Étude biblique approfondie ou formation', frequency: 'weekly', hour: 19, specificDays: [4], durationMin: 45 },
        ],
      },
    ],
  },
  {
    id: 'housing',
    title: 'Logement & propriété',
    icon: 'home',
    color: '#FFD700',
    domainType: 'finance',
    keywords: ['logement', 'maison', 'appartement', 'terrain', 'construire', 'habitation', 'domicile', 'propriete'],
    pitch:
      "Un projet immobilier se gagne par la régularité de l'épargne et des démarches méthodiques. Je transforme ton objectif en plan d'attaque.",
    questions: [
      {
        id: 'vision',
        label: 'Que vises-tu : terrain, maison en construction, appartement, ou meilleur loyer ? Et dans quelle zone ?',
        kind: 'text',
      },
      {
        id: 'target',
        label: 'Quelle enveloppe totale prévois-tu pour ce projet (FCFA) ?',
        kind: 'amount',
        hint: 'Exemple : 5 000 000 FCFA',
      },
      {
        id: 'horizon',
        label: 'Dans quel délai veux-tu atteindre ce palier ?',
        kind: 'months',
        choices: HORIZON_CHOICES,
      },
      {
        id: 'stage',
        label: 'Quelle est ta situation actuelle ?',
        kind: 'choice',
        choices: ['Chez un proche', 'En location', 'Terrain déjà acquis', 'Recherche en cours'],
      },
    ],
    savings: {
      targetSlot: 'target',
      horizonSlot: 'horizon',
      category: 'savings',
      label: 'Épargne logement',
      missionTitle: 'Verser mon enveloppe d’épargne logement',
    },
    battles: [
      {
        title: 'Financement immobilier',
        priority: 'high',
        missions: [
          { title: 'Suivre mon enveloppe logement et mes dépenses du mois', frequency: 'weekly', hour: 18, specificDays: [7], durationMin: 20 },
        ],
      },
      {
        title: 'Démarches & préparation',
        priority: 'medium',
        missions: [
          { title: 'Une avancée concrète : visite, dossier, devis ou information vérifiée', frequency: 'monthly', hour: 10, durationMin: 60 },
        ],
      },
    ],
  },
  {
    id: 'education',
    title: 'Études & formation',
    icon: 'school',
    color: '#FF9F43',
    domainType: 'education',
    keywords: ['etudes', 'etude', 'formation', 'diplome', 'ecole', 'universite', 'examen', 'concours', 'certification', 'apprentissage', 'savoir'],
    pitch:
      "La réussite scolaire est une guerre de régularité : programme clair, séances concentrées et bilans fréquents. Organisons ton plan d'étude.",
    questions: [
      {
        id: 'vision',
        label: 'Quel diplôme, examen ou savoir veux-tu obtenir, et pourquoi ?',
        kind: 'text',
      },
      {
        id: 'horizon',
        label: 'Quel est ton délai avant l’échéance ?',
        kind: 'months',
        choices: HORIZON_CHOICES,
      },
      {
        id: 'rhythm',
        label: 'Combien d’heures d’étude peux-tu placer chaque semaine ?',
        kind: 'choice',
        choices: ['2 heures', '5 heures', '10 heures ou plus'],
      },
    ],
    battles: [
      {
        title: 'Programme d’étude',
        priority: 'high',
        missions: [
          { title: 'Session d’étude concentrée, téléphone hors de portée', frequency: 'daily', hour: 19, durationMin: 45 },
          { title: 'Bilan de la semaine et planification de la suivante', frequency: 'weekly', hour: 17, specificDays: [7], durationMin: 30 },
        ],
      },
      {
        title: 'Réussite des échéances',
        priority: 'medium',
        missions: [
          { title: 'Entraînement type examen ou projet pratique', frequency: 'weekly', hour: 9, specificDays: [6], durationMin: 90 },
          { title: 'Bilan des progrès et ajustement du programme', frequency: 'monthly', hour: 18, durationMin: 30 },
        ],
      },
    ],
  },
  {
    id: 'career',
    title: 'Carrière & revenus',
    icon: 'briefcase',
    color: '#4DA3FF',
    domainType: 'career',
    keywords: ['carriere', 'emploi', 'travail', 'metier', 'promotion', 'reconversion', 'revenus', 'employabilite', 'cv'],
    pitch:
      "Une carrière se construit par actions délibérées : compétences, réseau et opportunités. Je te propose un plan d'assaut mesurable.",
    questions: [
      {
        id: 'vision',
        label: 'Quel poste, statut ou niveau de revenu vises-tu précisément ?',
        kind: 'text',
      },
      {
        id: 'horizon',
        label: 'Dans quel délai veux-tu décrocher cette étape ?',
        kind: 'months',
        choices: HORIZON_CHOICES,
      },
      {
        id: 'priority',
        label: 'Que dois-tu développer en priorité ?',
        kind: 'choice',
        choices: ['Compétences techniques', 'Réseau & visibilité', 'Discipline & productivité', 'Reconversion complète'],
      },
    ],
    battles: [
      {
        title: 'Montée en compétence',
        priority: 'high',
        missions: [
          { title: 'Bloc de travail profond sur mon objectif carrière', frequency: 'daily', hour: 18, durationMin: 45 },
          { title: 'Action réseau : contact, contenu ou échange avec un mentor', frequency: 'weekly', hour: 18, specificDays: [2], durationMin: 30 },
        ],
      },
      {
        title: 'Opportunités & visibilité',
        priority: 'medium',
        missions: [
          { title: 'Postuler, proposer mes services ou mettre à jour mon CV', frequency: 'weekly', hour: 10, specificDays: [5], durationMin: 45 },
          { title: 'Bilan carrière : opportunités, revenus, blocages', frequency: 'monthly', hour: 19, durationMin: 30 },
        ],
      },
    ],
  },
  {
    id: 'health',
    title: 'Santé & forme physique',
    icon: 'fitness',
    color: '#00FF88',
    domainType: 'health',
    keywords: ['sante', 'forme', 'sport', 'maigrir', 'poids', 'musculation', 'courir', 'nutrition', 'endurance', 'regime'],
    pitch:
      "Le corps est le QG de toutes tes autres guerres : on vise un objectif mesurable, un programme tenable et un suivi hebdomadaire.",
    questions: [
      {
        id: 'vision',
        label: 'Quel objectif santé précis veux-tu atteindre (poids, endurance, énergie, silhouette) ?',
        kind: 'text',
      },
      {
        id: 'horizon',
        label: 'Sur quel horizon t’engages-tu ?',
        kind: 'months',
        choices: HORIZON_CHOICES,
      },
      {
        id: 'rhythm',
        label: 'Combien de séances par semaine peux-tu tenir ?',
        kind: 'choice',
        choices: ['2 séances', '3 à 4 séances', '5 séances ou plus'],
      },
    ],
    battles: [
      {
        title: 'Entraînement',
        priority: 'high',
        missions: [
          { title: 'Séance de sport programmée', frequency: 'specific_days', specificDays: [1, 3, 5], hour: 18, durationMin: 45 },
          { title: 'Hydratation et objectif pas du jour', frequency: 'daily', hour: 21, durationMin: 10 },
        ],
      },
      {
        title: 'Nutrition & récupération',
        priority: 'medium',
        missions: [
          { title: 'Préparer mes repas et limiter le sucre ajouté', frequency: 'daily', hour: 12, durationMin: 20 },
          { title: 'Bilan poids/forme et ajustement du programme', frequency: 'weekly', hour: 8, specificDays: [6], durationMin: 20 },
        ],
      },
    ],
  },
  {
    id: 'family',
    title: 'Famille & relations',
    icon: 'people',
    color: '#FF6B35',
    domainType: 'family',
    keywords: ['famille', 'enfant', 'bebe', 'parentalite', 'parents', 'soeur', 'frere', 'fonder', 'relation'],
    pitch:
      "La famille mérite une stratégie, pas seulement du temps volé au hasard. Posons des rituels protecteurs et un suivi des responsabilités.",
    questions: [
      {
        id: 'vision',
        label: 'Que veux-tu construire ou réparer pour ta famille dans les mois à venir ?',
        kind: 'text',
      },
      {
        id: 'horizon',
        label: 'Sur quel horizon veux-tu installer ces nouvelles habitudes ?',
        kind: 'months',
        choices: HORIZON_CHOICES,
      },
      {
        id: 'rhythm',
        label: 'Quel temps peux-tu protéger chaque semaine pour ta famille ?',
        kind: 'choice',
        choices: ['Une soirée', 'Une demi-journée', 'Une journée complète'],
      },
    ],
    battles: [
      {
        title: 'Liens familiaux',
        priority: 'high',
        missions: [
          { title: 'Échange de qualité avec un membre de ma famille', frequency: 'daily', hour: 19, durationMin: 15 },
          { title: 'Activité familiale planifiée : repas, sortie ou appel', frequency: 'weekly', hour: 16, specificDays: [6], durationMin: 120 },
        ],
      },
      {
        title: 'Organisation & responsabilités',
        priority: 'medium',
        missions: [
          { title: 'Une tâche qui soulage la maison', frequency: 'weekly', hour: 9, specificDays: [6], durationMin: 60 },
          { title: 'Bilan des besoins de chacun et des responsabilités', frequency: 'monthly', hour: 19, durationMin: 30 },
        ],
      },
    ],
  },
  {
    id: 'business',
    title: 'Entrepreneuriat & business',
    icon: 'storefront',
    color: '#2EE6A8',
    domainType: 'career',
    keywords: ['entrepreneur', 'entreprise', 'business', 'commerce', 'startup', 'start up', 'client', 'lancer', 'activite'],
    pitch:
      "Un business se construit sur l'exécution quotidienne et le suivi des chiffres. Je transforme ton idée en plan de campagne.",
    questions: [
      {
        id: 'vision',
        label: 'Quel produit ou service veux-tu lancer, et pour quels clients ?',
        kind: 'text',
      },
      {
        id: 'horizon',
        label: 'Quel est ton horizon pour les premiers résultats sérieux ?',
        kind: 'months',
        choices: HORIZON_CHOICES,
      },
      {
        id: 'stage',
        label: 'Où en es-tu aujourd’hui ?',
        kind: 'choice',
        choices: ['Idée seulement', 'Étude en cours', 'Premiers clients', 'Prêt à passer à l’échelle'],
      },
    ],
    battles: [
      {
        title: 'Construction de l’offre',
        priority: 'high',
        missions: [
          { title: 'Une action concrète sur le business : produit, devis ou client', frequency: 'daily', hour: 17, durationMin: 45 },
          { title: 'Travailler l’offre et l’argumentaire de vente', frequency: 'weekly', hour: 18, specificDays: [3], durationMin: 45 },
        ],
      },
      {
        title: 'Clients & chiffres',
        priority: 'medium',
        missions: [
          { title: 'Démarcher ou publier pour attirer des clients', frequency: 'weekly', hour: 18, specificDays: [1], durationMin: 45 },
          { title: 'Suivre revenus, dépenses et marge du business', frequency: 'weekly', hour: 11, specificDays: [6], durationMin: 30 },
        ],
      },
    ],
  },
  {
    id: 'travel',
    title: 'Voyage & découverte',
    icon: 'airplane',
    color: '#6366F1',
    domainType: 'leisure',
    keywords: ['voyage', 'voyager', 'vacances', 'tourisme', 'visa', 'billet', 'destination', 'etranger'],
    pitch:
      "Un voyage réussi se finance et se prépare à l'avance. Fixons la destination, le budget et les réservations pour partir sans dettes.",
    questions: [
      {
        id: 'vision',
        label: 'Quelle destination et quel type de voyage rêves-tu ?',
        kind: 'text',
      },
      {
        id: 'target',
        label: 'Quel budget total prévois-tu pour ce voyage (FCFA) ?',
        kind: 'amount',
        hint: 'Exemple : 800 000 FCFA',
      },
      {
        id: 'horizon',
        label: 'Quand veux-tu partir ?',
        kind: 'months',
        choices: HORIZON_CHOICES,
      },
      {
        id: 'stage',
        label: 'Où en es-tu dans la préparation ?',
        kind: 'choice',
        choices: ['Je rêve seulement', 'Je compare les destinations', 'Je réserve bientôt'],
      },
    ],
    savings: {
      targetSlot: 'target',
      horizonSlot: 'horizon',
      category: 'savings',
      label: 'Épargne voyage',
      missionTitle: 'Verser mon enveloppe d’épargne voyage',
    },
    battles: [
      {
        title: 'Financement du voyage',
        priority: 'high',
        missions: [
          { title: 'Suivre mon enveloppe voyage et mes dépenses', frequency: 'weekly', hour: 18, specificDays: [7], durationMin: 15 },
        ],
      },
      {
        title: 'Préparation du séjour',
        priority: 'medium',
        missions: [
          { title: 'Une avancée réservation : billet, hébergement ou papiers', frequency: 'monthly', hour: 10, durationMin: 45 },
          { title: 'Rechercher une info pratique sur la destination', frequency: 'weekly', hour: 19, specificDays: [4], durationMin: 20 },
        ],
      },
    ],
  },
  {
    id: 'discipline',
    title: 'Discipline & habitudes',
    icon: 'flame',
    color: '#FF4D6D',
    domainType: 'custom',
    keywords: ['discipline', 'habitude', 'routine', 'procrastination', 'productivite', 'organiser', 'paresse', 'retard'],
    pitch:
      "La discipline est la mère de toutes les victoires. On identifie la fuite, on installe des routines et on mesure la régularité.",
    questions: [
      {
        id: 'vision',
        label: 'Quelle habitude veux-tu installer, ou quel défaut veux-tu vaincre ?',
        kind: 'text',
      },
      {
        id: 'horizon',
        label: 'Sur quel horizon t’engages-tu ?',
        kind: 'months',
        choices: HORIZON_CHOICES,
      },
      {
        id: 'blocker',
        label: 'Quel est ton plus gros point de blocage ?',
        kind: 'choice',
        choices: ['Le téléphone et les distractions', 'La procrastination', 'Le manque de sommeil', 'Le manque de régularité'],
      },
    ],
    battles: [
      {
        title: 'Routines gagnantes',
        priority: 'high',
        missions: [
          { title: 'Routine du matin : prière, mouvement et plan du jour', frequency: 'daily', hour: 5, durationMin: 20 },
          { title: 'Bilan du soir et préparation de demain', frequency: 'daily', hour: 21, durationMin: 15 },
        ],
      },
      {
        title: 'Élimination des fuites',
        priority: 'medium',
        missions: [
          { title: 'Audit de mon temps : où partent mes heures ?', frequency: 'weekly', hour: 20, specificDays: [7], durationMin: 20 },
          { title: 'Bloc de travail sans téléphone, minimum 25 minutes', frequency: 'daily', hour: 16, durationMin: 30 },
        ],
      },
    ],
  },
];

const GUIDE_IDS = new Set(LIFE_GUIDES.map((g) => g.id));

export function getLifeGuide(id: string): LifeGuide | undefined {
  return LIFE_GUIDES.find((g) => g.id === id);
}

export function lifeGuideIds(): Set<string> {
  return GUIDE_IDS;
}
