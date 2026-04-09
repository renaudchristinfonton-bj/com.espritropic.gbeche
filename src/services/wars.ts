// src/services/wars.ts
// Gestion des Guerres, Batailles, Adversaires

export async function createBattle(
  warId: string,
  title: string,
  description: string,
  deadline: Date
) {
  try {
    // À implémenter avec WatermelonDB
    console.log('Bataille créée:', { warId, title, deadline });
  } catch (error) {
    console.error('Erreur lors de la création de bataille:', error);
  }
}

export async function createAdversary(
  battleId: string,
  title: string,
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONCE',
  recurrenceDays?: number[]
) {
  try {
    // À implémenter avec WatermelonDB
    // Si WEEKLY, générer les instances pour 3 mois
    console.log('Adversaire créé:', { battleId, title, frequency });
  } catch (error) {
    console.error('Erreur lors de la création d\'adversaire:', error);
  }
}

export async function completeAdversary(adversaryId: string) {
  try {
    // À implémenter: Marquer comme WON
    console.log('Adversaire complété:', adversaryId);
  } catch (error) {
    console.error('Erreur lors de la complétion:', error);
  }
}