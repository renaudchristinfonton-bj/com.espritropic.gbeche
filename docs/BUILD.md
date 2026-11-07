# GBECHE — Build & distribution (Expo / EAS)

Ce guide décrit comment produire un **APK Android testable** directement depuis
[expo.dev](https://expo.dev), puis un bundle de production.

## 1. Prérequis

- Node.js **20+** (`node -v`) et npm 10+.
- Un compte Expo gratuit sur https://expo.dev.
- Le projet est déjà lié à un projet EAS (`extra.eas.projectId` dans `app.json`).
- Télécharger **Expo Go** ou, recommandé, un *development build* GBECHE (voir plus bas).

## 2. Installation des dépendances

```bash
npm install
npm run typecheck   # doit terminer sans erreur
```

Le fichier `.npmrc` active `legacy-peer-deps=true` : certains pairs transitifs
(react-dom via react-native-web) ne sont pas alignés sur la version React du SDK,
c'est une configuration Expo courante et reproductible, y compris sur EAS.

## 3. Vérifications locales avant un build

```bash
npm run typecheck      # TypeScript strict
npx eslint .           # 0 erreur (des warnings peuvent subsister)
npm test               # 47 tests unitaires Jest (logique métier + composant PIN)
npx expo export --platform android --output-dir /tmp/gbeche-export
```

## 3 bis. Tests unitaires

Le projet utilise **Jest** avec le preset `jest-expo` (configuration dans
`jest.config.js`, préparation globale dans `jest.setup.ts`). Lancer :

```bash
npm test               # toutes les suites
npm run test:coverage  # avec couverture
```

Couverture actuelle (sous `src/**/__tests__/`) :

| Suite | Ce qui est protégé |
| --- | --- |
| `routing.test.ts` | matrice de décision du BootGate (onboarding / PIN / app), garde-fou anti-boucle de navigation |
| `PinPad.test.tsx` | saisie chiffre par chiffre, plafond à 4, retour arrière, déclenchement de `onFull` (non-régression du bug de saisie PIN) |
| `security.test.ts` | PIN haché (jamais en clair), rejet des codes non conformes, cycle de vie, biométrie absente |
| `gamification.test.ts` | XP, multiplicateurs de combo, montée de niveau, streaks, défaite |
| `recurrence.test.ts` | moteur d'occurrences quotidiennes/hebdo/mensuelles/jours choisis, bornes et heures |
| `settings.test.ts` | cache de préférences et valeurs par défaut |
| `wars.repo.test.ts` | création de guerres, ordre de tri, activation, suppression |
| `format.test.ts` | devises FCFA, dates, clés de mois, formule de politesse |

Les modules natifs (SQLite, stockage sûr, haptiques, icônes) sont mockés :
les tests ne dépendent d'aucun appareil ni réseau.

La dernière commande compile le bundle Hermes complet sans machine native :
si elle réussit, le build EAS part sur une base saine.

## 4. Connexion à EAS

```bash
npx eas-cli login
npx eas-cli build:configure     # déjà configuré, à ne refaire que si besoin
```

## 5. Produire l'APK de test (recommandé pour les testeurs)

Le profil `preview` est paramétré en `android.buildType = apk`
et `distribution = internal` : EAS produit un **APK installable directement**,
sans passer par le Play Store.

```bash
npx eas-cli build -p android --profile preview
```

À la fin du build, Expo affiche un lien de téléchargement et un QR code.
Sur le téléphone : autoriser l'installation depuis des sources inconnues,
puis installer l'APK.

### Development build (pour développer avec le rechargement à chaud)

```bash
npx eas-cli build -p android --profile development
```

Ce build contient le client de développement Expo : on le connecte ensuite avec
`npx expo start --dev-client`. Les modules natifs (SQLite, SecureStore,
biométrie, Reanimated 4 / Worklets) sont tous disponibles.

> Expo Go n'est pas recommandé : Reanimated 4 et les worklets natifs nécessitent
> un development build. Utilise le profil `development` ou `preview`.

## 6. Build de production (AAB pour le Play Store)

```bash
npx eas-cli build -p android --profile production
```

Le profil `production` génère un **Android App Bundle** signé. La source de
version est **locale** (`cli.appVersionSource: "local"`) : le `android.versionCode`
vit dans `app.json` et doit être incrémenté manuellement avant chaque publication
sur le Play Store (le store refuse un versionCode déjà utilisé).

Le build de l'AAB lui-même ne nécessite aucun compte Play Store. L'étape de
soumission (`eas submit`, ou l'option *Submit to Google Play Store* du site Expo)
est distincte et exigera plus tard une clé de compte de service Google Play ;
elle n'est pas utilisée en Phase 1.

## 7. Profils EAS (rappel)

| Profil | Usage | Sortie Android | Distribution |
|---|---|---|---|
| `development` | Dev avec Metro / dev client | APK | interne |
| `preview` | Tests QA / testeurs | **APK** | interne |
| `production` | Publication | AAB signé (versionCode manuel dans app.json) | store |

## 8. Que vérifier sur l'APK de test (cahier de recette Phase 1)

1. Onboarding 5 écrans : PIN + biométrie, comptes et soldes, guerres actives.
2. Fermer et rouvrir l'app → l'écran PIN s'affiche ; les données sont conservées.
3. Onglet **Guerres** : créer une bataille, une routine, constater les instances
   planifiées, marquer une victoire → feedback XP / combo / niveau.
4. Onglet **Finances** : ajouter dépense et revenu, vérifier soldes et graphe,
   poser un budget et voir la jauge se remplir.
5. **Réglages** : changer thème et langue, changer le PIN, réinitialiser
   l'application → retour à l'onboarding, base vidée.
6. Mode avion activé pendant tout le parcours : l'app fonctionne intégralement.

## 9. Version web (utilisateurs iOS / navigateur)

Le même code source se compile en site statique déployable sur Netlify :

```bash
npx expo export --platform web   # sortie dans dist/
```

La base tourne dans SQLite compilé WASM (persistance OPFS), le PIN remplace
la biométrie (indisponible dans un navigateur) et les secrets vont en
`localStorage`. La procédure Netlify complète, les en-têtes COOP/COEP requis
et les abstractions `.web.ts` sont documentées dans
[`docs/WEB_NETLIFY.md`](./WEB_NETLIFY.md).

## 10. Dépannage

- **Erreur de plugin Babel** : vérifie que `babel-preset-expo` et
  `react-native-worklets` sont bien installés (ils sont dans `package.json`).
- **Versions natives désalignées** : ne pas utiliser `expo install` hors-ligne ;
  les versions sont épinglées manuellement sur la table du SDK 54
  (`node_modules/expo/bundledNativeModules.json`).
- **Build EAS qui échoue à l'install npm** : le `.npmrc` est versionné,
  EAS le reprend automatiquement.
- **Base corrompue pendant un test** : Réglages → Réinitialiser l'application.
- **`Google Service Account Keys cannot be set up in --non-interactive mode`** :
  deux causes possibles, le message est le même dans eas-cli.
  1. **Soumission Play Store activée sur le build (cas Phase 1)** — dans le
     formulaire « Create build » d'expo.dev, l'option *Submit to Google Play
     Store* (ou auto-submit) doit rester sur **No / désactivée**. Un build
     `preview` produit un APK interne à installer manuellement : il ne se soumet
     pas au Play Store. La section `submit` a été retirée de `eas.json` pour
     l'empêcher côté dépôt. La soumission Play Store ne sera configurée qu'avec
     un compte Google Play Console et une clé de compte de service.
  2. **Notifications push (FCM v1)** — se déclenche uniquement si
     `expo-notifications` est réinstallé sans clé Firebase. En Phase 2, créer un
     projet Firebase, ajouter `google-services.json`, uploader la clé de service
     via `eas credentials` (Android → *Google Service Account Key for Push
     Notifications (FCM V1)*), puis réinstaller `expo-notifications`. Voir
     https://docs.expo.dev/push-notifications/fcm-credentials/
