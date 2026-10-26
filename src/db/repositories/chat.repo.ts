/**
 * Repository — Conversation de l'agent local.
 * La table chat_messages est créée par la migration initiale ; l'agent
 * est 100 % hors-ligne (aucun appel réseau, aucun modèle distant).
 */

import { all, newId, run } from '../client';

export interface ChatMessageRow {
  id: string;
  role: 'user' | 'agent';
  text: string;
  intents_json: string;
  created_at: number;
}

export async function listMessages(limit = 200): Promise<ChatMessageRow[]> {
  return all<ChatMessageRow>(
    'SELECT * FROM chat_messages ORDER BY created_at ASC LIMIT ?;',
    [limit],
  );
}

export async function addMessage(
  role: 'user' | 'agent',
  text: string,
  intents: string[] = [],
): Promise<string> {
  const id = newId();
  await run(
    `INSERT INTO chat_messages (id, role, text, intents_json, created_at)
     VALUES (?, ?, ?, ?, ?);`,
    [id, role, text, JSON.stringify(intents), Date.now()],
  );
  return id;
}

export async function countMessages(): Promise<number> {
  const row = await all<{ n: number }>('SELECT COUNT(*) AS n FROM chat_messages;');
  return row[0]?.n ?? 0;
}

export async function clearChat(): Promise<void> {
  await run('DELETE FROM chat_messages;');
}
