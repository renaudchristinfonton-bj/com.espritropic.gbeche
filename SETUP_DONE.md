# GBECHE - Guide Complet
📦 Le projet est maintenant créé avec l'arborescence complète !

## Prochaines étapes

```bash
# 1. Installer les dépendances
pnpm install

# 2. Démarrer le développement
pnpm expo start

# 3. Sur ton téléphone
# Scanner le QR code avec Expo Go
```

## Structure créée

```
app/
  ├── _layout.tsx
  ├── (onboarding)/
  │   ├── index.tsx
  │   └── step1-5.tsx
  └── (app)/
      ├── _layout.tsx
      └── home.tsx, finance.tsx, calendar.tsx, wars.tsx, chat.tsx, settings.tsx

src/
  ├── components/
  │   ├── Button.tsx
  │   └── Card.tsx
  ├── services/
  │   ├── database.ts
  │   ├── auth.ts
  │   ├── finance.ts
  │   ├── wars.ts
  │   ├── tracking.ts
  │   ├── nlp.ts
  │   └── notifications.ts
  ├── types/
  │   └── index.ts
  ├── hooks/
  │   └── index.ts
  ├── utils/
  │   └── math.ts
  └── store/
      └── index.ts

Fichiers config:
  - tsconfig.json
  - tailwind.config.js
  - .eslintrc.json
  - .prettierrc.js
```

## Documentation
Voir `GBECHE_GUIDE_COMPLET_JUNIOR.md` pour le guide complet.
