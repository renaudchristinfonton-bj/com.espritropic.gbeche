#!/bin/bash

# ============================================================
# Script de configuration GBECHE - Crée l'arborescence complète
# Bash (.sh)
#
# Utilisation:
#   chmod +x setup.sh  (Une seule fois pour rendre exécutable)
#   ./setup.sh
#
# Ou directement:
#   bash setup.sh
# ============================================================

set -e  # Arrêter si une erreur survient

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Bannière
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo -e "║        ${CYAN}🏰 SETUP GBECHE - Création Arborescence${NC}            ║"
echo -e "║                    ${CYAN}Bash (Universel)${NC}                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# ============================================================
# Vérification préalable
# ============================================================

if [ ! -f "package.json" ]; then
    echo -e "${RED}⚠️  Attention: package.json non trouvé${NC}"
    echo ""
    echo "❓ Êtes-vous dans le dossier racine du projet GBECHE?"
    echo "   Placez ce script à la racine et relancez."
    echo ""
    exit 1
fi

echo -e "${GREEN}✅${NC} Dossier racine détecté. Démarrage de la création..."
echo ""

# ============================================================
# Fonction pour créer un dossier
# ============================================================
create_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        echo -e "   ${GREEN}✓${NC} $1"
    else
        echo -e "   ${YELLOW}⊘${NC} $1 (existe déjà)"
    fi
}

# ============================================================
# Fonction pour créer un fichier
# ============================================================
create_file() {
    local filepath="$1"
    local content="$2"

    if [ ! -f "$filepath" ]; then
        mkdir -p "$(dirname "$filepath")"
        echo "$content" > "$filepath"
        echo -e "   ${GREEN}✓${NC} $(basename "$filepath")"
    else
        echo -e "   ${YELLOW}⊘${NC} $(basename "$filepath") (existe déjà)"
    fi
}

# ============================================================
# 1. DOSSIERS APP
# ============================================================
echo -e "${CYAN}📁 Création des dossiers APP...${NC}"

create_dir "app"
create_dir "app/(onboarding)"
create_dir "app/(app)"
create_dir "app/api"

# ============================================================
# 2. DOSSIERS SRC
# ============================================================
echo ""
echo -e "${CYAN}📁 Création des dossiers SRC...${NC}"

create_dir "src"
create_dir "src/components"
create_dir "src/services"
create_dir "src/types"
create_dir "src/hooks"
create_dir "src/utils"
create_dir "src/store"
create_dir "src/assets"
create_dir "src/assets/fonts"
create_dir "src/assets/images"

# ============================================================
# 3. DOSSIERS ASSETS
# ============================================================
echo ""
echo -e "${CYAN}📁 Création des dossiers ASSETS...${NC}"

create_dir "assets"
create_dir "assets/animations"
create_dir "assets/images"

# ============================================================
# 4. FICHIERS ÉCRANS APP
# ============================================================
echo ""
echo -e "${CYAN}📄 Création des fichiers écrans APP...${NC}"

# app/_layout.tsx
create_file "app/_layout.tsx" "// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack />;
}"

# app/(onboarding)/index.tsx
create_file "app/(onboarding)/index.tsx" "// app/(onboarding)/index.tsx
import React, { useState } from 'react';
import { View, Text } from 'react-native';

export default function OnboardingIndex() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  return (
    <View className=\"flex-1 justify-center items-center\">
      <Text className=\"text-white text-xl font-bold\">Étape {step}: Onboarding GBECHE</Text>
    </View>
  );
}"

# Onboarding steps
create_file "app/(onboarding)/step1.tsx" "// app/(onboarding)/step1.tsx - Manifeste
import React from 'react';
import { View, Text } from 'react-native';

export default function Step1() {
  return (
    <View className=\"flex-1 justify-center items-center\">
      <Text>Le chaos s'arrête ici</Text>
    </View>
  );
}"

create_file "app/(onboarding)/step2.tsx" "// app/(onboarding)/step2.tsx - Forteresse (Sécurité)
import React from 'react';
import { View, Text } from 'react-native';

