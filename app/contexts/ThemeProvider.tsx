'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ReactNode, useEffect } from 'react';

// Define the Attribute type
type Attribute = 'class' | 'data-theme' | 'data-mode';

interface ThemeProviderProps {
  children: ReactNode;
  attribute?: Attribute | Attribute[];
  defaultTheme?: string;
  enableSystem?: boolean;
  forcedTheme?: string;
  storageKey?: string;
  themes?: string[];
  disableTransitionOnChange?: boolean;
  [key: string]: any;
}

export default function ThemeProvider({ 
  children, 
  attribute = "class",
  defaultTheme = "light",
  enableSystem = true,
  storageKey = "bpk-theme",
  disableTransitionOnChange = true,
  ...props 
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      storageKey={storageKey}
      disableTransitionOnChange={disableTransitionOnChange}
      {...props}
    >
      <ThemeScript />
      {children}
    </NextThemesProvider>
  );
}

// This component helps prevent theme flickering on page load
function ThemeScript() {
  useEffect(() => {
    // Ensure we're in a browser environment
    if (typeof window === 'undefined') return;
    
    try {
      // This function runs only on the client after the component mounts
      const storageKey = 'bpk-theme';
      let savedTheme;
      
      try {
        // Safely access localStorage
        savedTheme = localStorage.getItem(storageKey);
      } catch (e) {
        // Handle localStorage errors (e.g., in incognito mode)
        console.warn('Failed to read from localStorage:', e);
        savedTheme = null;
      }
      
      const prefersDark = window.matchMedia && 
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      console.error('Error in ThemeScript:', error);
    }
  }, []);
  
  return null;
} 