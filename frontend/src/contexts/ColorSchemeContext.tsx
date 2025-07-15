import { createContext, useContext } from 'react';

export type ColorScheme = 'light' | 'dark';

export interface ColorSchemeContextValue {
  colorScheme: ColorScheme;
  toggleColorScheme: (value?: ColorScheme) => void;
}

export const ColorSchemeContext = createContext<
  ColorSchemeContextValue | undefined
>(undefined);

export function useColorScheme() {
  const ctx = useContext(ColorSchemeContext);
  if (!ctx) {
    throw new Error(
      'useColorScheme must be used within ColorSchemeContext.Provider'
    );
  }
  return ctx;
}
