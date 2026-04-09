// src/components/Card.tsx
import React from 'react';
import { View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return (
    <View
      className="bg-gray-900 p-4 rounded-lg mb-3 border border-gray-700"
      style={style}
    >
      {children}
    </View>
  );
}