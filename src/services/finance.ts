// src/services/finance.ts
// Gestion des finances et transactions

export async function addTransaction(
  accountId: string,
  amount: number,
  type: 'INCOME' | 'EXPENSE',
  category: string,
  description: string
) {
  try {
    // À implémenter avec WatermelonDB
    // 1. Créer la transaction
    // 2. Mettre à jour le solde du compte

    console.log('Transaction ajoutée:', { accountId, amount, type, category });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de transaction:', error);
  }
}

export async function getTransactions(accountId: string) {
  try {
    // À implémenter: Récupérer les transactions d'un compte
    return [];
  } catch (error) {
    console.error('Erreur lors de la récupération des transactions:', error);
    return [];
  }
}

export async function getAccountBalance(accountId: string) {
  try {
    // À implémenter: Récupérer le solde d'un compte
    return 0;
  } catch (error) {
    console.error('Erreur lors de la récupération du solde:', error);
    return 0;
  }
}