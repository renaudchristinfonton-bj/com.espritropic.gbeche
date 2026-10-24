/**
 * Lecture/écriture de fichiers — implémentation navigateur.
 * Aucun module natif : téléchargement via Blob + ancre, lecture via
 * input[type=file]. Tout reste côté client, rien n'est envoyé au réseau.
 */

export interface PickedFile {
  name: string;
  content: string;
  uri: string;
}

export async function saveTextFile(filename: string, content: string, mimeType: string): Promise<string> {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Laisse au navigateur le temps de lancer le téléchargement.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return url;
}

export async function pickTextFile(accept: string[]): Promise<PickedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept.join(',');
    input.style.display = 'none';

    input.onchange = async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) {
        resolve(null);
        return;
      }
      const content = await file.text();
      resolve({ name: file.name, content, uri: URL.createObjectURL(file) });
    };
    input.oncancel = () => {
      input.remove();
      resolve(null);
    };

    document.body.appendChild(input);
    input.click();
  });
}
