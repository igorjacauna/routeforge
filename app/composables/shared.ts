import type { QueryFieldFilterConstraint } from 'firebase/firestore';
import { collection, query, where } from 'firebase/firestore';

/**
 * Universal shared collection composable
 * Works with both top-level collections and subcollections
 * Pass the full collection path (e.g., 'workspaces' or 'workspaces/123/projects')
 */
export function useSharedCollection<T>(collectionPath: string, extraWhere: QueryFieldFilterConstraint[] = []) {
  const db = useFirestore();
  const user = useCurrentUser();

  const ownedQuery = computed(() =>
    user.value
      ? query(collection(db, collectionPath), where('ownerId', '==', user.value.uid), ...extraWhere)
      : null,
  );

  const sharedQuery = computed(() =>
    user.value
      ? query(collection(db, collectionPath), where(`sharedWith.${user.value.uid}`, 'in', ['viewer', 'editor']), ...extraWhere)
      : null,
  );

  const owned = useCollection<T>(ownedQuery);
  const shared = useCollection<T>(sharedQuery);

  const combined = computed(() => {
    const map = new Map<string, T>();
    for (const d of owned.value) map.set((d as { id: string }).id, d);
    for (const d of shared.value) map.set((d as { id: string }).id, d);
    return Array.from(map.values());
  });

  return combined;
}