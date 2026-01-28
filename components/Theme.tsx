import React from 'react';
import { useColorScheme } from 'react-native';

export function Theme({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  return <>{children}</>;
}
