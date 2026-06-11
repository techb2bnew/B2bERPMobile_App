import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { MAIN_ROUTES } from '../navigation/routes';

const DrawerContext = createContext(null);

export const DrawerProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState(MAIN_ROUTES.DASHBOARD);

  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({
      isOpen,
      activeRoute,
      openDrawer,
      closeDrawer,
      setActiveRoute,
    }),
    [isOpen, activeRoute, openDrawer, closeDrawer],
  );

  return (
    <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>
  );
};

export const useDrawer = () => {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error('useDrawer must be used within DrawerProvider');
  }
  return context;
};
