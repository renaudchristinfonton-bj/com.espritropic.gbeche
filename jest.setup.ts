/**
 * GBECHE — Préparation globale des tests Jest.
 * Le preset jest-expo mocke déjà la majorité des modules natifs ;
 * on ajoute ici les silences utiles aux tests.
 */

// Les retours haptiques n'ont aucun sens en test : le wrapper est mocké
// pour toutes les plateformes avec la même surface d'API que le réel.
jest.mock('@/src/services/haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

// Aucune base native en test : les modules qui en dépendent (thème via le
// cache settings, etc.) doivent pouvoir s'importer sans moteur SQLite.
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

// Les polices d'icônes ne se résolvent pas dans l'environnement de test :
// on remplace le jeu d'icônes par un composant texte léger qui expose
// tout de même le nom de l'icône dans son rendu.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const makeIcon = () => {
    function MockIcon({ name, ...props }: { name?: string }) {
      return React.createElement(Text, props, name ?? null);
    }
    return MockIcon;
  };
  return {
    Ionicons: makeIcon(),
    MaterialCommunityIcons: makeIcon(),
    FontAwesome: makeIcon(),
  };
});

// Le stockage sûr natif n'existe pas sous Jest : localStorage de jsdom
// fait office de backend, comme dans secureStorage.web.ts.
jest.mock('@/src/services/secureStorage', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  setItemAsync: jest.fn(async (key: string, value: string) => {
    globalThis.localStorage.setItem(key, value);
  }),
  getItemAsync: jest.fn(async (key: string) => globalThis.localStorage.getItem(key)),
  deleteItemAsync: jest.fn(async (key: string) => {
    globalThis.localStorage.removeItem(key);
  }),
  isAvailableAsync: jest.fn(async () => true),
}));
