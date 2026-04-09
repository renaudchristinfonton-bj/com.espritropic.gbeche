// src/services/nlp.ts
// Traitement NLP pour l'IA locale

export interface Intent {
  type: 'FINANCE' | 'PRODUCTIVITY' | 'HEALTH' | 'OTHER';
  action: string;
  params: Record<string, any>;
}

export function parseUserInput(input: string): Intent[] {
  const intents: Intent[] = [];

  // Regex pour détecter les dépenses
  const expenseRegex = /(?:dépens|paié|acheté|coûté).*?(\d+).*?(cash|momo|wave|bank)/i;
  const expenseMatch = input.match(expenseRegex);

  if (expenseMatch) {
    const amount = parseInt(expenseMatch[1]);
    const account = expenseMatch[2].toUpperCase();

    let category = 'CUSTOM';
    if (input.includes('coiffeur') || input.includes('salon')) category = 'HEALTH_BEAUTY';
    if (input.includes('mange') || input.includes('restau')) category = 'FOOD';
    if (input.includes('taxi') || input.includes('transport')) category = 'TRANSPORT';

    intents.push({
      type: 'FINANCE',
      action: 'ADD_EXPENSE',
      params: { amount, account, category },
    });
  }

  // Regex pour détecter les tâches
  const taskRegex = /(?:rappelle|ajoute tâche|fais|apprend).*?([^.]+)/i;
  const taskMatch = input.match(taskRegex);

  if (taskMatch) {
    intents.push({
      type: 'PRODUCTIVITY',
      action: 'ADD_TASK',
      params: { title: taskMatch[1].trim() },
    });
  }

  return intents;
}