/**
 * GBECHE — Hook de requête réactif.
 * Re-exécute la requête :
 *  - au montage / changement de dépendances,
 *  - à chaque notification de changement de la base,
 *  - à chaque focus de l'écran (retour de navigation, reprise d'app).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { subscribeToChanges } from './client';

export type QueryStatus = 'loading' | 'ready' | 'error';

export interface RepoQueryResult<T> {
  data: T | null;
  status: QueryStatus;
  error: unknown;
  reload: () => Promise<void>;
}

export function useRepoQuery<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[] = [],
): RepoQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<QueryStatus>('loading');
  const [error, setError] = useState<unknown>(null);
  const mounted = useRef(true);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      if (mounted.current) {
        setData(result);
        setStatus('ready');
        setError(null);
      }
    } catch (caught) {
      if (mounted.current) {
        console.error('[useRepoQuery]', caught);
        setError(caught);
        setStatus('error');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mounted.current = true;
    reload();
    const unsubscribe = subscribeToChanges(reload);
    return () => {
      mounted.current = false;
      unsubscribe();
    };
  }, [reload]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { data, status, error, reload };
}
