# GBECHE — Version web & déploiement Netlify

La version web s'adresse notamment aux utilisateurs **iOS** qui ne peuvent pas
installer l'APK Android. C'est la **même base de code** (expo-router + React
Native Web), compilée en site **100 % statique** : aucun serveur, aucune API,
toutes les données restent dans le navigateur de l'utilisateur.

## 1. Ce qui change par rapport aux apps natives

| Brique | Native (Android/iOS) | Web (navigateur) |
| --- | --- | --- |
| Base de données | expo-sqlite (fichier SQLite) | expo-sqlite **WASM (wa-sqlite)** persistant via **OPFS** |
| Secret PIN / clé maître | expo-secure-store (Keystore/Keychain) | `localStorage` via `src/services/secureStorage.web.ts` |
| Biométrie | Face ID / empreinte | indisponible — code PIN uniquement |
| Haptiques | retour physique | no-op via `src/services/haptics.web.ts` |
| Chiffrement | expo-crypto natif | WebCrypto (fonctionne en HTTPS / localhost) |

Le code métier ne contient aucune branche `Platform.OS` dédiée au web hors
`src/db/client.ts` (pragma WAL natif uniquement) : toute la différenciation
passe par les extensions de modules Metro `.web.ts`.

### Fichiers d'abstraction

- `src/services/haptics.ts` / `haptics.web.ts` — même API (`impactAsync`,
  `notificationAsync`, `ImpactFeedbackStyle`, `NotificationFeedbackType`).
- `src/services/secureStorage.ts` / `secureStorage.web.ts` — même API
  (`setItemAsync`, `getItemAsync`, `deleteItemAsync`).
- `metro.config.js` — déclare `.wasm` comme asset pour que le moteur SQLite
  soit copié dans le build.

## 2. Build local

```bash
npm install
npx expo export --platform web
```

Le site statique est généré dans `dist/` (déjà ignoré par Git). On y trouve :

- `index.html` et une page HTML par route (`/home`, `/wars`, `/finance`…),
- `_expo/static/js/web/entry-*.js` (l'app) et `worker-*.js` (worker SQLite),
- `assets/node_modules/expo-sqlite/.../wa-sqlite.*.wasm` (moteur SQLite).

Test rapide du dossier `dist/` :

```bash
npx serve dist
# ou : python3 -m http.server --directory dist 8080
```

> En environnement sans accès réseau aux serveurs Expo, préfixer la commande
> avec `EXPO_OFFLINE=1`. Sur Netlify, aucune action n'est nécessaire.

## 3. Déploiement Netlify

Tout est déjà configuré dans [`netlify.toml`](../netlify.toml) à la racine :

| Réglage | Valeur |
| --- | --- |
| Build command | `npx expo export --platform web` |
| Publish directory | `dist` |
| Node | 20 |
| Redirect SPA | `/* → /index.html` (200) |

### Procédure pas à pas

1. Aller sur https://app.netlify.com → **Add new site → Import an existing
   project** → choisir le dépôt GitHub `com.espritropic.gbeche`.
2. Netlify détecte automatiquement `netlify.toml` : ne rien remplir
   manuellement (build, publish, Node sont déjà prescrits).
3. Choisir la branche `master` (après merge de la PR) puis **Deploy site**.
4. Le site reçoit une URL `https://<nom>.netlify.app` renommable ensuite
   (Site configuration → Domain management).

Chaque push ultérieur sur la branche déployée redéclenche un build
automatiquement.

## 4. En-têtes cross-origin (COOP / COEP)

Le VFS persistant d'expo-sqlite web (`AccessHandlePoolVFS`) s'appuie sur
**OPFS avec accès synchrones en worker**, ce qui exige un contexte
*cross-origin isolated*. `netlify.toml` injecte donc sur toutes les réponses :

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

L'app ne charge aucune ressource tierce (pas de police, pixel ou iframe
externe) : ces en-têtes ne cassent aucune fonctionnalité. Si un jour une
ressource externe était ajoutée, elle devrait être servie avec
`Cross-Origin-Resource-Policy: cross-origin` ou être auto-hébergée.

## 5. Persistance & vie privée

- Les données vivent dans le stockage **OPFS** du navigateur, par origine
  (le domaine Netlify) : elles survivent au rechargement et à la fermeture.
- Elles sont effacées si l'utilisateur « efface les données de site » dans
  son navigateur, ou via le bouton **Réinitialiser l'application** des
  réglages (la base est recréée à vide, comme sur mobile).
- Aucune donnée ne transite sur le réseau : le site fonctionne parfaitement
  hors-ligne une fois la première visite effectuée (le code est entièrement
  statique et mis en cache par le navigateur).

## 6. Navigateurs supportés

Dernières versions de Chrome, Edge, Safari (16+) et Firefox, sur ordinateur
comme mobile. Le contexte doit être sécurisé (HTTPS) — c'est toujours le cas
sur `*.netlify.app`.
