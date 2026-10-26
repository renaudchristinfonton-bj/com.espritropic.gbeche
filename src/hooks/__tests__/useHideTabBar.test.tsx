/* eslint-disable import/first */
const mockSetOptions = jest.fn();
const mockGetParent = jest.fn(() => ({ setOptions: mockSetOptions }));

jest.mock('expo-router', () => ({
  useNavigation: () => ({ getParent: mockGetParent }),
}));

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { useHideTabBar } from '../useHideTabBar';

function Probe({ hidden }: { hidden: boolean }) {
  useHideTabBar(hidden);
  return null;
}

describe('useHideTabBar', () => {
  beforeEach(() => {
    mockSetOptions.mockClear();
    mockGetParent.mockClear();
  });

  test('cache la barre d’onglets au montage quand hidden=true', () => {
    act(() => {
      TestRenderer.create(<Probe hidden />);
    });
    expect(mockGetParent).toHaveBeenCalled();
    expect(mockSetOptions).toHaveBeenCalledWith({ tabBarStyle: { display: 'none' } });
  });

  test('ne touche pas aux options quand hidden=false', () => {
    act(() => {
      TestRenderer.create(<Probe hidden={false} />);
    });
    expect(mockSetOptions).not.toHaveBeenCalled();
  });

  test('restaure les options par défaut au démontage', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<Probe hidden />);
    });
    act(() => {
      renderer.unmount();
    });
    expect(mockSetOptions).toHaveBeenLastCalledWith({ tabBarStyle: undefined });
  });

  test('ne plante pas sans navigator parent', () => {
    mockGetParent.mockReturnValueOnce(null as unknown as { setOptions: jest.Mock });
    expect(() => {
      act(() => {
        TestRenderer.create(<Probe hidden />);
      });
    }).not.toThrow();
  });
});
