// src/services/database.ts
// Configuration WatermelonDB

import { Database } from '@nozbe/watermelondb';

// Schéma et migrations À IMPLÉMENTER
// Pour l'instant, c'est juste une skeleton

export let db: Database | null = null;

export async function initializeDatabase() {
  try {
    // const adapter = new SQLiteAdapter({
    //   schema, // À définir
    //   migrations, // À définir
    // });

    // db = new Database({ adapter });
    console.log('Database initialized');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la BD:', error);
  }
}