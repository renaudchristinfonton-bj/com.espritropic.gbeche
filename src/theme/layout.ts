/**
 * GBECHE — Constantes de layout cross-plateforme.
 * Sur web, l'application est rendue dans une colonne de largeur type
 * téléphone centrée (voir app/_layout.tsx). Les éléments positionnés en
 * absolu (barre d'onglets, FAB, feuilles modulaires) doivent s'aligner sur
 * cette colonne plutôt que sur la fenêtre du navigateur.
 */
import { Platform, type ViewStyle } from 'react-native';

export const WEB_SHELL_WIDTH = 480;

/**
 * Hauteur réelle de la barre d'onglets (voir app/(app)/_layout.tsx).
 * Elle est en position absolue : tout contenu défilant doit réserver
 * cet espace + une marge d'air pour ne jamais être masqué.
 */
export const TAB_BAR_HEIGHT = Platform.select({ ios: 88, default: 72 });

/** Marge basse à appliquer aux ScrollView des écrans à onglets. */
export const SCREEN_BOTTOM_PADDING = TAB_BAR_HEIGHT + 20;

/** Largeur contrainte d'un panneau (Sheet, barre d'onglets) sur le web. */
export const centeredPanelStyle: ViewStyle =
  Platform.OS === 'web'
    ? { width: WEB_SHELL_WIDTH, maxWidth: '100%', alignSelf: 'center', left: 0, right: 0 }
    : { width: '100%' };

/**
 * Décalage droit d'un élément flottant (FAB) pour qu'il reste dans la
 * colonne centrée, avec une marge minimum de 16 px sur les petits écrans.
 * Les fonctions CSS max()/calc() n'existent que sur le web.
 */
export const floatingRightStyle = Platform.select({
  web: {
    right: `max(16px, calc(50% - ${WEB_SHELL_WIDTH / 2}px + 16px))`,
  },
  default: { right: 20 },
}) as ViewStyle;
