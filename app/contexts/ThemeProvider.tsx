'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

// Define the Attribute type
type Attribute = 'class' | 'data-theme' | 'data-mode';

interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: Attribute | Attribute[];
  defaultTheme?: string;
  enableSystem?: boolean;
  forcedTheme?: string;
  storageKey?: string;
  themes?: string[];
  [key: string]: any;
}

export default function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
} 