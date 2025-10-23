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

  const editorsQuery = computed(() => {
    if (!user.value) return null;
    return query(collection(db, collectionPath), where('editors', 'array-contains', user.value.uid), ...extraWhere);
  });

  const viewersQuery = computed(() => {
    if (!user.value) return null;
    return query(collection(db, collectionPath), where('viewers', 'array-contains', user.value.uid), ...extraWhere);
  });

  const editors = useCollection<T>(editorsQuery);
  const viewers = useCollection<T>(viewersQuery);

  const combined = computed(() => {
    const map = new Map<string, T>();
    for (const d of editors.value) map.set((d as { id: string }).id, d);
    for (const d of viewers.value) map.set((d as { id: string }).id, d);
    return Array.from(map.values());
  });

  return combined;
}

export function useOwnerCollection<T>(collectionPath: string, extraWhere: QueryFieldFilterConstraint[] = []) {
  const db = useFirestore();
  const user = useCurrentUser();

  const ownerQuery = computed(() =>
    user.value
      ? query(collection(db, collectionPath), where('ownerId', '==', user.value.uid), ...extraWhere)
      : null,
  );

  const ownerCollection = useCollection<T>(ownerQuery);

  return ownerCollection;
}