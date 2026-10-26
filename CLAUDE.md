# CLAUDE.md — Guide pour agents Claude (Claude Code)

Fichier de contexte lu automatiquement par Claude Code. Il résume les règles
non négociables du projet **GBECHE** (« ma vie » en fon, Bénin) : une application
Expo de discipline personnelle, 100 % hors-ligne, à l'identité visuelle
« néon militaire ».

## Stack

- Expo SDK 54, React Native, expo-router (fichiers dans `app/`), TypeScript strict.
- `expo-sqlite` comme **seule** source de vérité des données.
- Web = export statique Metro (`expo export --platform web`) déployé sur Netlify ;
  persistance web via OPFS + instantanés JSON.
- Tests : Jest + jest-expo + react-test-renderer (voir `*.test.ts(x)`).
- Pas de serveur, pas d'API tierce, **aucun appel réseau dans le code applicatif**.

## Commandes

```bash
npm test                      # suite Jest complète (doit rester verte)
npx tsc --noEmit              # vérification de types, 0 erreur attendue
npm run lint                  # ESLint flat config + plugin react-native-a11y
node scripts/audit.js         # audit consolidé → docs/AUDIT_REPORT.md
node scripts/generate-brand-assets.js   # régénère les assets de marque
EXPO_OFFLINE=1 npx expo export --platform web   # build web (dist/)
```

Toujours lancer dans l'ordre : `tsc` → `npm test` → `lint` → builds, avant de pousser.

## Règles d'or (ne jamais enfreindre)

1. **Hors-ligne total** : aucun `fetch`, `XMLHttpRequest`, `WebSocket`, URL `http(s)://`
   dans `app/` ou `src/`. L'audit `scripts/audit.js` détecte toute régression.
2. **Les mises à jour ne doivent jamais effacer les données.**
   - Migrations SQLite **strictement additives** : jamais de `DROP TABLE`,
     `TRUNCATE`, ni `DELETE FROM` sur une table métier (garde-fou testé + audité).
   - Base ouverte dans le dossier Documents natif ; auto-sauvegarde JSON
     (`writeAutoBackup`, rotation 3) et export/import manuels.
3. **Aucune donnée factice** : les écrans vides montrent des états vides, jamais
   de valeurs inventées.
4. **Tout écran de contenu doit défiler** (`<Screen scroll>` ou `ScrollView`).
5. Fonctionnalité annoncée = fonctionnalité finie et testée. Pas de bouton factice :
   une fonction non livrée reste hors de l'UI.
6. Anti-crash : les erreurs de rendu sont capturées par `ErrorBoundary`
   (`src/components/ui/ErrorBoundary.tsx`, exporté aussi dans `app/_layout.tsx`).

## Architecture

- `app/` — routes expo-router : `(onboarding)`, `(auth)` (PIN), `(app)` (écrans principaux).
- `src/db/` — client SQLite, migrations versionnées, repositories (un agrégat par fichier).
- `src/services/` — logique métier pure (gamification, agent local, rappels, sauvegarde…).
  Préférer des fonctions pures déterministes, faciles à tester.
- `src/components/ui/` — design system (`GlassCard`, `Screen`, `Button`, `Logo`, …).
- `src/theme/` — jetons de couleurs (dark/light), espacements, typographie, layout.
- `assets/brand/` — sources SVG du logo (tracés artisanaux, traçables, non générés par IA) ;
  `assets/images/` — PNG rasterisés par `scripts/generate-brand-assets.js`.

## Design system

- Thème sombre par défaut, accents néon cyan `#00E5FF` → vert `#00FF88`, or de grade.
- `GlassCard` est la surface standard ; la prop `blur` (`light`/`strong`) active un
  vrai flou expo-blur sur les seules surfaces élevées (à utiliser avec parcimonie
  pour préserver les performances).
- Le logo (`src/components/ui/Logo.tsx`) reprend les tracés de `assets/brand` :
  blason = protection de la vie, pulsation ECG = « GBECHE / ma vie », étoile = grade.
- Accessibilité : rôles et labels explicites sur les éléments tactiles ; le plugin
  `eslint-plugin-react-native-a11y` couvre les props invalides (erreur) et la
  couverture (avertissement).

## Agent conversationnel local (« tout faire en discutant »)

Entièrement **déterministe et hors-ligne** — jamais de modèle distant ou d'API.

- `src/services/agent/agentCommand.ts` : parseur pur. Transforme une phrase en
  `AgentAction` (`add-expense`, `add-income`, `set-budget`, `add-mission`,
  `complete-mission`, `create-account`) ou en réponse informative. Gère les montants
  en français (« 3k », « 20 mille », « 1,5 million », point millier), les catégories
  par mots-clés, les horaires, et le récit de journée multi-actions.
- `src/services/agent/agentActions.service.ts` : exécution via les repositories
  existants (aucune écriture silencieuse : l'UI montre une carte de confirmation),
  bilans purs `buildFinanceReview` / `buildDayReview` sur chiffres réels.
- `src/services/agent.service.ts` : réponses informatives de secours (intentions).
- Persistance `src/db/repositories/chat.repo.ts` (table `chat_messages`, colonnes
  `payload_json`/`status` ajoutées par la migration additive v3).
- Écran `app/(app)/agent.tsx` : bulles + cartes d'action Confirmer/Annuler.

## Navigation gestuelle et tutoriel

- `src/components/ui/SwipeTabView.tsx` : changement d'onglet par balayage horizontal
  via `PanResponder` natif (zéro dépendance). La fonction pure `decideSwipe` est testée.
- `src/components/ui/tutorial.model.ts` + `Tutorial.tsx` : tutoriel guidé au premier
  lancement, relançable depuis Réglages. Drapeau settings `tutorial_done` ; l'état
  transitoire d'ouverture vit dans `useAppStore` (`openTutorial`/`closeTutorial`).

## Build et livraison

- Web : `dist/` est committé sur la branche **et** archivé dans `gbeche-dist.zip`.
- Natif : bundles Hermes Android/iOS validés par `npx expo export` ; aucun build
  EAS interactif ni credential FCM ne doit être requis pour vérifier une évolution.
- L'alignement de versions natives suit `bundledNativeModules.json` du SDK ; ne pas
  lancer `npm audit fix --force` (il casserait l'alignement du SDK). Les vulnérabilités
  connues sont limitées à l'outillage de build et documentées dans `docs/AUDIT_REPORT.md`.
