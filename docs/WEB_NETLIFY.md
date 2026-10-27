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
  soit copié dans le build, et injecte COOP/COEP sur le serveur de dev web
  pour que les tests locaux fonctionnent comme sur Netlify.

## 2. Build local

```bash
npm install
npx expo export --platform web
```

Le site statique est généré dans `dist/`. Ce dossier est inscrit dans
`.gitignore` (c'est une sortie de build), mais une copie y est également
commitée (`git add -f`) pour permettre un déploiement manuel ou une
vérification sans build ; Netlify le reconstruit de toute façon à chaque
déploiement. On y trouve :

- `index.html` et une page HTML par route (`/home`, `/wars`, `/finance`…),
- `_expo/static/js/web/entry-*.js` (l'app) et `worker-*.js` (worker SQLite),
- `assets/node_modules/expo-sqlite/.../wa-sqlite.*.wasm` (moteur SQLite).

### Test en mode développement (recommandé)

```bash
npx expo start --web
```

`metro.config.js` injecte déjà les en-têtes COOP/COEP sur toutes les
réponses du serveur de dev : la base OPFS est donc pleinement fonctionnelle
(vérifié sur la page, le bundle JS, le worker SQLite et le fichier `.wasm`).

### Test du build statique

Un simple serveur statique ne pose pas les en-têtes d'isolation : la base
OPFS refuse alors de s'ouvrir. Pour tester `dist/` en local, utiliser un
serveur qui les ajoute, par exemple :

```bash
npx serve dist --headers '{"Cross-Origin-Opener-Policy":"same-origin","Cross-Origin-Embedder-Policy":"require-corp"}'
```

À défaut, déployer sur Netlify (les en-têtes sont dans `netlify.toml`).

> En environnement sans accès réseau aux serveurs Expo, préfixer la commande
> avec `EXPO_OFFLINE=1`. Sur Netlify, aucune action n'est nécessaire.

## 3. Connexion du dépôt à Netlify (déploiement automatique)

Tout est déjà configuré dans [`netlify.toml`](../netlify.toml) à la racine :

| Réglage | Valeur |
| --- | --- |
| Build command | `npx expo export --platform web` |
| Publish directory | `dist` |
| Node | 20 |
| Variables d'environnement | `EXPO_OFFLINE=1`, `EXPO_NO_TELEMETRY=true` (déjà dans le fichier) |
| Redirect SPA | `/* → /index.html` (200) |
| En-têtes | COOP/COEP pour SQLite/OPFS (voir §4) |

Aucune variable d'environnement n'est à saisir manuellement : tout est
prescrit par `netlify.toml`. Le build CI exact (`npm ci` puis la commande
ci-dessus) est validé dans le dépôt.

### Procédure pas à pas (interface web, ~2 minutes)

1. Aller sur https://app.netlify.com → **Add new site → Import an existing
   project**.
2. Choisir **GitHub** et autoriser Netlify (on peut restreindre l'accès au
   seul dépôt `com.espritropic.gbeche`).
3. Sélectionner le dépôt. Netlify détecte `netlify.toml` et pré-remplit
   build, publication et Node : **ne rien modifier**, cliquer sur
   **Deploy site**.
4. Le site reçoit une URL `https://<nom>.netlify.app`, renommable ensuite
   (Site configuration → Domain management).

### Ce qui se passe ensuite avec la PR ouverte

- **Chaque push sur la branche `arena/78d3101e-com-espritropic-gbeche`**
  déclenche un **deploy preview** avec sa propre URL — visible aussi
  directement dans la pull request GitHub (checks Netlify).
- **La production (`master`) ne change pas** tant que la PR #1 n'est pas
  mergée : au merge, Netlify construit et publie automatiquement le site
  de production sur l'URL principale.
- Pour déployer la branche actuelle en production sans merger, changer la
  « production branch » dans Site configuration → Build & deploy, ou
  utiliser « Trigger deploy » — mais le flux recommandé reste le merge.

### Alternative : Netlify CLI (depuis un terminal personnel)

```bash
npm install -g netlify-cli
netlify init        # autorisation du compte + liaison au dépôt
netlify deploy --build --prod
```

L'autorisation OAuth nécessite le compte Netlify du propriétaire : cette
étape ne peut pas être réalisée depuis un bac à sable de développement.

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
  (le domaine Netlify) : elles survivent au rechargement, à la fermeture
  **et aux redéploiements automatiques successifs** (l'origine ne change
  pas, seule la version du code est remplacée).
- Sur iOS, préférer **Safari 18+** : la fonction `createSyncAccessHandle`
  requise par SQLite WASM y est disponible ; l'app affiche un bandeau
  d'avertissement si le stockage persistant n'est pas supporté.
- Elles sont effacées si l'utilisateur « efface les données de site » dans
  son navigateur, ou via le bouton **Réinitialiser l'application** des
  réglages (la base est recréée à vide, comme sur mobile).
- Filet de sécurité : l'écran **Données** permet d'exporter et de
  restaurer une sauvegarde JSON complète à tout moment.
- Aucune donnée ne transite sur le réseau : le site fonctionne parfaitement
  hors-ligne une fois la première visite effectuée (le code est entièrement
  statique et mis en cache par le navigateur).

## 6. Navigateurs supportés

Dernières versions de Chrome, Edge, Safari (16+) et Firefox, sur ordinateur
comme mobile. Le contexte doit être sécurisé (HTTPS) — c'est toujours le cas
sur `*.netlify.app`.
