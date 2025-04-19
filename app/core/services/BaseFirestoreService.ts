import { db } from '@/app/core/firebase/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  CollectionReference,
  Query,
  DocumentData
} from 'firebase/firestore';

export class BaseFirestoreService {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  protected async getDocument(id: string) {
    const docRef = doc(db, this.collectionName, id);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  }

  protected async getDocuments(conditions?: any[]) {
    let q: Query<DocumentData> | CollectionReference<DocumentData> = collection(db, this.collectionName);
    
    if (conditions) {
      q = query(q as CollectionReference<DocumentData>, ...conditions);
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  protected createQuery(...conditions: any[]) {
    return query(collection(db, this.collectionName), ...conditions);
  }
} 