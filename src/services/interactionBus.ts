/**
 * GBECHE — Bus d'interaction utilisateur.
 * Permet à des composants transverses (ex. coach d'inactivité) d'être
 * prévenus de n'importe quel toucher sur l'app sans bloquer la réponse
 * des vues enfants (l'observateur renvoie toujours false).
 */
type Listener = () => void;

const listeners = new Set<Listener>();

/** Signale une interaction (toucher, clic). Sans état, sans rendu. */
export function pokeInteraction(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // Un listener défaillant ne doit pas gêner la saisie.
    }
  }
}

export function onInteraction(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
