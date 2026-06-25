import { Stack } from 'expo-router';
import { UserProvider } from '../src/context/UserContext';
import { ThemeProvider } from '../src/context/ThemeContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <UserProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </UserProvider>
    </ThemeProvider>
  );
}
