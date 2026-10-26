/**
 * GBECHE — Masquage de la barre d'onglets sur les écrans plein écran.
 *
 * Les écrans poussés par-dessus les onglets (agent, données) ont leur
 * propre navigation : la barre flottante masquerait sinon leur contenu
 * bas (composer, boutons). On la cache via le navigator parent, et on
 * restaure automatiquement les options par défaut au démontage.
 */
import { useEffect } from 'react';
import { useNavigation } from 'expo-router';

export function useHideTabBar(hidden = true): void {
  const navigation = useNavigation();

  useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return;

    if (hidden) {
      parent.setOptions({ tabBarStyle: { display: 'none' } });
    }
    return () => {
      // undefined fait retomber sur les screenOptions par défaut du Tabs.
      parent.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation, hidden]);
}
