/**
 * Tests du logo vectoriel : rendu sans crash dans les deux variantes et
 * respect de la taille demandée (le SVG natif est mocké par jest-expo).
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { View } from 'react-native';

import { Logo } from '../Logo';

function renderLogo(element: React.ReactElement) {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(element);
  });
  return renderer;
}

describe('<Logo />', () => {
  test('se rend sans erreur en variante full avec la taille demandée', () => {
    const renderer = renderLogo(<Logo size={140} variant="full" />);
    const host = renderer.root.findByType(View);
    const style = Array.isArray(host.props.style)
      ? Object.assign({}, ...host.props.style)
      : host.props.style;
    expect(style.width).toBe(140);
    expect(style.height).toBe(140);
  });

  test('se rend aussi en variante mark (fond transparent)', () => {
    expect(() => renderLogo(<Logo size={72} variant="mark" />)).not.toThrow();
  });

  test('accepte la taille par défaut', () => {
    const renderer = renderLogo(<Logo />);
    const host = renderer.root.findByType(View);
    const style = Array.isArray(host.props.style)
      ? Object.assign({}, ...host.props.style)
      : host.props.style;
    expect(style.width).toBe(120);
  });
});
