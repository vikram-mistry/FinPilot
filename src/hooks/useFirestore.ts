import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';

/**
 * Listen to a single Firestore document under users/{uid}/{path}.
 */
export function useDocument<T extends DocumentData>(path: string) {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    const segments = path.split('/');
    if (segments.length % 2 === 1) {
      segments.push(segments[segments.length - 1]!);
    }
    const docRef = doc(db, 'users', user.uid, ...segments);
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        setData(snap.exists() ? (snap.data() as T) : null);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsub;
  }, [user, path]);

  return { data, loading, error };
}

/**
 * Listen to a Firestore collection under users/{uid}/{path}.
 */
export function useCollection<T extends DocumentData>(
  path: string,
  constraints?: QueryConstraint[]
) {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    const colRef = collection(db, 'users', user.uid, ...path.split('/'));
    const q = constraints ? query(colRef, ...constraints) : colRef;

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as T),
        }));
        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsub;
  }, [user, path]);

  return { data, loading, error };
}

/**
 * Set (create or update) a document at users/{uid}/{path}.
 */
export async function setDocument<T extends DocumentData>(
  uid: string,
  path: string,
  data: T
): Promise<void> {
  const segments = path.split('/');
  if (segments.length % 2 === 1) {
    segments.push(segments[segments.length - 1]!);
  }
  const docRef = doc(db, 'users', uid, ...segments);
  await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * Add a document to a collection at users/{uid}/{path}.
 */
export async function addDocument<T extends DocumentData>(
  uid: string,
  path: string,
  data: T
): Promise<string> {
  const colRef = collection(db, 'users', uid, ...path.split('/'));
  const docRef = await addDoc(colRef, { ...data, createdAt: serverTimestamp() });
  return docRef.id;
}

/**
 * Delete a document at users/{uid}/{path}.
 */
export async function deleteDocument(
  uid: string,
  path: string
): Promise<void> {
  const segments = path.split('/');
  if (segments.length % 2 === 1) {
    segments.push(segments[segments.length - 1]!);
  }
  const docRef = doc(db, 'users', uid, ...segments);
  await deleteDoc(docRef);
}
