/**
 * GBECHE — Modèle pur du tutoriel guidé.
 *
 * Étapes et logique de navigation séparées de toute dépendance React/native
 * pour rester testables sans mock. Tutorial.tsx consomme ce modèle.
 */

export interface TutorialStep {
  icon: string;
  title: string;
  body: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    icon: 'shield-checkmark',
    title: 'Bienvenue au QG',
    body: 'GBECHE signifie « ma vie » en fon. Cette appli t’aide à défendre tes objectifs comme une mission : chaque routine gagnée renforce ton grade.',
  },
  {
    icon: 'home',
    title: 'Ton quartier général',
    body: 'L’écran d’accueil affiche tes missions du jour. Touche une mission pour la gagner et gagner de l’XP. Le FAB en bas à droite sert aux créations rapides.',
  },
  {
    icon: 'trophy',
    title: 'Guerres & batailles',
    body: 'Chaque domaine de vie (santé, finances, carrière…) est une guerre. Tu y crées des batailles et des routines récurrentes que l’app planifie pour toi.',
  },
  {
    icon: 'wallet',
    title: 'Finances réelles',
    body: 'Enregistre chaque dépense et chaque revenu, fixe des budgets mensuels par catégorie : l’agent te dira si tu restes dans tes plafonds.',
  },
  {
    icon: 'chatbubbles',
    title: 'Tout faire en discutant',
    body: "Ouvre l’agent depuis les Réglages. Écris « j’ai dépensé 2 500 FCFA de transport » ou « ajoute une mission sport demain 7h » : il prépare l’action, tu confirmes d’un toucher.",
  },
  {
    icon: 'swap-horizontal',
    title: 'Glisse pour naviguer',
    body: 'Balaye l’écran vers la gauche ou la droite pour passer d’un onglet à l’autre sans chercher les boutons. Tu peux revoir ce tutoriel quand tu veux, dans Réglages.',
  },
];

export interface TutorialState {
  open: boolean;
  index: number;
}

export type TutorialAction =
  | { type: 'open' }
  | { type: 'close' }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'skip' };

export const initialTutorialState: TutorialState = { open: false, index: 0 };

export function tutorialReducer(state: TutorialState, action: TutorialAction): TutorialState {
  switch (action.type) {
    case 'open':
      return { open: true, index: 0 };
    case 'close':
    case 'skip':
      return { open: false, index: 0 };
    case 'next':
      if (state.index >= TUTORIAL_STEPS.length - 1) return { open: false, index: 0 };
      return { ...state, index: state.index + 1 };
    case 'prev':
      return { ...state, index: Math.max(0, state.index - 1) };
  }
}
