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
npx expo export --platform android --output-dir /tmp/gbeche-export
```

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

## 9. Dépannage

- **Erreur de plugin Babel** : vérifie que `babel-preset-expo` et
  `react-native-worklets` sont bien installés (ils sont dans `package.json`).
- **Versions natives désalignées** : ne pas utiliser `expo install` hors-ligne ;
  les versions sont épinglées manuellement sur la table du SDK 54
  (`node_modules/expo/bundledNativeModules.json`).
- **Build EAS qui échoue à l'install npm** : le `.npmrc` est versionné,
  EAS le reprend automatiquement.
- **Base corrompue pendant un test** : Réglages → Réinitialiser l'application.
