/**
 * Lecture/écriture de fichiers — implémentation native.
 * Export via expo-file-system + feuille de partage expo-sharing ;
 * import via expo-document-picker. Le fichier `.web.ts` porte la version
 * navigateur (téléchargement Blob / input fichier).
 */
import * as DocumentPicker from 'expo-document-picker';
// API classique (documentDirectory, writeAsStringAsync) disponible sous
// le sous-chemin legacy depuis expo-file-system 19 (SDK 54).
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export interface PickedFile {
  name: string;
  content: string;
  uri: string;
}

export async function saveTextFile(filename: string, content: string, mimeType: string): Promise<string> {
  const uri = `${FileSystem.documentDirectory ?? ''}${filename}`;
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType, dialogTitle: filename });
  }
  return uri;
}

export async function pickTextFile(
  accept: string[] = ['text/csv', 'text/plain', 'application/json'],
): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: accept,
    copyToCacheDirectory: true,
  });
  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  const content = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return { name: asset.name, content, uri: asset.uri };
}
