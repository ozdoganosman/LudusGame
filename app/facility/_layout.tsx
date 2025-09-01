import { Stack } from 'expo-router';

export default function FacilityLayout() {
  return (
    <Stack>
      <Stack.Screen name="barracks" options={{ headerShown: false }} />
      <Stack.Screen name="palaestra" options={{ headerShown: false }} />
      <Stack.Screen name="armory" options={{ headerShown: false }} />
    </Stack>
  );
}
