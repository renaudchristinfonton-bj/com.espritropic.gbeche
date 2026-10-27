/**
 * GBECHE — Modèle CSV de planification sur mesure.
 * Même contenu que docs/gbeche-modele.csv : l'utilisateur peut remplir ce
 * fichier (ou le faire générer par une IA à partir de sa situation), puis
 * l'importer dans l'app. Chaque ligne crée ou réutilise la guerre, la
 * bataille, le compte référencés par leur nom.
 *
 * Construit via toCsv pour garantir 17 colonnes sur chaque ligne :
 * type, guerre, icone_guerre, couleur_guerre, bataille, description,
 * priorite, echeance_jours, adversaire, frequence, heure, jours_iso,
 * duree_min, xp, montant, categorie, compte
 */
import { toCsv } from '../../utils/csv';

const HEADER = [
  'type', 'guerre', 'icone_guerre', 'couleur_guerre', 'bataille', 'description',
  'priorite', 'echeance_jours', 'adversaire', 'frequence', 'heure', 'jours_iso',
  'duree_min', 'xp', 'montant', 'categorie', 'compte',
];

// Ligne vide type : 17 colonnes, seules les premières positions sont remplies.
const row = (cells: (string | number)[]): (string | number)[] => {
  const filled = [...cells];
  while (filled.length < HEADER.length) filled.push('');
  return filled;
};

export const CSV_TEMPLATE = toCsv([
  HEADER,
  row(['guerre', 'Santé & Physique', 'fitness', '#00FF88']),
  row(['guerre', 'Carrière & Business', 'briefcase', '#00E5FF']),
  row(['bataille', 'Santé & Physique', '', '', 'Perdre 8 kg', 'Programme sportif complet', 'high', 90]),
  // Colonnes 6-7 (priorité, échéance) vides, puis adversaire(8), fréquence(9),
  // heure(10), jours ISO(11), durée(12), XP(13).
  row(['adversaire', 'Santé & Physique', '', '', 'Perdre 8 kg', '', '', '', 'Séance de sport 45 min', 'daily', 6, '', 45, 60]),
  row(['adversaire', 'Santé & Physique', '', '', 'Perdre 8 kg', '', '', '', 'Course du week-end', 'specific_days', 8, '1,6', 60, 80]),
  row(['adversaire', 'Santé & Physique', '', '', 'Perdre 8 kg', '', '', '', 'Pesée hebdomadaire', 'weekly', 7, '', 10, 30]),
  row(['adversaire', 'Santé & Physique', '', '', 'Perdre 8 kg', '', '', '', 'Bilan mensuel', 'monthly', 9, '', 15, 40]),
  row(['bataille', 'Carrière & Business', '', '', 'Lancer mon activité', 'Prospection et trésorerie', 'medium', 180]),
  row(['adversaire', 'Carrière & Business', '', '', 'Lancer mon activité', '', '', '', 'Appeler un client prospect', 'once', 10, '', 20, 50]),
  row(['depense', '', '', '', '', '', '', '', '', '', '', '', '', '', 15000, 'transport', 'Cash']),
  row(['revenu', '', '', '', '', '', '', '', '', '', '', '', '', '', 250000, 'business', 'MTN MoMo']),
]);

export const CSV_TEMPLATE_FILENAME = 'gbeche-modele.csv';
