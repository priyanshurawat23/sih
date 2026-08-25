import { MD3DarkTheme, adaptNavigationTheme } from 'react-native-paper';
import { DarkTheme as NavigationDarkTheme } from '@react-navigation/native';

const { DarkTheme } = adaptNavigationTheme({ reactNavigationDark: NavigationDarkTheme });

export const theme = {
  ...MD3DarkTheme,
  ...DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...DarkTheme.colors,
    primary: '#6C63FF',
    background: '#121212',
    surface: '#1E1E2E',
    onSurface: '#FFFFFF',
    text: '#FFFFFF',
    accent: '#FF6584',
    error: '#FF6584',
    success: '#4CAF50',
    warning: '#FFC107',
    danger: '#F44336',
    gradientStart: '#6C63FF',
    gradientEnd: '#FF6584',
  },
  typography: {
    h1: { fontSize: 24, fontWeight: 'bold' },
    h2: { fontSize: 20, fontWeight: 'bold' },
    body: { fontSize: 16 },
    caption: { fontSize: 12, color: '#A0A0A0' }
  }
};
