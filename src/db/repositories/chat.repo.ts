/**
 * Repository — Conversation de l'agent local.
 * La table chat_messages est créée par la migration initiale ; les
 * colonnes payload_json/status viennent de la migration v3 (cartes
 * d'action à confirmer). L'agent est 100 % hors-ligne (aucun appel
 * réseau, aucun modèle distant).
 */

import { all, newId, run } from '../client';
import type { AgentAction } from '../../services/agent/agentCommand';

export type ChatMessageStatus = 'info' | 'proposed' | 'confirmed' | 'cancelled';

export interface ChatMessageRow {
  id: string;
  role: 'user' | 'agent';
  text: string;
  intents_json: string;
  payload_json: string;
  status: ChatMessageStatus;
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
  payload: AgentAction[] = [],
  status: ChatMessageStatus = 'info',
): Promise<string> {
  const id = newId();
  await run(
    `INSERT INTO chat_messages (id, role, text, intents_json, payload_json, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [id, role, text, JSON.stringify(intents), JSON.stringify(payload), status, Date.now()],
  );
  return id;
}

/** Change le cycle de vie d'une carte d'action proposée. */
export async function setMessageStatus(id: string, status: ChatMessageStatus): Promise<void> {
  await run('UPDATE chat_messages SET status = ? WHERE id = ?;', [status, id]);
}

export async function countMessages(): Promise<number> {
  const row = await all<{ n: number }>('SELECT COUNT(*) AS n FROM chat_messages;');
  return row[0]?.n ?? 0;
}

export async function clearChat(): Promise<void> {
  await run('DELETE FROM chat_messages;');
}
