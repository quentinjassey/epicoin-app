import { Stack } from 'expo-router/stack';
import { Colors } from '@/constants/NativeColors';

export default function AdminStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerLargeTitle: false,
        headerBlurEffect: undefined,
        headerTransparent: false,
        headerShadowVisible: true,
        headerBackTitle: 'Retour',
        headerStyle: { backgroundColor: Colors.white },
        headerTintColor: Colors.epitechBlue,
        headerTitleStyle: {
          fontWeight: '900',
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: Colors.black,
        } as any,
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
