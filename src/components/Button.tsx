// src/components/Button.tsx
import React from 'react';
import { Text, TouchableOpacity, ViewStyle } from 'react-native';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', style, disabled = false }: ButtonProps) {
  const bgColor = variant === 'primary' ? 'bg-cyan-500' : 'bg-gray-700';
  const opacity = disabled ? 0.5 : 1;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`${bgColor} p-3 rounded-lg mb-2`}
      style={[style, { opacity }]}
    >
      <Text className="text-white font-bold text-center">{label}</Text>
    </TouchableOpacity>
  );
}