// app/(onboarding)/index.tsx
import React, { useState } from 'react';
import { Text, View } from 'react-native';

export default function OnboardingIndex() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  return (
    <View className="flex-1 justify-center items-center bg-black">
      <Text className="text-white text-xl font-bold">Étape {step}: Onboarding GBECHE</Text>
    </View>
  );
}