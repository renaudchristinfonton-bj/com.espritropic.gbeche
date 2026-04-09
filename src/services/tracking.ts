// src/services/tracking.ts
// Suivi du temps et TimeLog

export async function logTime(
  date: Date,
  startHour: number,
  endHour: number,
  activity: string,
  isPlanned: boolean
) {
  try {
    // À implémenter avec WatermelonDB
    console.log('Temps enregistré:', { date, startHour, endHour, activity });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du temps:', error);
  }
}

export async function getTimeLogsForDay(date: Date) {
  try {
    // À implémenter: Récupérer les TimeLogs du jour
    return [];
  } catch (error) {
    console.error('Erreur lors de la récupération des logs:', error);
    return [];
  }
}

export async function checkMissingHour() {
  try {
    // À implémenter: Vérifier si une heure est non planifiée
    // et envoyer une notification
  } catch (error) {
    console.error('Erreur lors de la vérification:', error);
  }
}