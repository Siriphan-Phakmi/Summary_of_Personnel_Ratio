import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { FormConfiguration } from '../types';

const FORM_CONFIG_COLLECTION = 'form_configurations';

/**
 * Fetches the configuration for a specific form from Firestore.
 * @param formName The ID of the form document (e.g., 'login_form').
 * @returns The form configuration object, or null if the document doesn't exist or an error occurs.
 */
export const getFormConfiguration = async (formName: string): Promise<FormConfiguration | null> => {
  try {
    const docRef = doc(db, FORM_CONFIG_COLLECTION, formName);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // The data is cast to our FormConfiguration interface.
      // For a more robust solution, especially with complex or untrusted data,
      // consider using a validation library like Zod to parse and validate the data structure.
      return docSnap.data() as FormConfiguration;
    } else {
      // It's good practice to log when a configuration is not found.
      // This helps in debugging issues related to missing Firestore documents.
      console.warn(`Form configuration document not found for: '${formName}'`);
      return null;
    }
  } catch (error) {
    // Catching and logging the error is crucial for production monitoring.
    // This prevents the application from crashing and allows for graceful error handling.
    console.error(`Error fetching form configuration for '${formName}':`, error);
    return null;
  }
}; 