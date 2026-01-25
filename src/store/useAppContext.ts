import { useContext } from 'react';
import { AppContext } from './AppContext';

// Custom hook для использования контекста
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};