/**
 * GBECHE — Composant logo vectoriel (react-native-svg).
 * Reprend à l'identique les tracés artisanaux de assets/brand/icon-master.svg :
 * blason (protection de la vie), pulsation ECG (« GBECHE = ma vie ») et
 * étoile de grade. Deux variantes :
 *   - « full »  : sceau sur fond radial (écrans de boot / onboarding / PIN)
 *   - « mark »  : blason transparent (intégration dans une carte)
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  G,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

interface LogoProps {
  size?: number;
  variant?: 'full' | 'mark';
  testID?: string;
}

const SHIELD_PATH =
  'M262 214 H762 Q782 214 782 234 V520 C782 642 700 738 540 806 Q512 818 484 806 C324 738 242 642 242 520 V234 Q242 214 262 214 Z';
const INNER_SHIELD_TRANSFORM = 'translate(512 512) scale(0.84) translate(-512 -512)';
const STAR_POINTS =
  '512.0,276.0 525.5,311.4 563.4,313.3 533.9,337.1 543.7,373.7 512.0,353.0 480.3,373.7 490.1,337.1 460.6,313.3 498.5,311.4';
const PULSE_PATH = 'M332 524 H402 L438 434 L488 614 L538 464 L568 524 H692';

export function Logo({ size = 120, variant = 'full', testID }: LogoProps) {
  return (
    <View
      testID={testID}
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size * 0.22 },
        variant === 'full' && styles.fullShadow,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 1024 1024">
        <Defs>
          <LinearGradient id="logoNeon" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#00E5FF" />
            <Stop offset="1" stopColor="#00FF88" />
          </LinearGradient>
          <RadialGradient id="logoBg" cx="0.5" cy="0.32" r="0.92">
            <Stop offset="0" stopColor="#111525" />
            <Stop offset="1" stopColor="#070911" />
          </RadialGradient>
          <LinearGradient id="logoGold" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFE45C" />
            <Stop offset="1" stopColor="#FFD700" />
          </LinearGradient>
        </Defs>

        {variant === 'full' ? <Rect width="1024" height="1024" fill="url(#logoBg)" /> : null}

        <G transform="translate(512 512) scale(0.94) translate(-512 -512)">
          <Path
            d={SHIELD_PATH}
            fill="rgba(0,229,255,0.06)"
            stroke="url(#logoNeon)"
            strokeWidth={34}
            strokeLinejoin="round"
          />
          <Path
            d={SHIELD_PATH}
            fill="none"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth={10}
            strokeLinejoin="round"
            transform={INNER_SHIELD_TRANSFORM}
          />
          <Polygon points={STAR_POINTS} fill="url(#logoGold)" />
          <Path
            d={PULSE_PATH}
            fill="none"
            stroke="url(#logoNeon)"
            strokeWidth={36}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  fullShadow: {
    shadowColor: '#00E5FF',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
});
