/**
 * Non-régression du masquage de la barre d'onglets.
 *
 * Contexte : l'agent et l'écran Données sont des écrans plein écran dont le
 * champ de saisie (composer) était recouvert par la barre d'onglets. Une
 * première solution impérative (hook + navigation.getParent().setOptions)
 * n'a rien masqué car ces écrans n'étaient pas déclarés comme Tabs.Screen.
 *
 * La seule solution fiable est déclarative : chaque écran doit être un
 * <Tabs.Screen> portant `href: null` (pas de bouton) ET
 * `tabBarStyle: { display: 'none' }` (barre masquée au premier plan).
 * Ce test fige ce contrat et empêche de réintroduire le hook impératif.
 */
import * as fs from 'fs';
import * as path from 'path';

const layoutPath = path.resolve(__dirname, '../_layout.tsx');
const layoutSource = fs.readFileSync(layoutPath, 'utf8');

/** Extrait le bloc d'options d'un <Tabs.Screen name="<écran>" ...>. */
function screenBlock(source: string, name: string): string {
  const marker = `name="${name}"`;
  const start = source.indexOf(marker);
  expect(start).toBeGreaterThan(-1);
  // Le bloc Tabs.Screen se termine par la balise fermante `/>`.
  const end = source.indexOf('/>', start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('masquage déclaratif de la barre d’onglets', () => {
  test.each(['agent', 'data'])('l’écran %s est un Tabs.Screen masqué', (name) => {
    const block = screenBlock(layoutSource, name);
    // Absent de la barre : aucun bouton d'onglet.
    expect(block).toMatch(/href:\s*null/);
    // Barre réellement masquée quand l'écran est au premier plan.
    expect(block).toMatch(/tabBarStyle:\s*\{\s*display:\s*'none'\s*\}/);
  });

  test('les cinq onglets principaux restent visibles', () => {
    for (const name of ['home', 'calendar', 'wars', 'finance', 'settings']) {
      const block = screenBlock(layoutSource, name);
      expect(block).not.toMatch(/display:\s*'none'/);
    }
  });

  test('le hook impératif défaillant n’est plus réintroduit', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../../../src/hooks/useHideTabBar.ts'))).toBe(
      false,
    );
    expect(layoutSource).not.toMatch(/useHideTabBar/);
    expect(layoutSource).not.toMatch(/getParent\(\)[\s\S]*?setOptions/);
  });

  test('la pilule flottante repose sur la hauteur partagée du thème', () => {
    expect(layoutSource).toMatch(/FLOATING_TAB_BAR_HEIGHT/);
  });
});
