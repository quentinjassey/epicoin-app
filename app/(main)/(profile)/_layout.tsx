import { Stack } from 'expo-router/stack';

export default function ProfileStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="personal-info" />
      <Stack.Screen name="security" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="help" />
      <Stack.Screen name="delete-account" />
      <Stack.Screen name="data-export" />
      <Stack.Screen name="accessibility" />
    </Stack>
  );
}