export default function Step2() {
  return (
    <View className=\"flex-1 justify-center items-center\">
      <Text>La Forteresse</Text>
    </View>
  );
}"

create_file "app/(onboarding)/step3.tsx" "// app/(onboarding)/step3.tsx - Recensement (Finances)
import React from 'react';
import { View, Text } from 'react-native';

export default function Step3() {
  return (
    <View className=\"flex-1 justify-center items-center\">
      <Text>Le Recensement</Text>
    </View>
  );
}"

create_file "app/(onboarding)/step4.tsx" "// app/(onboarding)/step4.tsx - Déclaration de Guerre
import React from 'react';
import { View, Text } from 'react-native';

export default function Step4() {
  return (
    <View className=\"flex-1 justify-center items-center\">
      <Text>Déclaration de Guerre</Text>
    </View>
  );
}"

create_file "app/(onboarding)/step5.tsx" "// app/(onboarding)/step5.tsx - Pacte de Discipline
import React from 'react';
import { View, Text } from 'react-native';

export default function Step5() {
  return (
    <View className=\"flex-1 justify-center items-center\">
      <Text>Le Pacte de Discipline</Text>
    </View>
  );
}"

# app/(app)/_layout.tsx
create_file "app/(app)/_layout.tsx" "// app/(app)/_layout.tsx
import { Tabs } from 'expo-router';

export default function AppLayout() {
  return (
    <Tabs>
      <Tabs.Screen name=\"home\" options={{ title: 'Accueil' }} />
      <Tabs.Screen name=\"finance\" options={{ title: 'Finance' }} />
      <Tabs.Screen name=\"calendar\" options={{ title: 'Calendrier' }} />
      <Tabs.Screen name=\"wars\" options={{ title: 'Guerres' }} />
      <Tabs.Screen name=\"chat\" options={{ title: 'Agent' }} />
      <Tabs.Screen name=\"settings\" options={{ title: 'Paramètres' }} />
    </Tabs>
  );
}"

# App screens
create_file "app/(app)/home.tsx" "// app/(app)/home.tsx - Dashboard Quartier Général
import React from 'react';
import { View, Text } from 'react-native';

export default function Home() {
  return (
    <View className=\"flex-1 justify-center items-center\">
      <Text className=\"text-white\">Dashboard GBECHE</Text>
    </View>
  );
}"

create_file "app/(app)/finance.tsx" "// app/(app)/finance.tsx - Trésorerie
import React from 'react';
import { View, Text } from 'react-native';

export default function Finance() {
  return (
    <View className=\"flex-1 justify-center items-center\">
      <Text className=\"text-white\">Gestion des Finances</Text>
    </View>
  );
}"

create_file "app/(app)/calendar.tsx" "// app/(app)/calendar.tsx - Calendrier & Tracking
import React from 'react';
import { View, Text } from 'react-native';

export default function Calendar() {
  return (
    <View className=\"flex-1 justify-center items-center\">
      <Text className=\"text-white\">Calendrier & Tracking</Text>
    </View>
  );
}"

create_file "app/(app)/wars.tsx" "// app/(app)/wars.tsx - Guerres, Batailles, Adversaires
import React from 'react';
import { View, Text } from 'react-native';

export default function Wars() {
  return (
    <View className=\"flex-1 justify-center items-center\">
      <Text className=\"text-white\">Guerres, Batailles, Adversaires</Text>
    </View>
  );
}"

create_file "app/(app)/chat.tsx" "// app/(app)/chat.tsx - Agent IA
import React from 'react';
import { View, Text } from 'react-native';

export default function Chat() {
  return (
    <View className=\"flex-1 justify-center items-center\">
      <Text className=\"text-white\">Assistant IA</Text>
    </View>
  );
}"

create_file "app/(app)/settings.tsx" "// app/(app)/settings.tsx - Paramètres
import React from 'react';
import { View, Text } from 'react-native';

