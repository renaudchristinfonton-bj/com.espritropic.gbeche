# GBECHE — Quartier Général de discipline personnelle

Application mobile **100 % hors-ligne** qui transforme ta vie en stratégie militaire :

- **Guerres** = tes domaines de vie (Finance, Santé, Carrière, Spirituel, Relations, Éducation, Loisirs)
- **Batailles** = tes objectifs mesurables avec échéance
- **Adversaires** = tes tâches, ponctuelles ou récurrentes
- **Victoires / Défaites** = XP, combos, streaks et rangs de guerrier

Aucun serveur, aucune connexion Internet, aucune télémétrie : toutes les données
restent dans SQLite sur l'appareil, derrière un verrou PIN / biométrie.

## Stack

| Brique | Choix |
|---|---|
| Socle | Expo SDK 54 · React Native 0.81 (nouvelle architecture) · TypeScript strict |
| Navigation | expo-router (Stack + Tabs) |
| Persistance | **expo-sqlite** (SQLite / WAL) via couche repository + migrations |
| Sécurité | expo-secure-store, expo-local-authentication, expo-crypto (PIN salé + haché) |
| État UI | zustand + immer (les données métier restent dans SQLite) |
| UI | Design system maison (tokens, glassmorphism, Reanimated 4 + Worklets, haptics) |
| Graphes | SVG sur-mesure (donut, barres, radar, heatmap) |
| Build | EAS Build — APK de test interne, AAB de production |

## Architecture

```
app/                     Routes expo-router : onboarding, auth (PIN), app (tabs)
src/
  db/                    Client SQLite, migrations, settings, hook réactif
    repositories/        Accès SQL par table (wars, battles, adversaries, finance…)
  domain/                Catalogue métier (guerres par défaut, catégories, présets)
  services/              Logique : sécurité, gamification, finances, récurrence, seed
  store/                 Store zustand (session, feedback XP, actions rapides)
  theme/  i18n/  components/
```

Principe directeur : **un écran n'écrit jamais de SQL**, un repository ne contient
pas de logique d'écran, et il n'existe aucune donnée fictive — tout chiffre affiché
provient de la base.

## Commandes

```bash
npm install
npm run typecheck                 # TypeScript strict
npx eslint .                      # lint (0 erreur)
npx expo start --dev-client       # avec un development build sur appareil
npx eas-cli build -p android --profile preview     # APK de test
```

Voir **[docs/BUILD.md](docs/BUILD.md)** pour la procédure EAS complète et
**[docs/CAHIER_DES_CHARGES.md](docs/CAHIER_DES_CHARGES.md)** pour la spécification
produit et technique (Phase 1 livrée, Phase 2 roadmap).

## Phases

- **Phase 1 (livrée)** — socle SQLite, sécurité, onboarding réel, Quartier Général,
  Guerres/Batailles/Adversaires avec récurrence glissante, Finances
  (comptes, transactions, budgets, graphes), réglages, build EAS.
- **Phase 2 (roadmap)** — calendrier et suivi horaire, notifications,
  réajustement automatique, agent NLP local, export/import CSV, santé/humeur.
