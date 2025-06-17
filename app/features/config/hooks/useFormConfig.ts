import { useState, useEffect } from 'react';
import { getFormConfiguration } from '../services/configService';
import { FormConfiguration } from '../types';

/**
 * A reusable hook to fetch and manage form configuration from Firestore.
 * @param formName The ID of the form document in the 'form_configurations' collection.
 * @returns An object containing the form configuration, loading state, and any error.
 */
export const useFormConfig = (formName: string) => {
  const [formConfig, setFormConfig] = useState<FormConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      // Do not fetch if formName is not provided
      if (!formName) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const config = await getFormConfiguration(formName);
        setFormConfig(config);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        console.error(`Failed to fetch form configuration for ${formName}:`, err);
        setError(`Failed to load form configuration: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [formName]); // Re-run the effect if the formName changes

  return { formConfig, loading, error };
}; 