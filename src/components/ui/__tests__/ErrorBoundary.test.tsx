/* eslint-disable import/first */
/**
 * Tests de la frontière d'erreurs : un composant qui plante doit être
 * remplacé par l'écran de reprise, sans faire tomber l'application.
 */
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

import { ThemeProvider } from '../../../theme/ThemeContext';
import { ErrorBoundary, RouteErrorFallback } from '../ErrorBoundary';

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('boom');
  return <Text>contenu sain</Text>;
}

function render(children: React.ReactNode) {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(<ThemeProvider>{children}</ThemeProvider>);
  });
  return renderer;
}

function allText(renderer: TestRenderer.ReactTestRenderer): string {
  return renderer.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .filter((child) => typeof child === 'string')
    .join(' | ');
}

describe('ErrorBoundary', () => {
  test('affiche les enfants quand tout va bien', () => {
    const renderer = render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(allText(renderer)).toContain('contenu sain');
  });

  test('bascule sur l’écran de reprise quand un enfant jette', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const renderer = render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    const text = allText(renderer);
    expect(text).toContain('Mission perturbée');
    expect(text).toContain('boom');
    spy.mockRestore();
  });

  test('getDerivedStateFromError porte le flag d’erreur', () => {
    const state = ErrorBoundary.getDerivedStateFromError(new Error('x'));
    expect(state.hasError).toBe(true);
    expect(state.error).toBeInstanceOf(Error);
  });
});

describe('RouteErrorFallback', () => {
  test('se rend sans provider spécifique et expose les actions', () => {
    const retry = jest.fn();
    const renderer = render(<RouteErrorFallback error={new Error('capsule')} retry={retry} />);
    expect(allText(renderer)).toContain('capsule');
    const buttons = renderer.root.findAll((n) => typeof n.props?.onPress === 'function');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});
