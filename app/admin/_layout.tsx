import { Stack } from 'expo-router/stack';

export default function AdminStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerLargeTitle: false,
        headerBlurEffect: 'systemMaterial',
        headerTransparent: false,
        headerShadowVisible: true,
        headerBackTitle: 'Retour',
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Administration',
          presentation: 'modal',
        }} 
      />
      <Stack.Screen 
        name="fraud" 
        options={{ title: 'Alertes Fraude' }} 
      />
      <Stack.Screen 
        name="fraud-config" 
        options={{ title: 'Configuration Fraude' }} 
      />
      <Stack.Screen 
        name="fraud-detail" 
        options={{ title: 'Détail Alerte' }} 
      />
      <Stack.Screen 
        name="metrics" 
        options={{ title: 'Métriques' }} 
      />
      <Stack.Screen 
        name="products" 
        options={{ title: 'Produits' }} 
      />
      <Stack.Screen 
        name="transactions" 
        options={{ title: 'Transactions' }} 
      />
      <Stack.Screen 
        name="users" 
        options={{ title: 'Utilisateurs' }} 
      />
    </Stack>
  );
}