export default function Settings() {
  return (
    <View className=\"flex-1 justify-center items-center\">
      <Text className=\"text-white\">Paramètres</Text>
    </View>
  );
}"

# ============================================================
# 5. FICHIERS SERVICES
# ============================================================
echo ""
echo -e "${CYAN}📄 Création des fichiers SERVICES...${NC}"

create_file "src/services/database.ts" "// src/services/database.ts
// Configuration WatermelonDB

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

// À implémenter: schema et migrations
// const adapter = new SQLiteAdapter({ schema, migrations });
// export const db = new Database({ adapter });

export const db: any = null; // TODO: Configurer"

create_file "src/services/auth.ts" "// src/services/auth.ts
// Authentification FaceID, Empreinte, Code PIN

import * as LocalAuthentication from 'expo-local-authentication';

export async function authenticate(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authentifiez-vous',
      fallbackLabel: 'Utiliser le Code PIN',
      disableDeviceFallback: false,
    });

    return result.success;
  } catch (error) {
    console.error('Erreur d\\'authentification:', error);
    return false;
  }
}"

create_file "src/services/finance.ts" "// src/services/finance.ts
// Gestion des finances et transactions

export async function addTransaction() {
  // À implémenter
}"

create_file "src/services/wars.ts" "// src/services/wars.ts
// Gestion des Guerres, Batailles, Adversaires

export async function createBattle() {
  // À implémenter
}"

create_file "src/services/tracking.ts" "// src/services/tracking.ts
// Suivi du temps et TimeLog

export async function logTime() {
  // À implémenter
}"

create_file "src/services/nlp.ts" "// src/services/nlp.ts
// Traitement NLP pour l'IA locale

export function parseUserInput(input: string) {
  // À implémenter
}"

create_file "src/services/notifications.ts" "// src/services/notifications.ts
// Gestion des notifications locales

export async function scheduleNotification() {
  // À implémenter
}"

# ============================================================
# 6. FICHIERS TYPES
# ============================================================
echo ""
echo -e "${CYAN}📄 Création des fichiers TYPES...${NC}"

create_file "src/types/index.ts" "// src/types/index.ts
// Définitions TypeScript globales

export interface War {
  id: string;
  title: string;
  icon: string;
  color: string;
  type: 'FINANCE' | 'HEALTH' | 'PROFESSIONAL' | 'SPIRITUAL' | 'SOCIAL' | 'LEISURE';
}

export interface Battle {
  id: string;
  war_id: string;
  title: string;
  deadline: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

export interface Adversary {
  id: string;
  battle_id: string;
  title: string;
  scheduled_at: string;
  status: 'PENDING' | 'WON' | 'LOST';
}

export interface Transaction {
  id: string;
  account_id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  timestamp: string;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  type: 'MOBILE_MONEY' | 'CASH' | 'BANK' | 'WAVE';
}"

# ============================================================
# 7. FICHIERS HOOKS
# ============================================================
echo ""
echo -e "${CYAN}📄 Création des fichiers HOOKS...${NC}"

create_file "src/hooks/index.ts" "// src/hooks/index.ts
// Hooks personnalisés React

// Export des hooks réutilisables ici
// Exemple: export { useAuth } from './useAuth';"

# ============================================================
# 8. FICHIERS UTILS
# ============================================================
echo ""
echo -e "${CYAN}📄 Création des fichiers UTILS...${NC}"

create_file "src/utils/math.ts" "// src/utils/math.ts
// Fonctions utilitaires mathématiques

export function calculatePercentage(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
  }).format(amount);
}"

# ============================================================
# 9. FICHIERS STORE
# ============================================================
echo ""
echo -e "${CYAN}📄 Création des fichiers STORE...${NC}"

create_file "src/store/index.ts" "// src/store/index.ts
// Gestion d'état avec Zustand

import { create } from 'zustand';

interface AppState {
  isAuthenticated: boolean;
  isFirstTime: boolean;
  currentUser: any;

