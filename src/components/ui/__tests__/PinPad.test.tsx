/**
 * Test de non-régression du clavier PIN.
 * Couvre le bug réel où onChange était branché sur une fonction vide :
 * les chiffres tapés n'alimentaient aucun état et onFull ne partait jamais.
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { ThemeProvider } from '../../../theme/ThemeContext';
import { PinPad } from '../PinPad';

function Host({
  onFull,
  error = false,
}: {
  onFull: (pin: string) => void;
  error?: boolean;
}) {
  const [value, setValue] = useState('');
  return <PinPad value={value} onChange={setValue} onFull={onFull} error={error} />;
}

function createTree(onFull: jest.Mock, error = false): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <ThemeProvider>
        <Host onFull={onFull} error={error} />
      </ThemeProvider>,
    );
  });
  return renderer;
}

/** Tous les nœuds interactifs (le preset Jest peut masquer le type Pressable). */
function pressableNodes(renderer: ReactTestRenderer): ReactTestInstance[] {
  return renderer.root.findAll((node) => typeof node.props?.onPress === 'function');
}

function nodeText(node: ReactTestInstance): string {
  return node
    .findAllByType(Text)
    .map((textNode) => textNode.props.children)
    .filter((child) => typeof child === 'string')
    .join('');
}

function pressDigit(renderer: ReactTestRenderer, digit: string): void {
  const target = pressableNodes(renderer).find((node) => nodeText(node) === digit);
  if (!target) throw new Error(`Touche "${digit}" introuvable`);
  act(() => {
    target.props.onPress();
  });
}

function pressBackspace(renderer: ReactTestRenderer): void {
  const nodes = pressableNodes(renderer);
  act(() => {
    nodes[nodes.length - 1].props.onPress();
  });
}

/** Les points sont des vues rondes (radius.full = 9999, bordure 2 px). */
function filledDots(renderer: ReactTestRenderer): number {
  return renderer.root
    .findAllByType(View)
    .map((node) => node.props.style)
    .map((style) => (Array.isArray(style) ? Object.assign({}, ...style) : style))
    .filter(
      (style): style is Record<string, unknown> =>
        !!style && typeof style === 'object',
    )
    .filter((style) => style.borderRadius === 9999 && style.borderWidth === 2)
    .filter((style) => style.backgroundColor !== 'transparent').length;
}

describe('<PinPad />', () => {
  test('chaque chiffre remplit un point et 4 chiffres déclenchent onFull', () => {
    const onFull = jest.fn();
    const renderer = createTree(onFull);

    pressDigit(renderer, '1');
    pressDigit(renderer, '9');
    pressDigit(renderer, '8');
    expect(filledDots(renderer)).toBe(3);
    expect(onFull).not.toHaveBeenCalled();

    pressDigit(renderer, '4');
    expect(filledDots(renderer)).toBe(4);
    expect(onFull).toHaveBeenCalledTimes(1);
    expect(onFull).toHaveBeenCalledWith('1984');
  });

  test('le clavier est plafonné à 4 chiffres', () => {
    const onFull = jest.fn();
    const renderer = createTree(onFull);

    ['1', '2', '3', '4', '5', '6'].forEach((digit) => pressDigit(renderer, digit));

    expect(filledDots(renderer)).toBe(4);
    expect(onFull).toHaveBeenCalledTimes(1);
    expect(onFull).toHaveBeenCalledWith('1234');
  });

  test('le retour arrière vide le dernier point', () => {
    const onFull = jest.fn();
    const renderer = createTree(onFull);

    pressDigit(renderer, '7');
    pressDigit(renderer, '2');
    expect(filledDots(renderer)).toBe(2);

    pressBackspace(renderer);
    expect(filledDots(renderer)).toBe(1);
    expect(onFull).not.toHaveBeenCalled();
  });

  test('rendu sans crash en état d\'erreur', () => {
    const onFull = jest.fn();
    expect(() => createTree(onFull, true)).not.toThrow();
  });
});
