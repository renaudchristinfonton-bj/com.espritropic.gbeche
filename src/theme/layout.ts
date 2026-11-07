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
 * Hauteur de la pilule d'onglets flottante (voir app/(app)/_layout.tsx).
 * Elle est en position absolue : tout contenu défilant doit réserver cet
 * espace, sa marge basse et l'encoche système, pour ne jamais être masqué.
 */
export const FLOATING_TAB_BAR_HEIGHT = 62;

/**
 * Marge basse des ScrollView des écrans à onglets. Couvre la pilule (62),
 * son dégagement (8), l'encoche iOS (~34) et une marge d'air. Valeur
 * volontairement généreuse pour rester sûre sur tous les appareils.
 */
export const SCREEN_BOTTOM_PADDING =
  FLOATING_TAB_BAR_HEIGHT + (Platform.OS === 'ios' ? 50 : 34);

/** Conservé pour d'éventuels références historiques. */
export const TAB_BAR_HEIGHT = FLOATING_TAB_BAR_HEIGHT;

/** Largeur contrainte d'un panneau (Sheet, barre d'onglets) sur le web. */
export const centeredPanelStyle: ViewStyle =
  Platform.OS === 'web'
    ? { width: WEB_SHELL_WIDTH, maxWidth: '100%', alignSelf: 'center', left: 0, right: 0 }
    : { width: '100%' };

/**
 * Barre d'onglets flottante (pilule). Sur le web, elle reste calée dans la
 * colonne téléphone centrée, avec une marge de chaque côté ; sur mobile elle
 * occupe toute la largeur utile (les marges sont posées via left/right).
 */
export const floatingTabBarWebStyle =
  Platform.OS === 'web'
    ? ({
        width: WEB_SHELL_WIDTH - 32,
        maxWidth: 'calc(100% - 32px)',
        alignSelf: 'center',
        left: 0,
        right: 0,
      } as unknown as ViewStyle)
    : ({} as ViewStyle);

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
