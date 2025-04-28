import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {Collection, DefaultField} from './firebase/firestore/types';

initializeApp();

export const db = {
  collection<K extends keyof Collection>(collection: K) {
    return {
      async create(data: Omit<Collection[K], Exclude<keyof DefaultField, 'shop'>>) {
        const docRef = getFirestore().collection(collection).doc();
        const dataToSave: typeof data & DefaultField = {...data, id: docRef.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString()};
        return await docRef.set(dataToSave).then(() => dataToSave);
      },
      async read(id: string) {
        const docRef = getFirestore().collection(collection).doc(id);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          return {id: docSnap.id, ...docSnap.data()} as Collection[K];
        } else {
          return null;
        }
      },
      async update(id: string, data: Partial<Omit<Collection[K], 'id'>>) {
        const docRef = getFirestore().collection(collection).doc(id);
        await docRef.set(data, {merge: true});
        return await docRef.get().then((docSnap) => {
          if (docSnap.exists) {
            return {id: docSnap.id, ...docSnap.data()} as Collection[K];
          } else {
            return null;
          }
        });
      },
      async delete(id: string) {
        const docRef = getFirestore().collection(collection).doc(id);
        await docRef.delete();
      },
    };
  },
};
