import { useUserStore } from './store';

export const lightTheme = {
  background: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  primary: '#2563eb',
  danger: '#ef4444',
  success: '#22c55e',
  warning: '#eab308',
  icon: '#0f172a',
  iconMuted: '#94a3b8',
  inputBg: '#f8fafc',
  overlay: 'rgba(0,0,0,0.5)',
};

export const darkTheme = {
  background: '#0f172a',
  card: '#1e293b',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  border: '#334155',
  primary: '#3b82f6',
  danger: '#f87171',
  success: '#4ade80',
  warning: '#facc15',
  icon: '#f8fafc',
  iconMuted: '#64748b',
  inputBg: '#0f172a',
  overlay: 'rgba(0,0,0,0.7)',
};

export const useTheme = () => {
  const theme = useUserStore((state) => state.theme);
  return { colors: theme === 'light' ? lightTheme : darkTheme, isDark: theme === 'dark' };
};
