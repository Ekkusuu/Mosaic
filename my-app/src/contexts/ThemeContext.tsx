import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'default' | 'honeycomb' | 'forest';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('mosaic-theme') as Theme;
    return savedTheme || 'default';
  });

  useEffect(() => {
    console.log('Theme changing to:', theme);
    console.log('Current classes before:', document.documentElement.className);
    // Remove all theme classes
    document.documentElement.classList.remove('theme-default', 'theme-honeycomb', 'theme-forest');
    // Add current theme class
    document.documentElement.classList.add(`theme-${theme}`);
    console.log('Current classes after:', document.documentElement.className);
    // Save to localStorage
    localStorage.setItem('mosaic-theme', theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
