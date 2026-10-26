/**
 * Tests de non-régression des en-têtes partagés (design system).
 * ScreenHeader garantit une hiérarchie identique sur tous les écrans ;
 * SectionHeader expose un titre et un lien d'action optionnel.
 */
import React from 'react';
import { Text, View } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { ThemeProvider } from '../../../theme/ThemeContext';
import { ScreenHeader } from '../ScreenHeader';
import { SectionHeader } from '../SectionHeader';

function render(node: React.ReactElement): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(<ThemeProvider>{node}</ThemeProvider>);
  });
  return renderer;
}

function textContents(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === 'string');
}

function pressableNodes(renderer: ReactTestRenderer): ReactTestInstance[] {
  return renderer.root.findAll((node) => typeof node.props?.onPress === 'function');
}

describe('<ScreenHeader />', () => {
  test('affiche le titre et le sous-titre', () => {
    const renderer = render(<ScreenHeader title="Agenda" subtitle="Tes batailles" />);
    const texts = textContents(renderer);
    expect(texts).toContain('Agenda');
    expect(texts).toContain('Tes batailles');
  });

  test("n'affiche ni sous-titre ni eyebrow quand ils sont absents", () => {
    const renderer = render(<ScreenHeader title="Réglages" />);
    expect(textContents(renderer)).toEqual(['Réglages']);
  });

  test("affiche l'eyebrow au-dessus du titre", () => {
    const renderer = render(
      <ScreenHeader eyebrow="Quartier général" title="Trésorerie" subtitle="Comptes" />,
    );
    expect(textContents(renderer)).toEqual(['Quartier général', 'Trésorerie', 'Comptes']);
  });

  test('rend les zones left et right', () => {
    const renderer = render(
      <ScreenHeader
        title="Agent"
        left={
          <View>
            <Text>Retour</Text>
          </View>
        }
        right={
          <View>
            <Text>Poubelle</Text>
          </View>
        }
      />,
    );
    const texts = textContents(renderer);
    expect(texts).toContain('Retour');
    expect(texts).toContain('Poubelle');
    expect(texts).toContain('Agent');
  });
});

describe('<SectionHeader />', () => {
  test('affiche le titre sans action par défaut', () => {
    const renderer = render(<SectionHeader title="Mes guerres" />);
    expect(textContents(renderer)).toEqual(['Mes guerres']);
    expect(pressableNodes(renderer)).toHaveLength(0);
  });

  test("n'affiche le lien d'action que si le label et le handler sont fournis", () => {
    const onAction = jest.fn();
    const withLabelOnly = render(<SectionHeader title="A" actionLabel="Voir" />);
    expect(pressableNodes(withLabelOnly)).toHaveLength(0);

    const renderer = render(
      <SectionHeader title="Ordre de bataille" actionLabel="Tout voir" onAction={onAction} />,
    );
    expect(textContents(renderer)).toContain('Tout voir');
    const nodes = pressableNodes(renderer);
    expect(nodes).toHaveLength(1);

    act(() => {
      nodes[0].props.onPress();
    });
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