  setAuthenticated: (value: boolean) => void;
  setFirstTime: (value: boolean) => void;
  setCurrentUser: (user: any) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isAuthenticated: false,
  isFirstTime: true,
  currentUser: null,

  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setFirstTime: (value) => set({ isFirstTime: value }),
  setCurrentUser: (user) => set({ currentUser: user }),
}));"

# ============================================================
# 10. FICHIERS COMPOSANTS
# ============================================================
echo ""
echo -e "${CYAN}📄 Création des fichiers COMPOSANTS...${NC}"

create_file "src/components/Button.tsx" "// src/components/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, ViewStyle } from 'react-native';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', style }: ButtonProps) {
  const bgColor = variant === 'primary' ? 'bg-cyan-500' : 'bg-gray-700';

  return (
    <TouchableOpacity onPress={onPress} className={\`\${bgColor} p-3 rounded-lg mb-2\`} style={style}>
      <Text className=\"text-white font-bold text-center\">{label}</Text>
    </TouchableOpacity>
  );
}"

create_file "src/components/Card.tsx" "// src/components/Card.tsx
import React from 'react';
import { View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return (
    <View className=\"bg-gray-900 p-4 rounded-lg mb-3 border border-gray-700\" style={style}>
      {children}
    </View>
  );
}"

# ============================================================
# 11. FICHIERS CONFIG
# ============================================================
echo ""
echo -e "${CYAN}📄 Création des fichiers CONFIG...${NC}"

create_file "tsconfig.json" "{
  \"compilerOptions\": {
    \"target\": \"ES2020\",
    \"lib\": [\"ES2020\"],
    \"jsx\": \"react-jsx\",
    \"module\": \"ESNext\",
    \"moduleResolution\": \"bundler\",
    \"strict\": true,
    \"skipLibCheck\": true,
    \"esModuleInterop\": true,
    \"allowSyntheticDefaultImports\": true,
    \"baseUrl\": \".\",
    \"paths\": {
      \"@/*\": [\"./src/*\"]
    }
  },
  \"include\": [\"**/*.ts\", \"**/*.tsx\"],
  \"exclude\": [\"node_modules\", \".expo\", \"dist\"]
}"

create_file "tailwind.config.js" "/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#81ecff',
        secondary: '#ff7162',
        tertiary: '#b8ffb9',
      },
    },
  },
  plugins: [],
}"

create_file ".eslintrc.json" "{
  \"extends\": [\"expo\", \"prettier\"],
  \"plugins\": [\"prettier\"],
  \"rules\": {
    \"prettier/prettier\": \"warn\"
  }
}"

# ============================================================
# RÉSUMÉ
# ============================================================
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo -e "║                    ${GREEN}✅ SETUP TERMINÉ !${NC}                    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

echo -e "${CYAN}📊 Résumé:${NC}"
echo -e "   ${GREEN}✅${NC} Dossiers APP créés (onboarding, app, api)"
echo -e "   ${GREEN}✅${NC} Dossiers SRC créés (components, services, types, etc.)"
echo -e "   ${GREEN}✅${NC} Fichiers écrans créés (8 fichiers)"
echo -e "   ${GREEN}✅${NC} Fichiers services créés (6 fichiers)"
echo -e "   ${GREEN}✅${NC} Fichiers types et hooks créés"
echo -e "   ${GREEN}✅${NC} Fichiers composants créés"
echo -e "   ${GREEN}✅${NC} Fichiers config créés (tsconfig, tailwind, eslint)"
echo ""

echo -e "${CYAN}🚀 Prochaines étapes:${NC}"
echo "   1. Ouvrir VS Code: code ."
echo "   2. Installer les dépendances: pnpm install"
echo "   3. Démarrer le dev: pnpm expo start"
echo "   4. Scanner avec Expo Go sur ton téléphone 📱"
echo ""

echo -e "${CYAN}📖 Guide disponible:${NC} GBECHE_GUIDE_COMPLET_JUNIOR.md"
echo ""
