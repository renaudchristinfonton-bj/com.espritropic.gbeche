# GBECHE — Cahier des Charges (Version Pro)

> **Statut** : document de référence produit & technique.
> **Version** : 2.0 — refonte complète sur socle professionnel.
> **Date** : 2026-10.
> **Remplace** : `docs/archive/GBECHE_GUIDE_COMPLET_JUNIOR.txt` (conservé comme historique des intentions).
> **Langue de l'app** : français par défaut, anglais disponible (i18n intégrée).

---

## 1. Vision produit

GBECHE est une application mobile **100 % hors-ligne** de discipline personnelle, qui gamifie la vie réelle avec une métaphore militaire :

| Vocabulaire GBECHE | Réalité produit |
|---|---|
| **Guerre** | Domaine de vie (Finance, Santé, Carrière, Spirituel, Relationnel, Éducation, Loisirs) |
| **Bataille** | Objectif mesurable avec échéance (« Constituer un fonds d'urgence de 300 000 FCFA ») |
| **Adversaire** | Tâche récurrente ou ponctuelle (« Verser 5 000 FCFA chaque lundi ») |
| **Victoire / Défaite** | Adversaire accompli / manqué à échéance |
| **Quartier Général** | Tableau de bord personnel |

### Principes directeurs

1. **Offline-first absolu** : aucune connexion Internet requise, aucun serveur, aucune télémétrie. Toutes les données restent sur l'appareil.
2. **Privacy by design** : verrouillage biométrique/PIN, secrets dans le Keystore/Keychain, aucune donnée exportée sans action explicite de l'utilisateur.
3. **Une seule source de vérité** : une base SQLite locale, accessible via une couche repository. Zéro donnée fictive dans l'interface : tout chiffre affiché provient de la base.
4. **Motivation par la boucle de progrès** : action →反馈 visuelle (XP, combo, streak) → graphes → projection. Le design récompense chaque effort en moins de 300 ms.
5. **Sobre en ressources** : démarrage < 2 s, animations 60 fps, base capable de gérer 50 000 enregistrements sans ralentissement.

---

## 2. Périmètre & découpage livrable

### 2.1 Phase 1 — « Quartier Général opérationnel » (présent livrable)

Socle technique complet + boucle centrale de valeur, tout branché sur de vraies données :

- Architecture propre (DB, repositories, services, store, design system)
- Base SQLite avec migrations et amorçage (seed)
- Sécurité : PIN 4 chiffres haché (SHA-256 + sel PBKDF2-like) + biométrie
- Onboarding 5 étapes fonctionnel (crée réellement comptes, guerres et préférences)
- Dashboard « Quartier Général » avec statistiques et adversaires du jour
- module **Guerres** : guerres, batailles, adversaires + moteur de récurrence
- module **Finances** : comptes, transactions, budgets, soldes calculés, graphes
- Paramètres essentiels : profil, thème, langue, sécurité, réinitialisation
- Configuration EAS Build prête à produire un **APK Android testable**

### 2.2 Phase 2 — « Agent & vigilance » (roadmap)

- Calendrier horaire + suivi du temps (time logs) et notifications horaires
- Réajustement automatique des adversaires manqués
- Agent conversationnel NLP local (parser d'intentions en français, cartes de validation)
- Export/import CSV, sauvegardes chiffrées
- Notifications de rappels, résumé du soir, streaks en danger
- Mode clair parfait, santé (sommeil, eau, sport), humeur
- Rapports textuels générés à partir des graphes

### 2.3 Hors périmètre (jamais en V1/V2)

- Synchronisation cloud, comptes utilisateurs distants, achats intégrés, publicité, réseaux sociaux.

---

## 3. Stack technique finale

| Couche | Technologie | Justification |
|---|---|---|
| Application | **Expo SDK 54** (+ React Native 0.82, React 19, nouvelle architecture) | Build cloud EAS sans Android Studio ; versions **épinglées** (fini les `"*"`) |
| Langage | TypeScript strict | Contrôle de type de bout en bout |
| Navigation | expo-router (fichiers, Stack + Tabs) | Déjà en place, natif Expo |
| Persistance | **expo-sqlite** (SQLite, WAL) | Module officiel Expo, aucun module natif tiers, build EAS fiable, requêtes relationnelles complètes |
| Préférences locales | Table `settings` SQLite + expo-secure-store pour les secrets | Suppression de MMKV (module natif tiers inutile) |
| Sécurité | expo-local-authentication, expo-secure-store, expo-crypto | Biométrie native, stockage matériel des clés, hachage des PIN |
| État global | zustand + immer (état UI/session uniquement) | Les données métier restent dans SQLite, jamais dupliquées dans le store |
| UI | React Native StyleSheet + **tokens de design centralisés** | Un seul système de style ; NativeWind/Tailwind supprimés |
| Animations | react-native-reanimated 4 + expo-haptics | Motion design fluide et retour tactile |
| Effets | expo-blur (glassmorphism), expo-linear-gradient | Identité visuelle |
| Graphes | react-native-svg + composants maison (Donut, Bar, Radar, Heatmap) | Contrôle pixel parfait, zéro dépendance chart lourde |
| Icônes | @expo/vector-icons (Ionicons) | Cohérence, aucun emoji dans l'UI |
| Build | EAS Build (`preview` → APK interne, `production` → AAB) | Distribution directe via expo.dev |

### Dépendances supprimées lors de la refonte

`@nozbe/watermelondb` (jamais intégré), `react-native-mmkv`, `nativewind`, `tailwindcss`, `react-native-svg-transformer`, LokiJS, tous les fichiers starter Expo et services factices.

---

## 4. Architecture

### 4.1 Flux de données unidirectionnel

```
Écran (React)
   │  appelle
   ▼
Hook réactif (useRepoQuery) ─── émet un re-fetch sur notification de changement
   │
   ▼
Service (logique métier : gamification, récurrence, soldes…)
   │
   ▼
Repository (SQL paramétré, transactions SQL)
   │
   ▼
expo-sqlite (fichier GBECHE.db, WAL)
```

Règle : **un écran ne contient jamais de SQL** ; un repository ne contient jamais de logique d'écran. Le store zustand ne porte que l'état transitoire (session verrouillée, modale ouverte, dernier gain d'XP).

### 4.2 Arborescence cible

```
app/
  _layout.tsx                 # Boot : init DB, migrations, seed, garde-fous de route
  index.tsx                   # Redirection racine
  (onboarding)/index.tsx      # 5 étapes, écritures réelles
  (auth)/pin.tsx              # Verrou PIN + biométrie
  (app)/
    _layout.tsx               # Tabs (Quartier Général, Guerres, Finances, Réglages)
    home.tsx
    wars.tsx
    finance.tsx
    settings.tsx
src/
  db/
    client.ts                 # Ouverture DB, WAL, émetteur de changements
    migrations.ts             # DDL versionnée
    types.ts                  # Types Row des tables
    settings.ts               # Clé/valeur typée
    useRepoQuery.ts           # Hook de requête réactif
    repositories/             # war, battle, adversary, account, transaction, budget, gamification…
  services/
    security.ts               # PIN, biométrie, clé maître, identifiants
    seed.ts                   # Données par défaut (6 guerres)
    wars.service.ts           # CRUD + moteur de récurrence
    finance.service.ts        # Transactions, soldes calculés, budgets
    gamification.service.ts   # XP, niveaux, rangs, streaks, combos
    format.ts                 # Dates FR, devises, nombres
  store/useAppStore.ts        # État UI/session (aucune donnée métier en dur)
  theme/                      # Tokans couleurs, typographie, espacements, rayon, ombres
  i18n/                       # fr.ts / en.ts / provider
  components/
    ui/                       # Button, GlassCard, Sheet, TextInput, FAB, Segmented…
    charts/                   # Donut, Bar, Radar, Heatmap (SVG)
```

### 4.3 Conventions

- IDs : `crypto.randomUUID()` (UUID v4) ; timestamps : entiers `epoch毫秒` (`Date.now()`).
- Booléens en SQLite : `INTEGER` 0/1. Tableaux (jours de récurrence, médailles) : JSON textuel.
- Toutes les écritures multi-tables passent par une transaction SQL (`db.withTransactionAsync`).
- Chaque mutation appelle `notifyChange()` : les hooks réactifs se rafraîchissent automatiquement.
- Nommage : tables et colonnes en `snake_case` ; types et composants en `PascalCase` ; fonctions/services en `camelCase`.

---

## 5. Modèle de données (SQLite)

Schéma version 1, intégralement créé en une migration transactionnelle.

### 5.1 Tables métier

**`wars`** — domaines de vie
`id PK · title · icon · color · domain_type · xp_earned INT · is_active INT · sort_order INT · created_at · updated_at`

**`battles`** — objectifs
`id PK · war_id FK · title · description · deadline INT · status ('active'|'won'|'lost') · priority ('low'|'medium'|'high') · xp_reward INT · completed_at · created_at · updated_at`

**`adversary_templates`** — définition récurrente d'une tâche
`id PK · battle_id FK · war_id FK · title · xp_reward INT · frequency ('once'|'daily'|'weekly'|'monthly'|'yearly'|'specific_days') · specific_days TEXT(JSON) · hour INT · duration_min INT · start_date INT · end_date INT · is_active INT · created_at`

**`adversaries`** — instances planifiées (matérialisées depuis les templates)
`id PK · template_id FK · battle_id FK · war_id FK · title · xp_reward INT · scheduled_at INT · hour INT · duration_min INT · status ('pending'|'won'|'lost'|'rescheduled') · completed_at · created_at · updated_at`

**`accounts`** — comptes financiers
`id PK · name · type ('mobile_money'|'cash'|'bank'|'wave') · icon · color · initial_balance REAL · currency TEXT DEFAULT 'XOF' · is_default INT · is_archived INT · created_at · updated_at`

**`transactions`** — mouvements financiers
`id PK · account_id FK · amount REAL (signé : + revenu, − dépense) · type ('income'|'expense'|'transfer') · category · label · note · is_recurring INT · timestamp INT · created_at`

**`budgets`** — enveloppes mensuelles
`id PK · category · amount REAL · period DEFAULT 'monthly' · month TEXT ('YYYY-MM') · created_at · UNIQUE(category, month)`

**`gamification`** — ligne unique du profil joueur
`id PK=1 · xp · level · streak · shields · wins · losses · combo · best_combo · medals TEXT(JSON) · last_active TEXT(YYYY-MM-DD) · updated_at`

### 5.2 Tables préparées (Phase 2, créées dès la v1 pour éviter les migrations lourdes)

`time_logs · mood_logs · health_logs · chat_messages`.

### 5.3 Tables système

- **`app_meta(key PK, value)`** : version de schéma, date d'amorçage.
- **`settings(key PK, value)`** : préférences (onboarding terminé, nom du guerrier, thème, langue, notifications…).

Index : `adversaries(scheduled_at)`, `adversaries(status)`, `transactions(timestamp)`, `transactions(account_id)`, `battles(war_id)`, `adversary_templates(battle_id)`.

### 5.4 Règles métier de persistance

- **Soldes jamais stockés** : `solde(account) = initial_balance + Σ amount`. Aucune dérive possible.
- **Récurrence par matérialisation glissante** : au démarrage (et à chaque création), un service garantit les instances des **45 prochains jours** à partir des templates actifs. On ne pré-génère pas 3 mois d'un coup ; le service est idempotent (une instance `(template_id, scheduled_at)` n'existe qu'une fois).
- **Budgets** : la dépense mensuelle d'une catégorie est calculée par agrégat SQL, jamais recopiée.

---

## 6. Design System « Quartier Général »

Direction retenue : **sublimer l'identité néon militaire** (glassmorphism sombre, cyan néon, accents sémantiques), en la rendant premium et accessible.

### 6.1 Tokens

- **Couleurs** : fond `#070911`, surfaces verre `rgba(255,255,255,0.04–0.08)`, bordures `rgba(255,255,255,0.08)`. Néons : cyan `#00E5FF` (action), vert `#00FF88` (succès/finance positive), or `#FFD700` (argent), orange `#FF6B35` (priorité), rouge `#FF4757` (défaite/danger), violet `#A78BFA` (spirituel).
- **Typographie** : échelle fixe (12 / 13 / 15 / 17 / 22 / 28 / 34), graisses 500/700/800, numéros en tabular figures pour les montants.
- **Espacements** : grille de 4 px (4, 8, 12, 16, 24, 32). **Rayons** : 12 (champ), 16 (carte), 24 (fiche), 999 (pilule).
- **Ombres / halo** : néon diffus à 12 % d'opacité sur les éléments interactifs.
- **Mode clair** : tokens clairs maintenus en parallèle ; le sombre reste la référence V1, le clair est validé en Phase 2.

### 6.2 Composants normalisés

`Button` (primaire néon / secondaire verre / danger), `GlassCard`, `Sheet` (modale bottom native RN, aucun module tiers), `TextInput` sombre, `SegmentedControl`, `FAB` avec menu d'actions rapides, `EmptyState`, `ProgressBar`, `ProgressRing`, `StatCard`, `ListRow`, `Toast`/`XPModal`, `CategoryIcon`, graphiques SVG.

### 6.3 Principes UX (acceptance visuelle)

- Toute action destructive demande confirmation ; toute action réussie donne un feedback < 300 ms (haptic + animation).
- Zéro emoji dans l'UI : icônes vectorielles uniquement.
- États systématiques : chargement, vide (avec action principale), erreur (avec réessai).
- Cibles tactiles ≥ 44 × 44 px ; contraste texte/fond ≥ 4,5:1.
- Les écrans sont utilisables d'une seule main : actions principales en bas, FAB portée du pouce.

---

## 7. Spécification des écrans — Phase 1

### 7.1 Boot & sécurité

- **`_layout` racine** : ouvre la DB, exécute les migrations, amorce les guerries par défaut, matérialise les récurrences, puis route :
  - onboarding non terminé → `(onboarding)` ;
  - sinon PIN configuré → `(auth)/pin` ;
  - sinon `(app)/home`.
- **Écran PIN** : clavier 4 chiffres custom, biométrie auto-proposée si disponible, animation de secousse en cas d'erreur, verrouillage temporaire après 5 échecs (30 s).

### 7.2 Onboarding (5 étapes, tout est persisté)

1. **Manifeste** — promesse de valeur + animation.
2. **Forteresse** — création du PIN (confirmation saisies) et proposition biométrie.
3. **Recensement** — création de comptes financiers (MTN MoMo, Wave, Cash, Banque) avec soldes initiaux ; possibilité de passer.
4. **Déclaration de guerre** — sélection des domaines actifs parmi les 6 guerres par défaut, création possible d'une guerre custom.
5. **Pacte** — préférences de notifications (permission demandée, réglages effectifs en Phase 2) puis finalisation : `settings.onboarding_done = 1`.

### 7.3 Dashboard — Quartier Général (`home.tsx`)

- En-tête : salut selon l'heure, date longue FR, pastille rang/niveau, streak.
- Anneau de progression : adversaires du jour `gagnés / total`.
- 4 cartes statistiques : solde total, dépenses du jour, victoires du jour, XP total.
- « Ordre de bataille » : les adversaires du jour triés par heure ; tapoter = marquer gagné (animation + XP + combo).
- Aperçu des guerres avec barres de progression ; FAB actions rapides (Bataille, Adversaire, Dépense).

### 7.4 Guerres (`wars.tsx`)

- Sélecteur horizontal de guerres (couleur/icône dédiées), vue détaillée : batailles avec progression (`instances gagnées / instances à ce jour`), échéance, priorité.
- Création de bataille via `Sheet` (titre, description, échéance, priorité, XP).
- Détail bataille : templates d'adversaires + instances planifiées ; création d'adversaire avec fréquence (`once, daily, weekly, specific_days, monthly, yearly`), heure, durée ; les instances sont matérialisées immédiatement pour les 45 jours glissants.
- Tap sur une instance → victoire (gamification) ; statut `lost` traité par le service de réajustement en Phase 2.

### 7.5 Finances (`finance.tsx`)

- En-tête : solde total calculé, revenus/dépenses du mois.
- Onglets : **Comptes** (liste, soldes calculés, création/archivage), **Transactions** (liste filtrable par compte/catégorie, ajout revenu/dépense), **Budgets** (enveloppes mensuelles par catégorie + jauges de consommation).
- Graphique Donut : répartition des dépenses du mois par catégorie.
- Toute écriture passe par `finance.service` qui garantit l'équilibre des catégories et empêche les montants nuls/négatifs invalides.

### 7.6 Réglages (`settings.tsx`)

Profil (nom du guerrier), apparence (thème), langue (FR/EN), sécurité (statut biométrie, changement de PIN, réinitialisation), à propos (version, politique de confidentialité locale). Les fonctions Phase 2 (export, notifications avancées) apparaissent en état « Bientôt » honnête — jamais de bouton factice.

---

## 8. Moteurs métier

### 8.1 Gamification

- Niveaux via table d'XP et rangs : Recrue → Fantassin → Guerrier → Vétéran → Guerrier Élite → Général → Légende.
- Combo : multiplicateurs 1,2 / 1,5 / 2,0 après 2/3/5 victoires consécutives ; le combo se réinitialise à la première défaite du jour ou à minuit.
- Streak quotidien : +1 si dernière activité la veille, identique si même jour, remise à 1 sinon.
- Toute victoire d'adversaire : transaction SQL mettant à jour `adversaries`, `gamification`, `wars.xp_earned` atomiquement.

### 8.2 Récurrence

`materializeTemplates(untilDays = 45)` : pour chaque template actif, calcule les dates dues selon la fréquence puis insère les instances manquantes (`INSERT OR IGNORE` sur clé métier `template_id + scheduled_at`). Gestion correcte des `specific_days` (numéros de jours ISO), mensuel (même jour du mois), annuel.

### 8.3 Finances

- Agrégats SQL pour : solde total, dépenses/revenus de période, répartition par catégorie, consommation budget.
- Catégories V1 : alimentation, transport, santé/beauté, logement, factures, loisirs, éducation, épargne, revenu, divers.
- Devise par défaut XOF (FCFA), formatage FR sans centimes.

---

## 9. Sécurité & vie privée

- PIN jamais stocké en clair : sel 16 octets aléatoire + SHA-256, itérations via `expo-crypto`, conservation dans expo-secure-store (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`).
- Clé maître aléatoire de 256 bits dans le Keystore/Keychain (usage chiffrement Phase 2).
- Biométrie via `expo-local-authentication` avec fallback PIN obligatoire.
- Aucune permission réseau demandée (l'app n'a rien à faire d'Internet).
- Réinitialisation = suppression du fichier SQLite + des secrets SecureStore, puis ré-amorçage.

---

## 10. Build & distribution (EAS)

Profils `eas.json` :

- `development` : dev client interne pour le débogage.
- **`preview`** : build interne, `android.buildType = apk` → **APK directement installable** pour les tests.
- `production` : AAB signé, `autoIncrement` de version.

Commandes :

```bash
npm install
npx expo install --check         # vérifie l'alignement des versions
npx expo run:android             # test natif local (si environnement)
eas build -p android --profile preview      # APK testable via expo.dev
eas build -p android --profile production   # AAB de publication
```

L'identifiant Android est `com.espritropic.gbeche` ; le projet EAS est déjà lié (`projectId` dans `app.json`).

---

## 11. Definition of Done — Phase 1

1. `npm run typecheck` (tsc strict) et `npx expo export` réussissent sans erreur.
2. Aucune donnée codée en dur dans les écrans : toute valeur vient de SQLite (vérifiable en réinitialisant l'app : l'utilisateur repart à zéro).
3. Les données survivent à la fermeture complète de l'app et au redémarrage du téléphone.
4. Parcours onboarding → PIN → tableau de bord → création guerre/bataille/adversaire → victoire → transaction budgétisée, exécutable de bout en bout sur APK.
5. Toutes les écritures multi-tables sont atomiques ; aucune clé orpheline (contraintes FK activées).
6. Trois lancements consécutifs ne dupliquent pas les instances récurrentes.
7. Un appareil sans biométrie fonctionne uniquement avec le PIN ; un mauvais PIN n'ouvre jamais l'app.
8. Code mort nul, dépendances épinglées, README de lancement à jour.

---

## 12. Glossaire

Voir section 1. Les termes **Guerre, Bataille, Adversaire, Victoire, Défaite, Quartier Général, Ranger, Streak, Combo, Bouclier** sont les seuls termes gamifiés exposés à l'utilisateur ; le code utilise les identifiants techniques (`war`, `battle`, `adversary`…).
