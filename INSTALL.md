# GBECHE — Guide d'installation et de lancement

## Prérequis

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Expo CLI (`npx expo`)
- iPhone (iOS 16+) ou Android 12+ pour le build réel
- Expo Go (optionnel pour test rapide, certaines fonctionnalités nécessitent un dev build)

---

## 1. Installation des dépendances

```bash
cd GBECHE
pnpm install
```

### Dépendances critiques ajoutées

Ces packages ont été ajoutés et sont nécessaires au build :

| Package | Usage |
|---------|-------|
| `expo-crypto` | Hachage SHA-256 pour PIN |
| `expo-device` | Détection appareil réel/simulateur |
| `expo-linear-gradient` | Dégradés sur boutons et cards |
| `react-native-mmkv` | Storage offline ultra-rapide |
| `react-native-svg` | Graphes SVG (DonutChart, RadarChart, etc.) |

---

## 2. Configuration des sons de notifications

Crée les fichiers audio AVANT le build :

### iOS
Place dans `./assets/sounds/` :
- `warrior_morning.wav`
- `victory.wav`
- `streak_sound.wav`
- `warning_sound.wav`
- `boss_sound.wav`
- `levelup_sound.wav`

Puis dans `app.json` / `Info.plist` (géré via `expo-notifications`).

### Android
Place dans `./android/app/src/main/res/raw/` (sans extension dans le code) :
- `warrior_morning`
- `victory`
- `streak_sound`
- `warning_sound`
- `boss_sound`
- `levelup_sound`

---

## 3. Dev Build (recommandé pour tester toutes les fonctionnalités)

```bash
# Crée le dev build iOS (nécessite compte Apple Developer)
npx eas build --profile development --platform ios

# Crée le dev build Android
npx eas build --profile development --platform android
```

### eas.json à créer
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

---

## 4. Lancement en développement

```bash
# Démarrer le serveur Expo
npx expo start

# iOS simulateur
npx expo start --ios

# Android émulateur
npx expo start --android
```

---

## 5. Structure du projet

```
GBECHE/
├── app/
│   ├── _layout.tsx              # Root layout (ThemeProvider + I18nProvider)
│   ├── (onboarding)/
│   │   └── index.tsx            # Onboarding 5 étapes animées
│   ├── (auth)/
│   │   └── pin.tsx              # PIN lock + biométrie
│   └── (app)/
│       ├── _layout.tsx          # Tab bar thémé
│       ├── home.tsx             # Dashboard + RadarChart + missions
│       ├── wars.tsx             # Guerres + territoires
│       ├── finance.tsx          # Finance + DonutChart
│       ├── calendar.tsx         # Calendrier + HeatMap + mood
│       ├── chat.tsx             # Agent IA (NLP local)
│       └── settings.tsx         # Paramètres complets
│
├── src/
│   ├── theme/
│   │   ├── colors.ts            # Palette + tokens dark/light
│   │   ├── index.ts             # buildTheme() + typography + spacing
│   │   └── ThemeContext.tsx     # useTheme() hook
│   ├── i18n/
│   │   ├── fr.ts                # Traductions françaises
│   │   ├── en.ts                # Traductions anglaises
│   │   ├── index.ts             # useTranslation() hook
│   │   └── I18nProvider.tsx     # Provider i18n
│   ├── store/
│   │   └── index.ts             # Zustand store (warrior, missions, XP)
│   ├── services/
│   │   ├── crypto.ts            # Chiffrement AES + PIN + biométrie
│   │   ├── notifications.ts     # Notifications planifiées
│   │   ├── gamification.ts      # XP calculator + achievements
│   │   └── database.ts          # WatermelonDB schema
│   └── components/
│       ├── ui/
│       │   ├── Button.tsx        # Bouton avec variants + haptics
│       │   ├── GlassCard.tsx     # Card glassmorphism
│       │   ├── XPBar.tsx         # XPBar + ProgressRing + XPFloat
│       │   └── AchievementToast.tsx # Toast + XPModal + LevelUpModal
│       └── charts/
│           ├── DonutChart.tsx    # Donut animé (finance)
│           ├── RadarChart.tsx    # Radar (équilibre de vie)
│           ├── HeatMap.tsx       # HeatMap 90j (activité)
│           └── BarChart.tsx      # Bar + Line charts
│
├── assets/sounds/               # ← Sons à ajouter (voir section 2)
├── MARKETING.md                 # Plan marketing de rétention
└── prototype.html               # Prototype interactif complet
```

---

## 6. Connexion à WatermelonDB (production)

Dans `src/services/database.ts`, remplace l'adaptateur LokiJS par SQLite pour le build natif :

```typescript
// Décommenter pour iOS/Android natif :
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
```

---

## 7. Vérification TypeScript

```bash
npx tsc --noEmit
```

---

## 8. Fonctionnalités clés à tester

1. **Onboarding** : Première ouverture → 5 étapes animées → PIN setup
2. **PIN Lock** : Redémarrage → écran PIN + biométrie
3. **Dashboard** : Compléter des tâches → XP s'incrémente → combo multiplier
4. **Missions** : Progression des missions journalières
5. **Finance** : DonutChart des dépenses + évolution du solde
6. **Calendrier** : Vue jour + HeatMap 90j + mood tracker
7. **Guerres** : Créer une guerre → voir territoire
8. **Agent IA** : Taper "j'ai dépensé 5000 FCFA" → parsing NLP local
9. **Paramètres** : Basculer dark/light → changer langue FR/EN
10. **Notifications** : Activer → vérifier à 6h30

---

## 9. Obtenir un Dev Build sur appareil physique

```bash
# iPhone (sans compte payant Apple Developer — via Expo Go)
npx expo go

# Build complet avec toutes les fonctionnalités natives
npx eas build --profile development --platform ios --local
```

---

*GBECHE v1.0-beta — 100% offline · AES-256 · Gamification psychologique*
