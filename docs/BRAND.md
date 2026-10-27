# Identité de marque GBECHE

## Signification

**GBECHE** signifie **« ma vie »** en langue **fon** (Bénin). L'identité visuelle
traduit cette idée en trois symboles, dans le registre « néon militaire » de
l'application :

| Élément | Sens |
| --- | --- |
| Le **blason** (bouclier) | La protection de sa propre vie, la défense de ses objectifs |
| La **pulsation ECG** | La vie même, le cœur qui bat — le rappel quotidien de tenir ses missions |
| L'**étoile** à cinq branches | Le grade, la progression et la distinction du guerrier |

Les couleurs reprennent la charte existante : dégradé néon cyan `#00E5FF`
→ vert `#00FF88`, or `#FFD700` pour l'étoile, fond de nuit `#070911 → #111525`.

## Fabrication (non issue d'un générateur d'images)

Le logo n'a **pas** été produit par un modèle d'image génératif. Il est dessiné
sous forme de **tracés vectoriels géométriques écrits à la main** (chemins SVG
explicites, coordonnées et courbes calculées), regroupés dans un générateur
déterministe et reproductible :

- Sources vectorielles traçables : `assets/brand/*.svg`
- Générateur : `scripts/generate-brand-assets.js`
- Rendu raster : `@resvg/resvg-js` (moteur SVG, pas d'IA)

Toute modification passe par l'édition des chemins puis par une régénération :

```bash
node scripts/generate-brand-assets.js
```

## Assets générés

| Fichier | Usage | Dimensions |
| --- | --- | --- |
| `assets/images/icon.png` | Icône applicative principale | 1024 × 1024 |
| `assets/images/favicon.png` | Favicon web | 48 × 48 |
| `assets/images/android-icon-background.png` | Fond d'icône adaptative Android | 512 × 512 |
| `assets/images/android-icon-foreground.png` | Avant-plan d'icône adaptative (zone sûre 66 %) | 512 × 512 |
| `assets/images/android-icon-monochrome.png` | Icône thématisée Android | 432 × 432 |
| `assets/images/splash-icon.png` | Écran de démarrage | 1024 × 1024 |

Les noms de fichiers restent ceux attendus par Expo : `app.json` n'a pas besoin
d'être modifié après régénération.

## Composant in-app

`src/components/ui/Logo.tsx` reprend exactement les mêmes tracés avec
`react-native-svg`, en deux variantes :

- `variant="full"` : sceau sur fond radial (démarrage, écran PIN, onboarding) ;
- `variant="mark"` : blason transparent pour intégration dans une carte.
