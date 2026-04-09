// src/services/auth.ts
// Authentification FaceID, Empreinte, Code PIN

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { getOrCreateMasterKey } from './encryption';

export async function authenticate(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();

    if (!compatible) {
      console.log('Biométrie non disponible, fallback sur Code PIN');
      return askForPIN();
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authentifiez-vous avec FaceID ou empreinte',
      fallbackLabel: 'Utiliser le Code PIN',
      disableDeviceFallback: false,
    });

    if (result.success) {
      // On s'assure que la clé de chiffrement est prête dès l'auth
      await getOrCreateMasterKey();
      return true;
    } else {
      console.log('Authentification échouée');
      return askForPIN();
    }
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    return false;
  }
}

export async function askForPIN(): Promise<boolean> {
  // À implémenter: afficher une UI pour rentrer le PIN
  // Et comparer avec SecureStore.getItemAsync('userPin')
  return false;
}

export async function setPIN(pin: string): Promise<void> {
  await SecureStore.setItemAsync('userPin', pin);
}

export async function verifyPIN(pin: string): Promise<boolean> {
  const storedPin = await SecureStore.getItemAsync('userPin');
  return storedPin === pin;
}